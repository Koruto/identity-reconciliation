import type { Request, Response } from "express";
import type { ValidatedIdentifyBody } from "../middleware/validateIdentifyBody.js";
import * as identifyService from "../services/identify.service.js";

export async function identify(
  req: Request & { validatedIdentifyBody?: ValidatedIdentifyBody },
  res: Response
): Promise<void> {
  const { email, phoneNumber } = req.validatedIdentifyBody ?? {};
  const result = await identifyService.identify(email, phoneNumber);
  res.status(200).json(result);
}
