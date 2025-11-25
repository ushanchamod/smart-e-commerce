import { Router } from "express";
import multer from "multer";
import { useGuard, validateData } from "../middlewares";

import { createProductSchema } from "../validators/product.dto";
import {
  CreateProduct,
  GetAllProducts,
  GetProductById,
  SearchProducts,
} from "../controllers";

const router = Router();

const upload = multer();

router.get("/", GetAllProducts);

router.get("/:id", GetProductById);

router.post(
  "/",
  useGuard,
  upload.none(),
  validateData(createProductSchema),
  CreateProduct
);

router.get("/search/:query", SearchProducts);

export { router as productRouter };
