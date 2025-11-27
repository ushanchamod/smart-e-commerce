import { Router } from "express";

import { useGuard, validateData } from "../middlewares";
import {
  AddToCart,
  CreateOrder,
  DeleteCartItem,
  GetAllOrder,
  GetMyCart,
  GetOrderById,
} from "../controllers";
import { addToCartSchema, createOrderSchema } from "../validators/order.dto";

const router = Router();

router.post("/", useGuard, validateData(createOrderSchema), CreateOrder);
router.get("/", useGuard, GetAllOrder);
router.get("/:id", useGuard, GetOrderById);

router.put(
  "/add-to-cart/:productId",
  useGuard,
  validateData(addToCartSchema),
  AddToCart
);

router.delete("/my-cart/:itemId", useGuard, DeleteCartItem);

router.get("/my-cart", useGuard, GetMyCart);

export { router as orderRouter };
