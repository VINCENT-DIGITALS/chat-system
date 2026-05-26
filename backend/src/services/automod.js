const { query } = require('../config/db');

// Lightweight in-memory cache of enabled rules per server (5s TTL).
const cache = new Map(); // serverId -> { ts, rules: [...] }

async function getRules(serverId) {
  const hit = cache.get(serverId);
  const now = Date.now();
  if (hit && now - hit.ts < 5000) return hit.rules;
  const r = await query(
    `select id, rule_type, config, action
       from chat_automod_rules
      where server_id = $1 and enabled = true`,
    [serverId]
  );
  cache.set(serverId, { ts: now, rules: r.rows });
  return r.rows;
}

function invalidate(serverId) {
  cache.delete(serverId);
}

function check(rule, content) {
  const c = content || '';
  switch (rule.rule_type) {
    case 'keyword': {
      const list = Array.isArray(rule.config?.keywords) ? rule.config.keywords : [];
      const lower = c.toLowerCase();
      for (const k of list) {
        if (typeof k === 'string' && k.length > 0 && lower.includes(k.toLowerCase())) {
          return { matched: true, reason: `keyword: ${k}` };
        }
      }
      return { matched: false };
    }
    case 'caps': {
      const threshold = Math.max(0, Math.min(rule.config?.threshold ?? 0.7, 1));
      const letters = c.replace(/[^A-Za-z]/g, '');
      if (letters.length < 8) return { matched: false };
      const upper = letters.replace(/[^A-Z]/g, '').length;
      const ratio = upper / letters.length;
      return ratio >= threshold
        ? { matched: true, reason: `caps ${Math.round(ratio * 100)}%` }
        : { matched: false };
    }
    case 'mention_spam': {
      const limit = rule.config?.threshold ?? 5;
      const count = (c.match(/@[\w.\-]{2,32}/g) || []).length;
      return count >= limit
        ? { matched: true, reason: `mention spam x${count}` }
        : { matched: false };
    }
    case 'spam': {
      // Detect long repeated runs of the same character: aaaaaaa...
      const m = c.match(/(.)\1{9,}/);
      return m ? { matched: true, reason: 'spam repetition' } : { matched: false };
    }
    default:
      return { matched: false };
  }
}

// Returns { block: true, reason } | { block: false }
async function evaluate({ serverId, content }) {
  if (!serverId || !content) return { block: false };
  const rules = await getRules(serverId);
  for (const r of rules) {
    const m = check(r, content);
    if (m.matched && r.action === 'block') {
      return { block: true, reason: m.reason };
    }
  }
  return { block: false };
}

module.exports = { evaluate, invalidate };
