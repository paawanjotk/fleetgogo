import { graphqlRequest } from "../helpers/api-client";
import { uniquePhone, uniquePlate, uniqueSuffix } from "../helpers/unique-id";

describe("GraphQL gateway", () => {
  it("registers a driver via mutation", async () => {
    const suffix = uniqueSuffix();
    const result = await graphqlRequest<{
      registerDriver: {
        token: string;
        driver: { id: string; name: string; phone: string; status: string };
      };
    }>(
      `
        mutation RegisterDriver($name: String!, $phone: String!, $password: String!, $license: String!) {
          registerDriver(name: $name, phone: $phone, password: $password, license_number: $license) {
            token
            driver { id name phone status license_number }
          }
        }
      `,
      {
        name: `GQL Driver ${suffix}`,
        phone: uniquePhone(),
        password: "graphql-pass",
        license: `GQL-${suffix}`,
      }
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.registerDriver.token).toBeDefined();
    expect(result.data?.registerDriver.driver.status).toBe("active");
  });

  it("registers a vehicle via mutation", async () => {
    const result = await graphqlRequest<{
      registerVehicle: { id: string; type: string; license_plate: string; availability: string };
    }>(
      `
        mutation RegisterVehicle($type: String!, $plate: String!) {
          registerVehicle(type: $type, licensePlate: $plate) {
            id type license_plate availability
          }
        }
      `,
      { type: "sedan", plate: uniquePlate() }
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.registerVehicle.availability).toBe("available");
    expect(result.data?.registerVehicle.license_plate).toBeDefined();
  });

  it("queries drivers and vehicles lists", async () => {
    const driversResult = await graphqlRequest<{ drivers: Array<{ id: string }> }>(
      `{ drivers { id name phone status } }`
    );
    expect(driversResult.errors).toBeUndefined();
    expect(Array.isArray(driversResult.data?.drivers)).toBe(true);

    const vehiclesResult = await graphqlRequest<{ vehicles: Array<{ id: string }> }>(
      `{ vehicles { id type license_plate availability } }`
    );
    expect(vehiclesResult.errors).toBeUndefined();
    expect(Array.isArray(vehiclesResult.data?.vehicles)).toBe(true);
  });

  it("queries trips list", async () => {
    const result = await graphqlRequest<{ trips: Array<{ id: string; status: string }> }>(
      `{ trips { id driver vehicle status start_time } }`
    );

    expect(result.errors).toBeUndefined();
    expect(Array.isArray(result.data?.trips)).toBe(true);
  });
});
