import "./tracing";
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import router from "./routes/driver.routes";
import healthRouter from "./routes/health.routes";
import {connect} from "./services/rabbit";
import { requestIdMiddleware } from "./middleware/requestId";
import { metricsMiddleware } from "./middleware/metrics";
import { httpLogger } from "./middleware/httpLogger";
import { logger } from "./utils/logger";
import { register } from "./services/metrics";

connect();

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);
app.use(metricsMiddleware);
app.use(httpLogger);

const port = 3001;

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/health', healthRouter);
app.use('/drivers', router);

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
