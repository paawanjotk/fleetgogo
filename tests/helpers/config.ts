export const config = {
  driverUrl: process.env.DRIVER_URL ?? "http://localhost:3001",
  vehicleUrl: process.env.VEHICLE_URL ?? "http://localhost:3002",
  tripsUrl: process.env.TRIPS_URL ?? "http://localhost:3003",
  gatewayUrl: process.env.GATEWAY_URL ?? "http://localhost:4000",
};
