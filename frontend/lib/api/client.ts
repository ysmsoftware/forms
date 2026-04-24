const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3005/api";

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

/** Clear all auth state and redirect to login */
function forceLogout(): void {
    if (typeof window === "undefined") return;
    window.location.href = "/login";
}

/** Attempt a silent token refresh. Returns new accessToken or null. */
async function tryRefresh(): Promise<boolean> {
    try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
            method: "POST",
            credentials: 'include',
            headers: { "Content-Type": "application/json" },
            
        });

        if (!res.ok) {
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
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    // Auto-refresh on 401 (once)
    if (res.status === 401 && !options._isRetry) {
        const newToken = await tryRefresh();
        if (newToken) {
            return apiClient<T>(endpoint, { ...options, _isRetry: true });
        }
        return new Promise<T>(() => { })
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
