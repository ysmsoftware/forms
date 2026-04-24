import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import logger from "../config/logger";

const IS_PROD = process.env.NODE_ENV === "production";



const ACCESS_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax" as const,
    maxAge: 30 * 60 * 1000,     // 30 min TTL
    path: "/",
}

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,     // 7 days TTL
    path: "/api/auth/refresh",
}


function clearAuthCookies(res: Response) {
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
}

export class AuthController {

    constructor(private authService: AuthService) {}

    signup = async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info(`[auth] Signup attempt: ${req.body.email}`);
            const result = await this.authService.signup(req.body);

            res.cookie("accessToken", result.accessToken, ACCESS_COOKIE_OPTIONS);
            res.cookie("refreshToken", result.refreshToken, REFRESH_COOKIE_OPTIONS);

            res.status(201).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.authService.login(req.body);

            res.cookie("accessToken", result.accessToken, ACCESS_COOKIE_OPTIONS);
            res.cookie("refreshToken", result.refreshToken, REFRESH_COOKIE_OPTIONS);

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

            clearAuthCookies(res);
            res.status(200).json({ success: true, message: result.message });
        } catch (error) {
            next(error);
        }
    };

    // No authMiddleware — the refresh token IS the credential
    refresh = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const incomingRefreshToken = req.cookies?.refreshToken ?? req.body?.refreshToken;
            
            if (!incomingRefreshToken) {
                return res.status(400).json({ success: false, message: "refreshToken is required" });
            }
            const tokens = await this.authService.refreshTokens(incomingRefreshToken);

            res.cookie("accessToken", tokens.accessToken, ACCESS_COOKIE_OPTIONS);
            res.cookie("refreshToken", tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

            res.status(200).json({ success: true, data: tokens });
        } catch (error) {
            next(error);
        }
    };
}
