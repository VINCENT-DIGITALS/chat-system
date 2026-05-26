require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { originFn } = require('./config/cors');
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const livekitRoutes = require('./routes/livekit');
const userRoutes = require('./routes/users');
const pollRoutes = require('./routes/polls');
const threadRoutes = require('./routes/threads');
const eventRoutes = require('./routes/events');
const inboxRoutes = require('./routes/inbox');
const searchRoutes = require('./routes/search');
const adminRoutes = require('./routes/admin');
const systemRoutes = require('./routes/system');
const reactionRoutes = require('./routes/reactions');
const dmRoutes = require('./routes/dms');
const roleRoutes = require('./routes/roles');
const moderationRoutes = require('./routes/moderation');
const inviteRoutes = require('./routes/invites');
const webhookRoutes = require('./routes/webhooks');
const { maintenanceGuard } = require('./middleware/maintenance');
const { authRequired } = require('./middleware/auth');

function createApp() {
  const app = express();
  app.use(
    cors({
      origin: originFn,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // public
  app.use('/api/system', systemRoutes);
  app.use('/api/auth', authRoutes);

  // public webhook exec endpoint (token-authenticated)
  app.use('/api/webhooks', webhookRoutes);

  // admin (own auth+admin gate inside)
  app.use('/api/admin', adminRoutes);

  // chat APIs — require auth AND respect maintenance mode (admins bypass)
  app.use('/api', authRequired);
  app.use('/api', maintenanceGuard);
  app.use('/api/users', userRoutes);
  app.use('/api/servers', serverRoutes);
  app.use('/api/channels', channelRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/reactions', reactionRoutes);
  app.use('/api/polls', pollRoutes);
  app.use('/api/threads', threadRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/inbox', inboxRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/livekit', livekitRoutes);
  app.use('/api/dms', dmRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/moderation', moderationRoutes);
  app.use('/api/invites', inviteRoutes);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
