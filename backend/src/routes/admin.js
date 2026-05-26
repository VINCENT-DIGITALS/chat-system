const express = require('express');
const { query, pool } = require('../config/db');
const { authRequired, adminRequired } = require('../middleware/auth');
const { invalidate: invalidateMaintenance } = require('../middleware/maintenance');
const { invalidateBranding } = require('./system');

const router = express.Router();
router.use(authRequired, adminRequired);

async function audit(actorId, action, target_type, target_id, details) {
  try {
    await query(
      `insert into chat_admin_audit_log (actor_id, action, target_type, target_id, details)
       values ($1,$2,$3,$4,$5)`,
      [actorId, action, target_type || null, target_id ? String(target_id) : null, details ? JSON.stringify(details) : null]
    );
  } catch (e) {
    console.error('audit log error', e.message);
  }
}

// ----- ANALYTICS -----
router.get('/stats', async (_req, res) => {
  const client = await pool.connect();
  try {
    const [
      users,
      blocked,
      admins,
      servers,
      channels,
      messages,
      activeToday,
      newUsers7d,
      messages7d,
      topServers,
    ] = await Promise.all([
      client.query(`select count(*)::int as n from chat_users`),
      client.query(`select count(*)::int as n from chat_users where is_blocked`),
      client.query(`select count(*)::int as n from chat_users where is_admin`),
      client.query(`select count(*)::int as n from chat_servers`),
      client.query(`select count(*)::int as n from chat_channels`),
      client.query(`select count(*)::int as n from chat_messages`),
      client.query(`select count(distinct user_id)::int as n from chat_messages where created_at > now() - interval '24 hours'`),
      client.query(`select count(*)::int as n from chat_users where created_at > now() - interval '7 days'`),
      client.query(`
        select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
               count(*)::int as n
          from chat_messages
         where created_at > now() - interval '7 days'
         group by 1 order by 1 asc
      `),
      client.query(`
        select s.id, s.name, count(m.id)::int as messages
          from chat_servers s
          left join chat_channels c on c.server_id = s.id
          left join chat_messages m on m.channel_id = c.id
         group by s.id, s.name
         order by messages desc
         limit 5
      `),
    ]);
    res.json({
      totals: {
        users: users.rows[0].n,
        blocked: blocked.rows[0].n,
        admins: admins.rows[0].n,
        servers: servers.rows[0].n,
        channels: channels.rows[0].n,
        messages: messages.rows[0].n,
      },
      active_24h: activeToday.rows[0].n,
      new_users_7d: newUsers7d.rows[0].n,
      messages_7d: messages7d.rows,
      top_servers: topServers.rows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load stats' });
  } finally {
    client.release();
  }
});

// ----- USERS -----
router.get('/users', async (req, res) => {
  const search = (req.query.q || '').toString().trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = parseInt(req.query.offset, 10) || 0;
  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where = `where lower(username) like $1 or lower(email) like $1`;
  }
  params.push(limit, offset);
  const r = await query(
    `select id, username, email, avatar_url, status, is_admin, is_blocked,
            blocked_at, blocked_reason, created_at
       from chat_users
       ${where}
       order by created_at desc
       limit $${params.length - 1} offset $${params.length}`,
    params
  );
  const total = await query(
    `select count(*)::int as n from chat_users ${where}`,
    search ? [params[0]] : []
  );
  res.json({ users: r.rows, total: total.rows[0].n });
});

router.post('/users/:id/block', async (req, res) => {
  const { reason } = req.body || {};
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot block yourself' });
  }
  const r = await query(
    `update chat_users
        set is_blocked = true, blocked_at = now(), blocked_reason = $2
      where id = $1
      returning id, username, is_blocked, blocked_at, blocked_reason`,
    [req.params.id, reason || null]
  );
  if (!r.rowCount) return res.status(404).json({ error: 'User not found' });
  await audit(req.user.id, 'user.block', 'user', req.params.id, { reason: reason || null });
  res.json({ user: r.rows[0] });
});

router.post('/users/:id/unblock', async (req, res) => {
  const r = await query(
    `update chat_users
        set is_blocked = false, blocked_at = null, blocked_reason = null
      where id = $1
      returning id, username, is_blocked`,
    [req.params.id]
  );
  if (!r.rowCount) return res.status(404).json({ error: 'User not found' });
  await audit(req.user.id, 'user.unblock', 'user', req.params.id);
  res.json({ user: r.rows[0] });
});

