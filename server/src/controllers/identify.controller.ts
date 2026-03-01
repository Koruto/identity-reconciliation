import type { Request, Response } from "express";
import type { IdentifyResponse } from "../models/api.types.js";

export function identify(_req: Request, res: Response): void {
  const stub: IdentifyResponse = {
    contact: {
      primaryContactId: 0,
      emails: [],
      phoneNumbers: [],
      secondaryContactIds: [],
    },
  };
  res.status(200).json(stub);
}
