import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  JWT_PUBLIC_KEY,
} from "../configs";
import { HttpError } from "../errors/http-error";
import { IUser } from "../models/user.model";
import { UserRepository } from "../repositories/user.repository";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      authSessionId?: string;
    }
  }
}

interface AuthTokenPayload extends jwt.JwtPayload {
  id: string;
  email?: string;
  role?: string;
  sid?: string;
  tokenType?: string;
}

const userRepository = new UserRepository();

export const authorizedMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HttpError(401, "Authorization token is required");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new HttpError(401, "Authorization token is missing");
    }

    let decodedToken: AuthTokenPayload;
    if (!JWT_PUBLIC_KEY) {
      throw new HttpError(500, "JWT public key is not configured on the server");
    }

    try {
      decodedToken = jwt.verify(token, JWT_PUBLIC_KEY, {
        algorithms: [JWT_ALGORITHM],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as AuthTokenPayload;
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authorization token",
      });
    }

    if (!decodedToken.id) {
      throw new HttpError(401, "Authorization token could not be verified");
    }

    if (decodedToken.tokenType !== "access" || !decodedToken.sid) {
      throw new HttpError(401, "Authorization token could not be verified");
    }

    const userWithSecurityFields = await userRepository.getUserById(decodedToken.id, true);

    if (!userWithSecurityFields) {
      throw new HttpError(401, "Authorized user was not found");
    }

    if (
      userWithSecurityFields.passwordChangedAt &&
      decodedToken.iat &&
      decodedToken.iat <
        Math.floor(userWithSecurityFields.passwordChangedAt.getTime() / 1000)
    ) {
      throw new HttpError(401, "Authorization token is no longer valid");
    }

    const user = await userRepository.getUserById(decodedToken.id);
    if (!user) {
      throw new HttpError(401, "Authorized user was not found");
    }

    req.user = user;
    req.authSessionId = decodedToken.sid;
    return next();
  } catch (err: Error | any) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new HttpError(401, "Unauthorized: no user info");
    }

    if (req.user.role !== "admin") {
      throw new HttpError(403, "Forbidden: admin access only");
    }

    return next();
  } catch (err: Error | any) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};
