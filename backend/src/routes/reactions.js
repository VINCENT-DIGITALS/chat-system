const express = require('express');
const { query } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

async function canReact(messageId, userId) {
  const r = await query(
    `select c.id as channel_id
       from chat_messages m
       join chat_channels c on c.id = m.channel_id
       join chat_server_members sm on sm.server_id = c.server_id
      where m.id = $1 and sm.user_id = $2 limit 1`,
    [messageId, userId]
  );
  return r.rows[0] || null;
}

function normalizeEmoji(e) {
  if (typeof e !== 'string') return null;
  const trimmed = e.trim();
  if (!trimmed || trimmed.length > 32) return null;
  return trimmed;
}

// Toggle a reaction (add if missing, remove if present).
router.post('/:messageId', async (req, res) => {
  const emoji = normalizeEmoji(req.body?.emoji);
  if (!emoji) return res.status(400).json({ error: 'emoji is required' });

  const access = await canReact(req.params.messageId, req.user.id);
  if (!access) return res.status(403).json({ error: 'Not allowed' });

  const existing = await query(
    `select id from chat_message_reactions
      where message_id = $1 and user_id = $2 and emoji = $3 limit 1`,
    [req.params.messageId, req.user.id, emoji]
  );

  let action;
  if (existing.rowCount) {
    await query(`delete from chat_message_reactions where id = $1`, [existing.rows[0].id]);
    action = 'removed';
  } else {
    await query(
      `insert into chat_message_reactions (message_id, user_id, emoji) values ($1,$2,$3)`,
      [req.params.messageId, req.user.id, emoji]
    );
    action = 'added';
  }

  const summary = await query(
    `select emoji, count(*)::int as count,
            json_agg(user_id) as user_ids
       from chat_message_reactions
      where message_id = $1
      group by emoji
      order by min(created_at) asc`,
    [req.params.messageId]
  );

  const io = req.app.get('io');
  if (io) {
    io.to(`channel:${access.channel_id}`).emit('reaction:update', {
      message_id: req.params.messageId,
      reactions: summary.rows,
    });
  }

  res.json({ action, reactions: summary.rows });
});

// Get all reactions for a message (used by clients to bootstrap)
router.get('/:messageId', async (req, res) => {
  const access = await canReact(req.params.messageId, req.user.id);
  if (!access) return res.status(403).json({ error: 'Not allowed' });
  const r = await query(
    `select emoji, count(*)::int as count, json_agg(user_id) as user_ids
       from chat_message_reactions
      where message_id = $1
      group by emoji
      order by min(created_at) asc`,
    [req.params.messageId]
  );
  res.json({ message_id: req.params.messageId, reactions: r.rows });
});

module.exports = router;
