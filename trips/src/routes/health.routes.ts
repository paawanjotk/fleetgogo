import { Router } from 'express';
import mongoose from 'mongoose';
import { isConnected as rabbitConnected } from '../services/rabbit';
import redisClient from '../services/redis';

const router = Router();

router.get('/', (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const rabbitOk = rabbitConnected();
  const redisOk = redisClient.isOpen;

  const checks = {
    mongodb: { status: mongoOk ? 'healthy' : 'unhealthy' },
    rabbitmq: { status: rabbitOk ? 'healthy' : 'degraded' },
    redis: { status: redisOk ? 'healthy' : 'degraded' },
  };

  const status = !mongoOk ? 'unhealthy' : (!rabbitOk || !redisOk) ? 'degraded' : 'healthy';

  res.status(mongoOk ? 200 : 503).json({
    status,
    service: 'trips',
    uptime: process.uptime(),
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
