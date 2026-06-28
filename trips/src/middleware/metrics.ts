import type { NextFunction, Request, Response } from 'express';
import { httpRequestDuration, httpRequestsTotal } from '../services/metrics';

function normalizeRoute(req: Request): string {
  if (req.route?.path) {
    const base = req.baseUrl || '';
    return `${base}${req.route.path}`;
  }
  return req.path
    .replace(/\/[0-9a-fA-F]{24}/g, '/:id')
    .replace(/\/[0-9a-f-]{36}/g, '/:id');
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/metrics') {
    next();
    return;
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    const route = normalizeRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestDuration.observe(labels, durationSec);
    httpRequestsTotal.inc(labels);
  });

  next();
}
