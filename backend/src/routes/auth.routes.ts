import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { signupSchema, loginSchema } from "../validators/auth.schema";
import { authController } from "../container";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../config/redis";

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args: string[]) => {
            const [command, ...rest] = args as [string, ...string[]];
            return redis.call(command, ...rest) as Promise<any>;
        },
    }),
    message: {
        success: false,
        message: "Too many attempts from this IP, please try again in 15 minutes.",
    },
});

router.post("/signup",  authLimiter, validate(signupSchema), authController.signup);
router.post("/login",   authLimiter, validate(loginSchema),  authController.login);
router.post("/refresh",                                       authController.refresh);
router.get("/me",       authMiddleware,                       authController.me);
router.post("/logout",  authMiddleware,                       authController.logout);

export default router;
