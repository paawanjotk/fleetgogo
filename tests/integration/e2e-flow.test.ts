import {
  createTrip,
  driverApi,
  vehicleApi,
  registerDriver,
  registerVehicle,
  updateTripStatus,
  tripId,
  graphqlRequest,
} from "../helpers/api-client";
import { uniquePhone, uniquePlate, uniqueSuffix } from "../helpers/unique-id";
import { waitFor } from "../helpers/wait";

describe("End-to-end fleet flow", () => {
  it("register → assign trip → complete → resources return to pool", async () => {
    const suffix = uniqueSuffix();

    // 1. Register driver and vehicle
    const driverRes = await registerDriver({
      name: `E2E Driver ${suffix}`,
      phone: uniquePhone(),
      password: "e2e-password",
      license_number: `E2E-${suffix}`,
    });
    expect(driverRes.status).toBe(201);

    const vehicleRes = await registerVehicle("sedan", uniquePlate());
    expect(vehicleRes.status).toBe(201);

    // 2. Wait until trip can be created (Redis pools populated via RabbitMQ)
    const tripRes = await waitFor(
      () => createTrip(),
      (res) => res.status === 201,
      { timeoutMs: 20_000, label: "trip creation after resource registration" }
    );
    const trip = tripId(tripRes.data);
    const assignedDriver = tripRes.data.driver;
    const assignedVehicle = tripRes.data.vehicle;

    expect(assignedDriver).toEqual(expect.any(String));
    expect(assignedVehicle).toEqual(expect.any(String));
    expect(tripRes.data.status).toBe("pending");

    // 3. Assigned driver and vehicle should be marked occupied/assigned (async via RabbitMQ)
    await waitFor(
      async () => {
        const [d, v] = await Promise.all([
          driverApi.get(`/drivers/${assignedDriver}`),
          vehicleApi.get(`/vehicles/${assignedVehicle}`),
        ]);
        return { driver: d.data.status, vehicle: v.data.availability };
      },
      ({ driver: dStatus, vehicle: vStatus }) =>
        dStatus === "occupied" && vStatus === "assigned",
      { timeoutMs: 15_000, label: "driver/vehicle assignment after trip" }
    );

    // 4. Complete the trip
    const completeRes = await updateTripStatus(trip, "complete");
    expect(completeRes.status).toBe(200);
    expect(completeRes.data.status).toBe("complete");

    // 5. Resources should return to active/available (async via RabbitMQ)
    await waitFor(
      async () => {
        const [d, v] = await Promise.all([
          driverApi.get(`/drivers/${assignedDriver}`),
          vehicleApi.get(`/vehicles/${assignedVehicle}`),
        ]);
        return { driver: d.data.status, vehicle: v.data.availability };
      },
      ({ driver: dStatus, vehicle: vStatus }) =>
        dStatus === "active" && vStatus === "available",
      { timeoutMs: 15_000, label: "driver/vehicle release after trip complete" }
    );

    // 6. Verify via GraphQL gateway
    const gqlResult = await graphqlRequest<{
      getTripById: { id: string; status: string };
    }>(
      `query GetTrip($id: ID!) { getTripById(id: $id) { id status driver vehicle } }`,
      { id: trip }
    );

    expect(gqlResult.errors).toBeUndefined();
    expect(gqlResult.data?.getTripById.status).toBe("complete");
  });
});
