import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { CORS_ORIGINS } from "../configs";

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer): SocketIOServer => {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: CORS_ORIGINS,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet.');
  }

  return io;
};
