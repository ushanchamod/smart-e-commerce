import { z } from "zod";

export const createCompanyAdminSchema = z
  .object({
    username: z.string().min(1, "Username required"),
    email: z.email("Invalid email address"),
    firstName: z.string().min(1, "First name required"),
    lastName: z.string().optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
      .min(1)
      .max(15),
    joinedDate: z.date({ error: "Invalid date format" }).optional(),
    salary: z.number().min(0, "Salary must be non-negative").optional(),
    visaStartDate: z.date({ error: "Invalid date format" }).optional(),
    visaEndDate: z.date({ error: "Invalid date format" }).optional(),
    permissions: z.array(z.string()).optional(),
    // company id is required for company admin
    companyId: z.number().int("Company ID must be an integer"),
  })
  .refine(
    (data) =>
      data.visaStartDate === undefined ||
      data.visaEndDate === undefined ||
      data?.visaEndDate > data?.visaStartDate,
    {
      message: "Visa end date must be after start date",
      path: ["visaEndDate"],
    }
  )
  .refine(
    (data) => data.joinedDate === undefined || data.joinedDate <= new Date(),
    {
      message: "Joined date cannot be in the future",
      path: ["joinedDate"],
    }
  );

export type createCompanyAdminSchemaType = z.infer<
  typeof createCompanyAdminSchema
>;

export const updateCompanyAdminSchema = z.object({
  firstName: z.string().min(1, "First name required").optional(),
  email: z.email("Invalid email address").optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional(),
});

export type updateCompanyAdminSchemaType = z.infer<
  typeof updateCompanyAdminSchema
>;

export const createSuperAdminSchema = z
  .object({
    username: z.string().min(1, "Username required"),
    email: z.email("Invalid email address"),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
      .min(1)
      .max(15),
    firstName: z.string().min(1, "First name required"),
    lastName: z.string().optional(),
    joinedDate: z.date({ error: "Invalid date format" }).optional(),
    salary: z.number().min(0, "Salary must be non-negative").optional(),
    visaStartDate: z.date({ error: "Invalid date format" }).optional(),
    visaEndDate: z.date({ error: "Invalid date format" }).optional(),
    permissions: z.array(z.string()).optional(),
    companyId: z.number().int("Company ID must be an integer").optional(),
  })
  .refine(
    (data) =>
      data.visaStartDate === undefined ||
      data.visaEndDate === undefined ||
      data?.visaEndDate > data?.visaStartDate,
    {
      message: "Visa end date must be after start date",
      path: ["visaEndDate"],
    }
  )
  .refine(
    (data) => data.joinedDate === undefined || data.joinedDate <= new Date(),
    {
      message: "Joined date cannot be in the future",
      path: ["joinedDate"],
    }
  );

export type createSuperAdminSchemaType = z.infer<typeof createSuperAdminSchema>;

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username required"),
  password: z.string().min(1, "Password required"),
  role: z.string().optional(),
});

export type loginUserSchemaType = z.infer<typeof loginUserSchema>;

export const updateMeSchema = z.object({
  firstName: z.string().min(1, "First name required").optional(),
  email: z.email("Invalid email address").optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional(),
  lastName: z.string().min(1, "Last name required").optional(),
  joinedDate: z.date({ error: "Invalid date format" }).optional(),
  salary: z.number().min(0, "Salary must be non-negative").optional(),
  visaStartDate: z.date({ error: "Invalid date format" }).optional(),
  visaEndDate: z.date({ error: "Invalid date format" }).optional(),
});

export type updateMeSchemaType = z.infer<typeof updateMeSchema>;

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Old password required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(100, "Password must be at most 100 characters long"),
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  });

export type changePasswordSchemaType = z.infer<typeof changePasswordSchema> & {
  confirmNewPassword?: never;
};
