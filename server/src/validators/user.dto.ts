import { z } from "zod";

export const loginUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password required"),
  role: z.string().optional(),
});

export type loginUserSchemaType = z.infer<typeof loginUserSchema>;
