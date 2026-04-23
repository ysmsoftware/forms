import { Router } from "express";
import { authenticatedOrgMiddleware } from "../middlewares/authenticated-org.middleware";
import { tagController } from "../container";

const router = Router();


router.post("/", authenticatedOrgMiddleware, tagController.create);
router.get("/", authenticatedOrgMiddleware, tagController.list);
router.post("/assign", authenticatedOrgMiddleware, tagController.addToContact);
router.post("/assign/bulk", authenticatedOrgMiddleware, tagController.bulkAdd);
router.post("/remove", authenticatedOrgMiddleware, tagController.removeFromContact);
router.get("/:tagId/contacts", authenticatedOrgMiddleware, tagController.getContactByTag);

export default router;