import { Router } from "express";
import { multerMemoryUpload } from "../middlewares/multer.middleware";
import { validateFile } from "../middlewares/file-validate.middleware";
import { compressImage } from "../middlewares/image-compress.middleware";
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
router.get("/contact/:contactId", fileController.getByContactId);

// get files by event
router.get("/event/:eventId", fileController.getByEventId);

// get by file ID
router.get("/:id", fileController.getById);

// delete file
router.delete("/:id", fileController.deleteById);

export default router;