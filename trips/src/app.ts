import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import router from "./routes/trips.routes";
import {connect} from "./services/rabbit";
connect();
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = 3003;


app.use('/trips', router);

// Connect to MongoDB
const dbUrl = process.env.MONGO_URL;

if (!dbUrl) {
  throw new Error("MONGO_URL is not defined in the environment variables");
}

mongoose
  .connect(dbUrl)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error.message);
  });

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
