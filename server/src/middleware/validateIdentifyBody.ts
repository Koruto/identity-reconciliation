import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

const IdentifyBodySchema = z
  .object({
    email: z
      .string()
      .optional()
      .transform((s) => (s?.trim() ? s.trim().toLowerCase() : null)),
    phoneNumber: z
      .string()
      .optional()
      .transform((s) => (s?.trim() ? s.trim() : null)),
  })
  .refine((data) => data.email ?? data.phoneNumber, {
    message: "At least one of email or phoneNumber is required.",
  });

export type ValidatedIdentifyBody = z.infer<typeof IdentifyBodySchema>;

export function validateIdentifyBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = IdentifyBodySchema.safeParse(req.body);

  if (!result.success) {
    const first = result.error.issues[0];
    const message = first?.message ?? result.error.message ?? "Validation failed";
    res.status(400).json({ error: message });
    return;
  }

  (req as Request & { validatedIdentifyBody: ValidatedIdentifyBody }).validatedIdentifyBody =
    result.data;
  next();
}
