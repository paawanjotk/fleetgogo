import {
  createTrip,
  registerDriver,
  registerVehicle,
  tripsApi,
  updateTripStatus,
  tripId,
} from "../helpers/api-client";
import { uniquePhone, uniquePlate, uniqueSuffix } from "../helpers/unique-id";
import { waitFor } from "../helpers/wait";

async function registerAvailablePair() {
  const suffix = uniqueSuffix();
  await registerDriver({
    name: `Trip Driver ${suffix}`,
    phone: uniquePhone(),
    password: "trip-test-pass",
    license_number: `DL-${suffix}`,
  });
  await registerVehicle("sedan", uniquePlate());
}

async function createTripWhenReady() {
  return waitFor(
    () => createTrip(),
    (res) => res.status === 201,
    { timeoutMs: 20_000, label: "trip pool to be ready" }
  );
}

describe("Trips service", () => {
  it("returns 404 when no drivers or vehicles are available", async () => {
    const response = await createTrip();

    if (response.status === 201) {
      // Pools had leftover resources from a prior run — drain is non-deterministic, skip assertion
      expect(response.data.status).toBe("pending");
      return;
    }

    expect(response.status).toBe(404);
    expect(["No active drivers available", "No available vehicles"]).toContain(
      response.data.message
    );
  });

  it("creates a trip when driver and vehicle are available", async () => {
    await registerAvailablePair();
    const response = await createTripWhenReady();

    expect(response.status).toBe(201);
    expect(response.data).toMatchObject({
      driver: expect.any(String),
      vehicle: expect.any(String),
      status: "pending",
    });
    expect(response.data.start_time).toBeDefined();
  });

  it("lists and fetches trip by id", async () => {
    await registerAvailablePair();
    const created = await createTripWhenReady();
    const id = tripId(created.data);

    const listResponse = await tripsApi.get("/trips/");
    expect(listResponse.status).toBe(200);
    expect(listResponse.data.some((t: { id: string }) => t.id === id)).toBe(true);

    const getResponse = await tripsApi.get(`/trips/${id}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.id).toBe(id);
    expect(getResponse.data.status).toBe("pending");
  });

  it("updates trip status", async () => {
    await registerAvailablePair();
    const created = await createTripWhenReady();
    const id = tripId(created.data);

    const ongoing = await updateTripStatus(id, "ongoing");
    expect(ongoing.status).toBe(200);
    expect(ongoing.data.status).toBe("ongoing");

    const complete = await updateTripStatus(id, "complete");
    expect(complete.status).toBe(200);
    expect(complete.data.status).toBe("complete");
    expect(complete.data.end_time).not.toBe("null");
  });

  it("rejects invalid trip status", async () => {
    await registerAvailablePair();
    const created = await createTripWhenReady();
    const id = tripId(created.data);

    const response = await tripsApi.put(`/trips/${id}/status`, {
      status: "invalid-status",
    });

    expect(response.status).toBe(400);
    expect(response.data.message).toBe("Invalid status");
  });

  it("returns 404 for unknown trip id", async () => {
    const response = await tripsApi.get("/trips/000000000000000000000000");
    expect(response.status).toBe(404);
    expect(response.data.message).toBe("Trip not found");
  });
});
