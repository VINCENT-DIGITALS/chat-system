const express = require('express');
const { query } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// Recent @mentions of me (across all servers I'm in)
router.get('/mentions', async (req, res) => {
  const r = await query(
    `select mn.*, m.content, m.created_at as message_created_at, m.channel_id,
            ch.name as channel_name, s.id as server_id, s.name as server_name,
            u.username, u.display_name, u.avatar_url
       from chat_mentions mn
       join chat_messages m on m.id = mn.message_id
       join chat_channels ch on ch.id = m.channel_id
       join chat_servers s on s.id = ch.server_id
       join chat_users u on u.id = m.user_id
      where mn.mentioned_user = $1
        and mn.created_at > now() - interval '7 days'
      order by mn.created_at desc
      limit 50`,
    [req.user.id]
  );
  res.json({ mentions: r.rows });
});

router.post('/mentions/read', async (req, res) => {
  await query(`update chat_mentions set read = true where mentioned_user = $1`, [req.user.id]);
  res.json({ ok: true });
});

// "For You" — recent server joins, system msgs about me (lightweight placeholder)
router.get('/for-you', async (req, res) => {
  const r = await query(
    `select sm.server_id, s.name as server_name, sm.joined_at
       from chat_server_members sm
       join chat_servers s on s.id = sm.server_id
      where sm.user_id = $1
        and sm.joined_at > now() - interval '30 days'
      order by sm.joined_at desc
      limit 10`,
    [req.user.id]
  );
  res.json({ items: r.rows });
});

// "Unreads" — last 5 messages per channel I'm in, from the last 24h, not authored by me
router.get('/unreads', async (req, res) => {
  const r = await query(
    `select m.id, m.content, m.created_at, m.channel_id, ch.name as channel_name,
            s.id as server_id, s.name as server_name,
            u.username, u.display_name, u.avatar_url
       from chat_messages m
       join chat_channels ch on ch.id = m.channel_id
       join chat_servers s on s.id = ch.server_id
       join chat_server_members sm on sm.server_id = s.id and sm.user_id = $1
       join chat_users u on u.id = m.user_id
      where m.user_id <> $1
        and m.type = 'message'
        and m.thread_id is null
        and m.created_at > now() - interval '24 hours'
      order by m.created_at desc
      limit 40`,
    [req.user.id]
  );
  res.json({ messages: r.rows });
});

module.exports = router;