router.post('/users/:id/promote', async (req, res) => {
  const r = await query(
    `update chat_users set is_admin = true where id = $1
      returning id, username, is_admin`,
    [req.params.id]
  );
  if (!r.rowCount) return res.status(404).json({ error: 'User not found' });
  await audit(req.user.id, 'user.promote', 'user', req.params.id);
  res.json({ user: r.rows[0] });
});

router.post('/users/:id/demote', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot demote yourself' });
  }
  const r = await query(
    `update chat_users set is_admin = false where id = $1
      returning id, username, is_admin`,
    [req.params.id]
  );
  if (!r.rowCount) return res.status(404).json({ error: 'User not found' });
  await audit(req.user.id, 'user.demote', 'user', req.params.id);
  res.json({ user: r.rows[0] });
});

// Toggle bot status (visual badge + identification)
router.post('/users/:id/make-bot', async (req, res) => {
  const r = await query(
    `update chat_users set is_bot = true where id = $1
      returning id, username, is_bot`,
    [req.params.id]
  );
  if (!r.rowCount) return res.status(404).json({ error: 'User not found' });
  await audit(req.user.id, 'user.make_bot', 'user', req.params.id);
  res.json({ user: r.rows[0] });
});

router.post('/users/:id/unmake-bot', async (req, res) => {
  const r = await query(
    `update chat_users set is_bot = false where id = $1
      returning id, username, is_bot`,
    [req.params.id]
  );
  if (!r.rowCount) return res.status(404).json({ error: 'User not found' });
  await audit(req.user.id, 'user.unmake_bot', 'user', req.params.id);
  res.json({ user: r.rows[0] });
});

router.get('/bots', async (_req, res) => {
  const r = await query(
    `select id, username, email, avatar_url, created_at
       from chat_users where is_bot = true
       order by created_at desc`
  );
  res.json({ bots: r.rows });
});

router.delete('/users/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  const r = await query(`delete from chat_users where id = $1 returning id`, [req.params.id]);
  if (!r.rowCount) return res.status(404).json({ error: 'User not found' });
  await audit(req.user.id, 'user.delete', 'user', req.params.id);
  res.json({ ok: true });
});

// ----- SERVERS -----
router.get('/servers', async (_req, res) => {
  const r = await query(`
    select s.*,
           (select count(*)::int from chat_server_members m where m.server_id = s.id) as member_count,
           (select count(*)::int from chat_channels c where c.server_id = s.id) as channel_count,
           u.username as owner_username
      from chat_servers s
      left join chat_users u on u.id = s.owner_id
      order by s.created_at desc
  `);
  res.json({ servers: r.rows });
});

router.delete('/servers/:id', async (req, res) => {
  const r = await query(`delete from chat_servers where id = $1 returning id, name`, [req.params.id]);
  if (!r.rowCount) return res.status(404).json({ error: 'Server not found' });
  await audit(req.user.id, 'server.delete', 'server', req.params.id, { name: r.rows[0].name });
  res.json({ ok: true });
});

// ----- SETTINGS (maintenance, etc.) -----
router.get('/settings', async (_req, res) => {
  const r = await query(`select key, value, updated_at from chat_system_settings order by key`);
  const settings = {};
  for (const row of r.rows) settings[row.key] = row.value;
  res.json({ settings, raw: r.rows });
});

router.put('/settings', async (req, res) => {
  const updates = req.body || {};
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Body must be an object of {key: value}' });
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const [key, value] of Object.entries(updates)) {
      await client.query(
        `insert into chat_system_settings (key, value, updated_at, updated_by)
              values ($1, $2::jsonb, now(), $3)
         on conflict (key) do update
            set value = excluded.value,
                updated_at = now(),
                updated_by = excluded.updated_by`,
        [key, JSON.stringify(value), req.user.id]
      );
    }
    await client.query('commit');
    invalidateMaintenance();
    invalidateBranding();
    await audit(req.user.id, 'settings.update', 'settings', null, updates);
    res.json({ ok: true, updated: Object.keys(updates) });
  } catch (e) {
    await client.query('rollback');
    console.error(e);
    res.status(500).json({ error: 'Failed to update settings' });
  } finally {
    client.release();
  }
});

// ----- AUDIT LOG -----
router.get('/audit-log', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const r = await query(
    `select a.*, u.username as actor_username
       from chat_admin_audit_log a
       left join chat_users u on u.id = a.actor_id
      order by a.created_at desc
      limit $1`,
    [limit]
  );
  res.json({ entries: r.rows });
});

module.exports = router;
