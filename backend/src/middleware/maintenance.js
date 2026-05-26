const { query } = require('../config/db');

// In-memory cache so we don't hit the DB on every request.
let cached = { maintenance: false, message: '', ts: 0 };
const TTL_MS = 5000;

async function getSetting(key) {
  const r = await query(`select value from chat_system_settings where key = $1`, [key]);
  return r.rows[0]?.value;
}

async function refresh() {
  const [mm, msg] = await Promise.all([
    getSetting('maintenance_mode'),
    getSetting('maintenance_message'),
  ]);
  cached = {
    maintenance: mm === true || mm === 'true',
    message: typeof msg === 'string' ? msg : 'Maintenance in progress',
    ts: Date.now(),
  };
  return cached;
}

async function getMaintenanceState() {
  if (Date.now() - cached.ts > TTL_MS) await refresh();
  return cached;
}

function invalidate() {
  cached.ts = 0;
}

// Block non-admin traffic to chat APIs when maintenance is on.
// Always allow: /api/health, /api/auth/*, /api/admin/*
function maintenanceGuard(req, res, next) {
  const path = req.path;
  if (path === '/health' || path.startsWith('/auth') || path.startsWith('/admin')) {
    return next();
  }
  getMaintenanceState()
    .then((state) => {
      if (!state.maintenance) return next();
      if (req.user?.is_admin) return next();
      return res.status(503).json({
        error: 'maintenance',
        message: state.message,
      });
    })
    .catch(() => next());
}

module.exports = { maintenanceGuard, getMaintenanceState, invalidate };
