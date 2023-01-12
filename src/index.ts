import { Server } from 'socket.io';
import crypto from 'crypto';
import { getRandomHostId } from './uuid';

interface Session {
  token: string;
  id: string;
  active: boolean;
}

declare module 'socket.io' {
  interface Socket {
    userId: string;
    session: Session;
  }
}

const sessions = new Map<string, Session>();

const PORT = Number(process.env.PORT ?? 8080);
const io = new Server(PORT, { cors: { origin: '*' } });

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const session = sessions.get(token);

  if (session) {
    socket.session = session;
    session.active = true;
  }

  socket.userId = crypto.randomUUID();
  next();
});

io.on('connection', (socket) => {
  const session = socket.session;

  if (session) {
    socket.leave(socket.userId);
    socket.join(socket.session.id);
  } else {
    socket.join(socket.userId);

    socket.on('host', () => {
      const session = { id: getRandomHostId(), token: crypto.randomUUID(), active: true };
      socket.session = session;

      sessions.set(session.token, session);

      socket.leave(socket.userId);
      socket.join(session.id);
      socket.emit('host:promoted', { hostId: session.id, token: session.token });
    });
  }

  socket.on('peer', ({ type, to, data }) => {
    socket.to(to).emit('peer', { type, from: socket.userId, data });
  });

  socket.on('disconnect', () => {
    if (!socket.session) return;

    socket.session.active = false;

    // fire cleanup event after 10 minutes
    setTimeout(() => {
      if (socket.session.active) return;
      sessions.delete(socket.session.token);
    }, 1000 * 60 * 10);
  });
});

console.log('started on port 8080');
