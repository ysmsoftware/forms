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

// Must match the expiresIn value in jwt.ts (7d in seconds)
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

const refreshKey = (userId: string) => `auth:refresh:${userId}`;

export class AuthService {

    constructor(private userRepository: IUserRepository) {}

    async signup(data: SignupInput): Promise<SignupResponseDTO> {
        const existing = await this.userRepository.findByEmail(data.email);
        if (existing) throw new ConflictError("User already exists");

        const passwordHash = await hashPassword(data.password);
        const user = await this.userRepository.createUser({
            name: data.name,
            email: data.email,
            passwordHash,
        });

        const accessToken  = createAccessToken({ userId: user.id });
        const refreshToken = createRefreshToken({ userId: user.id });

        await redis.set(refreshKey(user.id), refreshToken, "EX", REFRESH_TTL_SECONDS);

        return { user: toUserResponseDTO(user), accessToken, refreshToken };
    }

    async login(data: LoginInput): Promise<LoginResponseDTO> {
        const user = await this.userRepository.findByEmail(data.email);
        if (!user) throw new UnauthorizedError("Invalid credentials");

        const isMatch = await comparePassword(data.password, user.passwordHash);
        if (!isMatch) throw new UnauthorizedError("Invalid credentials");

        const accessToken  = createAccessToken({ userId: user.id });
        const refreshToken = createRefreshToken({ userId: user.id });

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

    /**
     * Validates the incoming refresh token against the one stored in Redis,
     * then rotates both tokens (old refresh token is invalidated immediately).
     */
    async refreshTokens(incomingToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        let payload: { userId: string };
        try {
            payload = verifyRefreshToken(incomingToken);
        } catch {
            throw new UnauthorizedError("Invalid or expired refresh token");
        }

        const stored = await redis.get(refreshKey(payload.userId));
        if (!stored || stored !== incomingToken) {
            throw new UnauthorizedError("Refresh token has been revoked");
        }

        const accessToken  = createAccessToken({ userId: payload.userId });
        const refreshToken = createRefreshToken({ userId: payload.userId });

        // Rotate: old token is replaced, cannot be reused
        await redis.set(refreshKey(payload.userId), refreshToken, "EX", REFRESH_TTL_SECONDS);

        return { accessToken, refreshToken };
    }
}
