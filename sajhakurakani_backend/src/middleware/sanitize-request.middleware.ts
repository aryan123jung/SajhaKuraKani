import { NextFunction, Request, Response } from "express";

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    // input validation & sanitization
    return value.replace(/\u0000/g, "");
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const sanitizedEntries = Object.entries(value).map(([key, nestedValue]) => [
      key,
      sanitizeValue(nestedValue),
    ]);

    return Object.fromEntries(sanitizedEntries);
  }

  return value;
};

export const sanitizeRequestMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  // input validation & sanitization
  req.body = sanitizeValue(req.body) as typeof req.body;
  req.query = sanitizeValue(req.query) as typeof req.query;
  req.params = sanitizeValue(req.params) as typeof req.params;
  next();
};
