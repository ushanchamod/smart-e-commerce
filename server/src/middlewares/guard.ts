import jwt from "jsonwebtoken";
import { sendError } from "../utils";
import { NextFunction, Request, Response } from "express";
import { JWTPayloadType } from "../dto";

export interface AuthenticatedRequest extends Request {
  user?: string | jwt.JwtPayload;
}

export const useGuard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return sendError(res, "No token provided", 401);
  }
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JWTPayloadType;

    if (!decoded) {
      return sendError(res, "Invalid token", 401);
    }

    next();
  } catch (error: unknown) {
    console.error("Error verifying token:", error);
    return sendError(res, "Forbidden", 403);
  }
};
