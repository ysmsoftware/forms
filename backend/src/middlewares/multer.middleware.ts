import multer from "multer";


export const multerMemoryUpload = multer({
    storage: multer.memoryStorage(),
})