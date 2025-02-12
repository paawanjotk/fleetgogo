import { Request, Response } from "express";
import trips from "../models/trips.model";
import axios from "axios";

import { publishToExchange, subscribeToEvent } from '../services/rabbit';
import { start } from "repl";

const tripController = {
    createTrip: async (req: Request, res: Response)=>{
        console.log("create trip");
        // const {driver_id, vehicle_id} = req.body;
        try{

            const availableDriver = await axios.get(`http://localhost:3001/drivers/status/active`);
            const availableVehicle = await axios.get(`http://localhost:3002/vehicles/status/available`);

            console.log("Available driver: ", availableDriver.data);
            console.log("Available vehicle: ", availableVehicle.data);

            if(!availableDriver.data || !availableVehicle.data){
                res.status(404).json({message: 'No available driver or vehicle'});
                return;
            }
            const newTrip = await trips.create({
                driver: availableDriver.data._id,
                vehicle: availableVehicle.data._id,
                status: 'pending'
            });

            console.log("New trip: ", newTrip);

            await publishToExchange("new-trip", newTrip);

            res.status(201).json({
                _id: newTrip._id,
                driver: (newTrip.driver).toString(),
                vehicle: (newTrip.vehicle).toString(),
                status: newTrip.status,
                start_time: (newTrip.start_time).toISOString(),
            });


        } catch(error: any){
            console.log(error);
            res.status(500).json({message: error.message});
            return
        }
    },
    getTrips: async (req: Request, res: Response)=>{
        try{
            const allTrips = await trips.find();
            res.status(200).json(allTrips);
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    },

    getTripById: async (req: Request, res: Response)=>{
        const id = req.params.id;
        try{
            const trip = await trips.findById({_id: id});
            if(trip){  
                res.status(200).json(trip);
            } else{
                res.status(404).json({message: 'Trip not found'});
            }
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    },
    updateTripStatus: async (req: Request, res: Response)=>{
        const id = req.params.id;
        const {status} = req.body;
        try{
            const tripExists = await trips.findById({_id: id});
            if(!tripExists){
                res.status(404).json({message: 'Trip not found'});
                return;
            }

            if( status!= "complete" && status!= "cancelled" && status!= "ongoing"){
                res.status(400).json({message: 'Invalid status'});
                return;
            }

            if(status === "complete" || status === "cancelled"){
                tripExists.status = status;
                tripExists.end_time= new Date();
                await tripExists.save();
                console.log("Trip completed: ", tripExists);
                await publishToExchange("trip-complete", tripExists);
            } else{
                tripExists.status = status;
                await tripExists.save();
            }

            res.status(200).json(tripExists);
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    }
}

export default tripController;