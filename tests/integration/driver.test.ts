import {
  driverApi,
  registerDriver,
  loginDriver,
  updateDriverAvailability,
  driverId,
} from "../helpers/api-client";
import { uniquePhone, uniqueSuffix } from "../helpers/unique-id";

describe("Driver service", () => {
  const password = "test-password-123";
  let phone: string;
  let licenseNumber: string;

  beforeEach(() => {
    phone = uniquePhone();
    licenseNumber = `DL-${uniqueSuffix()}`;
  });

  it("registers a new driver and returns a JWT", async () => {
    const response = await registerDriver({
      name: "Test Driver",
      phone,
      password,
      license_number: licenseNumber,
    });

    expect(response.status).toBe(201);
    expect(response.data.token).toBeDefined();
    expect(response.data.newDriver).toMatchObject({
      name: "Test Driver",
      phone,
      license_number: licenseNumber,
      status: "active",
    });
  });

  it("rejects duplicate phone on register", async () => {
    await registerDriver({
      name: "First Driver",
      phone,
      password,
      license_number: licenseNumber,
    });

    const response = await registerDriver({
      name: "Duplicate Driver",
      phone,
      password,
      license_number: `DL-dup-${uniqueSuffix()}`,
    });

    expect(response.status).toBe(400);
    expect(response.data.message).toBe("Driver already exists");
  });

  it("logs in with valid credentials", async () => {
    await registerDriver({
      name: "Login Driver",
      phone,
      password,
      license_number: licenseNumber,
    });

    const response = await loginDriver(phone, password);

    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();
    expect(response.data.foundDriver.phone).toBe(phone);
  });

  it("rejects login with wrong password", async () => {
    await registerDriver({
      name: "Wrong Pass Driver",
      phone,
      password,
      license_number: licenseNumber,
    });

    const response = await loginDriver(phone, "wrong-password");

    expect(response.status).toBe(400);
    expect(response.data.message).toBe("Invalid email or password");
  });

  it("lists and fetches driver by id", async () => {
    const registered = await registerDriver({
      name: "List Driver",
      phone,
      password,
      license_number: licenseNumber,
    });
    const id = driverId(registered.data.newDriver);

    const listResponse = await driverApi.get("/drivers/");
    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.data)).toBe(true);
    expect(listResponse.data.some((d: { id: string }) => d.id === id)).toBe(true);

    const getResponse = await driverApi.get(`/drivers/${id}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.id).toBe(id);
    expect(getResponse.data.phone).toBe(phone);
  });

  it("requires JWT to update availability", async () => {
    const response = await driverApi.put("/drivers/availability", {
      availability: "inactive",
    });

    expect(response.status).toBe(401);
    expect(response.data.message).toBe("Unauthorized");
  });

  it("updates driver availability with valid JWT", async () => {
    const registered = await registerDriver({
      name: "Availability Driver",
      phone,
      password,
      license_number: licenseNumber,
    });
    const token = registered.data.token;

    const response = await updateDriverAvailability(token, "inactive");

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("inactive");
  });

  it("filters drivers by status", async () => {
    const registered = await registerDriver({
      name: "Status Driver",
      phone,
      password,
      license_number: licenseNumber,
    });
    const id = driverId(registered.data.newDriver);

    const response = await driverApi.get("/drivers/status/active");
    expect(response.status).toBe(200);
    expect(response.data.some((d: { _id: string }) => d._id === id)).toBe(true);
  });
});
