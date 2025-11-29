import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().min(0, "Price must be non-negative"),
  description: z.string().optional(),
  image: z.url().optional(),
  categoryId: z.number().min(1, "Category ID is required"),
});

export type createProductSchemaType = z.infer<typeof createProductSchema>;
