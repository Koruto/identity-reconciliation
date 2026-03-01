import { Router } from "express";
import { identify } from "../controllers/identify.controller.js";
import { validateIdentifyBody } from "../middleware/validateIdentifyBody.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.post("/", validateIdentifyBody, asyncHandler(identify));

export const identifyRoutes = router;
