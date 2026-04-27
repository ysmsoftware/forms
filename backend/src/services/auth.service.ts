import { IUserRepository } from "../repositories/user.repo";
import { hashPassword, comparePassword } from "../utils/password";
import { createAccessToken, createRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { SignupInput, LoginInput } from "../validators/auth.schema";
import { SignupResponseDTO } from "../dtos/auth/signup.dto";
import { LoginResponseDTO } from "../dtos/auth/login.dto";
import { toUserResponseDTO } from "../mappers/user.mapper";
import { ConflictError, UnauthorizedError, NotFoundError } from "../errors/http-errors";
import { UserResponseDTO } from "../dtos/user/user-response.dto";
import { redis } from "../config/redis";
import { sign, verify } from "jsonwebtoken";
import { sendResetPasswordEmail } from "../providers/email.provider";
import logger from "../config/logger";


// Must match the expiresIn value in jwt.ts (7d in seconds)
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

const refreshKey = (userId: string) => `auth:refresh:${userId}`;

export class AuthService {

    constructor(private userRepository: IUserRepository) {}

    async signup(data: SignupInput): Promise<SignupResponseDTO> {
        const existing = await this.userRepository.findByEmail(data.email);
        if (existing) throw new ConflictError("User already exists");

        const passwordHash = await hashPassword(data.password);
        const { user, organizationId } = await this.userRepository.createUserWithOrg({
            name: data.name,
            email: data.email,
            passwordHash,
        });

        const accessToken  = createAccessToken({ userId: user.id , organizationId });
        const refreshToken = createRefreshToken({ userId: user.id, organizationId  });

        await redis.set(refreshKey(user.id), refreshToken, "EX", REFRESH_TTL_SECONDS);

        return { user: toUserResponseDTO(user), accessToken, refreshToken };
    }

    async login(data: LoginInput): Promise<LoginResponseDTO> {
        const user = await this.userRepository.findByEmail(data.email);
        if (!user) throw new UnauthorizedError("Invalid credentials");

        const isMatch = await comparePassword(data.password, user.passwordHash);
        if (!isMatch) throw new UnauthorizedError("Invalid credentials");

        const membership = await this.userRepository.findOrgMembership(user.id);
        if(!membership) throw new UnauthorizedError("User has no active organization")

        const { organizationId } = membership;

        const accessToken  = createAccessToken({ userId: user.id, organizationId });
        const refreshToken = createRefreshToken({ userId: user.id, organizationId });

        // Overwrite any existing session — one active refresh token per user
        await redis.set(refreshKey(user.id), refreshToken, "EX", REFRESH_TTL_SECONDS);

        return { user: toUserResponseDTO(user), accessToken, refreshToken };
    }

    async getMe(userId: string): Promise<UserResponseDTO> {
        const user = await this.userRepository.findById(userId);
        if (!user) throw new NotFoundError("User not found");
        return toUserResponseDTO(user);
    }

    /**
     * Deletes the stored refresh token so it can never be used again.
     * The short-lived access token (30 min) will expire on its own —
     * acceptable for an internal tool. Add an access-token denylist here
     * if you need immediate access revocation in the future.
     */
    async logout(userId: string): Promise<{ message: string }> {
        await redis.del(refreshKey(userId));
        return { message: "Logged out successfully" };
    }

    async refreshTokens(incomingToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        let payload: { userId: string, organizationId: string };
        try {
            payload = verifyRefreshToken(incomingToken);
        } catch {
            throw new UnauthorizedError("Invalid or expired refresh token");
        }

        const stored = await redis.get(refreshKey(payload.userId));
        if (!stored || stored !== incomingToken) {
            throw new UnauthorizedError("Refresh token has been revoked");
        }

        const accessToken  = createAccessToken({ userId: payload.userId, organizationId: payload.organizationId });
        const refreshToken = createRefreshToken({ userId: payload.userId, organizationId: payload.organizationId });

        // Rotate: old token is replaced, cannot be reused
        await redis.set(refreshKey(payload.userId), refreshToken, "EX", REFRESH_TTL_SECONDS);

        return { accessToken, refreshToken };
    }

    async forgotPassword(email: string): Promise<void> {
        const user = await this.userRepository.findByEmail(email);

        // Silently return if user not found — prevents email enumeration attacks
        // The frontend always shows the same "check your email" message regardless
        if (!user) {
            logger.warn(`[auth] Password reset requested for unknown email: ${email}`);
            return;
        }

        const resetToken = sign(
            { userId: user.id, purpose: "password-reset" },
            process.env.JWT_RESET_SECRET!,
            { expiresIn: "15m" }
        )

        await redis.set(`reset:${resetToken}`, user.id, "EX", 15*60 );

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        await sendResetPasswordEmail(user.email, user.name, resetLink);
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {

        const userId = await redis.get(`reset:${token}`);
        if(!userId) throw new UnauthorizedError("Reset link is invalid  or has expired");

        let payload: any;
        try {
            payload = verify(token, process.env.JWT_RESET_SECRET!);
        } catch  {
            throw new UnauthorizedError("Reset link is invalid or has expired");
        }

        if(payload.purpose !== "password-reset" || payload.userId !== userId) {
            throw new UnauthorizedError("Reset link in invalid");
        }

        const passwordHash = await hashPassword(newPassword);
        await this.userRepository.updatePassword(userId, passwordHash)

        // Single use
        await redis.del(`reset:${token}`);

        // invalidate any active session
        await redis.del(refreshKey(userId));
    }

}
