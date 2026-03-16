"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { login, logout, signup, getMe } from "@/lib/api/auth";
import type { User } from "@/lib/types/api";

export function useAuth(callbackUrl?: string) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!user;

    // Check existing token on mount
    useEffect(() => {
        const token =
            typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

        if (!token) {
            setIsLoading(false);
            return;
        }

        getMe()
            .then((data) => setUser(data))
            .catch(() => localStorage.removeItem("accessToken"))
            .finally(() => setIsLoading(false));
    }, []);

    const handleLogin = useCallback(
        async (email: string, password: string): Promise<void> => {
            const res = await login({ email, password });
            localStorage.setItem("accessToken", res.accessToken);
            // Set cookie for middleware
            document.cookie = `accessToken=${res.accessToken}; path=/; SameSite=Lax`;

            if (res.refreshToken) {
                localStorage.setItem("refreshToken", res.refreshToken);
            }
            setUser(res.user);
            // Hard redirect so middleware re-evaluates with the new cookie
            window.location.href = callbackUrl ?? "/dashboard";
        },
        [callbackUrl]
    );

    const handleLogout = useCallback(async (): Promise<void> => {
        try {
            await logout();
        } catch {
            // ignore errors
        }
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        // Remove cookie for middleware
        document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";

        setUser(null);
        router.push("/");
    }, [router]);

    const handleSignup = useCallback(
        async (name: string, email: string, password: string): Promise<void> => {
            const res = await signup({ name, email, password });
            // signup returns tokens directly — store them before login redirect
            if (res?.accessToken) {
                localStorage.setItem("accessToken", res.accessToken);
                // Set cookie for middleware
                document.cookie = `accessToken=${res.accessToken}; path=/; SameSite=Lax`;

                if (res?.refreshToken) localStorage.setItem("refreshToken", res.refreshToken);
                setUser(res.user);
                window.location.href = "/dashboard";
            } else {
                await handleLogin(email, password);
            }
        },
        [handleLogin]
    );

    return {
        user,
        isLoading,
        isAuthenticated,
        login: handleLogin,
        logout: handleLogout,
        signup: handleSignup,
    };
}
