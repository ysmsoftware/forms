import { apiClient, publicClient } from "./client";
import type { User, AuthLoginResponse } from "../types/api";

export async function signup(data: {
    name: string;
    email: string;
    password: string;
}): Promise<AuthLoginResponse> {
    const res = await publicClient<AuthLoginResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
    });
    if (typeof window !== "undefined" && res.accessToken) {
        localStorage.setItem("accessToken", res.accessToken);
        if (res.refreshToken) localStorage.setItem("refreshToken", res.refreshToken);
        document.cookie = `accessToken=${res.accessToken}; path=/; SameSite=Strict`;
    }
    return res;
}

export async function login(data: {
    email: string;
    password: string;
}): Promise<AuthLoginResponse> {
    const res = await publicClient<AuthLoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
    });
    if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", res.accessToken);
        if (res.refreshToken) localStorage.setItem("refreshToken", res.refreshToken);
        document.cookie = `accessToken=${res.accessToken}; path=/; SameSite=Strict`;
    }
    return res;
}

export async function getMe(): Promise<User> {
    return apiClient("/auth/me");
}

export async function updateMe(body: {
    name?: string;
    email?: string;
    phone?: string;
}): Promise<User> {
    return apiClient("/users/me", {
        method: "PATCH",
        body: JSON.stringify(body),
    });
}

export async function logout(): Promise<void> {
    if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    return apiClient("/auth/logout", { method: "POST" });
}
