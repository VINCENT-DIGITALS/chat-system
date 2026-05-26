const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { sign } = require('../utils/jwt');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatar_url: u.avatar_url,
    status: u.status,
    is_admin: u.is_admin === true,
    is_blocked: u.is_blocked === true,
    is_bot: u.is_bot === true,
    display_name: u.display_name,
    bio: u.bio,
    pronouns: u.pronouns,
    banner_color: u.banner_color,
    created_at: u.created_at,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const hash = await bcrypt.hash(password, 10);
    const insert = await query(
      `insert into chat_users (username, email, password_hash)
       values ($1,$2,$3) returning *`,
      [username, email.toLowerCase(), hash]
    );
    const user = insert.rows[0];
    const token = sign({ sub: user.id, username: user.username });
    return res.status(201).json({ user: publicUser(user), token });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    console.error(e);
    return res.status(500).json({ error: 'Failed to register' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const found = await query(
      `select * from chat_users where email = $1 limit 1`,
      [email.toLowerCase()]
    );
    const user = found.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.is_blocked) return res.status(403).json({ error: 'Your account has been blocked' });
    const token = sign({ sub: user.id, username: user.username });
    return res.json({ user: publicUser(user), token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

router.get('/me', authRequired, async (req, res) => {
  const r = await query(`select * from chat_users where id = $1`, [req.user.id]);
  return res.json({ user: publicUser(r.rows[0]) });
});

module.exports = router;
