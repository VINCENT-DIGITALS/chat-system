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

function canModerate(role) {
  return role === 'owner' || role === 'admin';
}

async function audit(serverId, actorId, action, targetType, targetId, details) {
  try {
    await query(
      `insert into chat_server_audit_log (server_id, actor_id, action, target_type, target_id, details)
       values ($1,$2,$3,$4,$5,$6)`,
      [serverId, actorId, action, targetType, targetId, details ? JSON.stringify(details) : null]
    );
  } catch (e) {
    console.error('server audit error', e.message);
  }
}

// Kick a member (removes them from the server)
router.post('/server/:serverId/kick/:userId', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canModerate(role)) return res.status(403).json({ error: 'Only admins can kick' });
  if (req.params.userId === req.user.id) return res.status(400).json({ error: 'Cannot kick yourself' });

  const target = await memberRole(req.params.serverId, req.params.userId);
  if (!target) return res.status(404).json({ error: 'Not a member' });
  if (target === 'owner') return res.status(400).json({ error: 'Cannot kick the owner' });

  await query(
    `delete from chat_server_members where server_id = $1 and user_id = $2`,
    [req.params.serverId, req.params.userId]
  );
  await query(
    `insert into chat_member_moderation (server_id, user_id, actor_id, action, reason)
     values ($1,$2,$3,'kick',$4)`,
    [req.params.serverId, req.params.userId, req.user.id, req.body?.reason || null]
  );
  await audit(req.params.serverId, req.user.id, 'member.kick', 'user', req.params.userId, { reason: req.body?.reason });
  res.json({ ok: true });
});

// Ban a member (kicks + records permanent ban)
router.post('/server/:serverId/ban/:userId', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canModerate(role)) return res.status(403).json({ error: 'Only admins can ban' });
  if (req.params.userId === req.user.id) return res.status(400).json({ error: 'Cannot ban yourself' });

  const target = await memberRole(req.params.serverId, req.params.userId);
  if (target === 'owner') return res.status(400).json({ error: 'Cannot ban the owner' });

  await query(
    `delete from chat_server_members where server_id = $1 and user_id = $2`,
    [req.params.serverId, req.params.userId]
  );
  const expiresAt = req.body?.expires_at || null;
  await query(
    `insert into chat_member_moderation (server_id, user_id, actor_id, action, reason, expires_at)
     values ($1,$2,$3,'ban',$4,$5)`,
    [req.params.serverId, req.params.userId, req.user.id, req.body?.reason || null, expiresAt]
  );
  await audit(req.params.serverId, req.user.id, 'member.ban', 'user', req.params.userId,
    { reason: req.body?.reason, expires_at: expiresAt });
  res.json({ ok: true });
});

router.post('/server/:serverId/unban/:userId', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canModerate(role)) return res.status(403).json({ error: 'Only admins can unban' });
  await query(
    `insert into chat_member_moderation (server_id, user_id, actor_id, action, reason)
     values ($1,$2,$3,'unban',$4)`,
    [req.params.serverId, req.params.userId, req.user.id, req.body?.reason || null]
  );
  await audit(req.params.serverId, req.user.id, 'member.unban', 'user', req.params.userId);
  res.json({ ok: true });
});

// Timeout (temp mute)
router.post('/server/:serverId/timeout/:userId', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canModerate(role)) return res.status(403).json({ error: 'Only admins can timeout' });
  const minutes = Math.max(1, Math.min(parseInt(req.body?.minutes, 10) || 10, 60 * 24 * 7));
  const expires = new Date(Date.now() + minutes * 60_000).toISOString();
  await query(
    `insert into chat_member_moderation (server_id, user_id, actor_id, action, reason, expires_at)
     values ($1,$2,$3,'timeout',$4,$5)`,
    [req.params.serverId, req.params.userId, req.user.id, req.body?.reason || null, expires]
  );
  await audit(req.params.serverId, req.user.id, 'member.timeout', 'user', req.params.userId,
    { minutes, expires_at: expires, reason: req.body?.reason });
  res.json({ ok: true, expires_at: expires });
});

