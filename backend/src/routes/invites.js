const express = require('express');
const crypto = require('crypto');
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

function randomCode(len = 8) {
  return crypto.randomBytes(len).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, len);
}

// List invites for a server
router.get('/server/:serverId', async (req, res) => {
  if (!(await memberRole(req.params.serverId, req.user.id))) {
    return res.status(403).json({ error: 'Not a member' });
  }
  const r = await query(
    `select i.*, u.username as creator_username
       from chat_invites i
       left join chat_users u on u.id = i.created_by
      where i.server_id = $1
      order by i.created_at desc`,
    [req.params.serverId]
  );
  res.json({ invites: r.rows });
});

// Create invite — admin/owner only; allows custom_code, expiry, max_uses, temp
router.post('/server/:serverId', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!['owner', 'admin'].includes(role)) {
    return res.status(403).json({ error: 'Only admins can create invites' });
  }
  let { custom_code, max_uses, expires_in_seconds, is_temporary, channel_id } = req.body || {};
  let code = (custom_code || '').trim().replace(/[^a-zA-Z0-9-]/g, '').slice(0, 32);
  if (!code) code = randomCode(10);
  if (code.length < 3) return res.status(400).json({ error: 'Code must be 3+ chars' });

  const expires_at = expires_in_seconds
    ? new Date(Date.now() + Math.min(expires_in_seconds, 60 * 60 * 24 * 30) * 1000).toISOString()
    : null;
  try {
    const r = await query(
      `insert into chat_invites (server_id, channel_id, code, created_by, max_uses, expires_at, is_temporary)
       values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [req.params.serverId, channel_id || null, code, req.user.id,
       max_uses ?? null, expires_at, !!is_temporary]
    );
    res.status(201).json({ invite: r.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Code already taken' });
    console.error(e);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// Look up an invite without joining (for preview pages)
router.get('/code/:code', async (req, res) => {
  const r = await query(
    `select i.*, s.name as server_name, s.icon_url as server_icon, s.banner_url as server_banner,
            (select count(*)::int from chat_server_members where server_id = i.server_id) as member_count
       from chat_invites i
       join chat_servers s on s.id = i.server_id
      where i.code = $1
      limit 1`,
    [req.params.code]
  );
  if (!r.rowCount) return res.status(404).json({ error: 'Invite not found' });
  const inv = r.rows[0];
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Invite expired' });
  }
  if (inv.max_uses != null && inv.uses >= inv.max_uses) {
    return res.status(410).json({ error: 'Invite has reached its use limit' });
  }
  res.json({ invite: inv });
});

// Use an invite to join
router.post('/use/:code', async (req, res) => {
  const r = await query(`select * from chat_invites where code = $1 limit 1`, [req.params.code]);
  const inv = r.rows[0];
  if (!inv) return res.status(404).json({ error: 'Invite not found' });
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Invite expired' });
  }
  if (inv.max_uses != null && inv.uses >= inv.max_uses) {
    return res.status(410).json({ error: 'Invite has reached its use limit' });
  }
  await query(
    `insert into chat_server_members (server_id, user_id) values ($1,$2)
     on conflict do nothing`,
    [inv.server_id, req.user.id]
  );
  await query(`update chat_invites set uses = uses + 1 where id = $1`, [inv.id]);
  const s = await query(`select * from chat_servers where id = $1`, [inv.server_id]);
  res.json({ server: s.rows[0] });
});

// Delete invite
router.delete('/:inviteId', async (req, res) => {
  const r0 = await query(`select server_id from chat_invites where id = $1`, [req.params.inviteId]);
  if (!r0.rowCount) return res.status(404).json({ error: 'Invite not found' });
  const role = await memberRole(r0.rows[0].server_id, req.user.id);
  if (!['owner', 'admin'].includes(role)) {
    return res.status(403).json({ error: 'Only admins can delete invites' });
  }
  await query(`delete from chat_invites where id = $1`, [req.params.inviteId]);
  res.json({ ok: true });
});

module.exports = router;
