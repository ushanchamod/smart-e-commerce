import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares";
import { JWTPayloadType } from "../dto";
import { sendError, sendSuccess } from "../utils";
import { db } from "../db";
import { usersTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { loginUserSchemaType } from "../validators/user.dto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/** User login controller
 * Validates user credentials, generates JWT token, and sets it in an HTTP-only cookie
 * */
export const UserLogin = async (req: Request, res: Response) => {
  const { email, password, role } = req.body as loginUserSchemaType;

  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()));
    const user = users[0];

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return sendError(res, "Invalid password", 401);
    }

    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        role: user.role,
      } as JWTPayloadType,
      process.env.JWT_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return sendSuccess(
      res,
      {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        token,
      },
      "User logged in successfully"
    );
  } catch (error: unknown) {
    console.error("Error during user login:", error);
    throw error;
  }
};

export const LogoutUser = async (req: AuthenticatedRequest, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  return sendSuccess(res, null, "User logged out successfully");
};

export const GetMe = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user as JWTPayloadType;

  console.log({
    user,
  });

  try {
    const [userData] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, user?.email.toLowerCase()));

    if (!userData) {
      return sendError(res, "User not found", 404);
    }
    return sendSuccess(res, {
      message: "User data retrieved successfully",
      data: userData,
    });
  } catch (error: unknown) {
    console.error("Error retrieving user data:", error);
    return sendError(res, "Failed to retrieve user data", 500);
  }
};
