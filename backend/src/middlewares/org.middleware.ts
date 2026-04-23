import { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../errors/http-errors";

export const orgMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { organizationId } = req.user!;
  if (!organizationId) {
    throw new ForbiddenError("No active organization");
  }
  // TODO: optionally verify membership is still active in DB
  // (JWT can be stale if membership was revoked)
  next();
};