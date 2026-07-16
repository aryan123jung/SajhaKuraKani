import { NextFunction, Request, Response } from "express";
import { securityStateStore } from "../security/security-state.store";

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
  message: string;
  keyGenerator?: (req: Request) => string;
};

export const getClientIp = (req: Request): string => {
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
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // rate limiting
      const key = getKey(req, options);
      const { count, retryAfterMs } =
        await securityStateStore.incrementRateLimitCounter(key, options.windowMs);

      if (count > options.maxRequests) {
        const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
        res.setHeader("Retry-After", retryAfterSeconds.toString());
        return res.status(429).json({
          success: false,
          message: options.message,
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
