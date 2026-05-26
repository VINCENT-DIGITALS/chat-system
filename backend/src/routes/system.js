const express = require('express');
const { getMaintenanceState } = require('../middleware/maintenance');
const { query } = require('../config/db');

const router = express.Router();

// In-memory branding cache (5s TTL) to avoid DB hit on every page load
let brandingCache = { value: null, ts: 0 };
const TTL = 5000;

async function loadBranding() {
  if (Date.now() - brandingCache.ts < TTL && brandingCache.value) return brandingCache.value;
  const r = await query(
    `select key, value from chat_system_settings where key in ('app_name','app_short')`
  );
  const map = {};
  for (const row of r.rows) map[row.key] = row.value;
  const value = {
    app_name: typeof map.app_name === 'string' ? map.app_name : 'Chat System',
    app_short: typeof map.app_short === 'string' ? map.app_short : 'CS',
  };
  brandingCache = { value, ts: Date.now() };
  return value;
}

function invalidateBranding() {
  brandingCache.ts = 0;
}

router.get('/status', async (_req, res) => {
  const s = await getMaintenanceState();
  res.json({ maintenance: s.maintenance, message: s.message });
});

router.get('/branding', async (_req, res) => {
  try {
    const b = await loadBranding();
    res.json(b);
  } catch (e) {
    res.json({ app_name: 'Chat System', app_short: 'CS' });
  }
});

module.exports = router;
module.exports.invalidateBranding = invalidateBranding;
