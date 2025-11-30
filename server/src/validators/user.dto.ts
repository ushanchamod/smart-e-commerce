import { z } from "zod";

export const loginUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password required"),
  role: z.string().optional(),
});

export type loginUserSchemaType = z.infer<typeof loginUserSchema>;

export const registerUserSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email address"),
  password: z.string().min(3, "Password must be at least 3 characters long"),
});
export type registerUserSchemaType = z.infer<typeof registerUserSchema>;
