import mongoose, { Schema } from "mongoose";

const tripSchema = new Schema({
    driver:{
        type: Schema.Types.ObjectId,
        required: true
    },
    vehicle:{
        type: Schema.Types.ObjectId,
        required: true
    },
    start_time:{
        type: Date,
        required: true,
        default: Date.now
    },
    end_time:{
        type: Date,
        required: false,
        default: null
    },
    status:{
        type: String,
        required: true,
        enum: [ 'pending', 'ongoing', 'complete', 'cancelled'],
        default: 'ongoing'
    }
});

const trips = mongoose.model('trips', tripSchema);

export default trips;
