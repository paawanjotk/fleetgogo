import { Router } from 'express';
import mongoose from 'mongoose';
import { isConnected as rabbitConnected } from '../services/rabbit';

const router = Router();

router.get('/', (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const rabbitOk = rabbitConnected();

  const checks = {
    mongodb: { status: mongoOk ? 'healthy' : 'unhealthy' },
    rabbitmq: { status: rabbitOk ? 'healthy' : 'degraded' },
  };

  const status = !mongoOk ? 'unhealthy' : !rabbitOk ? 'degraded' : 'healthy';

  res.status(mongoOk ? 200 : 503).json({
    status,
    service: 'driver',
    uptime: process.uptime(),
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
