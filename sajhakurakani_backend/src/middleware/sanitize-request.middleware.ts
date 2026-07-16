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

const replaceObjectContents = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
) => {
  for (const key of Object.keys(target)) {
    delete target[key];
  }

  Object.assign(target, source);
};

export const sanitizeRequestMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  // input validation & sanitization
  req.body = sanitizeValue(req.body) as typeof req.body;

  const sanitizedQuery = sanitizeValue(req.query);
  if (
    req.query &&
    typeof req.query === "object" &&
    !Array.isArray(req.query) &&
    sanitizedQuery &&
    typeof sanitizedQuery === "object" &&
    !Array.isArray(sanitizedQuery)
  ) {
    replaceObjectContents(
      req.query as Record<string, unknown>,
      sanitizedQuery as Record<string, unknown>
    );
  }

  const sanitizedParams = sanitizeValue(req.params);
  if (
    req.params &&
    typeof req.params === "object" &&
    sanitizedParams &&
    typeof sanitizedParams === "object" &&
    !Array.isArray(sanitizedParams)
  ) {
    replaceObjectContents(
      req.params as Record<string, unknown>,
      sanitizedParams as Record<string, unknown>
    );
  }

  next();
};
