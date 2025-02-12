import { Request, Response } from "express";
import vehicles from "../model/vehicle.model";
import { subscribeToEvent } from "../services/rabbit";
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
      res.status(201).json(newVehicle);
    } catch (error: any) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  },

  getVehicles: async (req: Request, res: Response) => {
    try {
      const allVehicles = await vehicles.find();
      console.log(allVehicles);
      res.status(200).json(allVehicles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  getVehicleById: async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
      const vehicle = await vehicles.findById({ _id: id });
      console.log(vehicle);
      if (vehicle) {
        res.status(200).json(vehicle);
      } else {
        res.status(404).json({ message: "Vehicle not found" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
  updateVehicleAvailability: async (req: Request, res: Response) => {
    const id = req.params.id;
    const { availability } = req.body;
    try {
      const vehicleExists = await vehicles.findById({ _id: id });
      if (!vehicleExists) {
        res.status(404).json({ message: "Vehicle not found" });
        return;
      }

      vehicleExists.availability = availability;
      await vehicleExists.save();
      res.status(200).json(vehicleExists);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
  getVehicleByStatus: async (req: Request, res: Response) => {
    const availability = req.params.status;
    try {
      const vehicle = await vehicles.findOne({ availability: availability });
      if (vehicle) {
        res.status(200).json(vehicle);
      } else {
        res.status(404);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};

subscribeToEvent("new-trip", async (message: any) => {
    console.log("New trip received:", message);

    const trip = JSON.parse(message);
    console.log("Vehicle:", trip.vehicle);
    
    const vehicleId = trip.vehicle; // This is a string id
    const vehicle = await vehicles.findById(vehicleId);
    console.log("vehicle:", vehicle);
    if (vehicle) {
        vehicle.availability = "assigned";
        await vehicle.save();
    }
});

subscribeToEvent("trip-complete", async (message: any) => {
  console.log("Trip completed: ", message.content.toString());
  const trip = JSON.parse(message.content.toString());
  const vehicle = await vehicles.findById({ _id: trip.vehicle });
  if (vehicle) {
    vehicle.availability = "available";
    await vehicle.save();
  }
});

export default vehicleController;
