import { Request, Response } from "express";
import trips from "../models/trips.model";
import axios from "axios";
import redisClient from "../services/redis";
import { publishToExchange, subscribeToEvent } from "../services/rabbit";

const DRIVER_KEY = "active_drivers";
const VEHICLE_KEY = "active_vehicles";

// Function to fetch active entities from Redis or API
const getActiveEntities = async (entity: string, apiUrl: string) => {
    console.log("Fetching data from Redis or API...");
    let cachedEntities = await redisClient.hGetAll(entity);
    
    if (Object.keys(cachedEntities).length === 0) {
        const response = await axios.get(apiUrl);
        if (!response.data) return null;
        console.log("Fetched data from API:", response.data);
        const entities = response.data;

        // **Delete the existing key before setting a hash**
        await redisClient.del(entity);

        // Use multi() to batch insert
        const multi = redisClient.multi();
        entities.forEach((e: any) => {
            multi.hSet(entity, e._id, JSON.stringify({_id: e._id}));
        });
        await multi.exec();

        cachedEntities = await redisClient.hGetAll(entity);
    }
    return Object.values(cachedEntities).map((e) => JSON.parse(e));
};


const tripController = {
    createTrip: async (req: Request, res: Response) => {
        try {
            console.log("Creating a new trip...");
            
            const drivers = await getActiveEntities(DRIVER_KEY, "http://localhost:3001/drivers/status/active");
            const vehicles = await getActiveEntities(VEHICLE_KEY, "http://localhost:3002/vehicles/status/available");

            if (!drivers || drivers.length === 0) {
                return res.status(404).json({ message: "No active drivers available" });
            }
            if (!vehicles || vehicles.length === 0) {
                return res.status(404).json({ message: "No available vehicles" });
            }

            const availableDriver = drivers[0];
            const availableVehicle = vehicles[0];

            console.log("Selected driver:", availableDriver);
            console.log("Selected vehicle:", availableVehicle);

            const newTrip = await trips.create({
                driver: availableDriver._id,
                vehicle: availableVehicle._id,
                status: "pending"
            });

            await publishToExchange("new-trip", newTrip);

            res.status(201).json({
                _id: newTrip._id,
                driver: newTrip.driver.toString(),
                vehicle: newTrip.vehicle.toString(),
                status: newTrip.status,
                start_time: newTrip.start_time.toISOString(),
            });
        } catch (error: any) {
            console.error(error);
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
                await publishToExchange("trip-complete", trip);
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
    console.log("Received driver availability event:", message);
    const parsedMessage = JSON.parse(message);
    if(parsedMessage.availability === "active"){
        await redisClient.hSet(DRIVER_KEY, parsedMessage.driver_id, JSON.stringify(parsedMessage.driver_id));
    } else if(parsedMessage.availability === "inactive" || parsedMessage.availability === "occupied"){
        await redisClient.hDel(DRIVER_KEY, parsedMessage.driver_id);
    }
});

subscribeToEvent("vehicle-availability", async (message)=>{
    console.log("Received vehicle availability event:", message);
    const parsedMessage = JSON.parse(message);
    if(parsedMessage.availability === "available"){
        await redisClient.hSet(VEHICLE_KEY, parsedMessage.vehicle_id, JSON.stringify(parsedMessage.vehicle_id));
    } else if(parsedMessage.availability === "in-maintenance" || parsedMessage.availability === "assigned"){
        await redisClient.hDel(VEHICLE_KEY, parsedMessage.vehicle_id);
    }
});

export default tripController;