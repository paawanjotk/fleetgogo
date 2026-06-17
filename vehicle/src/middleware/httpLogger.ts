import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export function httpLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info(
      {
        requestId: res.locals.requestId,
        method: req.method,
        route: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 1000) / 1000,
      },
      'request.complete'
    );
  });

  next();
}

