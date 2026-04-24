"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { login, logout, signup, getMe } from "@/lib/api/auth";
import type { User } from "@/lib/types/api";

export function useAuth(callbackUrl?: string) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getMe()
            .then((data) => setUser(data))
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false));
    }, []);

    const handleLogin = useCallback(
        async (email: string, password: string): Promise<void> => {
            const res = await login({ email, password });

            setUser(res.user);
            
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
        
        setUser(null);
        router.push("/login");
    }, [router]);

    const handleSignup = useCallback(
        async (name: string, email: string, password: string): Promise<void> => {
            const res = await signup({ name, email, password });
            // signup returns tokens directly — store them before login redirect
            if (res?.user) {
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
        isAuthenticated: !!user,
        login: handleLogin,
        logout: handleLogout,
        signup: handleSignup,
    };
}
