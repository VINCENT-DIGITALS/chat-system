const express = require('express');
const { query, pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

async function canAccessPoll(pollId, userId) {
  const r = await query(
    `select c.id as channel_id
       from chat_polls p
       join chat_messages m on m.id = p.message_id
       join chat_channels c on c.id = m.channel_id
       join chat_server_members sm on sm.server_id = c.server_id
      where p.id = $1 and sm.user_id = $2 limit 1`,
    [pollId, userId]
  );
  return r.rows[0];
}

// Create a poll (as a message of type 'poll')
router.post('/channel/:channelId', async (req, res) => {
  const { question, options, multi_select } = req.body || {};
  if (!question || !question.trim()) return res.status(400).json({ error: 'question is required' });
  if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
    return res.status(400).json({ error: 'Must have 2-10 options' });
  }

  const access = await query(
    `select 1 from chat_channels c
        join chat_server_members m on m.server_id = c.server_id
      where c.id = $1 and m.user_id = $2 limit 1`,
    [req.params.channelId, req.user.id]
  );
  if (!access.rowCount) return res.status(403).json({ error: 'Not allowed' });

  const client = await pool.connect();
  try {
    await client.query('begin');
    const msg = await client.query(
      `insert into chat_messages (channel_id, user_id, content, type)
       values ($1,$2,$3,'poll') returning *`,
      [req.params.channelId, req.user.id, question.trim()]
    );
    const opts = options.map((t, idx) => ({ idx, text: String(t).slice(0, 80) })).filter((o) => o.text);
    const poll = await client.query(
      `insert into chat_polls (message_id, question, options, multi_select)
       values ($1,$2,$3::jsonb,$4) returning *`,
      [msg.rows[0].id, question.trim(), JSON.stringify(opts), !!multi_select]
    );
    const u = await client.query(
      `select username, display_name, avatar_url, is_bot from chat_users where id = $1`,
      [req.user.id]
    );
    await client.query('commit');

    const message = {
      ...msg.rows[0],
      ...u.rows[0],
      poll: { ...poll.rows[0], votes: [] },
      attachments: [],
    };
    const io = req.app.get('io');
    if (io) io.to(`channel:${req.params.channelId}`).emit('message:new', message);
    res.status(201).json({ message });
  } catch (e) {
    await client.query('rollback');
    console.error(e);
    res.status(500).json({ error: 'Failed to create poll' });
  } finally {
    client.release();
  }
});

// Vote
router.post('/:pollId/vote', async (req, res) => {
  const { option_idx } = req.body || {};
  if (typeof option_idx !== 'number') return res.status(400).json({ error: 'option_idx required' });

  const access = await canAccessPoll(req.params.pollId, req.user.id);
  if (!access) return res.status(403).json({ error: 'Not allowed' });

  const pollRow = await query(`select * from chat_polls where id = $1`, [req.params.pollId]);
  const poll = pollRow.rows[0];
  if (!poll) return res.status(404).json({ error: 'Poll not found' });

  // If not multi_select, delete existing votes for this user
  if (!poll.multi_select) {
    await query(
      `delete from chat_poll_votes where poll_id = $1 and user_id = $2`,
      [req.params.pollId, req.user.id]
    );
  }
  try {
    await query(
      `insert into chat_poll_votes (poll_id, user_id, option_idx) values ($1,$2,$3)
       on conflict do nothing`,
      [req.params.pollId, req.user.id, option_idx]
    );
  } catch (e) {
    /* duplicate vote - ignore */
  }

  const votes = await query(
    `select option_idx, user_id from chat_poll_votes where poll_id = $1`,
    [req.params.pollId]
  );
  const io = req.app.get('io');
  if (io) io.to(`channel:${access.channel_id}`).emit('poll:update', {
    poll_id: req.params.pollId,
    votes: votes.rows,
  });
  res.json({ poll_id: req.params.pollId, votes: votes.rows });
});

// Remove my vote
router.delete('/:pollId/vote/:idx', async (req, res) => {
  const access = await canAccessPoll(req.params.pollId, req.user.id);
  if (!access) return res.status(403).json({ error: 'Not allowed' });

  await query(
    `delete from chat_poll_votes where poll_id = $1 and user_id = $2 and option_idx = $3`,
    [req.params.pollId, req.user.id, parseInt(req.params.idx, 10)]
  );
  const votes = await query(
    `select option_idx, user_id from chat_poll_votes where poll_id = $1`,
    [req.params.pollId]
  );
  const io = req.app.get('io');
  if (io) io.to(`channel:${access.channel_id}`).emit('poll:update', {
    poll_id: req.params.pollId,
    votes: votes.rows,
  });
  res.json({ poll_id: req.params.pollId, votes: votes.rows });
});

module.exports = router;
