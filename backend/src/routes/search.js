const express = require('express');
const { query } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// Parses Discord-style search syntax from `q`:
//   "hello from:alice in:general has:image mentions:bob"
function parseQuery(raw) {
  const result = { q: '', from: null, in: null, has: null, mentions: null };
  if (!raw) return result;
  const tokens = raw.split(/\s+/);
  const rest = [];
  for (const tok of tokens) {
    const m = tok.match(/^(from|in|has|mentions):(.+)$/i);
    if (m) result[m[1].toLowerCase()] = m[2];
    else rest.push(tok);
  }
  result.q = rest.join(' ').trim();
  return result;
}

// Search messages across servers the caller is a member of
router.get('/messages', async (req, res) => {
  const opts = parseQuery((req.query.q || '').toString());
  const serverFilter = req.query.server_id || null;
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

  const conds = [];
  const params = [req.user.id];

  // Always restricted to channels the caller can see
  let sql = `
    select m.id, m.content, m.created_at, m.type, m.thread_id,
           u.username, u.display_name, u.avatar_url, u.is_bot,
           ch.id as channel_id, ch.name as channel_name,
           s.id as server_id, s.name as server_name
      from chat_messages m
      join chat_users u on u.id = m.user_id
      join chat_channels ch on ch.id = m.channel_id
      join chat_servers s on s.id = ch.server_id
      join chat_server_members sm on sm.server_id = s.id and sm.user_id = $1
     where m.type = 'message'
  `;

  if (serverFilter) {
    params.push(serverFilter);
    conds.push(`s.id = $${params.length}`);
  }
  if (opts.q) {
    params.push(`%${opts.q.toLowerCase()}%`);
    conds.push(`lower(m.content) like $${params.length}`);
  }
  if (opts.from) {
    params.push(opts.from.toLowerCase());
    conds.push(`(lower(u.username) = $${params.length} or lower(coalesce(u.display_name,'')) = $${params.length})`);
  }
  if (opts.in) {
    params.push(opts.in.toLowerCase());
    conds.push(`lower(ch.name) = $${params.length}`);
  }
  if (opts.has === 'image') {
    conds.push(`exists(select 1 from chat_attachments a where a.message_id = m.id and a.mime_type like 'image/%')`);
  } else if (opts.has === 'file' || opts.has === 'attachment') {
    conds.push(`exists(select 1 from chat_attachments a where a.message_id = m.id)`);
  } else if (opts.has === 'link') {
    conds.push(`m.content ~* 'https?://'`);
  }
  if (opts.mentions) {
    params.push(opts.mentions.toLowerCase());
    conds.push(`
      exists(
        select 1 from chat_mentions mn
        join chat_users mu on mu.id = mn.mentioned_user
        where mn.message_id = m.id
          and (lower(mu.username) = $${params.length} or lower(coalesce(mu.display_name,'')) = $${params.length})
      )
    `);
  }

  if (conds.length > 0) sql += ` and ${conds.join(' and ')}`;
  sql += ` order by m.created_at desc limit ${limit}`;

  try {
    const r = await query(sql, params);
    res.json({ messages: r.rows, parsed: opts });
  } catch (e) {
    console.error('search error', e);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
