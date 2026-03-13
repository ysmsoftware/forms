import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import logger from "../config/logger";

export class AuthController {

    constructor(private authService: AuthService) {}

    signup = async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info(`[auth] Signup attempt: ${req.body.email}`);
            const result = await this.authService.signup(req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.authService.login(req.body);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    me = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await this.authService.getMe(req.user!.id);
            res.status(200).json({ success: true, data: user });
        } catch (error) {
            next(error);
        }
    };

    // Requires authMiddleware — userId is read from the verified JWT
    logout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.authService.logout(req.user!.id);
            res.status(200).json({ success: true, message: result.message });
        } catch (error) {
            next(error);
        }
    };

    // No authMiddleware — the refresh token IS the credential
    refresh = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({ success: false, message: "refreshToken is required" });
            }
            const tokens = await this.authService.refreshTokens(refreshToken);
            res.status(200).json({ success: true, data: tokens });
        } catch (error) {
            next(error);
        }
    };
}
