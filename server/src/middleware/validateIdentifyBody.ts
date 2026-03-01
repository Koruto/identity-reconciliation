import type { Request, Response, NextFunction } from "express";

export interface ValidatedIdentifyBody {
  email?: string;
  phoneNumber?: string;
}

function isPresent(v: unknown): v is string | number {
  return v !== undefined && v !== null && v !== "";
}

export function validateIdentifyBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Request body must be a JSON object." });
    return;
  }

  const rawEmail = body.email;
  const rawPhone = body.phoneNumber;

  if (!isPresent(rawEmail) && !isPresent(rawPhone)) {
    res.status(400).json({
      error: "At least one of email or phoneNumber is required.",
    });
    return;
  }

  let email: string | undefined;
  if (rawEmail !== undefined && rawEmail !== null) {
    if (typeof rawEmail !== "string" || rawEmail.trim() === "") {
      res.status(400).json({ error: "email must be a non-empty string." });
      return;
    }
    email = rawEmail.trim().toLowerCase();
  }

  let phoneNumber: string | undefined;
  if (rawPhone !== undefined && rawPhone !== null) {
    const s =
      typeof rawPhone === "number"
        ? String(rawPhone).trim()
        : typeof rawPhone === "string"
          ? rawPhone.trim()
          : "";
    if (s === "") {
      res.status(400).json({
        error: "phoneNumber must be a non-empty string or number.",
      });
      return;
    }
    phoneNumber = s;
  }

  if (!email && !phoneNumber) {
    res.status(400).json({
      error: "At least one of email or phoneNumber must be non-empty.",
    });
    return;
  }

  (req as Request & { validatedIdentifyBody: ValidatedIdentifyBody }).validatedIdentifyBody = {
    ...(email && { email }),
    ...(phoneNumber && { phoneNumber }),
  };
  next();
}
