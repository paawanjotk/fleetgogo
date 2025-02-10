import { Request, Response } from "express";
import trips from "../models/trips.model";
import axios from "axios";

import { publishToQueue, subscribeToQueue } from '../services/rabbit';

const tripController = {
    createTrip: async (req: Request, res: Response)=>{
        // const {driver_id, vehicle_id} = req.body;
        try{

            const availableDriver = await axios.get(`http://localhost:3001/drivers/status/available`);
            const availableVehicle = await axios.get(`http://localhost:3002/vehicles/status/available`);

            if(!availableDriver.data || !availableVehicle.data){
                res.status(404).json({message: 'No available driver or vehicle'});
                return;
            }
            const newTrip = trips.create({
                driver: availableDriver.data._id,
                vehicle: availableVehicle.data._id,
                status: 'pending'
            });

            await publishToQueue("new-trip", JSON.stringify(newTrip));

            res.status(201).json(newTrip);


        } catch(error: any){
            res.status(500).json({message: error.message});
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

            if( status!= "complete" && status!= "cancelled"){
                res.status(400).json({message: 'Invalid status'});
                return;
            }

            tripExists.status = status;
            tripExists.end_time= new Date();
            await tripExists.save();
            
            console.log("Trip completed: ", tripExists);

            await publishToQueue("trip-complete", JSON.stringify(tripExists));


            res.status(200).json(tripExists);
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    }
}

export default tripController;