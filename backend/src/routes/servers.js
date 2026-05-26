const express = require('express');
const { query } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// List servers the authed user is a member of
router.get('/', authRequired, async (req, res) => {
  const r = await query(
    `select s.*
       from chat_servers s
       join chat_server_members m on m.server_id = s.id
      where m.user_id = $1
      order by s.created_at asc`,
    [req.user.id]
  );
  return res.json({ servers: r.rows });
});

// Create new server (owner auto-joins, plus a default "general" text channel)
router.post('/', authRequired, async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

  const client = await require('../config/db').pool.connect();
  try {
    await client.query('begin');
    const s = await client.query(
      `insert into chat_servers (name, owner_id) values ($1,$2) returning *`,
      [name.trim(), req.user.id]
    );
    const server = s.rows[0];
    await client.query(
      `insert into chat_server_members (server_id, user_id, role) values ($1,$2,'owner')`,
      [server.id, req.user.id]
    );
    const ch = await client.query(
      `insert into chat_channels (server_id, name, type, position) values ($1,'general','text',0) returning *`,
      [server.id]
    );
    // Welcome system message
    await client.query(
      `insert into chat_messages (channel_id, user_id, content, type)
       values ($1,$2,$3,'system_create')`,
      [ch.rows[0].id, req.user.id, 'created this server.']
    );
    await client.query('commit');
    return res.status(201).json({ server });
  } catch (e) {
    await client.query('rollback');
    console.error(e);
    return res.status(500).json({ error: 'Failed to create server' });
  } finally {
    client.release();
  }
});

// Join server by invite code (also posts a system welcome message)
router.post('/join', authRequired, async (req, res) => {
  const { invite_code } = req.body || {};
  if (!invite_code) return res.status(400).json({ error: 'invite_code is required' });
  const sRes = await query(
    `select * from chat_servers where invite_code = $1 limit 1`,
    [invite_code.trim()]
  );
  const server = sRes.rows[0];
  if (!server) return res.status(404).json({ error: 'Invalid invite code' });
  try {
    const ins = await query(
      `insert into chat_server_members (server_id, user_id) values ($1,$2)
       on conflict (server_id, user_id) do nothing
       returning *`,
      [server.id, req.user.id]
    );
    // First-time join: post a system "joined the party" message in the first text channel
    if (ins.rowCount > 0) {
      const ch = await query(
        `select id from chat_channels where server_id = $1 and type = 'text'
          order by position asc, created_at asc limit 1`,
        [server.id]
      );
      if (ch.rowCount) {
        const u = await query(
          `select username, display_name, avatar_url, is_bot from chat_users where id = $1`,
          [req.user.id]
        );
        const m = await query(
          `insert into chat_messages (channel_id, user_id, content, type)
           values ($1,$2,$3,'system_join') returning *`,
          [ch.rows[0].id, req.user.id, 'joined the party!']
        );
        const message = { ...m.rows[0], ...u.rows[0], attachments: [] };
        const io = req.app.get('io');
        if (io) io.to(`channel:${ch.rows[0].id}`).emit('message:new', message);
      }
    }
    return res.json({ server });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to join server' });
  }
});

// Server detail (must be member)
router.get('/:id', authRequired, async (req, res) => {
  const member = await query(
    `select 1 from chat_server_members where server_id = $1 and user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!member.rowCount) return res.status(403).json({ error: 'Not a member of this server' });
  const r = await query(`select * from chat_servers where id = $1`, [req.params.id]);
  return res.json({ server: r.rows[0] });
});

// Leave server (system message posted)
router.post('/:id/leave', authRequired, async (req, res) => {
  const memRes = await query(
    `select role from chat_server_members where server_id = $1 and user_id = $2`,
    [req.params.id, req.user.id]
  );
  const role = memRes.rows[0]?.role;
  if (!role) return res.status(404).json({ error: 'Not a member' });
  if (role === 'owner') return res.status(400).json({ error: 'Owners must transfer or delete the server' });

  const u = await query(`select username, display_name, avatar_url, is_bot from chat_users where id = $1`, [req.user.id]);
  const ch = await query(
    `select id from chat_channels where server_id = $1 and type = 'text'
      order by position asc, created_at asc limit 1`,
    [req.params.id]
  );
  if (ch.rowCount) {
    const m = await query(
      `insert into chat_messages (channel_id, user_id, content, type)
       values ($1,$2,$3,'system_leave') returning *`,
      [ch.rows[0].id, req.user.id, 'left the server.']
    );
    const io = req.app.get('io');
    if (io) io.to(`channel:${ch.rows[0].id}`).emit('message:new', { ...m.rows[0], ...u.rows[0], attachments: [] });
  }
  await query(`delete from chat_server_members where server_id = $1 and user_id = $2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// Delete server (owner only)
router.delete('/:id', authRequired, async (req, res) => {
  const m = await query(
    `select role from chat_server_members where server_id = $1 and user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (m.rows[0]?.role !== 'owner') return res.status(403).json({ error: 'Only the server owner can delete it' });
  await query(`delete from chat_servers where id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// Members of a server
router.get('/:id/members', authRequired, async (req, res) => {
  const member = await query(
    `select 1 from chat_server_members where server_id = $1 and user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!member.rowCount) return res.status(403).json({ error: 'Not a member of this server' });
  const r = await query(
    `select u.id, u.username, u.display_name, u.avatar_url, u.status, u.is_bot, m.role
       from chat_server_members m
       join chat_users u on u.id = m.user_id
      where m.server_id = $1
      order by m.joined_at asc`,
    [req.params.id]
  );
  return res.json({ members: r.rows });
});

module.exports = router;
