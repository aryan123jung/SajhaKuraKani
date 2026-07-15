import { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
  message: string;
  keyGenerator?: (req: Request) => string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || "unknown";
};

const getKey = (req: Request, options: RateLimitOptions): string => {
  const baseKey = options.keyGenerator ? options.keyGenerator(req) : getClientIp(req);
  return `${options.keyPrefix}:${baseKey}`;
};

export const createRateLimitMiddleware = (options: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = getKey(req, options);
    const current = rateLimitStore.get(key);

    if (!current || current.resetAt <= now) {
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return next();
    }

    if (current.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      return res.status(429).json({
        success: false,
        message: options.message,
      });
    }

    current.count += 1;
    rateLimitStore.set(key, current);
    return next();
  };
};
