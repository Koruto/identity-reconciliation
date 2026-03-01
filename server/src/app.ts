import express from "express";
import { identifyRoutes } from "./routes/identify.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/identify", identifyRoutes);

app.use(errorHandler);

export default app;
