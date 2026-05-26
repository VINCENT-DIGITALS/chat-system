const { query } = require('../config/db');

// Parse @username (and @display name) tokens in content, look them up in the
// same server, and insert chat_mentions rows. Idempotent per message.
async function extractMentions({ messageId, channelId, content, authorId }) {
  if (!content) return [];
  // Match @ followed by 2-32 chars of word/dot/dash
  const matches = Array.from(content.matchAll(/@([\w.\-]{2,32})/g));
  if (matches.length === 0) return [];
  const tokens = [...new Set(matches.map((m) => m[1].toLowerCase()))];

  // Find the server for this channel
  const sv = await query(
    `select server_id from chat_channels where id = $1`,
    [channelId]
  );
  if (!sv.rowCount) return [];

  // Find matching users among server members (username or display_name)
  const r = await query(
    `select distinct u.id, u.username, u.display_name
       from chat_users u
       join chat_server_members m on m.user_id = u.id
      where m.server_id = $1
        and (
          lower(u.username) = any($2::text[])
          or lower(coalesce(u.display_name,'')) = any($2::text[])
        )`,
    [sv.rows[0].server_id, tokens]
  );
  const ids = r.rows.map((x) => x.id).filter((id) => id !== authorId);
  for (const uid of ids) {
    await query(
      `insert into chat_mentions (message_id, mentioned_user, channel_id) values ($1,$2,$3)
       on conflict do nothing`,
      [messageId, uid, channelId]
    );
  }
  return ids;
}

module.exports = { extractMentions };
