import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error";
import logger from "../config/logger";
import { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";

export const globalErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const requestId = (req as any).id;
    const { method, originalUrl } = req;

    // ── JWT errors — return 401 so the frontend can trigger token refresh ──
    if (err instanceof TokenExpiredError) {
        return res.status(401).json({
            success: false,
            message: "Token expired",
            requestId,
        });
    }

    if (err instanceof JsonWebTokenError) {
        return res.status(401).json({
            success: false,
            message: "Invalid token",
            requestId,
        });
    }
    // ── end JWT errors ──────────────────────────────────────────────────────

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
