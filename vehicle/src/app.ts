import "./tracing";
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import router from "./routes/vehicle.routes";
import healthRouter from "./routes/health.routes";
import {connect} from "./services/rabbit";
import { requestIdMiddleware } from "./middleware/requestId";
import { httpLogger } from "./middleware/httpLogger";
import { logger } from "./utils/logger";
connect();
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);
app.use(httpLogger);
const port = 3002;


app.use('/health', healthRouter);
app.use('/vehicles', router);

// Connect to MongoDB
const dbUrl = process.env.MONGO_URL;

if (!dbUrl) {
  throw new Error("MONGO_URL is not defined in the environment variables");
}

mongoose
  .connect(dbUrl)
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((error) => {
    logger.error({ err: error }, "Error connecting to MongoDB");
  });

app.listen(port, () => {
  logger.info({ port }, "Server started");
});
