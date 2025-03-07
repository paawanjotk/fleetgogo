import { createClient } from 'redis';

const redisClient = createClient({ url: 'redis://redis:6379/1' });

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Redis Connection Error:', err);
  }
})();

export default redisClient;