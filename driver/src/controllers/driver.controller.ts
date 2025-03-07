import { Request, Response } from "express";
import drivers from "../models/driver.model";
import { publishToExchange, subscribeToEvent } from "../services/rabbit";
import mongoose from "mongoose";
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const DriverController = {
    registerDriver : async (req: Request, res: Response)=>{

        const {name, phone, password, license_number} =  req.body;
        console.log("register driver: ", name);

        const saltRounds = 10;
        try{
            const driver = await drivers.findOne({ phone: phone });

            if(driver){
                res.status(400).json({message: 'Driver already exists'});
                return;
            }
            
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const newDriver= await drivers.create({
                name: name,
                phone: phone,
                password: hashedPassword,
                license_number: license_number
            })          
            
            const secret = process.env.JWT_SECRET;

            if(!secret){
                throw new Error('JWT_SECRET is not defined in the environment variables');
            }

            const token = jwt.sign({id: newDriver._id}, secret, {expiresIn: '7d'});
            
            publishToExchange("driver-availability", {driver_id: newDriver._id, availability: 'active'});

            res.status(201).json({token, newDriver});
        } catch(error: any){
            console.log(error);
            res.status(500).json({message: error.message || "Internal Server Error"});
        }
    },

    loginDriver: async(req: Request, res: Response)=>{
        const {phone, password} = req.body
        try{

            
            const foundDriver = await drivers.findOne({phone: phone});

            if(foundDriver){
                const secret = process.env.JWT_SECRET;

                if(!secret){
                    throw new Error('JWT_SECRET is not defined in the environment variables');
                }

                const match = await bcrypt.compare(password, foundDriver.password);

                if(!match){
                    res.status(400).json({message: 'Invalid email or password'});
                    return; 
                }

                const token = jwt.sign({id: foundDriver._id}, secret);

                res.status(200).json({token, foundDriver});

            } else {
                res.status(404).json({message: 'Driver not found'});
            }
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    },
    getDrivers: async (req: Request, res: Response)=>{
        console.log("get all drivers")
        try{
            let allDrivers = await drivers.find().lean();
            let driversAll = allDrivers.map((driver: any) => {
                let obj = { ...driver, id: driver._id.toString() };
                delete obj._id;
                return obj;
            });
            console.log(driversAll);
            res.status(200).json(driversAll);
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    },
    getDriverById: async (req: Request, res: Response)=>{
        const id = req.params.id;   
        try{
            const driver = await drivers.findById({_id: id}).lean();
            if(driver){
                let obj = { ...driver, id: driver._id.toString() };
                console.log(obj);
                res.status(200).json(obj);
                
            } else{
                res.status(404).json({message: 'Driver not found'});
            }
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    },
    updateDriverAvailability: async (req: Request, res: Response)=>{
        const {id, availability} = req.body;
        try{
            if(!id || !availability || !['active', 'inactive', 'occupied'].includes(availability)){
                res.status(400).json({message: 'id and availability are required'});
                return;
            }
            const driverExists = await drivers.findById({_id: id});
            if(!driverExists){
                res.status(404).json({message: 'Driver not found'});
                return;
            }
            if(driverExists.status === availability){
                res.status(400).json({message: 'Driver is already ' + availability});
                return;
            }
            driverExists.status = availability;
            await driverExists.save();
            publishToExchange("driver-availability", {driver_id: id, availability});
            res.status(200).json(driverExists);
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    },
    getDriversByStatus: async (req: Request, res: Response)=>{
        const status = req.params.status;
        console.log(status);
        try{
            const driverByStatus = await drivers.find({status: status});
            console.log(status, ": ", driverByStatus);
            res.status(200).json(driverByStatus);
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    },

    JWTmiddleware: async (req: Request, res: Response, next: any)=>{
        const token = req.headers.authorization;
        if(!token){
            res.status(401).json({message: 'Unauthorized'});
            return;
        }
        const secret = process.env.JWT_SECRET;
        if(!secret){
            throw new Error('JWT_SECRET is not defined in the environment variables');
        }
        try{
            const decoded = jwt.verify(token, secret);
            const driver = await drivers.findById({_id: decoded.id});
            if(!driver){
                res.status(404).json({message: 'Invalid token'});
                return;
            }
            req.body.id = decoded.id;

            next();
        } catch(error: any){
            res.status(401).json({message: 'Unauthorized'});
        }
    },
}
  
subscribeToEvent("new-trip", async (message: any)=>{
    try {
        console.log("message: ", message)
        const trip = JSON.parse(message);
    
        const driver_id = trip.driver;
        const driver = await drivers.findById(driver_id);
        console.log("driver: ", driver);
        if(driver){
            driver.status = 'occupied';
            await driver.save();
            publishToExchange("driver-availability", {driver_id, availability: 'occupied'});
        };
        
    } catch (error) {
        console.error("Error processing new trip:", error);
    }
});

subscribeToEvent("trip-complete", async (message: any)=>{
    try {
        console.log('Trip completed: ', message);
        const trip = JSON.parse(message);
        const driver = await drivers.findById(trip.driver);
        console.log("driver: ", driver);
        if(driver){
            driver.status = 'active';
            await driver.save();
            publishToExchange("driver-availability", {driver_id: trip.driver , availability: 'active'});
        };
        
    } catch (error) {
        console.error("Error processing complete trip:", error);
    }    

});

export default DriverController;