const express = require('express');
const { query } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

async function memberRole(serverId, userId) {
  const r = await query(
    `select role from chat_server_members where server_id = $1 and user_id = $2`,
    [serverId, userId]
  );
  return r.rows[0]?.role || null;
}

// List events in a server
router.get('/server/:serverId', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Not a member' });
  const r = await query(
    `select e.*, u.username as creator_username, u.display_name as creator_display,
            (select count(*)::int from chat_event_interested i where i.event_id = e.id) as interested_count,
            exists(select 1 from chat_event_interested i where i.event_id = e.id and i.user_id = $2) as is_interested
       from chat_events e
       left join chat_users u on u.id = e.created_by
      where e.server_id = $1 and e.starts_at > now() - interval '1 day'
      order by e.starts_at asc`,
    [req.params.serverId, req.user.id]
  );
  res.json({ events: r.rows });
});

// Create event (owner/admin only)
router.post('/server/:serverId', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Not a member' });
  if (!['owner', 'admin'].includes(role)) {
    return res.status(403).json({ error: 'Only admins can create events' });
  }
  const {
    topic, description, starts_at, ends_at,
    channel_id, external_location, frequency, cover_url,
  } = req.body || {};
  if (!topic || !topic.trim()) return res.status(400).json({ error: 'topic required' });
  if (!starts_at) return res.status(400).json({ error: 'starts_at required' });
  const r = await query(
    `insert into chat_events
       (server_id, channel_id, external_location, created_by, topic, description, cover_url,
        starts_at, ends_at, frequency)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     returning *`,
    [
      req.params.serverId,
      channel_id || null,
      external_location || null,
      req.user.id,
      topic.trim().slice(0, 100),
      description ? description.trim().slice(0, 1000) : null,
      cover_url || null,
      starts_at,
      ends_at || null,
      frequency || 'does_not_repeat',
    ]
  );
  res.status(201).json({ event: r.rows[0] });
});

// RSVP interested
router.post('/:id/interested', async (req, res) => {
  await query(
    `insert into chat_event_interested (event_id, user_id) values ($1,$2)
     on conflict do nothing`,
    [req.params.id, req.user.id]
  );
  res.json({ ok: true });
});
router.delete('/:id/interested', async (req, res) => {
  await query(
    `delete from chat_event_interested where event_id = $1 and user_id = $2`,
    [req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

// Delete event (owner/admin only)
router.delete('/:id', async (req, res) => {
  const evt = await query(`select server_id from chat_events where id = $1`, [req.params.id]);
  if (!evt.rowCount) return res.status(404).json({ error: 'Event not found' });
  const role = await memberRole(evt.rows[0].server_id, req.user.id);
  if (!['owner', 'admin'].includes(role)) return res.status(403).json({ error: 'Not allowed' });
  await query(`delete from chat_events where id = $1`, [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
