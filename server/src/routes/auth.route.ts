import { Router } from "express";
import { GetMe, UserLogin } from "../controllers";

import { useGuard, validateData } from "../middlewares";

import { loginUserSchema } from "../validators/user.dto";

const router = Router();

router.post("/login", validateData(loginUserSchema), UserLogin);
router.get("/me", useGuard, GetMe);

export { router as authRouter };
