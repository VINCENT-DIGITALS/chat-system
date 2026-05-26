require('dotenv').config();
const http = require('http');
const { createApp } = require('./app');
const { setupSocket } = require('./socket');

const app = createApp();
const httpServer = http.createServer(app);
const io = setupSocket(httpServer);
app.set('io', io);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`[chat-system] backend listening on http://localhost:${PORT}`);
});
