import jwt from "jsonwebtoken";

export interface JwtPayload {
    userId: string,
    organizationId: string,
}

export const createAccessToken = (payload: JwtPayload) => {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: "30m",
    });
};

export const createRefreshToken = (payload: JwtPayload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: '7d',
    });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET) as JwtPayload;
};