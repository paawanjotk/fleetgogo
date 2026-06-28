import amqp from 'amqplib';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import {
    rabbitmqConsumerErrorsTotal,
    rabbitmqEventLag,
    rabbitmqMessageProcessingDuration,
    rabbitmqMessagesConsumedTotal,
    rabbitmqMessagesPublishedTotal,
} from './metrics';
dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || process.env.RABBIT_URL || '';
const EXCHANGE_NAME = 'topic_events';
const DLX_NAME = 'topic_events.dlx';
const SERVICE_NAME = process.env.SERVICE_NAME || 'trips';

let connection: amqp.Connection;
let channel: amqp.Channel;
let connecting: Promise<void> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

async function connect() {
    if (!RABBITMQ_URL) {
        logger.warn('RABBITMQ_URL not set; RabbitMQ disabled');
        return;
    }
    if (channel) return;
    if (connecting) return connecting;

    connecting = (async () => {
        let attempt = 0;
        while (!channel) {
            attempt += 1;
            try {
                connection = await amqp.connect(RABBITMQ_URL);
                connection.on('error', (err) => {
                    logger.error({ err }, 'RabbitMQ connection error');
                });
                connection.on('close', () => {
                    logger.error('RabbitMQ connection closed; reconnecting');
                    channel = undefined as any;
                    connection = undefined as any;
                    if (!reconnectTimer) {
                        reconnectTimer = setTimeout(() => {
                            reconnectTimer = null;
                            void connect();
                        }, 1000);
                    }
                });

                channel = await connection.createChannel();
                await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
                await channel.assertExchange(DLX_NAME, 'direct', { durable: true });
                channel.prefetch(10);
                logger.info('Connected to RabbitMQ with Topic Exchange');
            } catch (err) {
                const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 15000);
                logger.warn({ attempt, delayMs }, 'RabbitMQ connect failed; retrying');
                await new Promise((r) => setTimeout(r, delayMs));
            }
        }
    })().finally(() => {
        connecting = null;
    });

    return connecting;
}

async function publishToExchange(eventType: string, data: any) {
    if (!channel) await connect();

    const envelope = {
        eventId: crypto.randomUUID(),
        eventType,
        occurredAt: new Date().toISOString(),
        correlationId: data?._correlationId ?? null,
        payload: data,
    };

    channel.publish(
        EXCHANGE_NAME,
        eventType,
        Buffer.from(JSON.stringify(envelope)),
        { persistent: true, contentType: 'application/json' }
    );
    rabbitmqMessagesPublishedTotal.inc({ event_type: eventType });
    logger.info({ eventType, eventId: envelope.eventId, correlationId: envelope.correlationId }, 'rabbit.publish');
}

async function subscribeToEvent(eventType: string, callback: (msg: string) => void) {
    if (!channel) await connect();
    // Use a named queue instead of an exclusive queue
    // Service-scoped queue name to get pub/sub semantics (each service receives each event)
    const queueName = `${SERVICE_NAME}.${eventType}.queue`;
    const dlqName = `${queueName}.dlq`;
    const dlqRoutingKey = `${eventType}.dlq`;

    await channel.assertQueue(dlqName, { durable: true });
    await channel.bindQueue(dlqName, DLX_NAME, dlqRoutingKey);

    await channel.assertQueue(queueName, {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': DLX_NAME,
            'x-dead-letter-routing-key': dlqRoutingKey,
        },
    });
    await channel.bindQueue(queueName, EXCHANGE_NAME, eventType);

    logger.info({ eventType, queueName }, 'rabbit.subscribe');

    channel.consume(queueName, async (message) => {
        if (!message) return;

        const processStart = process.hrtime.bigint();
        try {
            const raw = message.content.toString();

            try {
                const envelope = JSON.parse(raw);
                if (envelope.occurredAt) {
                    const lagSec = (Date.now() - new Date(envelope.occurredAt).getTime()) / 1000;
                    if (lagSec >= 0) {
                        rabbitmqEventLag.observe({ event_type: eventType }, lagSec);
                    }
                }
            } catch {
                // ignore malformed envelope for lag metric
            }

            await callback(raw);
            rabbitmqMessagesConsumedTotal.inc({ event_type: eventType });
            channel.ack(message);
        } catch (err) {
            rabbitmqConsumerErrorsTotal.inc({ event_type: eventType });
            logger.error({ err, eventType }, 'Error handling event; dead-lettering');
            channel.nack(message, false, false);
        } finally {
            const durationSec = Number(process.hrtime.bigint() - processStart) / 1e9;
            rabbitmqMessageProcessingDuration.observe({ event_type: eventType }, durationSec);
        }
    }, { noAck: false });
}

function isConnected(): boolean {
    return !!channel;
}

export { publishToExchange, subscribeToEvent, connect, isConnected };
