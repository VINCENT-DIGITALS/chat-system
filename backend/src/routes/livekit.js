const express = require('express');
const { query } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { createAccessToken } = require('../services/livekit');

const router = express.Router();

// Issue an access token for a voice/video channel
router.post('/token', authRequired, async (req, res) => {
  const { channel_id } = req.body || {};
  if (!channel_id) return res.status(400).json({ error: 'channel_id is required' });

  // Verify access & fetch channel
  const r = await query(
    `select c.*, m.user_id as is_member
       from chat_channels c
  left join chat_server_members m on m.server_id = c.server_id and m.user_id = $2
      where c.id = $1 limit 1`,
    [channel_id, req.user.id]
  );
  const ch = r.rows[0];
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  if (!ch.is_member) return res.status(403).json({ error: 'Not a member of this channel' });
  if (ch.type === 'text') return res.status(400).json({ error: 'Channel is not voice/video' });

  const userRow = await query(`select username from chat_users where id = $1`, [req.user.id]);
  const username = userRow.rows[0]?.username || 'user';

  const result = await createAccessToken({
    identity: req.user.id,
    name: username,
    room: `channel-${channel_id}`,
  });
  return res.json(result);
});

module.exports = router;
