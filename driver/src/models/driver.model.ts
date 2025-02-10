import mongoose, { Schema } from "mongoose";

const driverSchema = new Schema({
    phone:{
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'inactive', 'occupied'],
        default: 'active'
    },
    license_number: {
        type: String,
        required: true
    }

})

const drivers = mongoose.model('drivers', driverSchema);


export default drivers;