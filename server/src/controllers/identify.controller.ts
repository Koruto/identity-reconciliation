import type { Request, Response } from "express";
import type { IdentifyResponse } from "../models/api.types.js";
import type { ValidatedIdentifyBody } from "../middleware/validateIdentifyBody.js";


export async function identify(
  req: Request & { validatedIdentifyBody?: ValidatedIdentifyBody },
  res: Response
): Promise<void> {
  const stub: IdentifyResponse = {
    contact: {
      primaryContactId: 0,
      emails: req.validatedIdentifyBody?.email ? [req.validatedIdentifyBody.email] : [],
      phoneNumbers: req.validatedIdentifyBody?.phoneNumber
        ? [req.validatedIdentifyBody.phoneNumber]
        : [],
      secondaryContactIds: [],
    },
  };
  res.status(200).json(stub);
}
