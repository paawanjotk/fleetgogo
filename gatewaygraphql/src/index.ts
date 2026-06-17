import './tracing.js';
import { ApolloServer } from "@apollo/server";
import { gql } from "apollo-server";
import axios from "axios";
import express from "express";
import { expressMiddleware } from "@apollo/server/express4";
import dotenv from "dotenv";
import redisClient from "./services/redis.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { httpLogger } from "./middleware/httpLogger.js";
import { logger } from "./utils/logger.js";
dotenv.config();
const app = express();
app.use(requestIdMiddleware);
app.use(httpLogger);

const CACHE_EXPIRATION = 300;
const DRIVERS = process.env.DRIVERS_SERVICE_URL;
const VEHICLES = process.env.VEHICLES_SERVICE_URL;
const TRIPS = process.env.TRIPS_SERVICE_URL;
logger.info({ DRIVERS, VEHICLES, TRIPS }, "service.urls");

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
    end_time: String
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
    drivers: async (_: any, __: any, ctx: any) => {
      try {
        const requestId = ctx.requestId;
        const cacheKey ='drivers_list';

        // Check if data exists in Redis cache
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            logger.info({ requestId, cacheKey }, 'cache.hit');
            return parsed;
          }
        }
        logger.info({ requestId, cacheKey }, 'cache.miss');
        const response = await fetch(`${DRIVERS}/drivers/`, {
          headers: requestId ? { 'X-Request-ID': requestId } : undefined,
        });
        const drivers = await response.json();

        await redisClient.setEx(cacheKey, CACHE_EXPIRATION, JSON.stringify(drivers));

        return drivers; 
               
      } catch (error) {
        logger.error({ err: error }, 'drivers.query.error');
        return { error: error.message };
      }
    },
    vehicles: async (_: any, __: any, ctx: any) => {
      try {
        const requestId = ctx.requestId;
        const cacheKey = 'vehicles_list';
        
        // Check if data exists in Redis cache
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            logger.info({ requestId, cacheKey }, 'cache.hit');
            return parsed;
          }
        }
        logger.info({ requestId, cacheKey }, 'cache.miss');
        const response = await fetch(`${VEHICLES}/vehicles/`, {
          headers: requestId ? { 'X-Request-ID': requestId } : undefined,
        });
        const vehicles = await response.json();
  
        await redisClient.setEx(cacheKey, CACHE_EXPIRATION, JSON.stringify(vehicles));
        

        return vehicles;
        
      } catch (error) {
        logger.error({ err: error }, 'vehicles.query.error');
        return { error: error.message };
      }
    },
    trips: async (_: any, __: any, ctx: any) =>
      fetch(`${TRIPS}/trips/`, {
        headers: ctx.requestId ? { 'X-Request-ID': ctx.requestId } : undefined,
      }).then((res) => res.json()),
    getDriverById: async (_: any, { id }: { id: string }, ctx: any) => {
      const response = await axios.get(`${DRIVERS}/drivers/${id}`, {
        headers: ctx.requestId ? { 'X-Request-ID': ctx.requestId } : undefined,
      });
      return response.data;
    },
    getVehicleById: async (_: any, { id }: { id: string }, ctx: any) => {
      const response = await axios.get(`${VEHICLES}/vehicles/${id}`, {
        headers: ctx.requestId ? { 'X-Request-ID': ctx.requestId } : undefined,
      });
      return response.data;
    },
    getTripById: async (_: any, { id }: { id: string }, ctx: any) => {
      const response = await axios.get(`${TRIPS}/trips/${id}`, {
        headers: ctx.requestId ? { 'X-Request-ID': ctx.requestId } : undefined,
      });
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
      },
      ctx: any
    ) => {
      logger.info({ requestId: ctx.requestId, name }, "registerDriver.mutation");
      const response = await axios.post(
        `${DRIVERS}/drivers/register`,
        { name, phone, password, license_number },
        { headers: ctx.requestId ? { 'X-Request-ID': ctx.requestId } : undefined }
      );
      const { token, newDriver } = response.data;
      await redisClient.del('drivers_list');
      return { 
        token,
        driver: {
          id: newDriver._id,
          name: newDriver.name,
          phone: newDriver.phone,
          license_number: newDriver.license_number,
          status: newDriver.status,
        }
      };
    },
    registerVehicle: async (
      _: any,
      { type, licensePlate }: { type: string; licensePlate: string },
      ctx: any
    ) => {
      const response = await axios.post(
        `${VEHICLES}/vehicles/register`,
        { type, licence_plate: licensePlate },
        { headers: ctx.requestId ? { 'X-Request-ID': ctx.requestId } : undefined }
      );
      await redisClient.del('vehicles_list');
      return {
        id: response.data._id,
        type: response.data.type,
        license_plate: response.data.licence_plate,
        availability: response.data.availability,
      }
    },
    createTrip: async (_: any, __: any, ctx: any) => {
      const response = await axios.post(`${TRIPS}/trips/createTrip`, undefined, {
        headers: ctx.requestId ? { 'X-Request-ID': ctx.requestId } : undefined,
      });

      return {
        id: response.data._id,
        driver: response.data.driver,
        vehicle: response.data.vehicle,
        status: response.data.status,
        start_time: response.data.start_time,
        end_time: response.data.end_time ?? null,
      }
    },
    updateTripStatus: async (
      _: any,
      { id, status }: { id: string; status: string },
      ctx: any
    ) => {
      const response = await axios.put(`${TRIPS}/trips/${id}/status`, {
        status,
      }, {
        headers: ctx.requestId ? { 'X-Request-ID': ctx.requestId } : undefined,
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
    context: async ({ req, res }) => ({ req, requestId: (res as any)?.locals?.requestId }),
  })
);

const HEALTH_TIMEOUT_MS = 3000;

app.get('/health', async (_req, res) => {
  const redisOk = redisClient.isOpen;

  const ping = async (url: string): Promise<boolean> => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      return r.ok;
    } catch {
      return false;
    }
  };

  const [driverOk, vehicleOk, tripsOk] = await Promise.all([
    ping(`${DRIVERS}/health`),
    ping(`${VEHICLES}/health`),
    ping(`${TRIPS}/health`),
  ]);

  const checks = {
    redis:   { status: redisOk   ? 'healthy' : 'unhealthy' },
    driver:  { status: driverOk  ? 'healthy' : 'degraded'  },
    vehicle: { status: vehicleOk ? 'healthy' : 'degraded'  },
    trips:   { status: tripsOk   ? 'healthy' : 'degraded'  },
  };

  const status = !redisOk ? 'unhealthy'
    : (!driverOk || !vehicleOk || !tripsOk) ? 'degraded'
    : 'healthy';

  res.status(redisOk ? 200 : 503).json({
    status,
    service: 'gatewaygraphql',
    uptime: process.uptime(),
    checks,
    timestamp: new Date().toISOString(),
  });
});

app.listen(4000, () => logger.info({ port: 4000 }, "Server started"));
