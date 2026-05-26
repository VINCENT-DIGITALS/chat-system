const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { query } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { uploadAvatar } = require('../services/storage');

const router = express.Router();
router.use(authRequired);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatar_url: u.avatar_url,
    banner_url: u.banner_url,
    status: u.status,
    custom_status: u.custom_status,
    custom_status_emoji: u.custom_status_emoji,
    custom_status_until: u.custom_status_until,
    is_admin: u.is_admin === true,
    is_blocked: u.is_blocked === true,
    is_bot: u.is_bot === true,
    display_name: u.display_name,
    bio: u.bio,
    pronouns: u.pronouns,
    banner_color: u.banner_color,
    activity_share: u.activity_share !== false,
    badges: u.badges || [],
    profile_effect: u.profile_effect || null,
    nameplate: u.nameplate || null,
    created_at: u.created_at,
  };
}

router.get('/me', async (req, res) => {
  const r = await query(`select * from chat_users where id = $1`, [req.user.id]);
  res.json({ user: publicUser(r.rows[0]) });
});

router.put('/me', async (req, res) => {
  const { display_name, bio, pronouns, banner_color, activity_share } = req.body || {};
  if (bio && bio.length > 190) return res.status(400).json({ error: 'Bio is too long (190 max)' });
  if (display_name && display_name.length > 32) return res.status(400).json({ error: 'Display name too long' });
  if (pronouns && pronouns.length > 40) return res.status(400).json({ error: 'Pronouns too long' });
  const r = await query(
    `update chat_users set
       display_name  = coalesce($2, display_name),
       bio           = coalesce($3, bio),
       pronouns      = coalesce($4, pronouns),
       banner_color  = coalesce($5, banner_color),
       activity_share = coalesce($6, activity_share),
       updated_at    = now()
     where id = $1
     returning *`,
    [req.user.id,
     display_name ?? null, bio ?? null, pronouns ?? null,
     banner_color ?? null, activity_share ?? null]
  );
  res.json({ user: publicUser(r.rows[0]) });
});

// Custom presence status (online | idle | dnd | invisible | offline)
router.post('/me/presence', async (req, res) => {
  const allowed = ['online', 'idle', 'dnd', 'invisible', 'offline'];
  const status = (req.body?.status || '').toString();
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });
  await query(`update chat_users set status = $1 where id = $2`, [status, req.user.id]);
  const io = req.app.get('io');
  if (io) io.emit('presence:update', { user_id: req.user.id, status });
  res.json({ ok: true, status });
});

// Custom status (text + emoji + optional expiry)
router.post('/me/custom-status', async (req, res) => {
  const { text, emoji, until } = req.body || {};
  if (text && text.length > 100) return res.status(400).json({ error: 'custom status too long' });
  await query(
    `update chat_users set
       custom_status        = $2,
       custom_status_emoji  = $3,
       custom_status_until  = $4
     where id = $1`,
    [req.user.id, text || null, emoji || null, until || null]
  );
  const io = req.app.get('io');
  if (io) io.emit('presence:custom_status', {
    user_id: req.user.id, text: text || null, emoji: emoji || null, until: until || null,
  });
  res.json({ ok: true });
});

// ───── Theme settings (persisted across browsers) ─────────────────
router.get('/me/theme', async (req, res) => {
  const r = await query(
    `select mode, density, msg_mode, custom_base, brand_color, gradient
       from chat_theme_settings where user_id = $1`,
    [req.user.id]
  );
  res.json({ theme: r.rows[0] || null });
});

