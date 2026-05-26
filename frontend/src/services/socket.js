import { io } from 'socket.io-client';
import { SOCKET_URL } from './endpoints';

let socket = null;

export function connectSocket(token) {
  if (socket && socket.connected) return socket;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
