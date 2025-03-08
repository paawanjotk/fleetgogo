# Fleet Management System

## Overview

The **Fleet Management System** is a microservices-based backend that handles driver, vehicle, and trip management. It ensures smooth operations with **event-driven communication** using RabbitMQ and provides a **GraphQL API** for unified data access.

## Features

- **Driver Management:** Registration, authentication, and availability tracking.
- **Vehicle Management:** Vehicle status tracking and maintenance updates.
- **Trip Management:** Assignment of drivers and vehicles, trip status updates.
- **Event-Driven Communication:** Uses RabbitMQ for asynchronous updates.
- **GraphQL Gateway:** Unified API for seamless interaction with microservices (Caching implemented for frequent queries).
- **JWT Authentication:** Secure access for driver-related operations.

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Message Queue:** RabbitMQ (CloudAMQP)
- **Caching:** Redis
- **API Gateway:** GraphQL
- **Containerization:** Docker

---

## Microservices

### 1. Driver Service

**Responsibilities:**

- Register and manage driver profiles
- Authenticate drivers with JWT
- Track driver availability

**Events:**

- `Driver Registered`
- `Driver Availability Updated`

### 2. Vehicle Service

**Responsibilities:**

- Manage vehicle availability and maintenance status
- Track vehicle assignments

**Events:**

- `Vehicle Registered`
- `Vehicle Availability Updated`

### 3. Trip Service

**Responsibilities:**

- Create and assign trips
- Validate driver and vehicle availability
- Track trip progress
- Stores only active drivers and vehicles in redis DB for efficient management and assignment to trips

**Events:**

- `Trip Created`
- `Trip Completed`

---

## Docker Setup

To run the entire system using Docker:

1. Clone the repository:

   ```bash
   git clone https://github.com/paawanjotk/fleetgogo.git
   cd fleetgogo
   ```

2. Build and run containers:

   ```bash
   docker-compose up --build
   ```

3. Stop the containers:

   ```bash
   docker-compose down
   ```

---

## RabbitMQ Setup

The system uses **RabbitMQ**, and you will need to host your RabbitMQ instance on **CloudAMQP**.

1. Go to [CloudAMQP](https://www.cloudamqp.com/) and create an account.
2. Set up a RabbitMQ instance and obtain the **AMQPS URL**.
3. Add the obtained URL to your `.env` file under `RABBITMQ_URL`.

---

## Environment Variables

All `.env` files must be created manually. The repository provides `.env.example` files with the required structure.

---

## API Usage

**Postman collection**
https://www.postman.com/martian-eclipse-158887/team-workspace/graphql-request/67ad9f5c74736f45802c1662

---

## Monitoring & Debugging

### View Redis Data:

```bash
redis-cli
SELECT 1
KEYS *
```

### View Running Services:

```bash
docker ps
```

---

## Future Enhancements

- Implement dead-letter queues for failed event processing.
- Error Handling in GraphQL
- Choosing vehicle type while creating a trip.
- Add real-time driver tracking with WebSockets.
- Integrate Prometheus & Grafana for monitoring.

---

## Contributors

- **Paawanjot K** 💖✨ (Main Developer)

---


