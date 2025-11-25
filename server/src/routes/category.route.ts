import { Router } from "express";
import { CreateCategory } from "../controllers";

import { useGuard, validateData } from "../middlewares";

import { createCategorySchema } from "../validators/category.dto";

const router = Router();

router.post("/", useGuard, validateData(createCategorySchema), CreateCategory);

export { router as categoryRouter };
