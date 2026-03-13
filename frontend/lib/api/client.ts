
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

/** Attempt a silent token refresh. Returns new accessToken or null. */
async function tryRefresh(): Promise<string | null> {
    if (typeof window === "undefined") return null;
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return null;

    try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const json = await res.json();
        const data = json?.data ?? json;
        if (data?.accessToken) {
            localStorage.setItem("accessToken", data.accessToken);
            document.cookie = `accessToken=${data.accessToken}; path=/; SameSite=Strict`;
            if (data?.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
            return data.accessToken;
        }
        return null;
    } catch {
        return null;
    }
}

export async function apiClient<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    // Auto-refresh on 401 (once)
    if (res.status === 401 && !options._isRetry) {
        const newToken = await tryRefresh();
        if (newToken) {
            return apiClient<T>(endpoint, { ...options, _isRetry: true });
        }
        // Refresh failed — clear and redirect
        if (typeof window !== "undefined") {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            window.location.href = "/login";
        }
        throw new Error("Unauthorized");
    }

    return unwrap<T>(res);
}

export async function publicClient<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    return unwrap<T>(res);
}
