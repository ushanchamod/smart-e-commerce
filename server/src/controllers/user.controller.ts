import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares";
import { JWTPayloadType } from "../dto";
import { sendError } from "../utils";

/** User login controller
 * Validates user credentials, generates JWT token, and sets it in an HTTP-only cookie
 * */
export const UserLogin = async (req: Request, res: Response) => {
  const { username, password, role } = req.body;

  // try {
  //   const users = await db
  //     .select()
  //     .from(usersTable)
  //     .where(eq(usersTable.username, username.toLowerCase()));
  //   const user = users[0];

  //   if (!user) {
  //     return sendError(res, "User not found", 404);
  //   }

  //   if (role && role === "SUPER_ADMIN") {
  //     if (["SUPER_ADMIN", "OWNER"].includes(user.role) === false) {
  //       return sendError(res, `Unauthorized to access as ${role}`, 403);
  //     }
  //   } else if (role && role === "COMPANY_ADMIN") {
  //     if (user.role !== "COMPANY_ADMIN") {
  //       return sendError(res, `Unauthorized to access as ${role}`, 403);
  //     }
  //   }

  //   const credentials = await db
  //     .select()
  //     .from(userCredentialsTable)
  //     .where(eq(userCredentialsTable.userId, user.userId));

  //   if (credentials.length === 0) {
  //     return sendError(res, "Credentials not found for user", 404);
  //   }

  //   const credential = credentials[0];

  //   if (!credential.passwordHash) {
  //     return sendError(res, "Invalid password", 401);
  //   }

  //   const isPasswordValid = await bcrypt.compare(
  //     password,
  //     credential.passwordHash
  //   );
  //   if (!isPasswordValid) {
  //     return sendError(res, "Invalid password", 401);
  //   }

  //   if (!config.JWT_SECRET) {
  //     return sendError(res, "JWT secret is not configured", 500);
  //   }
  //   const token = jwt.sign(
  //     {
  //       userId: user.userId,
  //       username: user.username,
  //       email: user.email,
  //       firstName: user.firstName,
  //       role: user.role,
  //       companyId: user.companyId,
  //       permissions: user.permissions,
  //     } as JWTPayloadType,
  //     config.JWT_SECRET,
  //     {
  //       expiresIn: "7d",
  //     }
  //   );

  //   res.cookie("token", token, {
  //     httpOnly: true,
  //     secure: config.nodeEnv === "production",
  //     sameSite: config.nodeEnv === "production" ? "none" : "lax",
  //     path: "/",
  //     maxAge: 7 * 24 * 60 * 60 * 1000,
  //   });

  //   // sendWhatsAppMessage({
  //   //   to: "+94716654153",
  //   //   templateName: "hello_world",
  //   // });

  //   // console.log("WhatsApp response:", wpResponse);

  //   return sendSuccess(res, {
  //     message: "User logged in successfully",
  //     data: {
  //       username: user.username,
  //       email: user.email,
  //       firstName: user.firstName,
  //       lastName: user.lastName,
  //       role: user.role,
  //       companyId: user.companyId,
  //       permissions: user.permissions as string[],
  //       token,
  //     },
  //   });
  // } catch (error: unknown) {
  //   console.error("Error during user login:", error);
  //   throw error;
  // }
};

/** Get current authenticated user info
 * Retrieves user information based on the JWT token in the request
 * */
export const GetMe = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user as JWTPayloadType;

  // try {
  //   // const userData = await UserModel.findOne({
  //   //   username,
  //   // }).select("-hash");
  //   // const userData = req.user; // need change
  //   const [userData] = await db
  //     .select()
  //     .from(usersTable)
  //     .where(eq(usersTable.username, user?.username));

  //   if (!userData) {
  //     return sendError(res, "User not found", 404);
  //   }
  //   return sendSuccess(res, {
  //     message: "User data retrieved successfully",
  //     data: userData,
  //   });
  // } catch (error: unknown) {
  //   console.error("Error retrieving user data:", error);
  //   return sendError(res, "Failed to retrieve user data", 500);
  // }
};
