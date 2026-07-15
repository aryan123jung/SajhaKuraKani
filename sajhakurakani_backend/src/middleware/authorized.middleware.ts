import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../configs";
import { HttpError } from "../errors/http-error";
import { IUser } from "../models/user.model";
import { UserRepository } from "../repositories/user.repository";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface AuthTokenPayload extends jwt.JwtPayload {
  id: string;
  email?: string;
  role?: string;
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

    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authorization token",
      });
    }

    if (!decodedToken.id) {
      throw new HttpError(401, "Authorization token could not be verified");
    }

    const user = await userRepository.getUserById(decodedToken.id);

    if (!user) {
      throw new HttpError(401, "Authorized user was not found");
    }

    req.user = user;
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
