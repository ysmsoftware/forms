import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import logger from "../config/logger";
import { UnauthorizedError, ForbiddenError } from "../errors/http-errors";

export const authenticatedOrgMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Unauthorized");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new UnauthorizedError("Unauthorized");
    }

    const payload = verifyToken(token);

    req.user = { id: payload.userId, organizationId: payload.organizationId };

    const { organizationId } = req.user;
    if (!organizationId) {
      throw new ForbiddenError("No active organization");
    }
    // TODO: For production with multiple orgs, verify membership is still active in DB
    // JWT can be stale if membership was revoked (TTL: 30min for internal tool, acceptable)

    logger.debug(`User authenticated: ${payload.userId} org: ${payload.organizationId}`);
    next();
  } catch (error) {
    next(error);
  }
};