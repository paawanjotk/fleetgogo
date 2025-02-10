import { ApolloServer, gql } from "apollo-server";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const DRIVERS = process.env.DRIVERS_SERVICE_URL;
const VEHICLES = process.env.VEHICLES_SERVICE_URL;
const TRIPS = process.env.TRIPS_SERVICE_URL;

const typeDefs = gql`
  type Driver { id: ID!, name: String!, phone: String!, license_number: String!, status: String! }
  type Vehicle { id: ID!, license_plate: String!, type: String!, availability: String! }
  type Trip { id: ID!, driver: Driver, vehicle: Vehicle, status: String! }


  type Query {
    drivers: [Driver]
    vehicles: [Vehicle]
    trips: [Trip]
    getDriverById(id: ID!): Driver
    getVehicleById(id: ID!): Vehicle
    getTripById(id: ID!): Trip
  }

  type Mutation {
    registerDriver(name: String!, phone: String!, password: String!, license_number: String!): Driver
    registerVehicle(type: String!, licensePlate: String!): Vehicle
    createTrip: Trip
    updateTripStatus(id: ID!, status: String!) : Trip
  }
`;

const resolvers = {
  Query: {
    drivers: () => fetch(`${DRIVERS}/drivers/`).then(res => res.json()),
    vehicles: () => fetch(`${VEHICLES}/vehicles/`).then(res => res.json()),
    trips: () => fetch(`${TRIPS}/trips/`).then(res => res.json()),
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
    registerDriver: async (_: any, { name, phone, password, license_number }: { name: string, phone: string, password: string, license_number: string }) => {
      const response = await axios.post(`${DRIVERS}/drivers/`, { name, phone, password, license_number });
      return response.data;
    },
    registerVehicle: async (_: any, { type, licensePlate }: { type: string, licensePlate: string }) => {
      const response = await axios.post(`${VEHICLES}/vehicles/`, { type, license_plate: licensePlate });
      return response.data;
    },
    createTrip: async (_: any) => {
      const response = await axios.post(`${TRIPS}/trips/`);
      return response.data;
    },
    updateTripStatus: async (_: any, { id, status }: { id: string, status: string }) => {
      const response = await axios.put(`${TRIPS}/trips/${id}/status`, { status });
      return response.data;
    },
  }
  
};

const server = new ApolloServer({ typeDefs, resolvers });
server.listen(4000, () => console.log("GraphQL running on 4000"));
