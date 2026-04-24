"use client";

import { useCallback } from "react";
import { login, logout, signup } from "@/lib/api/auth";
import { useMe } from "../query/hooks/useUser";

/**
 * Auth hook — provides user state and auth actions.
 *
 * DESIGN:
 * - `useMe()` (React Query) fetches `/auth/me` to get the current user.
 * - If the user is not logged in, the query will fail with 401 → `client.ts`
 *   will try one refresh → if that fails, `forceLogout()` redirects to /login.
 * - This hook does NOT redirect on its own. Redirection is handled by:
 *   1. `AuthGuard` (for protected routes like /dashboard)
 *   2. `client.ts` `forceLogout()` (for expired sessions)
 *
 * On public pages (login, signup), `useMe()` will still fire but:
 * - `retry: false` in useMe prevents retries
 * - `client.ts` `forceLogout()` skips redirect if already on /login
 */
export function useAuth(callbackUrl?: string) {
    const {
        data: user,
        isLoading,
    } = useMe();

    const handleLogin = useCallback(
        async (email: string, password: string): Promise<void> => {
            const res = await login({ email, password });
            if (res?.user) {
                window.location.href = callbackUrl ?? "/dashboard";
            }
        },
        [callbackUrl]
    );

    const handleLogout = useCallback(async (): Promise<void> => {
        try {
            await logout();
        } catch {
            // ignore
        }
        window.location.href = "/login";
    }, []);

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