import { apiClient, publicClient } from "./client";
import type { User, AuthLoginResponse } from "../types/api";

export async function signup(data: {
    name: string;
    email: string;
    password: string;
}): Promise<AuthLoginResponse> {
    return publicClient<AuthLoginResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
    });
    
    
}

export async function login(data: {
    email: string;
    password: string;
}): Promise<AuthLoginResponse> {
    return publicClient<AuthLoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
    });
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
    return apiClient("/auth/logout", { method: "POST" });
}
