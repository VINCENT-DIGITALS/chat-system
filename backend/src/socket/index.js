const { Server } = require('socket.io');
const { verify } = require('../utils/jwt');
const { query } = require('../config/db');
const { originFn } = require('../config/cors');
const { extractMentions } = require('../services/mentions');
const automod = require('../services/automod');

const onlineUsers = new Map(); // userId -> Set<socketId>

function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: originFn,
      credentials: true,
    },
  });

  // JWT auth handshake (also rejects blocked accounts)
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing token'));
    try {
      const payload = verify(token);
      const r = await query(
        `select id, username, is_admin, is_blocked from chat_users where id = $1`,
        [payload.sub]
      );
      const u = r.rows[0];
      if (!u) return next(new Error('Account no longer exists'));
      if (u.is_blocked) return next(new Error('Your account has been blocked'));
      socket.user = { id: u.id, username: u.username, is_admin: u.is_admin };
      next();
    } catch (e) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;

    // Online presence
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    if (onlineUsers.get(userId).size === 1) {
      await query(
        `update chat_users set status = case when status = 'invisible' then status else 'online' end where id = $1`,
        [userId]
      );
      const cur = await query(`select status from chat_users where id = $1`, [userId]);
      io.emit('presence:update', { user_id: userId, status: cur.rows[0]?.status || 'online' });
    }

    // ── Channel rooms ─────────────────────────────────────────────
    socket.on('channel:join', async ({ channel_id }) => {
      if (!channel_id) return;
      const ok = await query(
        `select 1 from chat_channels c
            join chat_server_members m on m.server_id = c.server_id
          where c.id = $1 and m.user_id = $2 limit 1`,
        [channel_id, userId]
      );
      if (!ok.rowCount) return;
      socket.join(`channel:${channel_id}`);
    });

    socket.on('channel:leave', ({ channel_id }) => {
      if (!channel_id) return;
      socket.leave(`channel:${channel_id}`);
    });

    // ── Thread rooms ──────────────────────────────────────────────
    socket.on('thread:join', async ({ thread_id }) => {
      if (!thread_id) return;
      const r = await query(
        `select 1 from chat_threads t
            join chat_channels c on c.id = t.channel_id
            join chat_server_members m on m.server_id = c.server_id
          where t.id = $1 and m.user_id = $2 limit 1`,
        [thread_id, userId]
      );
      if (!r.rowCount) return;
      socket.join(`thread:${thread_id}`);
    });

    socket.on('thread:leave', ({ thread_id }) => {
      if (thread_id) socket.leave(`thread:${thread_id}`);
    });

    // ── DM rooms ──────────────────────────────────────────────────
    socket.on('dm:join', async ({ conversation_id }) => {
      if (!conversation_id) return;
      const r = await query(
        `select 1 from chat_dm_members where conversation_id = $1 and user_id = $2 limit 1`,
        [conversation_id, userId]
      );
      if (!r.rowCount) return;
      socket.join(`dm:${conversation_id}`);
    });

    socket.on('dm:leave', ({ conversation_id }) => {
      if (conversation_id) socket.leave(`dm:${conversation_id}`);
    });

    // ── Sending channel messages ──────────────────────────────────
    socket.on('message:send', async ({ channel_id, content, attachments, parent_message_id }, ack) => {
      try {
        const hasContent = content && content.trim();
        const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
        if (!channel_id || (!hasContent && !hasAttachments)) {
          if (typeof ack === 'function') ack({ ok: false, error: 'invalid payload' });
          return;
        }
        const access = await query(
          `select c.server_id from chat_channels c
              join chat_server_members m on m.server_id = c.server_id
            where c.id = $1 and m.user_id = $2 limit 1`,
          [channel_id, userId]
        );
        if (!access.rowCount) {
          if (typeof ack === 'function') ack({ ok: false, error: 'not allowed' });
          return;
        }
        const serverId = access.rows[0].server_id;

        // AutoMod check
        if (hasContent) {
          const verdict = await automod.evaluate({ serverId, content: content.trim() });
          if (verdict.block) {
            if (typeof ack === 'function') {
              ack({ ok: false, error: `Blocked by AutoMod (${verdict.reason})` });
            }
            return;
          }
        }

        const ins = await query(
          `insert into chat_messages (channel_id, user_id, content, parent_message_id)
           values ($1,$2,$3,$4) returning *`,
          [channel_id, userId, hasContent ? content.trim() : '', parent_message_id || null]
        );
        const msgRow = ins.rows[0];
        const atts = [];
        if (hasAttachments) {
          for (const a of attachments) {
            if (!a?.url) continue;
            const ar = await query(
              `insert into chat_attachments (message_id, file_url, file_name, mime_type, size_bytes)
               values ($1,$2,$3,$4,$5) returning *`,
              [msgRow.id, a.url, a.name || null, a.mime_type || null, a.size_bytes || null]
            );
            atts.push({
              id: ar.rows[0].id,
              file_url: ar.rows[0].file_url,
              file_name: ar.rows[0].file_name,
              mime_type: ar.rows[0].mime_type,
              size_bytes: ar.rows[0].size_bytes,
            });
          }
        }
        const u = await query(
          `select username, display_name, avatar_url, is_bot from chat_users where id = $1`,
          [userId]
        );
        // Hydrate parent message preview if provided
        let parent = null;
        if (parent_message_id) {
          const p = await query(
            `select pm.id, pm.user_id, pm.content, pm.deleted_at,
                    pu.username, pu.display_name, pu.avatar_url
               from chat_messages pm
               join chat_users pu on pu.id = pm.user_id
              where pm.id = $1`,
            [parent_message_id]
          );
          parent = p.rows[0] || null;
        }
        const message = {
          ...msgRow, ...u.rows[0],
          attachments: atts,
          reactions: [],
          parent,
        };
        if (hasContent) {
          extractMentions({
            messageId: msgRow.id,
            channelId: channel_id,
            content: msgRow.content,
            authorId: userId,
          }).catch(() => {});
        }
        io.to(`channel:${channel_id}`).emit('message:new', message);
        if (typeof ack === 'function') ack({ ok: true, message });
      } catch (e) {
        console.error('message:send error', e);
        if (typeof ack === 'function') ack({ ok: false, error: 'server error' });
      }
    });

    // ── DM message send via socket ────────────────────────────────
    socket.on('dm:send', async ({ conversation_id, content, parent_message_id }, ack) => {
      try {
        if (!conversation_id || !content?.trim()) {
          if (typeof ack === 'function') ack({ ok: false, error: 'invalid payload' });
          return;
        }
        const mem = await query(
          `select 1 from chat_dm_members where conversation_id = $1 and user_id = $2 limit 1`,
          [conversation_id, userId]
        );
        if (!mem.rowCount) {
          if (typeof ack === 'function') ack({ ok: false, error: 'not a member' });
          return;
        }
        const ins = await query(
          `insert into chat_dm_messages (conversation_id, user_id, content, parent_message_id)
           values ($1,$2,$3,$4) returning *`,
          [conversation_id, userId, content.trim(), parent_message_id || null]
        );
        await query(
          `update chat_dm_conversations set last_message_at = now() where id = $1`,
          [conversation_id]
        );
        const u = await query(
          `select username, display_name, avatar_url, is_bot from chat_users where id = $1`,
          [userId]
        );
        const message = { ...ins.rows[0], ...u.rows[0], attachments: [], reactions: [] };
        io.to(`dm:${conversation_id}`).emit('dm:message', message);
        if (typeof ack === 'function') ack({ ok: true, message });
      } catch (e) {
        console.error('dm:send error', e);
        if (typeof ack === 'function') ack({ ok: false, error: 'server error' });
      }
    });

    // Typing indicator
    socket.on('typing:start', ({ channel_id, conversation_id }) => {
      if (channel_id) {
        socket.to(`channel:${channel_id}`).emit('typing:start', {
          channel_id, user_id: userId, username: socket.user.username,
        });
      } else if (conversation_id) {
        socket.to(`dm:${conversation_id}`).emit('typing:start', {
          conversation_id, user_id: userId, username: socket.user.username,
        });
      }
    });
    socket.on('typing:stop', ({ channel_id, conversation_id }) => {
      if (channel_id) {
        socket.to(`channel:${channel_id}`).emit('typing:stop', { channel_id, user_id: userId });
      } else if (conversation_id) {
        socket.to(`dm:${conversation_id}`).emit('typing:stop', { conversation_id, user_id: userId });
      }
    });

    socket.on('disconnect', async () => {
      const set = onlineUsers.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineUsers.delete(userId);
          await query(
            `update chat_users set status = case when status = 'invisible' then status else 'offline' end where id = $1`,
            [userId]
          );
          io.emit('presence:update', { user_id: userId, status: 'offline' });
        }
      }
    });
  });

  return io;
}

module.exports = { setupSocket };
