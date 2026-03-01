import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = (err as { statusCode?: number }).statusCode ?? 500;
  console.error(`[${status}]`, err.message, err.stack);
  const message = status === 500 ? "Internal Server Error" : err.message;
  res.status(status).json({ error: message });
}
