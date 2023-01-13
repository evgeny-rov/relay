import * as dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import crypto from 'crypto';

dotenv.config();

declare module 'socket.io' {
  interface Socket {
    session: {
      token: string;
      userId: string;
    };
  }
}

const IO_PORT = Number(process.env.PORT ?? 8080);

const randomNanoId = (
  len: number,
  source = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_'
) => {
  return Array(len)
    .fill(null)
    .map(() => source[Math.floor(Math.random() * source.length)])
    .join('');
};

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on('error', (err) => console.log('Could not establish a connection with redis. ' + err));
redis.connect();

const io = new Server(IO_PORT, { cors: { origin: '*' } });

io.use(async (socket, next) => {
  const sessionToken = socket.handshake.auth.sessionToken;
  const userId = sessionToken && (await redis.get(sessionToken));

  if (sessionToken && userId) {
    redis.persist(sessionToken);
    socket.session = { token: sessionToken, userId };
  } else {
    const newToken = crypto.randomUUID();
    const newUserId = randomNanoId(7);
    socket.session = { token: newToken, userId: newUserId };
    redis.set(newToken, newUserId);
  }

  next();
});

io.on('connection', (socket) => {
  socket.join(socket.session.userId);
  socket.emit('session', socket.session);

  socket.on('direct', ({ type, to, data }) => {
    socket.to(to).emit('direct', { type, from: socket.session.userId, data });
  });

  socket.on('disconnect', async () => {
    // expire session after 20 minutes
    await redis.expire(socket.session.token, 60 * 20);
  });
});

console.log(`LISTENING ON PORT: ${IO_PORT}`);
