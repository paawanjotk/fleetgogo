import { createClient } from 'redis';
import { logger } from '../utils/logger';

const redisClient = createClient({ url: 'redis://redis:6379' });
redisClient.on('error', (err) => logger.error({ err }, 'Redis Client Error'));

(async () => {
  try {
    await redisClient.connect();
    logger.info('Connected to Redis');
  } catch (err) {
    logger.error({ err }, 'Redis Connection Error');
  }
})();

export default redisClient;
