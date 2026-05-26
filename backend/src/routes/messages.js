const express = require('express');
const multer = require('multer');
const { query, pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { uploadAttachment } = require('../services/storage');
const { extractMentions } = require('../services/mentions');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

async function canAccessChannel(channelId, userId) {
  const r = await query(
    `select c.id, c.server_id
       from chat_channels c
       join chat_server_members m on m.server_id = c.server_id
      where c.id = $1 and m.user_id = $2 limit 1`,
    [channelId, userId]
  );
  return r.rows[0] || null;
}

async function memberRole(serverId, userId) {
  const r = await query(
    `select role from chat_server_members where server_id = $1 and user_id = $2`,
    [serverId, userId]
  );
  return r.rows[0]?.role || null;
}

// Build the standard message row with reactions, attachments, poll, parent
const MESSAGE_SELECT = `
  select m.*, u.username, u.display_name, u.avatar_url, u.is_bot,
         coalesce(
           (select json_agg(json_build_object(
              'id', a.id, 'file_url', a.file_url, 'file_name', a.file_name,
              'mime_type', a.mime_type, 'size_bytes', a.size_bytes
            ) order by a.created_at)
              from chat_attachments a where a.message_id = m.id),
           '[]'::json
         ) as attachments,
         (select row_to_json(p) from chat_polls p where p.message_id = m.id) as poll,
         coalesce(
           (select json_agg(json_build_object('option_idx', v.option_idx, 'user_id', v.user_id))
              from chat_poll_votes v
              join chat_polls p on p.id = v.poll_id
             where p.message_id = m.id),
           '[]'::json
         ) as poll_votes,
         coalesce(
           (select json_agg(json_build_object(
              'emoji', r.emoji, 'count', r.cnt, 'user_ids', r.user_ids
            ))
              from (
                select emoji, count(*)::int as cnt, json_agg(user_id) as user_ids,
                       min(created_at) as first_at
                  from chat_message_reactions
                 where message_id = m.id
                 group by emoji
              ) r),
           '[]'::json
         ) as reactions,
         (select row_to_json(pm) from (
            select pm.id, pm.user_id, pm.content, pm.deleted_at,
                   pu.username, pu.display_name, pu.avatar_url
              from chat_messages pm
              join chat_users pu on pu.id = pm.user_id
             where pm.id = m.parent_message_id
          ) pm) as parent
    from chat_messages m
    join chat_users u on u.id = m.user_id
`;

// Load messages for a text channel
router.get('/channel/:channelId', authRequired, async (req, res) => {
  const access = await canAccessChannel(req.params.channelId, req.user.id);
  if (!access) return res.status(403).json({ error: 'Not allowed' });
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const r = await query(
    `${MESSAGE_SELECT}
      where m.channel_id = $1 and m.thread_id is null
      order by m.created_at desc
      limit $2`,
    [req.params.channelId, limit]
  );
  return res.json({ messages: r.rows.reverse() });
});

// Pinned messages
router.get('/channel/:channelId/pinned', authRequired, async (req, res) => {
  const access = await canAccessChannel(req.params.channelId, req.user.id);
  if (!access) return res.status(403).json({ error: 'Not allowed' });
  const r = await query(
    `${MESSAGE_SELECT}
      where m.channel_id = $1 and m.pinned = true
      order by m.pinned_at desc nulls last
      limit 50`,
    [req.params.channelId]
  );
  res.json({ messages: r.rows });
});

// Send message via REST (Socket.IO is primary; this is the fallback).
router.post('/channel/:channelId', authRequired, async (req, res) => {
  const { content, attachments, parent_message_id } = req.body || {};
  if ((!content || !content.trim()) && (!attachments || attachments.length === 0)) {
    return res.status(400).json({ error: 'content or attachments required' });
  }
  const access = await canAccessChannel(req.params.channelId, req.user.id);
  if (!access) return res.status(403).json({ error: 'Not allowed' });
  const client = await pool.connect();
  try {
    await client.query('begin');
    const r = await client.query(
      `insert into chat_messages (channel_id, user_id, content, parent_message_id)
       values ($1,$2,$3,$4) returning id`,
      [req.params.channelId, req.user.id, (content || '').trim(), parent_message_id || null]
    );
    const msgId = r.rows[0].id;
    if (Array.isArray(attachments)) {
      for (const a of attachments) {
        if (!a?.url) continue;
        await client.query(
          `insert into chat_attachments (message_id, file_url, file_name, mime_type, size_bytes)
           values ($1,$2,$3,$4,$5)`,
          [msgId, a.url, a.name || null, a.mime_type || null, a.size_bytes || null]
        );
      }
    }
    await client.query('commit');
    try {
      await extractMentions({
        messageId: msgId,
        channelId: req.params.channelId,
        content: (content || '').trim(),
        authorId: req.user.id,
      });
    } catch (_) { /* non-fatal */ }
    const m = await query(`${MESSAGE_SELECT} where m.id = $1`, [msgId]);
    const message = m.rows[0];
    const io = req.app.get('io');
    if (io) io.to(`channel:${req.params.channelId}`).emit('message:new', message);
    return res.status(201).json({ message });
  } catch (e) {
    await client.query('rollback');
    console.error(e);
    return res.status(500).json({ error: 'Failed to send' });
  } finally {
    client.release();
  }
});

// Edit a message (author only, within 7 days; not allowed for system messages)
router.patch('/:messageId', authRequired, async (req, res) => {
  const { content } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: 'content required' });
  const m = await query(`select * from chat_messages where id = $1`, [req.params.messageId]);
  const row = m.rows[0];
  if (!row) return res.status(404).json({ error: 'Message not found' });
  if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Only the author can edit' });
  if (row.type && row.type.startsWith('system_')) return res.status(400).json({ error: 'System messages cannot be edited' });
  if (row.deleted_at) return res.status(400).json({ error: 'Cannot edit a deleted message' });

  await query(
    `update chat_messages set content = $1, edited_at = now() where id = $2`,
    [content.trim(), req.params.messageId]
  );
  const upd = await query(`${MESSAGE_SELECT} where m.id = $1`, [req.params.messageId]);
  const updated = upd.rows[0];
  const io = req.app.get('io');
  if (io) io.to(`channel:${row.channel_id}`).emit('message:edit', updated);
  res.json({ message: updated });
});

