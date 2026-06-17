import type { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

const HEADER_NAME = 'x-request-id';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header(HEADER_NAME);
  const requestId = incoming && incoming.trim().length > 0 ? incoming : crypto.randomUUID();

  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

