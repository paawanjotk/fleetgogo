import {
  vehicleApi,
  registerVehicle,
  updateVehicleAvailability,
  vehicleId,
} from "../helpers/api-client";
import { uniquePlate } from "../helpers/unique-id";

describe("Vehicle service", () => {
  let plate: string;

  beforeEach(() => {
    plate = uniquePlate();
  });

  it("registers a new vehicle", async () => {
    const response = await registerVehicle("sedan", plate);

    expect(response.status).toBe(201);
    expect(response.data).toMatchObject({
      type: "sedan",
      licence_plate: plate,
      availability: "available",
    });
  });

  it("lists and fetches vehicle by id", async () => {
    const registered = await registerVehicle("suv", plate);
    const id = vehicleId(registered.data);

    const listResponse = await vehicleApi.get("/vehicles/");
    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.data)).toBe(true);
    expect(listResponse.data.some((v: { id: string }) => v.id === id)).toBe(true);

    const getResponse = await vehicleApi.get(`/vehicles/${id}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.id).toBe(id);
    expect(getResponse.data.license_plate).toBe(plate);
  });

  it("updates vehicle availability", async () => {
    const registered = await registerVehicle("van", plate);
    const id = vehicleId(registered.data);

    const response = await updateVehicleAvailability(id, "in-maintenance");

    expect(response.status).toBe(200);
    expect(response.data.availability).toBe("in-maintenance");
  });

  it("rejects setting the same availability twice", async () => {
    const registered = await registerVehicle("truck", plate);
    const id = vehicleId(registered.data);

    const response = await updateVehicleAvailability(id, "available");

    expect(response.status).toBe(400);
    expect(response.data.message).toBe("Vehicle is already available");
  });

  it("filters vehicles by availability status", async () => {
    const registered = await registerVehicle("sedan", plate);
    const id = vehicleId(registered.data);

    const response = await vehicleApi.get("/vehicles/status/available");
    expect(response.status).toBe(200);
    expect(response.data.some((v: { _id: string }) => v._id === id)).toBe(true);
  });
});
