const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "/api";

interface RequestOptions extends Omit<RequestInit, "headers"> {
    headers?: Record<string, string>;
    _isRetry?: boolean;
}

async function unwrap<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Request failed" }));
        throw new Error(body.message ?? "Request failed");
    }
    const json = await res.json();
    return (json?.data !== undefined ? json.data : json) as T;
}

/**
 * Flag to prevent multiple concurrent refresh attempts.
 * Once a refresh fails, we redirect once and stop.
 */
let isRedirecting = false;

/** Clear all auth state and redirect to login */
function forceLogout(): void {
    if (typeof window === "undefined") return;
    if (isRedirecting) return;          // ← already redirecting, don't fire again

    // Don't redirect if we're already on a public auth page
    const path = window.location.pathname;
    if (path === "/login" || path === "/signup") return;

    isRedirecting = true;
    window.location.href = "/login";
}

/** Attempt a silent token refresh. Returns true if successful. */
async function tryRefresh(): Promise<boolean> {
    if (isRedirecting) return false;    // ← already gave up, skip network call

    try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            // 🔥 Refresh failed — session is truly dead. Redirect once.
            forceLogout();
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

export async function apiClient<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    // If we're already redirecting to login, don't even fire the request
    if (isRedirecting) {
        return new Promise<T>(() => {});
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    // Auto-refresh on 401 (once)
    if (res.status === 401 && !options._isRetry) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            return apiClient<T>(endpoint, { ...options, _isRetry: true });
        }
        // Refresh failed — throw so React Query stops retrying
        throw new Error("Session expired");
    }

    return unwrap<T>(res);
}

export async function publicClient<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    return unwrap<T>(res);
}
