const express = require('express');
const { query } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

async function memberRole(serverId, userId) {
  const r = await query(
    `select role from chat_server_members where server_id = $1 and user_id = $2`,
    [serverId, userId]
  );
  return r.rows[0]?.role || null;
}

function canManage(role) {
  return role === 'owner' || role === 'admin';
}

// List webhooks for a server (admin only — exposes tokens)
router.get('/server/:serverId', authRequired, async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canManage(role)) return res.status(403).json({ error: 'Only admins can manage webhooks' });
  const r = await query(
    `select id, server_id, channel_id, name, avatar_url, token, created_by, created_at
       from chat_webhooks where server_id = $1
       order by created_at desc`,
    [req.params.serverId]
  );
  res.json({ webhooks: r.rows });
});

// Create webhook
router.post('/server/:serverId', authRequired, async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canManage(role)) return res.status(403).json({ error: 'Only admins can manage webhooks' });
  const { channel_id, name, avatar_url } = req.body || {};
  if (!channel_id || !name) return res.status(400).json({ error: 'channel_id and name required' });
  const r = await query(
    `insert into chat_webhooks (server_id, channel_id, name, avatar_url, created_by)
     values ($1,$2,$3,$4,$5) returning *`,
    [req.params.serverId, channel_id, name.slice(0, 80), avatar_url || null, req.user.id]
  );
  res.status(201).json({ webhook: r.rows[0] });
});

router.delete('/:webhookId', authRequired, async (req, res) => {
  const r0 = await query(`select server_id from chat_webhooks where id = $1`, [req.params.webhookId]);
  if (!r0.rowCount) return res.status(404).json({ error: 'Webhook not found' });
  const role = await memberRole(r0.rows[0].server_id, req.user.id);
  if (!canManage(role)) return res.status(403).json({ error: 'Only admins can manage webhooks' });
  await query(`delete from chat_webhooks where id = $1`, [req.params.webhookId]);
  res.json({ ok: true });
});

// Public webhook execution endpoint — no auth, token is the secret.
// Usage:  POST /api/webhooks/exec/:token  { content, username, avatar_url }
router.post('/exec/:token', express.json(), async (req, res) => {
  const wh = await query(`select * from chat_webhooks where token = $1 limit 1`, [req.params.token]);
  if (!wh.rowCount) return res.status(404).json({ error: 'Webhook not found' });
  const { content, username, avatar_url } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: 'content required' });
  const w = wh.rows[0];
  // Webhook posts a message as a synthetic system author. We store the actual
  // human-friendly name in the message content header — UI renders it specially.
  const r = await query(
    `insert into chat_messages (channel_id, user_id, content, type)
     values ($1, $2, $3, 'webhook') returning *`,
    [w.channel_id, w.created_by, content.trim().slice(0, 4000)]
  );
  const msg = r.rows[0];
  const synthetic = {
    ...msg,
    username:    username     || w.name,
    display_name:username     || w.name,
    avatar_url:  avatar_url   || w.avatar_url,
    is_bot: true,
    attachments: [],
    reactions: [],
    webhook: { id: w.id, name: w.name },
  };
  const io = req.app.get('io');
  if (io) io.to(`channel:${w.channel_id}`).emit('message:new', synthetic);
  res.status(201).json({ ok: true, message: synthetic });
});

module.exports = router;