router.post('/server/:serverId/untimeout/:userId', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canModerate(role)) return res.status(403).json({ error: 'Only admins can untimeout' });
  await query(
    `insert into chat_member_moderation (server_id, user_id, actor_id, action)
     values ($1,$2,$3,'untimeout')`,
    [req.params.serverId, req.params.userId, req.user.id]
  );
  await audit(req.params.serverId, req.user.id, 'member.untimeout', 'user', req.params.userId);
  res.json({ ok: true });
});

// Bans list
router.get('/server/:serverId/bans', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canModerate(role)) return res.status(403).json({ error: 'Only admins can see bans' });
  const r = await query(
    `select distinct on (mm.user_id) mm.*, u.username, u.display_name, u.avatar_url
       from chat_member_moderation mm
       join chat_users u on u.id = mm.user_id
      where mm.server_id = $1 and mm.action = 'ban'
        and not exists (
          select 1 from chat_member_moderation m2
           where m2.server_id = mm.server_id and m2.user_id = mm.user_id
             and m2.action = 'unban' and m2.created_at > mm.created_at
        )
      order by mm.user_id, mm.created_at desc`,
    [req.params.serverId]
  );
  res.json({ bans: r.rows });
});

// Server audit log
router.get('/server/:serverId/audit-log', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canModerate(role)) return res.status(403).json({ error: 'Only admins can view audit log' });
  const r = await query(
    `select a.*, u.username as actor_username
       from chat_server_audit_log a
       left join chat_users u on u.id = a.actor_id
      where a.server_id = $1
      order by a.created_at desc
      limit 200`,
    [req.params.serverId]
  );
  res.json({ entries: r.rows });
});

// ── AUTOMOD ─────────────────────────────────────────────────────────
router.get('/server/:serverId/automod', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canModerate(role)) return res.status(403).json({ error: 'Only admins can view automod' });
  const r = await query(
    `select * from chat_automod_rules where server_id = $1 order by created_at desc`,
    [req.params.serverId]
  );
  res.json({ rules: r.rows });
});

router.post('/server/:serverId/automod', async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!canModerate(role)) return res.status(403).json({ error: 'Only admins can manage automod' });
  const { name, rule_type, config, action } = req.body || {};
  if (!name || !rule_type) return res.status(400).json({ error: 'name and rule_type required' });
  const allowedTypes = ['keyword', 'spam', 'mention_spam', 'caps'];
  if (!allowedTypes.includes(rule_type)) return res.status(400).json({ error: 'invalid rule_type' });
  const r = await query(
    `insert into chat_automod_rules (server_id, name, rule_type, config, action, created_by)
     values ($1,$2,$3,$4::jsonb,$5,$6) returning *`,
    [req.params.serverId, name.slice(0, 80), rule_type, JSON.stringify(config || {}),
     action || 'block', req.user.id]
  );
  await audit(req.params.serverId, req.user.id, 'automod.create', 'rule', r.rows[0].id, { name });
  res.status(201).json({ rule: r.rows[0] });
});

router.patch('/automod/:ruleId', async (req, res) => {
  const r0 = await query(`select server_id from chat_automod_rules where id = $1`, [req.params.ruleId]);
  if (!r0.rowCount) return res.status(404).json({ error: 'Rule not found' });
  const role = await memberRole(r0.rows[0].server_id, req.user.id);
  if (!canModerate(role)) return res.status(403).json({ error: 'Only admins can manage automod' });
  const { name, config, action, enabled } = req.body || {};
  const r = await query(
    `update chat_automod_rules set
       name    = coalesce($2, name),
       config  = coalesce($3::jsonb, config),
       action  = coalesce($4, action),
       enabled = coalesce($5, enabled)
     where id = $1 returning *`,
    [req.params.ruleId, name ?? null, config ? JSON.stringify(config) : null,
     action ?? null, enabled ?? null]
  );
  res.json({ rule: r.rows[0] });
});

router.delete('/automod/:ruleId', async (req, res) => {
  const r0 = await query(`select server_id from chat_automod_rules where id = $1`, [req.params.ruleId]);
  if (!r0.rowCount) return res.status(404).json({ error: 'Rule not found' });
  const role = await memberRole(r0.rows[0].server_id, req.user.id);
  if (!canModerate(role)) return res.status(403).json({ error: 'Only admins can manage automod' });
  await query(`delete from chat_automod_rules where id = $1`, [req.params.ruleId]);
  res.json({ ok: true });
});

module.exports = router;
