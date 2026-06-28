import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const SERVICE_NAME = process.env.SERVICE_NAME || 'gatewaygraphql';

export const register = new Registry();
register.setDefaultLabels({ service: SERVICE_NAME });

collectDefaultMetrics({ register });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});
