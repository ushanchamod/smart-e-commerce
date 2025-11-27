import { z } from "zod";

export const addToCartSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

export type addToCartSchemaType = z.infer<typeof addToCartSchema>;

export const createOrderSchema = z.object({
  address: z.string().min(1, "Address required"),
  paymentMethod: z.enum(["cod", "online"]),
});

export type createOrderSchemaType = z.infer<typeof createOrderSchema>;
