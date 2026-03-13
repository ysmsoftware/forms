import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../errors/http-errors";

const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const DOC_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export type FileCategory = "image" | "document" | "any";

export const validateFile =
  (options: {
    category?: FileCategory;
    maxSizeMB?: number;
  } = {}) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.file) {
      throw new BadRequestError("File is required");
    }

    const { mimetype, size } = req.file;

    const maxSizeBytes =
      (options.maxSizeMB ?? 5) * 1024 * 1024;

    if (size > maxSizeBytes) {
      throw new BadRequestError(
        `File size exceeds ${options.maxSizeMB ?? 5}MB`
      );
    }

    if (options.category === "image") {
      if (!IMAGE_MIME_TYPES.includes(mimetype)) {
        throw new BadRequestError("Invalid image type");
      }
    }

    if (options.category === "document") {
      if (!DOC_MIME_TYPES.includes(mimetype)) {
        throw new BadRequestError("Invalid document type");
      }
    }

    next();
  };


  export const validateBannerFile = validateFile({ category: "image", maxSizeMB: 5 });