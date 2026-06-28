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
- **Health Checks:** Each service exposes a `/health` endpoint reporting dependency status (MongoDB, RabbitMQ, Redis). Docker Compose uses these to gate service startup order.

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Message Queue:** RabbitMQ (local via Docker Compose or CloudAMQP)
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

The system uses **RabbitMQ**. For local development, Docker Compose runs a local RabbitMQ instance for you. For production (or if you prefer), you can use **CloudAMQP**.

### Local (recommended for development)

1. Start the stack:

   ```bash
   docker-compose up --build
   ```

2. RabbitMQ Management UI is available at `http://localhost:15672` (default user/pass: `guest` / `guest`).

By default, services will use `amqp://rabbitmq:5672` inside the Compose network.

### CloudAMQP

1. Create an instance on [CloudAMQP](https://www.cloudamqp.com/) and obtain the **AMQPS URL**.
2. Set `RABBITMQ_URL=amqps://...` for the services.

---

## Environment Variables

All `.env` files must be created manually. The repository provides `.env.example` files with the required structure.

---

## API Usage

**Postman collection**
https://www.postman.com/martian-eclipse-158887/team-workspace/graphql-request/67ad9f5c74736f45802c1662

---

## Health Checks

Every service exposes `GET /health`. The response follows a three-state model:

| Status | HTTP | Meaning |
|--------|------|---------|
| `healthy` | 200 | All dependencies up |
| `degraded` | 200 | Non-critical dependency down (RabbitMQ / Redis) — service still operational |
| `unhealthy` | 503 | Critical dependency down (MongoDB for data services, Redis for gateway) |

**Example response:**
```json
{
  "status": "healthy",
  "service": "driver",
  "uptime": 42.3,
  "checks": {
    "mongodb": { "status": "healthy" },
    "rabbitmq": { "status": "healthy" }
  },
  "timestamp": "2026-05-02T10:00:00.000Z"
}
```

**Endpoints:**

| Service | URL |
|---------|-----|
| Driver | `http://localhost:3001/health` |
| Vehicle | `http://localhost:3002/health` |
| Trips | `http://localhost:3003/health` |
| GraphQL Gateway | `http://localhost:4000/health` |

The gateway's `/health` additionally pings all three downstream services and reports their status under `checks`.

Docker Compose uses these endpoints as `healthcheck` probes. The gateway container will only start once driver, vehicle, and trips are healthy.

---

## Monitoring & Debugging

### Check Service Health:

```bash
curl http://localhost:3001/health   # driver
curl http://localhost:3002/health   # vehicle
curl http://localhost:3003/health   # trips
curl http://localhost:4000/health   # gateway (aggregates all)
```

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

## Integration Tests

Run the full API test suite against Docker locally:

```bash
cd tests
npm run test:docker
```

See [tests/README.md](tests/README.md) for details.

---

## Future Enhancements

- Error Handling in GraphQL
- Choosing vehicle type while creating a trip.
- Add real-time driver tracking with WebSockets.
- Integrate Prometheus & Grafana for monitoring.

---

## Contributors

- **Paawanjot K** 

---


