import { Request, Response, NextFunction } from "express";

/**
 * Image compression middleware
 * Uses sharp in future
 */
export const compressImage =
  (enabled = false) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!enabled || !req.file) {
      return next();
    }

    // Future:
    // if (req.file.mimetype.startsWith("image/")) {
    //   req.file.buffer = await sharp(req.file.buffer)
    //     .resize({ width: 2000 })
    //     .jpeg({ quality: 80 })
    //     .toBuffer();
    // }

    next();
  };
