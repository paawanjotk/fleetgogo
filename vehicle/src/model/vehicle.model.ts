import mongoose from "mongoose";


const vehicleSchema = new mongoose.Schema({ 
    licence_plate: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true
    },
    availability: {
        type: String,
        enum: ["available", "assigned", "in-maintenance"],
        required: true,
        default: "available"
    },
    maintainance_logs: {
        type: Array,
        default: []
    }
});

const vehicles = mongoose.model("vehicles", vehicleSchema);

export default vehicles;