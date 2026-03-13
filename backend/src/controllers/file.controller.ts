// src/modules/file/controllers/file.controller.ts
import { Request, Response, NextFunction } from "express";
import { FileService } from "../services/file.service";
import { FileContext } from "../types/file-context.enum";

export class FileController {
  constructor(private readonly fileService: FileService) {}

  /**
   * Upload a file
   *
   * POST /api/files/upload
   *
   * multipart/form-data:
   * - file
   * - context
   * - contactId
   * - eventId
   * - fieldKey? (optional)
   * - visitorId? (optional)
   * - expiresInSeconds? (optional)
   */
  upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "File is required",
        });
      }

      const {
        context,
        contactId,
        eventId,
        eventSlug,
        fieldKey,
        visitorId,
        expiresInSeconds,
      } = req.body;

      if(!Object.values(FileContext).includes(context)) {
            return res.status(400).json({
                success: false,
                message: "Invalid file context",
            })
      }

      const result = await this.fileService.upload({
        file: req.file,
        context: context as FileContext,
        contactId,
        eventId,
        eventSlug,
        fieldKey,
        visitorId,
        // Only include expiresInSeconds if it exists, otherwise omit it
        ...(expiresInSeconds && { expiresInSeconds: Number(expiresInSeconds) }),
      });

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get file by ID
   *
   * GET /api/files/:id
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          message: "File ID is required",
        });
      }

      const file = await this.fileService.getById(id);

      return res.json({
        success: true,
        data: file,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get files by contactId
   *
   * GET /api/files/contact/:contactId
   */
  getByContactId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contactId } = req.params;
      
      if (!contactId || typeof contactId !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Valid contact ID is required",
        });
      }

      const files = await this.fileService.getByContactId(contactId);

      return res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get files by eventId
   *
   * GET /api/files/event/:eventId
   */
  getByEventId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;
      
      if (!eventId || typeof eventId !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Valid event ID is required",
        });
      }

      const files = await this.fileService.getByEventId(eventId);

      return res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete file
   *
   * DELETE /api/files/:id
   */
  deleteById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          message: "File ID is required",
        });
      }

      await this.fileService.deleteById(id);

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}