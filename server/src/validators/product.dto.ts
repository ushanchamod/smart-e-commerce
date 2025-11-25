import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z
    .string()
    .min(1, "Price is required")
    .refine((val) => !isNaN(Number(val)), {
      message: "Price must be a valid number",
    }),
  description: z.string().optional(),
  image: z.url().optional(),
  categoryId: z.string().min(1, "Category ID is required"),
});

export type createProductSchemaType = z.infer<typeof createProductSchema>;
