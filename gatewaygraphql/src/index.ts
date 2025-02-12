import { ApolloServer } from "@apollo/server";
import { gql } from "apollo-server";
import axios from "axios";
import express from "express";
import { expressMiddleware } from "@apollo/server/express4";
import dotenv from "dotenv";
dotenv.config();
const app = express();

const DRIVERS = process.env.DRIVERS_SERVICE_URL;
const VEHICLES = process.env.VEHICLES_SERVICE_URL;
const TRIPS = process.env.TRIPS_SERVICE_URL;
console.log(DRIVERS, VEHICLES, TRIPS);

const typeDefs = gql`
  type Driver {
    id: ID!
    name: String!
    phone: String!
    license_number: String!
    status: String!
  }
  type Vehicle {
    id: ID!
    license_plate: String!
    type: String!
    availability: String!
  }
  type Trip {
    id: ID!
    driver: String!
    vehicle: String!
    status: String!
    start_time: String!
    end_time: String!
  }

  type RegisterDriverResponse {
    token: String!
    driver: Driver!
  }

  type Query {
    drivers: [Driver]
    vehicles: [Vehicle]
    trips: [Trip]
    getDriverById(id: ID!): Driver
    getVehicleById(id: ID!): Vehicle
    getTripById(id: ID!): Trip
  }

  type Mutation {
    registerDriver(
      name: String!
      phone: String!
      password: String!
      license_number: String!
    ): RegisterDriverResponse

    registerVehicle(
      type: String!, 
      licensePlate: String!
    ): Vehicle

    createTrip: Trip

    updateTripStatus(
      id: ID!, 
      status: String!
    ): Trip
  }
`;

const resolvers = {
  Query: {
    drivers: () => fetch(`${DRIVERS}/drivers/`).then((res) => res.json()),
    vehicles: () => fetch(`${VEHICLES}/vehicles/`).then((res) => res.json()),
    trips: () => fetch(`${TRIPS}/trips/`).then((res) => res.json()),
    getDriverById: async (_: any, { id }: { id: string }) => {
      const response = await axios.get(`${DRIVERS}/drivers/${id}`);
      return response.data;
    },
    getVehicleById: async (_: any, { id }: { id: string }) => {
      const response = await axios.get(`${VEHICLES}/vehicles/${id}`);
      return response.data;
    },
    getTripById: async (_: any, { id }: { id: string }) => {
      const response = await axios.get(`${TRIPS}/trips/${id}`);
      return response.data;
    },
  },
  Mutation: {
    registerDriver: async (
      _: any,
      {
        name,
        phone,
        password,
        license_number,
      }: {
        name: string;
        phone: string;
        password: string;
        license_number: string;
      }
    ) => {
      console.log("register driver: ", name);
      const response = await axios.post(`${DRIVERS}/drivers/register`, {
        name,
        phone,
        password,
        license_number,
      });
      console.log(response);
      const { token, newDriver } = response.data;
      return { 
        token,
        driver: {
          name: newDriver.name,
          phone: newDriver.phone,
          license_number: newDriver.license_number,
          status: newDriver.status,
        }
      };
    },
    registerVehicle: async (
      _: any,
      { type, licensePlate }: { type: string; licensePlate: string }
    ) => {
      const response = await axios.post(`${VEHICLES}/vehicles/register`, {
        type,
        licence_plate: licensePlate,
      });
      console.log(response.data);
      return {
        id: response.data._id,
        type: response.data.type,
        license_plate: response.data.licence_plate,
        availability: response.data.availability,
      }
    },
    createTrip: async (_: any) => {
      console.log("create trip");
      const response = await axios.post(`${TRIPS}/trips/createTrip`);
      console.log(response.data);

      return {
        id: response.data._id,
        driver: response.data.driver,
        vehicle: response.data.vehicle,
        status: response.data.status,
        start_time: response.data.start_time,
        end_time: response.data.end_time,
      }
    },
    updateTripStatus: async (
      _: any,
      { id, status }: { id: string; status: string }
    ) => {
      const response = await axios.put(`${TRIPS}/trips/${id}/status`, {
        status,
      });
      return response.data;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

await server.start();

app.use(
  "/graphql",
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => ({ req }),
  })
);

app.listen(4000, () => console.log("GraphQL running on 4000"));
