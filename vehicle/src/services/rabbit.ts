import amqp from 'amqplib';
import dotenv from 'dotenv';
dotenv.config();

const RABBITMQ_URL = process.env.RABBIT_URL || '';

let connection,channel: any;
async function connect(){
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log('Connected to RabbitMQ');
}

async function publishToQueue(queue: any, data: any){
    if(!channel){
        await connect();
    }
    await channel.assertQueue(queue);
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
}

async function subscribeToQueue(queue: any, callback: any) {
    if (!channel) await connect();
    await channel.assertQueue(queue);
    channel.consume(queue, (message: any) => {
        callback(message.content.toString());
        channel.ack(message);
    });
}

export { publishToQueue, subscribeToQueue, connect };