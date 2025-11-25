// src/lib/validators.ts
import { z } from "zod";

export const checkoutSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  shippingAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    zip: z.string().min(5),
  }),
  giftMessage: z
    .string()
    .max(200, "Gift message must be under 200 characters")
    .optional(),
  deliveryDate: z.string().refine((date) => new Date(date) > new Date(), {
    message: "Delivery date must be in the future",
  }),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
