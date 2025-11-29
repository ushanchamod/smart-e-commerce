import { Router } from "express";

import { useGuard, validateData } from "../middlewares";
import {
  AddToCart,
  CreateOrder,
  DeleteCartItem,
  GetAllOrder,
  GetMyCart,
  GetOrderById,
  UpdateOrderStatus,
} from "../controllers";
import {
  addToCartSchema,
  createOrderSchema,
  updateOrderStatusSchema,
} from "../validators/order.dto";

const router = Router();

router.post("/", useGuard, validateData(createOrderSchema), CreateOrder);
router.get("/", useGuard, GetAllOrder);
router.get("/my-cart", useGuard, GetMyCart);
router.get("/:id", useGuard, GetOrderById);

router.put(
  "/add-to-cart/:productId",
  useGuard,
  validateData(addToCartSchema),
  AddToCart
);

router.patch(
  "/update-order-status/:orderId",
  useGuard,
  validateData(updateOrderStatusSchema),
  UpdateOrderStatus
);

router.delete("/my-cart/:itemId", useGuard, DeleteCartItem);

export { router as orderRouter };
