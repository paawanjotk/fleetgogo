import { Request, Response } from "express";
import drivers from "../models/driver.model";
import { subscribeToQueue } from "../services/rabbit";
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const DriverController = {
    registerDriver : async (req: Request, res: Response)=>{

        const {name, phone, password, license_number} =  req.body;


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

            const token = jwt.sign({id: newDriver._id}, secret);

            res.status(201).json({token, newDriver});
        } catch(error: any){
            res.status(500).json({message: error.message});
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
        try{
            const driver = await drivers.findOne({status: status});
            if(driver){
                res.status(200).json(driver);
            } else{
                res.status(404);
            }
        } catch(error: any){
            res.status(500).json({message: error.message});
        }
    },
}

subscribeToQueue("new-trip", async (message: any)=>{
    console.log('New trip received: ', message.content.toString());
    const trip = JSON.parse(message.content.toString());
    const driver = await drivers.findById({_id: trip.driver});
    if(driver){
        driver.status = 'occupied';
        await driver.save();
    };    
});

subscribeToQueue("trip-complete", async (message: any)=>{
    console.log('Trip completed: ', message.content.toString());
    const trip = JSON.parse(message.content.toString());
    const driver = await drivers.findById({_id: trip.driver});
    if(driver){
        driver.status = 'active';
        await driver.save();
    };    
});

export default DriverController;