import { Request, Response } from "express";
import drivers from "../models/driver.model";
import { subscribeToEvent } from "../services/rabbit";
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
            const allDrivers = await drivers.find();
            res.status(200).json(allDrivers);
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    },
    getDriverById: async (req: Request, res: Response)=>{
        const id = req.params.id;   
        try{
            const driver = await drivers.findById({_id: id});
            if(driver){
                res.status(200).json(driver);
            } else{
                res.status(404).json({message: 'Driver not found'});
            }
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    },
    updateDriverAvailability: async (req: Request, res: Response)=>{
        const id = req.params.id;
        const {availability} = req.body;
        try{
            const driverExists = await drivers.findById({_id: id});
            if(!driverExists){
                res.status(404).json({message: 'Driver not found'});
                return;
            }
            driverExists.status = availability;
            await driverExists.save();
            res.status(200).json(driverExists);
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    },
    getDriverByStatus: async (req: Request, res: Response)=>{
        const status = req.params.status;
        console.log(status);
        try{
            const driver = await drivers.findOne({status: status});
            if(driver){
                res.status(200).json(driver);
                return
            } else{
                res.status(404);
                return
            }
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    },
}
  
subscribeToEvent("new-trip", async (message: any)=>{
    console.log("message: ", message)
    const trip = JSON.parse(message);

    const driver_id = trip.driver;
    const driver = await drivers.findById(driver_id);
    console.log("driver: ", driver);
    if(driver){
        driver.status = 'occupied';
        await driver.save();
    };    
});

subscribeToEvent("trip-complete", async (message: any)=>{
    console.log('Trip completed: ', message.content.toString());
    const trip = JSON.parse(message.toString());
    let driverId = mongoose.Types.ObjectId.createFromHexString(trip.driver);
    console.log("driverId: ", driverId);
    const driver = await drivers.findById({_id: driverId});
    if(driver){
        driver.status = 'active';
        await driver.save();
    };    
});

export default DriverController;