const { verify } = require('../utils/jwt');
const { query } = require('../config/db');

async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });
  try {
    const payload = verify(token);
    const r = await query(
      `select id, username, is_admin, is_blocked from chat_users where id = $1`,
      [payload.sub]
    );
    const u = r.rows[0];
    if (!u) return res.status(401).json({ error: 'Account no longer exists' });
    if (u.is_blocked) return res.status(403).json({ error: 'Your account has been blocked' });
    req.user = {
      id: u.id,
      username: u.username,
      is_admin: u.is_admin,
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminRequired(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

module.exports = { authRequired, adminRequired };
