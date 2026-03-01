import { Router } from "express";
import { listContacts } from "../controllers/contacts.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listContacts));

export const contactsRoutes = router;
