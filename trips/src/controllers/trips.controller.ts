import { Request, Response } from "express";
import trips from "../models/trips.model";
import redisClient from "../services/redis";
import { publishToExchange, subscribeToEvent } from "../services/rabbit";
import { logger } from "../utils/logger";
import { redisAtomicPopTotal, tripCreationTotal } from "../services/metrics";

const DRIVER_KEY = "active_drivers";
const VEHICLE_KEY = "active_vehicles";

// Atomically removes and returns one random entry from a Redis hash.
// Redis is single-threaded: this Lua script runs without interruption,
// so two concurrent requests can never pop the same field.
const LUA_ATOMIC_POP = `
local fields = redis.call('HRANDFIELD', KEYS[1], 1)
if #fields == 0 then return nil end
local value = redis.call('HGET', KEYS[1], fields[1])
redis.call('HDEL', KEYS[1], fields[1])
return value
`;

const atomicPop = async (hashKey: string): Promise<{ _id: string } | null> => {
    const result = await redisClient.eval(LUA_ATOMIC_POP, { keys: [hashKey], arguments: [] });
    const hit = !!result;
    redisAtomicPopTotal.inc({ key: hashKey, result: hit ? 'hit' : 'miss' });
    if (!result) return null;
    return JSON.parse(result as string);
};


const tripController = {
    createTrip: async (req: Request, res: Response) => {
        try {
            logger.info({ requestId: res.locals.requestId }, "trip.create.start");

            // Atomically claim one driver — removed from the hash immediately,
            // invisible to any concurrent request from this point forward.
            const reservedDriver = await atomicPop(DRIVER_KEY);
            if (!reservedDriver) {
                tripCreationTotal.inc({ result: 'no_driver' });
                return res.status(404).json({ message: "No active drivers available" });
            }

            // Atomically claim one vehicle.
            const reservedVehicle = await atomicPop(VEHICLE_KEY);
            if (!reservedVehicle) {
                // No vehicle available — put the driver back (compensation step).
                await redisClient.hSet(DRIVER_KEY, reservedDriver._id, JSON.stringify(reservedDriver));
                tripCreationTotal.inc({ result: 'no_vehicle' });
                return res.status(404).json({ message: "No available vehicles" });
            }

            // Both resources are exclusively ours. Create the trip record.
            let newTrip;
            try {
                newTrip = await trips.create({
                    driver: reservedDriver._id,
                    vehicle: reservedVehicle._id,
                    status: "pending",
                });
            } catch (dbError) {
                // DB write failed — compensate both reservations so they re-enter the pool.
                await redisClient.hSet(DRIVER_KEY, reservedDriver._id, JSON.stringify(reservedDriver));
                await redisClient.hSet(VEHICLE_KEY, reservedVehicle._id, JSON.stringify(reservedVehicle));
                tripCreationTotal.inc({ result: 'db_error' });
                throw dbError;
            }

            // Publish the event. Driver/vehicle services will mark them occupied/assigned
            // and emit availability events — those will attempt hDel on keys already gone. No-op, fine.
            await publishToExchange("new-trip", { ...newTrip.toObject(), _correlationId: res.locals.requestId });

            tripCreationTotal.inc({ result: 'success' });
            res.status(201).json({
                _id: newTrip._id,
                driver: newTrip.driver.toString(),
                vehicle: newTrip.vehicle.toString(),
                status: newTrip.status,
                start_time: newTrip.start_time.toISOString(),
            });
        } catch (error: any) {
            logger.error({ requestId: res.locals.requestId, err: error }, "trip.create.error");
            res.status(500).json({ message: error.message });
        }
    },

    getTrips: async (_req: Request, res: Response) => {
        try {
            const allTrips = await trips.find().lean();
            const formattedTrips = allTrips.map((trip: any) => ({
                id: trip._id.toString(),
                driver: trip.driver.toString(),
                vehicle: trip.vehicle.toString(),
                status: trip.status,
                start_time: trip.start_time.toISOString(),
                end_time: trip.end_time ? trip.end_time.toISOString() : "null",
            }));
            res.status(200).json(formattedTrips);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    },

    getTripById: async (req: Request, res: Response) => {
        try {
            const trip = await trips.findById(req.params.id).lean();
            if (!trip) {
                return res.status(404).json({ message: "Trip not found" });
            }
            res.status(200).json({
                id: trip._id.toString(),
                driver: trip.driver.toString(),
                vehicle: trip.vehicle.toString(),
                status: trip.status,
                start_time: trip.start_time.toISOString(),
                end_time: trip.end_time ? trip.end_time.toISOString() : "null",
            });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    },

    updateTripStatus: async (req: Request, res: Response) => {
        try {
            const { status } = req.body;
            const trip = await trips.findById(req.params.id);

            if (!trip) {
                return res.status(404).json({ message: "Trip not found" });
            }
            if (!["complete", "cancelled", "ongoing"].includes(status)) {
                return res.status(400).json({ message: "Invalid status" });
            }

            trip.status = status;
            if (status === "complete" || status === "cancelled") {
                trip.end_time = new Date();
                await publishToExchange("trip-complete", { ...trip.toObject(), _correlationId: res.locals.requestId });
            }
            await trip.save();

            res.status(200).json({
                id: trip._id,
                driver: trip.driver.toString(),
                vehicle: trip.vehicle.toString(),
                status: trip.status,
                start_time: trip.start_time.toISOString(),
                end_time: trip.end_time ? trip.end_time.toISOString() : "null",
            });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
};

subscribeToEvent("driver-availability", async (message)=>{
    const envelope = JSON.parse(message);
    const { eventId, correlationId } = envelope;
    const parsedMessage = envelope?.payload ?? envelope;

    if (eventId) {
        const isNew = await redisClient.set(`dedupe:trips:${eventId}`, '1', { NX: true, EX: 86400 });
        if (!isNew) {
            logger.info({ eventId, correlationId }, "rabbit.dedupe.skip");
            return;
        }
    }
    if(parsedMessage.availability === "active"){
        await redisClient.hSet(DRIVER_KEY, parsedMessage.driver_id, JSON.stringify({ _id: parsedMessage.driver_id }));
    } else if(parsedMessage.availability === "inactive" || parsedMessage.availability === "occupied"){
        await redisClient.hDel(DRIVER_KEY, parsedMessage.driver_id);
    }
});

subscribeToEvent("vehicle-availability", async (message)=>{
    const envelope = JSON.parse(message);
    const { eventId, correlationId } = envelope;
    const parsedMessage = envelope?.payload ?? envelope;

    if (eventId) {
        const isNew = await redisClient.set(`dedupe:trips:${eventId}`, '1', { NX: true, EX: 86400 });
        if (!isNew) {
            logger.info({ eventId, correlationId }, "rabbit.dedupe.skip");
            return;
        }
    }
    if(parsedMessage.availability === "available"){
        await redisClient.hSet(VEHICLE_KEY, parsedMessage.vehicle_id, JSON.stringify({ _id: parsedMessage.vehicle_id }));
    } else if(parsedMessage.availability === "in-maintenance" || parsedMessage.availability === "assigned"){
        await redisClient.hDel(VEHICLE_KEY, parsedMessage.vehicle_id);
    }
});

export default tripController;