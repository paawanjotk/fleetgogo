import { driverApi, vehicleApi, tripsApi, gatewayApi } from "../helpers/api-client";

const services = [
  { name: "driver", client: driverApi },
  { name: "vehicle", client: vehicleApi },
  { name: "trips", client: tripsApi },
  { name: "gateway", client: gatewayApi },
];

describe("Health checks", () => {
  it.each(services)("$name /health returns healthy", async ({ client, name }) => {
    const response = await client.get("/health");

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("healthy");
    expect(response.data.service).toBe(name === "gateway" ? "gatewaygraphql" : name);
    expect(response.data.checks).toBeDefined();
    expect(response.data.timestamp).toBeDefined();
  });

  it("gateway aggregates downstream service health", async () => {
    const response = await gatewayApi.get("/health");

    expect(response.status).toBe(200);
    expect(response.data.checks.driver.status).toBe("healthy");
    expect(response.data.checks.vehicle.status).toBe("healthy");
    expect(response.data.checks.trips.status).toBe("healthy");
    expect(response.data.checks.redis.status).toBe("healthy");
  });
});
