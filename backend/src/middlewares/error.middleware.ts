import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error";
import logger from "../config/logger";

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = (req as any).id;
  const { method, originalUrl } = req;

  if (err instanceof AppError) {
    logger.warn(`${err.message} - [${method} ${originalUrl}] (ReqID: ${requestId})`);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      requestId,
      method,
      url: originalUrl,
    });
  }

  logger.error(`${err.message} - [${method} ${originalUrl}] (ReqID: ${requestId})`, { stack: err.stack });
  return res.status(500).json({
    success: false,
    message: "Internal server error",
    requestId,
    method,
    url: originalUrl,
  });
};