router.put('/me/theme', async (req, res) => {
  const { mode, density, msg_mode, custom_base, brand_color, gradient } = req.body || {};
  const validMode    = ['light', 'soft-gray', 'dark', 'near-black', 'system', 'custom'];
  const validDensity = ['compact', 'default', 'spacious'];
  const validMsg     = ['default', 'compact'];
  const validBase    = ['light', 'dark'];
  if (mode && !validMode.includes(mode))         return res.status(400).json({ error: 'invalid mode' });
  if (density && !validDensity.includes(density))return res.status(400).json({ error: 'invalid density' });
  if (msg_mode && !validMsg.includes(msg_mode))  return res.status(400).json({ error: 'invalid msg_mode' });
  if (custom_base && !validBase.includes(custom_base)) return res.status(400).json({ error: 'invalid custom_base' });
  const gradArr = Array.isArray(gradient) ? gradient.slice(0, 5) : [];
  const r = await query(
    `insert into chat_theme_settings (user_id, mode, density, msg_mode, custom_base, brand_color, gradient, updated_at)
     values ($1, coalesce($2,'dark'), coalesce($3,'default'), coalesce($4,'default'),
             coalesce($5,'dark'), $6, $7::jsonb, now())
     on conflict (user_id) do update set
       mode        = coalesce(excluded.mode, chat_theme_settings.mode),
       density     = coalesce(excluded.density, chat_theme_settings.density),
       msg_mode    = coalesce(excluded.msg_mode, chat_theme_settings.msg_mode),
       custom_base = coalesce(excluded.custom_base, chat_theme_settings.custom_base),
       brand_color = excluded.brand_color,
       gradient    = excluded.gradient,
       updated_at  = now()
     returning mode, density, msg_mode, custom_base, brand_color, gradient`,
    [req.user.id, mode || null, density || null, msg_mode || null,
     custom_base || null, brand_color || null, JSON.stringify(gradArr)]
  );
  res.json({ theme: r.rows[0] });
});

router.delete('/me/custom-status', async (req, res) => {
  await query(
    `update chat_users set
       custom_status = null, custom_status_emoji = null, custom_status_until = null
     where id = $1`,
    [req.user.id]
  );
  const io = req.app.get('io');
  if (io) io.emit('presence:custom_status', {
    user_id: req.user.id, text: null, emoji: null, until: null,
  });
  res.json({ ok: true });
});

router.post('/me/password', async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const r = await query(`select password_hash from chat_users where id = $1`, [req.user.id]);
  const u = r.rows[0];
  const ok = await bcrypt.compare(current_password, u.password_hash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  const hash = await bcrypt.hash(new_password, 10);
  await query(`update chat_users set password_hash = $1, updated_at = now() where id = $2`, [hash, req.user.id]);
  res.json({ ok: true });
});

router.post('/me/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded (field name: "avatar")' });
    if (!/^image\//.test(file.mimetype)) return res.status(400).json({ error: 'Only image files allowed' });
    const ext = (file.originalname.split('.').pop() || 'png').toLowerCase().slice(0, 5);
    const url = await uploadAvatar({
      userId: req.user.id,
      buffer: file.buffer,
      contentType: file.mimetype,
      ext,
    });
    const r = await query(
      `update chat_users set avatar_url = $1, updated_at = now() where id = $2 returning *`,
      [url, req.user.id]
    );
    res.json({ user: publicUser(r.rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed to upload avatar' });
  }
});

router.delete('/me/avatar', async (req, res) => {
  const r = await query(
    `update chat_users set avatar_url = null, updated_at = now() where id = $1 returning *`,
    [req.user.id]
  );
  res.json({ user: publicUser(r.rows[0]) });
});

// Other user's public profile (for clicking on someone in the member list)
router.get('/:id', async (req, res) => {
  const r = await query(
    `select id, username, display_name, bio, pronouns, avatar_url, banner_url, banner_color,
            status, custom_status, custom_status_emoji, is_admin, is_bot,
            badges, profile_effect, nameplate, created_at
       from chat_users where id = $1`,
    [req.params.id]
  );
  if (!r.rowCount) return res.status(404).json({ error: 'User not found' });

  // Mutual servers (servers we both belong to)
  const mutual = await query(
    `select s.id, s.name
       from chat_server_members a
       join chat_server_members b on a.server_id = b.server_id
       join chat_servers s on s.id = a.server_id
      where a.user_id = $1 and b.user_id = $2`,
    [req.user.id, req.params.id]
  );

  res.json({ user: r.rows[0], mutual_servers: mutual.rows });
});

module.exports = router;