// Delete a message (author OR server admin/owner OR site admin)
router.delete('/:messageId', authRequired, async (req, res) => {
  const m = await query(
    `select m.*, c.server_id from chat_messages m
       join chat_channels c on c.id = m.channel_id
      where m.id = $1`,
    [req.params.messageId]
  );
  const row = m.rows[0];
  if (!row) return res.status(404).json({ error: 'Message not found' });

  const isAuthor = row.user_id === req.user.id;
  let isMod = !!req.user.is_admin;
  if (!isAuthor && !isMod) {
    const role = await memberRole(row.server_id, req.user.id);
    isMod = role === 'owner' || role === 'admin';
  }
  if (!isAuthor && !isMod) return res.status(403).json({ error: 'Not allowed' });

  await query(
    `update chat_messages
        set deleted_at = now(),
            content = '',
            edited_at = coalesce(edited_at, now())
      where id = $1`,
    [req.params.messageId]
  );
  // Detach attachments display by clearing content; attachments table rows stay
  const io = req.app.get('io');
  if (io) {
    io.to(`channel:${row.channel_id}`).emit('message:delete', {
      message_id: req.params.messageId,
      channel_id: row.channel_id,
    });
  }
  res.json({ ok: true });
});

// Pin / unpin (server admin/owner only)
router.post('/:messageId/pin', authRequired, async (req, res) => {
  const m = await query(
    `select m.*, c.server_id from chat_messages m
       join chat_channels c on c.id = m.channel_id
      where m.id = $1`,
    [req.params.messageId]
  );
  const row = m.rows[0];
  if (!row) return res.status(404).json({ error: 'Message not found' });
  const role = await memberRole(row.server_id, req.user.id);
  if (!['owner', 'admin'].includes(role) && !req.user.is_admin) {
    return res.status(403).json({ error: 'Only admins can pin messages' });
  }
  await query(
    `update chat_messages set pinned = true, pinned_at = now(), pinned_by = $2
      where id = $1`,
    [req.params.messageId, req.user.id]
  );
  const io = req.app.get('io');
  if (io) io.to(`channel:${row.channel_id}`).emit('message:pin', {
    message_id: req.params.messageId,
    channel_id: row.channel_id,
    pinned: true,
  });
  res.json({ ok: true, pinned: true });
});

router.delete('/:messageId/pin', authRequired, async (req, res) => {
  const m = await query(
    `select m.*, c.server_id from chat_messages m
       join chat_channels c on c.id = m.channel_id
      where m.id = $1`,
    [req.params.messageId]
  );
  const row = m.rows[0];
  if (!row) return res.status(404).json({ error: 'Message not found' });
  const role = await memberRole(row.server_id, req.user.id);
  if (!['owner', 'admin'].includes(role) && !req.user.is_admin) {
    return res.status(403).json({ error: 'Only admins can unpin messages' });
  }
  await query(
    `update chat_messages set pinned = false, pinned_at = null, pinned_by = null
      where id = $1`,
    [req.params.messageId]
  );
  const io = req.app.get('io');
  if (io) io.to(`channel:${row.channel_id}`).emit('message:pin', {
    message_id: req.params.messageId,
    channel_id: row.channel_id,
    pinned: false,
  });
  res.json({ ok: true, pinned: false });
});

// Forward a message into another channel
router.post('/:messageId/forward', authRequired, async (req, res) => {
  const { channel_id } = req.body || {};
  if (!channel_id) return res.status(400).json({ error: 'channel_id required' });
  const src = await query(`select * from chat_messages where id = $1`, [req.params.messageId]);
  const srcRow = src.rows[0];
  if (!srcRow) return res.status(404).json({ error: 'Source message not found' });
  if (!(await canAccessChannel(channel_id, req.user.id))) {
    return res.status(403).json({ error: 'Not allowed to post in that channel' });
  }
  const ins = await query(
    `insert into chat_messages (channel_id, user_id, content, forwarded_from)
     values ($1,$2,$3,$4) returning id`,
    [channel_id, req.user.id, srcRow.content || '', srcRow.id]
  );
  const m = await query(`${MESSAGE_SELECT} where m.id = $1`, [ins.rows[0].id]);
  const message = m.rows[0];
  const io = req.app.get('io');
  if (io) io.to(`channel:${channel_id}`).emit('message:new', message);
  res.status(201).json({ message });
});

// Upload an attachment file. Returns a { url, name, mime_type, size_bytes }
// that the client then submits when sending the message.
router.post('/channel/:channelId/upload', authRequired, upload.single('file'), async (req, res) => {
  try {
    const access = await canAccessChannel(req.params.channelId, req.user.id);
    if (!access) return res.status(403).json({ error: 'Not allowed' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name "file")' });
    const result = await uploadAttachment({
      userId: req.user.id,
      channelId: req.params.channelId,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
    });
    res.json({ attachment: result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Upload failed' });
  }
});

module.exports = router;
