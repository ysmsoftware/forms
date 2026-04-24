"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { login, logout, signup } from "@/lib/api/auth";
import { useMe } from "../query/hooks/useUser";

export function useAuth(callbackUrl?: string) {
    const router = useRouter();

    const {
        data: user,
        isLoading,
        isError,
        error,
    } = useMe();

    // 🔥 Prevent multiple redirects (important)
    const hasRedirected = useRef(false);

    /**
     * 🚨 Handle unauthorized state (STOP LOOP HERE)
     */
    useEffect(() => {
        if (isLoading) return;

        if (isError && !hasRedirected.current) {
            hasRedirected.current = true;

            // Optional: only redirect on 401-type errors
            if (typeof window !== "undefined") {
                window.location.href = "/login";
            }
        }
    }, [isLoading, isError]);

    /**
     * 🔐 Login
     */
    const handleLogin = useCallback(
        async (email: string, password: string): Promise<void> => {
            const res = await login({ email, password });

            if (res?.user) {
                window.location.href = callbackUrl ?? "/dashboard";
            }
        },
        [callbackUrl]
    );

    /**
     * 🚪 Logout
     */
    const handleLogout = useCallback(async (): Promise<void> => {
        try {
            await logout();
        } catch {
            // ignore
        }

        window.location.href = "/login";
    }, []);

    /**
     * 🆕 Signup
     */
    const handleSignup = useCallback(
        async (name: string, email: string, password: string): Promise<void> => {
            const res = await signup({ name, email, password });

            if (res?.user) {
                window.location.href = "/dashboard";
            } else {
                await handleLogin(email, password);
            }
        },
        [handleLogin]
    );

    return {
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        login: handleLogin,
        logout: handleLogout,
        signup: handleSignup,
    };
}