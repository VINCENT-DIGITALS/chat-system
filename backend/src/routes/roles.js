const express = require('express');
const { query } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// Permission bits — original mapping (not Discord's exact bit positions).
// Stored as a bigint mask on chat_roles.permissions.
const PERMS = {
  VIEW_CHANNELS:    1n << 0n,
  SEND_MESSAGES:    1n << 1n,
  MANAGE_MESSAGES:  1n << 2n,
  MANAGE_CHANNELS:  1n << 3n,
  KICK_MEMBERS:     1n << 4n,
  BAN_MEMBERS:      1n << 5n,
  TIMEOUT_MEMBERS:  1n << 6n,
  MANAGE_ROLES:     1n << 7n,
  MANAGE_SERVER:    1n << 8n,
  MENTION_EVERYONE: 1n << 9n,
  EMBED_LINKS:      1n << 10n,
  ATTACH_FILES:     1n << 11n,
  ADD_REACTIONS:    1n << 12n,
  CREATE_INVITES:   1n << 13n,
  MANAGE_WEBHOOKS:  1n << 14n,
  ADMINISTRATOR:    1n << 31n,
};

async function memberRole(serverId, userId) {
  const r = await query(
    `select role from chat_server_members where server_id = $1 and user_id = $2`,
    [serverId, userId]
  );
  return r.rows[0]?.role || null;
}

function canManageRoles(role) {
  return role === 'owner' || role === 'admin';
}

// List roles for a server
router.get('/server/:serverId', async (req, res) => {
  if (!(await memberRole(req.params.serverId, req.user.id))) {
    return res.status(403).json({ error: 'Not a member' });
  }
  const r = await query(
    `select id, server_id, name, color, position, permissions::text as permissions,
            hoist, mentionable, managed, created_at
       from chat_roles where server_id = $1
       order by position desc, created_at asc`,
    [req.params.serverId]
  );
  res.json({ roles: r.rows });
});

// Create role
router.post('/server/:serverId', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canManageRoles(role)) return res.status(403).json({ error: 'Only admins can manage roles' });
  const { name, color, permissions, hoist, mentionable } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });

  const r = await query(
    `insert into chat_roles (server_id, name, color, permissions, hoist, mentionable)
     values ($1,$2,$3,$4,$5,$6) returning id, server_id, name, color, position,
            permissions::text as permissions, hoist, mentionable, managed, created_at`,
    [req.params.serverId, name.trim().slice(0, 60), color || null, permissions || 0,
     !!hoist, !!mentionable]
  );
  res.status(201).json({ role: r.rows[0] });
});

// Update role
router.patch('/:roleId', async (req, res) => {
  const r0 = await query(`select server_id from chat_roles where id = $1`, [req.params.roleId]);
  if (!r0.rowCount) return res.status(404).json({ error: 'Role not found' });
  const serverRole = await memberRole(r0.rows[0].server_id, req.user.id);
  if (!canManageRoles(serverRole)) return res.status(403).json({ error: 'Only admins can manage roles' });

  const { name, color, permissions, hoist, mentionable, position } = req.body || {};
  const r = await query(
    `update chat_roles set
       name        = coalesce($2, name),
       color       = coalesce($3, color),
       permissions = coalesce($4, permissions),
       hoist       = coalesce($5, hoist),
       mentionable = coalesce($6, mentionable),
       position    = coalesce($7, position)
     where id = $1
     returning id, server_id, name, color, position,
              permissions::text as permissions, hoist, mentionable, managed, created_at`,
    [req.params.roleId,
     name ?? null, color ?? null, permissions ?? null,
     hoist ?? null, mentionable ?? null, position ?? null]
  );
  res.json({ role: r.rows[0] });
});

// Delete role
router.delete('/:roleId', async (req, res) => {
  const r0 = await query(`select server_id, managed from chat_roles where id = $1`, [req.params.roleId]);
  const row = r0.rows[0];
  if (!row) return res.status(404).json({ error: 'Role not found' });
  if (row.managed) return res.status(400).json({ error: 'Managed roles cannot be deleted' });
  const serverRole = await memberRole(row.server_id, req.user.id);
  if (!canManageRoles(serverRole)) return res.status(403).json({ error: 'Only admins can manage roles' });
  await query(`delete from chat_roles where id = $1`, [req.params.roleId]);
  res.json({ ok: true });
});

// Assign / unassign role to a member
router.post('/server/:serverId/member/:userId/role/:roleId', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canManageRoles(role)) return res.status(403).json({ error: 'Only admins can manage roles' });
  await query(
    `insert into chat_member_roles (server_id, user_id, role_id)
     values ($1,$2,$3) on conflict do nothing`,
    [req.params.serverId, req.params.userId, req.params.roleId]
  );
  res.json({ ok: true });
});

router.delete('/server/:serverId/member/:userId/role/:roleId', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canManageRoles(role)) return res.status(403).json({ error: 'Only admins can manage roles' });
  await query(
    `delete from chat_member_roles where server_id = $1 and user_id = $2 and role_id = $3`,
    [req.params.serverId, req.params.userId, req.params.roleId]
  );
  res.json({ ok: true });
});

router.get('/permissions/bits', (_req, res) => {
  // Return the bit definitions to the client (UI permission picker)
  const out = {};
  for (const [k, v] of Object.entries(PERMS)) out[k] = v.toString();
  res.json({ permissions: out });
});

module.exports = router;
module.exports.PERMS = PERMS;
