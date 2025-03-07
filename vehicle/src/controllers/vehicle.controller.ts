import { Request, Response } from "express";
import vehicles from "../model/vehicle.model";
import { publishToExchange, subscribeToEvent } from "../services/rabbit";
import mongoose from "mongoose";

const vehicleController = {
  registerVehicle: async (req: Request, res: Response) => {
    const { type, licence_plate } = req.body;
    console.log("new vehicle: ", type, licence_plate);
    try {
      const newVehicle = await vehicles.create({
        type: type,
        licence_plate: licence_plate,
      });
      publishToExchange("vehicle-availability", {vehicle_id: newVehicle._id, availability: "available"});
      res.status(201).json(newVehicle);
    } catch (error: any) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  },

  getVehicles: async (req: Request, res: Response) => {
    try {
      const allVehicles = await vehicles.find().lean();
      let vehiclesAll = allVehicles.map((vehicle: any) => {
        let obj = { ...vehicle, id: vehicle._id.toString(), license_plate: vehicle.licence_plate };
        return obj;
      });
      console.log(vehiclesAll);

      res.status(200).json(vehiclesAll);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  getVehicleById: async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
      const vehicle = await vehicles.findById({ _id: id }).lean();
      if (vehicle) {
        const obj = { ...vehicle, id: vehicle._id.toString(), license_plate: vehicle.licence_plate };
        console.log(obj);
        res.status(200).json(obj);
      } else {
        res.status(404).json({ message: "Vehicle not found" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
  updateVehicleAvailability: async (req: Request, res: Response) => {
    const { id, availability } = req.body;
    try {

      if(!id || !availability || !['available', 'in-maintenance', 'assigned'].includes(availability)){
        res.status(400).json({ message: "id and availability are required" });
        return;
      }

      const vehicleExists = await vehicles.findById({ _id: id });
      if (!vehicleExists) {
        res.status(404).json({ message: "Vehicle not found" });
        return;
      }

      if(vehicleExists.availability.toString() === availability){
        res.status(400).json({ message: "Vehicle is already " + availability });
        return;
      }

      if(availability === "available" && vehicleExists.availability.toString() == "in-maintenance"){
        vehicleExists.maintainance_logs[vehicleExists.maintainance_logs.length - 1].end_time = new Date();
        vehicleExists.markModified("maintainance_logs");
      }

      if(availability === "in-maintenance" && vehicleExists.availability.toString() == "available"){
        vehicleExists.maintainance_logs.push({
          start_time: new Date(),
          end_time: null
        })
      }
      vehicleExists.availability = availability;
      await vehicleExists.save();
      await publishToExchange("vehicle-availability", {vehicle_id: id, availability});
      res.status(200).json(vehicleExists);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
  getVehiclesByStatus: async (req: Request, res: Response) => {
    const availability = req.params.status;
    try {
      const availableVehicles = await vehicles.find({ availability: availability });
      res.status(200).json(availableVehicles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};

subscribeToEvent("new-trip", async (message: any) => {
  try {
    console.log("New trip received:", message);

    const trip = JSON.parse(message);
    console.log("Vehicle:", trip.vehicle);
    
    const vehicleId = trip.vehicle; // This is a string id
    const vehicle = await vehicles.findById(vehicleId);
    console.log("vehicle:", vehicle);
    if (vehicle) {
      vehicle.availability = "assigned";
      await vehicle.save();
      publishToExchange("vehicle-availability", {vehicle_id: vehicleId, availability: "assigned"});
    }
  } catch (error) {
    console.error("Error processing new trip:", error);
  }
});

subscribeToEvent("trip-complete", async (message: any) => {
  try{
    console.log("Trip completed: ", message);
    const trip = JSON.parse(message);
    const vehicle = await vehicles.findById(trip.vehicle);
    if (vehicle) {
      vehicle.availability = "available";
      await vehicle.save();
      publishToExchange("vehicle-availability", {vehicle_id: trip.vehicle, availability: "available"});
    }
  }catch (error) {
    console.error("Error processing complete trip:", error);
  }
});

export default vehicleController;
