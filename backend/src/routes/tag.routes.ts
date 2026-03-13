import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { tagController } from "../container";

const router = Router();


router.post("/", authMiddleware, tagController.create);
router.get("/", authMiddleware, tagController.list);
router.post("/assign", authMiddleware, tagController.addToContact);
router.post("/assign/bulk", authMiddleware, tagController.bulkAdd);
router.post("/remove", authMiddleware, tagController.removeFromContact);
router.get("/:tagId/contacts", authMiddleware, tagController.getContactByTag);

export default router;