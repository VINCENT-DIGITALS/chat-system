const express = require('express');
const { query, pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

async function isMember(convId, userId) {
  const r = await query(
    `select 1 from chat_dm_members where conversation_id = $1 and user_id = $2 limit 1`,
    [convId, userId]
  );
  return r.rowCount > 0;
}

// List my conversations with last message preview + unread count
router.get('/', async (req, res) => {
  const r = await query(
    `select c.id, c.is_group, c.name, c.icon_url, c.owner_id, c.last_message_at,
            (
              select json_agg(json_build_object(
                'id', u.id, 'username', u.username, 'display_name', u.display_name,
                'avatar_url', u.avatar_url, 'status', u.status
              ))
                from chat_dm_members mm
                join chat_users u on u.id = mm.user_id
               where mm.conversation_id = c.id and mm.user_id <> $1
            ) as others,
            (
              select row_to_json(lm) from (
                select dm.id, dm.user_id, dm.content, dm.created_at,
                       dm.deleted_at, dmu.username, dmu.display_name
                  from chat_dm_messages dm
                  join chat_users dmu on dmu.id = dm.user_id
                 where dm.conversation_id = c.id
                 order by dm.created_at desc
                 limit 1
              ) lm
            ) as last_message
       from chat_dm_conversations c
       join chat_dm_members m on m.conversation_id = c.id
      where m.user_id = $1
      order by c.last_message_at desc nulls last, c.created_at desc`,
    [req.user.id]
  );
  res.json({ conversations: r.rows });
});

// Open or create a 1:1 conversation with another user
router.post('/with/:userId', async (req, res) => {
  const otherId = req.params.userId;
  if (otherId === req.user.id) return res.status(400).json({ error: 'Cannot DM yourself' });
  const target = await query(`select id from chat_users where id = $1`, [otherId]);
  if (!target.rowCount) return res.status(404).json({ error: 'User not found' });

  // Find existing 1:1
  const existing = await query(
    `select c.id from chat_dm_conversations c
       join chat_dm_members a on a.conversation_id = c.id and a.user_id = $1
       join chat_dm_members b on b.conversation_id = c.id and b.user_id = $2
      where c.is_group = false
      limit 1`,
    [req.user.id, otherId]
  );
  if (existing.rowCount) return res.json({ conversation_id: existing.rows[0].id, created: false });

  const client = await pool.connect();
  try {
    await client.query('begin');
    const c = await client.query(
      `insert into chat_dm_conversations (is_group, owner_id) values (false, $1) returning id`,
      [req.user.id]
    );
    const id = c.rows[0].id;
    await client.query(
      `insert into chat_dm_members (conversation_id, user_id) values ($1,$2),($1,$3)`,
      [id, req.user.id, otherId]
    );
    await client.query('commit');
    res.status(201).json({ conversation_id: id, created: true });
  } catch (e) {
    await client.query('rollback');
    console.error(e);
    res.status(500).json({ error: 'Failed to open DM' });
  } finally {
    client.release();
  }
});

// Create a group DM with a list of user_ids (max 10 incl. self)
router.post('/group', async (req, res) => {
  const { name, user_ids } = req.body || {};
  const ids = Array.isArray(user_ids) ? Array.from(new Set(user_ids.filter(Boolean))) : [];
  if (ids.length < 1) return res.status(400).json({ error: 'At least one other user required' });
  if (ids.length > 9) return res.status(400).json({ error: 'Group DMs support up to 10 members' });
  const all = ids.includes(req.user.id) ? ids : [...ids, req.user.id];

  const client = await pool.connect();
  try {
    await client.query('begin');
    const c = await client.query(
      `insert into chat_dm_conversations (is_group, name, owner_id) values (true, $1, $2) returning *`,
      [name?.trim() || null, req.user.id]
    );
    const conv = c.rows[0];
    for (const uid of all) {
      await client.query(
        `insert into chat_dm_members (conversation_id, user_id) values ($1,$2)
         on conflict do nothing`,
        [conv.id, uid]
      );
    }
    await client.query('commit');
    res.status(201).json({ conversation: conv });
  } catch (e) {
    await client.query('rollback');
    console.error(e);
    res.status(500).json({ error: 'Failed to create group DM' });
  } finally {
    client.release();
  }
});

// Messages in a conversation
router.get('/:convId/messages', async (req, res) => {
  if (!(await isMember(req.params.convId, req.user.id))) {
    return res.status(403).json({ error: 'Not a member of this conversation' });
  }
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const r = await query(
    `select m.*, u.username, u.display_name, u.avatar_url, u.is_bot,
            coalesce(
              (select json_agg(json_build_object(
                'id', a.id, 'file_url', a.file_url, 'file_name', a.file_name,
                'mime_type', a.mime_type, 'size_bytes', a.size_bytes))
                from chat_dm_attachments a where a.message_id = m.id),
              '[]'::json
            ) as attachments,
            coalesce(
              (select json_agg(json_build_object(
                 'emoji', r.emoji, 'count', r.cnt, 'user_ids', r.user_ids))
                from (
                  select emoji, count(*)::int as cnt, json_agg(user_id) as user_ids,
                         min(created_at) as first_at
                    from chat_dm_reactions
                   where message_id = m.id
                   group by emoji
                ) r),
              '[]'::json
            ) as reactions
       from chat_dm_messages m
       join chat_users u on u.id = m.user_id
      where m.conversation_id = $1
      order by m.created_at desc
      limit $2`,
    [req.params.convId, limit]
  );
  res.json({ messages: r.rows.reverse() });
});

// Send a DM message via REST (socket also supports this)
router.post('/:convId/messages', async (req, res) => {
  const { content, parent_message_id, attachments } = req.body || {};
  if ((!content || !content.trim()) && (!attachments || attachments.length === 0)) {
    return res.status(400).json({ error: 'content or attachments required' });
  }
  if (!(await isMember(req.params.convId, req.user.id))) {
    return res.status(403).json({ error: 'Not a member' });
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const r = await client.query(
      `insert into chat_dm_messages (conversation_id, user_id, content, parent_message_id)
       values ($1,$2,$3,$4) returning *`,
      [req.params.convId, req.user.id, (content || '').trim(), parent_message_id || null]
    );
    const msg = r.rows[0];
    if (Array.isArray(attachments)) {
      for (const a of attachments) {
        if (!a?.url) continue;
        await client.query(
          `insert into chat_dm_attachments (message_id, file_url, file_name, mime_type, size_bytes)
           values ($1,$2,$3,$4,$5)`,
          [msg.id, a.url, a.name || null, a.mime_type || null, a.size_bytes || null]
        );
      }
    }
    await client.query(
      `update chat_dm_conversations set last_message_at = now() where id = $1`,
      [req.params.convId]
    );
    const u = await client.query(
      `select username, display_name, avatar_url, is_bot from chat_users where id = $1`,
      [req.user.id]
    );
    await client.query('commit');
    const message = { ...msg, ...u.rows[0], attachments: [], reactions: [] };
    const io = req.app.get('io');
    if (io) io.to(`dm:${req.params.convId}`).emit('dm:message', message);
    res.status(201).json({ message });
  } catch (e) {
    await client.query('rollback');
    console.error(e);
    res.status(500).json({ error: 'Failed to send DM' });
  } finally {
    client.release();
  }
});

// Leave / close a conversation
router.delete('/:convId/leave', async (req, res) => {
  if (!(await isMember(req.params.convId, req.user.id))) {
    return res.status(404).json({ error: 'Not a member' });
  }
  await query(
    `delete from chat_dm_members where conversation_id = $1 and user_id = $2`,
    [req.params.convId, req.user.id]
  );
  // Garbage-collect empty conversations
  await query(
    `delete from chat_dm_conversations c
      where c.id = $1
        and not exists (select 1 from chat_dm_members m where m.conversation_id = c.id)`,
    [req.params.convId]
  );
  res.json({ ok: true });
});

module.exports = router;
