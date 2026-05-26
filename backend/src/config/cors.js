// CORS origin handler that:
// - Allows every origin in CLIENT_ORIGIN (comma-separated)
// - Allows any origin if CLIENT_ORIGIN="*"
// - Always allows localhost / 127.0.0.1 / private LAN ranges (10/8, 172.16/12, 192.168/16)
//   so you can open the site from your phone on the same Wi-Fi without extra config.

const PRIVATE_RE =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[?::1\]?|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)[^\s]*$/i;

function originFn(origin, cb) {
  // server-to-server / curl / mobile WebViews sometimes send no Origin
  if (!origin) return cb(null, true);

  const cfg = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').trim();
  if (cfg === '*') return cb(null, true);

  const allowed = cfg.split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.includes(origin)) return cb(null, true);

  if (PRIVATE_RE.test(origin)) return cb(null, true);

  return cb(new Error('Origin not allowed: ' + origin), false);
}

module.exports = { originFn };
