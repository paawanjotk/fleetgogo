# Fleetgogo Integration Tests

API integration tests against the full Docker stack.

## Quick start

```bash
cd tests
npm run test:docker
```

Leave Docker running after tests:

```bash
npm run test:docker:keep
```

## Manual workflow

```bash
cd tests
npm run docker:up
npm install
npm test
npm run docker:down
```

## Test suites

- `health.test.ts` — all `/health` endpoints
- `driver.test.ts` — register, login, JWT, availability
- `vehicle.test.ts` — register, list, availability
- `trips.test.ts` — create, status updates, errors
- `gateway.test.ts` — GraphQL queries/mutations
- `e2e-flow.test.ts` — full register → trip → complete flow

## Environment

| Variable | Default |
|----------|---------|
| `DRIVER_URL` | `http://localhost:3001` |
| `VEHICLE_URL` | `http://localhost:3002` |
| `TRIPS_URL` | `http://localhost:3003` |
| `GATEWAY_URL` | `http://localhost:4000` |

## Notes

- Auto-creates `.env` from `.env.example` if missing
- JWT uses raw token in `Authorization` header (no `Bearer` prefix)
- Reset stale data: `docker compose down -v` from project root
