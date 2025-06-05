// backend/src/socket.js
import { Server } from 'socket.io';

let io = null;

/**
 * Инициализирует Socket.IO на переданном http.Server
 * @param {import('http').Server} server
 */
export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', socket => {
    console.log(`⚡️ Socket connected: ${socket.id}`);
    // можно слушать пользовательские эвенты:
    socket.on('disconnect', () => {
      console.log(`⚡️ Socket disconnected: ${socket.id}`);
    });
  });
}

/** Экспортируем экземпляр для использования в других модулях */
export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
