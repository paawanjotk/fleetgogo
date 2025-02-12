import amqp from 'amqplib';
import dotenv from 'dotenv';
dotenv.config();

const RABBITMQ_URL = process.env.RABBIT_URL || '';
const EXCHANGE_NAME = 'topic_events';

let connection: amqp.Connection;
let channel: amqp.Channel;

async function connect() {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    console.log('Connected to RabbitMQ with Topic Exchange');
}

async function publishToExchange(eventType: string, data: any) {
    if (!channel) await connect();

    channel.publish(EXCHANGE_NAME, eventType, Buffer.from(JSON.stringify(data)));
    console.log(`Published to ${eventType}: ${JSON.stringify(data)}`);
}

async function subscribeToEvent(eventType: string, callback: (msg: string) => void) {
    if (!channel) await connect();
    // Use a named queue instead of an exclusive queue
    const queueName = `${eventType}_queue`;
    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, EXCHANGE_NAME, eventType);

    console.log(`Subscribed to event: ${eventType} with queue: ${queueName}`);

    channel.consume(queueName, (message) => {
        if (message) {
            callback(message.content.toString());
            channel.ack(message);
        }
    });
}

export { publishToExchange, subscribeToEvent, connect };
