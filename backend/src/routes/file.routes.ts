import { Router } from "express";
import { multerMemoryUpload } from "../middlewares/multer.middleware";
import { validateFile } from "../middlewares/file-validate.middleware";
import { compressImage } from "../middlewares/image-compress.middleware";
import { authenticatedOrgMiddleware } from "../middlewares/authenticated-org.middleware";
import { fileController } from "../container";


const router = Router();


// POST /api/files/upload
router.post(
    "/upload",
    multerMemoryUpload.single("file"),
    validateFile({ category: "any", maxSizeMB: 10 }),
    compressImage(false),   // later if needed
    fileController.upload
);

// get files by contact
router.get("/contact/:contactId", authenticatedOrgMiddleware, fileController.getByContactId);

// get files by event
router.get("/event/:eventId", authenticatedOrgMiddleware, fileController.getByEventId);

// get by file ID
router.get("/:id", authenticatedOrgMiddleware, fileController.getById);

// delete file
router.delete("/:id", authenticatedOrgMiddleware, fileController.deleteById);

export default router;