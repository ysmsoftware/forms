import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import logger from "../config/logger";
import { UnauthorizedError } from "../errors/http-errors";

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    
    let token: string | undefined = req.cookies?.accessToken;
    
    if(!token) {
        const authHeader = req.headers.authorization;
        if( authHeader?.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
    }
    
    if (!token) {
      throw new UnauthorizedError("Unauthorized");
    }
    
    const payload = verifyToken(token);

    req.user = { id: payload.userId, organizationId: payload.organizationId };

    logger.debug(`User authenticated: ${payload.userId} org: ${payload.organizationId}`);
    next();
  } catch (error) {
    next(error);
  }
};
