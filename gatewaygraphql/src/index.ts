import { ApolloServer, gql } from "apollo-server";
import axios from "axios";
import { get } from "http";

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
    createTrip(driverId: ID!, vehicleId: ID!): Trip
  }
`;

const resolvers = {
  Query: {
    drivers: () => fetch("http://localhost:3001/drivers/").then(res => res.json()),
    vehicles: () => fetch("http://localhost:3002/vehicles/").then(res => res.json()),
    trips: () => fetch("http://localhost:3003/trips").then(res => res.json()),
    getDriverById: async (_: any, { id }: { id: string }) => {
      const response = await axios.get(`http://localhost:3001/drivers/${id}`);
      return response.data;
    },
    getVehicleById: async (_: any, { id }: { id: string }) => {
      const response = await axios.get(`http://localhost:3002/vehicles/${id}`);
      return response.data;
    },
    getTripById: async (_: any, { id }: { id: string }) => {
      const response = await axios.get(`http://localhost:3003/trips/${id}`);
      return response.data;
    },
  },
  // Mutation: {
  //   registerDriver: (_, { name, licenseNumber }) =>
  //     fetch("http://driver-service/drivers", { method: "POST", body: JSON.stringify({ name, licenseNumber }) })
  //     .then(res => res.json()),
  //   createTrip: (_, { driverId, vehicleId }) =>
  //     fetch("http://trip-service/trips", { method: "POST", body: JSON.stringify({ driverId, vehicleId }) })
  //     .then(res => res.json()),
  // }
};

const server = new ApolloServer({ typeDefs, resolvers });
server.listen(4000, () => console.log("GraphQL running on 4000"));
