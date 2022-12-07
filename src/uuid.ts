export const getRandomHostId = (ID_LENGTH = 6) => {
  const CHARS_SOURCE = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';

  let id = '';

  for (let i = 0; i < ID_LENGTH; i += 1) {
    id += CHARS_SOURCE[Math.floor(Math.random() * CHARS_SOURCE.length)];
  }

  return id;
};
