import express from "express";
import cors from "cors";
import { identifyRoutes } from "./routes/identify.routes.js";
import { contactsRoutes } from "./routes/contacts.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/identify", identifyRoutes);
app.use("/contacts", contactsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use(errorHandler);

export default app;
