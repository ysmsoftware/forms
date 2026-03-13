import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { contactController } from "../container";


const router = Router();


router.get("/", authMiddleware, contactController.list);
router.post("/", authMiddleware, contactController.create);

router.get("/:id/events", authMiddleware, contactController.getEvents);
router.get("/:id", authMiddleware, contactController.getById);

router.put("/:id", authMiddleware, contactController.update);
router.delete("/:id", authMiddleware, contactController.delete);
router.patch("/:id/restore", authMiddleware, contactController.restore);

export default router;