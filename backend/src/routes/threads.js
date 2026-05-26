const express = require('express');
const { query, pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

async function canAccessChannel(channelId, userId) {
  const r = await query(
    `select 1 from chat_channels c
        join chat_server_members m on m.server_id = c.server_id
      where c.id = $1 and m.user_id = $2 limit 1`,
    [channelId, userId]
  );
  return r.rowCount > 0;
}

async function canAccessThread(threadId, userId) {
  const r = await query(
    `select t.channel_id from chat_threads t
       join chat_channels c on c.id = t.channel_id
       join chat_server_members m on m.server_id = c.server_id
      where t.id = $1 and m.user_id = $2 limit 1`,
    [threadId, userId]
  );
  return r.rows[0];
}

// List threads in a channel (with reply counts)
router.get('/channel/:channelId', async (req, res) => {
  if (!(await canAccessChannel(req.params.channelId, req.user.id))) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  const r = await query(
    `select t.*,
            (select count(*)::int from chat_messages m where m.thread_id = t.id) as message_count
       from chat_threads t
      where t.channel_id = $1
      order by t.created_at desc`,
    [req.params.channelId]
  );
  res.json({ threads: r.rows });
});

// Create a thread (optionally anchored to an existing message)
router.post('/channel/:channelId', async (req, res) => {
  const { name, root_message_id, first_message } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

  if (!(await canAccessChannel(req.params.channelId, req.user.id))) {
    return res.status(403).json({ error: 'Not allowed' });
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const t = await client.query(
      `insert into chat_threads (channel_id, root_message_id, name, created_by)
       values ($1,$2,$3,$4) returning *`,
      [req.params.channelId, root_message_id || null, name.trim().slice(0, 100), req.user.id]
    );
    let firstMsg = null;
    if (first_message && first_message.trim()) {
      const m = await client.query(
        `insert into chat_messages (channel_id, user_id, content, thread_id)
         values ($1,$2,$3,$4) returning *`,
        [req.params.channelId, req.user.id, first_message.trim(), t.rows[0].id]
      );
      const u = await client.query(
        `select username, display_name, avatar_url, is_bot from chat_users where id = $1`,
        [req.user.id]
      );
      firstMsg = { ...m.rows[0], ...u.rows[0], attachments: [] };
    }
    await client.query('commit');

    const thread = { ...t.rows[0], message_count: firstMsg ? 1 : 0 };
    const io = req.app.get('io');
    if (io) {
      io.to(`channel:${req.params.channelId}`).emit('thread:new', { thread });
      if (firstMsg) io.to(`thread:${t.rows[0].id}`).emit('thread:message', { message: firstMsg });
    }
    res.status(201).json({ thread, first_message: firstMsg });
  } catch (e) {
    await client.query('rollback');
    console.error(e);
    res.status(500).json({ error: 'Failed to create thread' });
  } finally {
    client.release();
  }
});

// List messages in a thread
router.get('/:threadId/messages', async (req, res) => {
  const access = await canAccessThread(req.params.threadId, req.user.id);
  if (!access) return res.status(403).json({ error: 'Not allowed' });
  const r = await query(
    `select m.*, u.username, u.display_name, u.avatar_url, u.is_bot,
            coalesce(
              (select json_agg(json_build_object(
                 'id', a.id, 'file_url', a.file_url, 'file_name', a.file_name,
                 'mime_type', a.mime_type, 'size_bytes', a.size_bytes))
                 from chat_attachments a where a.message_id = m.id),
              '[]'::json
            ) as attachments
       from chat_messages m
       join chat_users u on u.id = m.user_id
      where m.thread_id = $1
      order by m.created_at asc
      limit 200`,
    [req.params.threadId]
  );
  res.json({ messages: r.rows });
});

// Send a message into a thread
router.post('/:threadId/messages', async (req, res) => {
  const { content } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: 'content required' });
  const access = await canAccessThread(req.params.threadId, req.user.id);
  if (!access) return res.status(403).json({ error: 'Not allowed' });

  const ins = await query(
    `insert into chat_messages (channel_id, user_id, content, thread_id)
     values ($1,$2,$3,$4) returning *`,
    [access.channel_id, req.user.id, content.trim(), req.params.threadId]
  );
  const u = await query(
    `select username, display_name, avatar_url, is_bot from chat_users where id = $1`,
    [req.user.id]
  );
  const message = { ...ins.rows[0], ...u.rows[0], attachments: [] };
  const io = req.app.get('io');
  if (io) io.to(`thread:${req.params.threadId}`).emit('thread:message', { message });
  res.status(201).json({ message });
});

module.exports = router;
