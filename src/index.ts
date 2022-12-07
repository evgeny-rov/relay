import { Server } from 'socket.io';
import crypto from 'crypto';
import { getRandomHostId } from './uuid';

declare module 'socket.io' {
  interface Socket {
    userId: string;
    hostId?: string;
  }
}

const io = new Server(8080, { cors: { origin: '*' } });

io.use((socket, next) => {
  socket.userId = crypto.randomUUID();
  next();
});

io.on('connection', (socket) => {
  socket.join(socket.userId);
  socket.emit('session', { userId: socket.userId });

  socket.on('host', () => {
    const hostId = getRandomHostId();
    socket.hostId = hostId;

    socket.leave(socket.userId);
    socket.join(hostId);
    socket.emit('host:promoted', { hostId });
  });

  socket.on('peer', ({ type, to, data }) => {
    socket.to(to).emit('peer', { type, from: socket.userId, data });
  });
});
