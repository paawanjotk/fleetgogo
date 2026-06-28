import axios, { AxiosInstance } from "axios";
import { config } from "./config";

function createClient(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    validateStatus: () => true,
    timeout: 10_000,
  });
}

export const driverApi = createClient(config.driverUrl);
export const vehicleApi = createClient(config.vehicleUrl);
export const tripsApi = createClient(config.tripsUrl);
export const gatewayApi = createClient(config.gatewayUrl);

export interface DriverRecord {
  id?: string;
  _id?: string;
  name: string;
  phone: string;
  license_number: string;
  status: string;
}

export interface VehicleRecord {
  id?: string;
  _id?: string;
  type: string;
  licence_plate?: string;
  license_plate?: string;
  availability: string;
}

export interface TripRecord {
  id?: string;
  _id?: string;
  driver: string;
  vehicle: string;
  status: string;
  start_time: string;
  end_time?: string | null;
}

export async function registerDriver(payload: {
  name: string;
  phone: string;
  password: string;
  license_number: string;
}) {
  return driverApi.post("/drivers/register", payload);
}

export async function loginDriver(phone: string, password: string) {
  return driverApi.post("/drivers/login", { phone, password });
}

export async function updateDriverAvailability(
  token: string,
  availability: "active" | "inactive" | "occupied"
) {
  return driverApi.put(
    "/drivers/availability",
    { availability },
    { headers: { Authorization: token } }
  );
}

export async function registerVehicle(type: string, licence_plate: string) {
  return vehicleApi.post("/vehicles/register", { type, licence_plate });
}

export async function updateVehicleAvailability(
  id: string,
  availability: "available" | "in-maintenance" | "assigned"
) {
  return vehicleApi.put("/vehicles/availability", { id, availability });
}

export async function createTrip() {
  return tripsApi.post("/trips/createTrip");
}

export async function updateTripStatus(
  tripId: string,
  status: "ongoing" | "complete" | "cancelled"
) {
  return tripsApi.put(`/trips/${tripId}/status`, { status });
}

export async function graphqlRequest<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
  const response = await gatewayApi.post("/graphql", { query, variables });
  return response.data;
}

export function driverId(driver: DriverRecord): string {
  return (driver.id ?? driver._id)!;
}

export function vehicleId(vehicle: VehicleRecord): string {
  return (vehicle.id ?? vehicle._id)!;
}

export function tripId(trip: TripRecord): string {
  return (trip.id ?? trip._id)!;
}
