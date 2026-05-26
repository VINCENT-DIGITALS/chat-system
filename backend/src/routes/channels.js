const express = require('express');
const { query, pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

async function memberRole(serverId, userId) {
  const r = await query(
    `select role from chat_server_members where server_id = $1 and user_id = $2`,
    [serverId, userId]
  );
  return r.rows[0]?.role || null;
}

const MANAGE_ROLES = new Set(['owner', 'admin']);
const VALID_TYPES = new Set([
  'text',
  'voice',
  'video',
  'announcement',
  'forum',
  'stage',
]);

// List channels for a server (with categories)
router.get('/server/:serverId', authRequired, async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Not a member of this server' });
  const [channels, categories] = await Promise.all([
    query(
      `select * from chat_channels where server_id = $1
        order by position asc, created_at asc`,
      [req.params.serverId]
    ),
    query(
      `select * from chat_channel_categories where server_id = $1
        order by position asc, created_at asc`,
      [req.params.serverId]
    ),
  ]);
  return res.json({ channels: channels.rows, categories: categories.rows });
});

// Create channel — owner/admin only
router.post('/server/:serverId', authRequired, async (req, res) => {
  const { name, type, category_id, topic, is_private } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const t = VALID_TYPES.has(type) ? type : 'text';
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Not a member of this server' });
  if (!MANAGE_ROLES.has(role)) return res.status(403).json({ error: 'Only admins can create channels' });
  const r = await query(
    `insert into chat_channels (server_id, name, type, category_id, topic, is_private)
     values ($1,$2,$3,$4,$5,$6) returning *`,
    [req.params.serverId, name.trim(), t, category_id || null, topic || null, !!is_private]
  );
  return res.status(201).json({ channel: r.rows[0] });
});

// Edit channel (name/topic/slowmode/private/category)
router.patch('/:channelId', authRequired, async (req, res) => {
  const ch = await query(`select server_id from chat_channels where id = $1`, [req.params.channelId]);
  if (!ch.rowCount) return res.status(404).json({ error: 'Channel not found' });
  const role = await memberRole(ch.rows[0].server_id, req.user.id);
  if (!MANAGE_ROLES.has(role)) return res.status(403).json({ error: 'Only admins can manage channels' });
  const { name, topic, slowmode_sec, is_private, category_id, position, nsfw } = req.body || {};
  const r = await query(
    `update chat_channels set
       name         = coalesce($2, name),
       topic        = coalesce($3, topic),
       slowmode_sec = coalesce($4, slowmode_sec),
       is_private   = coalesce($5, is_private),
       category_id  = coalesce($6, category_id),
       position     = coalesce($7, position),
       nsfw         = coalesce($8, nsfw)
     where id = $1
     returning *`,
    [req.params.channelId,
     name ?? null, topic ?? null, slowmode_sec ?? null,
     is_private ?? null, category_id ?? null, position ?? null, nsfw ?? null]
  );
  res.json({ channel: r.rows[0] });
});

// Reorder a list of channels in one call
router.post('/server/:serverId/reorder', authRequired, async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!MANAGE_ROLES.has(role)) return res.status(403).json({ error: 'Only admins can reorder channels' });
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const it of items) {
      if (!it?.id) continue;
      await client.query(
        `update chat_channels set position = $2, category_id = $3
          where id = $1 and server_id = $4`,
        [it.id, it.position ?? 0, it.category_id ?? null, req.params.serverId]
      );
    }
    await client.query('commit');
    res.json({ ok: true });
  } catch (e) {
    await client.query('rollback');
    console.error(e);
    res.status(500).json({ error: 'Failed to reorder' });
  } finally {
    client.release();
  }
});

// Delete channel — owner/admin only
router.delete('/:channelId', authRequired, async (req, res) => {
  const r = await query(
    `select c.server_id from chat_channels c where c.id = $1`,
    [req.params.channelId]
  );
  if (!r.rowCount) return res.status(404).json({ error: 'Channel not found' });
  const role = await memberRole(r.rows[0].server_id, req.user.id);
  if (!role) return res.status(403).json({ error: 'Not a member' });
  if (!MANAGE_ROLES.has(role)) return res.status(403).json({ error: 'Only admins can delete channels' });
  await query(`delete from chat_channels where id = $1`, [req.params.channelId]);
  res.json({ ok: true });
});

// ── CATEGORIES ────────────────────────────────────────────────────
router.post('/server/:serverId/category', authRequired, async (req, res) => {
  const role = await memberRole(req.params.serverId, req.user.id);
  if (!MANAGE_ROLES.has(role)) return res.status(403).json({ error: 'Only admins can manage categories' });
  const { name, position } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const r = await query(
    `insert into chat_channel_categories (server_id, name, position)
     values ($1,$2,$3) returning *`,
    [req.params.serverId, name.trim().slice(0, 80), position ?? 0]
  );
  res.status(201).json({ category: r.rows[0] });
});

router.patch('/category/:categoryId', authRequired, async (req, res) => {
  const cat = await query(`select server_id from chat_channel_categories where id = $1`, [req.params.categoryId]);
  if (!cat.rowCount) return res.status(404).json({ error: 'Category not found' });
  const role = await memberRole(cat.rows[0].server_id, req.user.id);
  if (!MANAGE_ROLES.has(role)) return res.status(403).json({ error: 'Only admins can manage categories' });
  const { name, position } = req.body || {};
  const r = await query(
    `update chat_channel_categories
        set name = coalesce($2, name), position = coalesce($3, position)
      where id = $1 returning *`,
    [req.params.categoryId, name ?? null, position ?? null]
  );
  res.json({ category: r.rows[0] });
});

router.delete('/category/:categoryId', authRequired, async (req, res) => {
  const cat = await query(`select server_id from chat_channel_categories where id = $1`, [req.params.categoryId]);
  if (!cat.rowCount) return res.status(404).json({ error: 'Category not found' });
  const role = await memberRole(cat.rows[0].server_id, req.user.id);
  if (!MANAGE_ROLES.has(role)) return res.status(403).json({ error: 'Only admins can manage categories' });
  await query(`delete from chat_channel_categories where id = $1`, [req.params.categoryId]);
  res.json({ ok: true });
});

module.exports = router;
