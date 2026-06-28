import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const SERVICE_NAME = process.env.SERVICE_NAME || 'driver';

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

export const rabbitmqMessagesPublishedTotal = new Counter({
  name: 'rabbitmq_messages_published_total',
  help: 'Total number of RabbitMQ messages published',
  labelNames: ['event_type'] as const,
  registers: [register],
});

export const rabbitmqMessagesConsumedTotal = new Counter({
  name: 'rabbitmq_messages_consumed_total',
  help: 'Total number of RabbitMQ messages consumed',
  labelNames: ['event_type'] as const,
  registers: [register],
});

export const rabbitmqConsumerErrorsTotal = new Counter({
  name: 'rabbitmq_consumer_errors_total',
  help: 'Total number of RabbitMQ consumer errors',
  labelNames: ['event_type'] as const,
  registers: [register],
});

export const rabbitmqMessageProcessingDuration = new Histogram({
  name: 'rabbitmq_message_processing_duration_seconds',
  help: 'RabbitMQ message processing duration in seconds',
  labelNames: ['event_type'] as const,
  registers: [register],
});

export const rabbitmqEventLag = new Histogram({
  name: 'rabbitmq_event_lag_seconds',
  help: 'Time between event occurredAt and consumption in seconds',
  labelNames: ['event_type'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});
