import amqp from 'amqplib';
import dotenv from 'dotenv';
import crypto from 'crypto';
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
        console.warn('RABBITMQ_URL not set; RabbitMQ disabled');
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
                    console.error('RabbitMQ connection error', err);
                });
                connection.on('close', () => {
                    console.error('RabbitMQ connection closed; reconnecting');
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
                console.log('Connected to RabbitMQ with Topic Exchange');
            } catch (err) {
                const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 15000);
                console.warn(`RabbitMQ connect failed (attempt ${attempt}); retrying in ${delayMs}ms`);
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
        payload: data,
    };

    channel.publish(
        EXCHANGE_NAME,
        eventType,
        Buffer.from(JSON.stringify(envelope)),
        { persistent: true, contentType: 'application/json' }
    );
    console.log(`Published to ${eventType}: ${JSON.stringify(envelope)}`);
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

    console.log(`Subscribed to event: ${eventType} with queue: ${queueName}`);

    channel.consume(queueName, async (message) => {
        if (!message) return;
        try {
            await callback(message.content.toString());
            channel.ack(message);
        } catch (err) {
            console.error(`Error handling ${eventType}; dead-lettering`, err);
            channel.nack(message, false, false);
        }
    }, { noAck: false });
}

export { publishToExchange, subscribeToEvent, connect };
