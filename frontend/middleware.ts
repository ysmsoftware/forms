import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Only protect dashboard routes
    if (pathname.startsWith("/dashboard")) {
        // Check for access token in cookies OR Authorization header
        // Note: localStorage is not accessible in middleware (edge runtime)
        // So we check a cookie that mirrors the token
        const token = request.cookies.get("accessToken")?.value

        if (!token) {
            const loginUrl = new URL("/login", request.url)
            // Pass the original URL so we can redirect back after login
            loginUrl.searchParams.set("callbackUrl", pathname)
            return NextResponse.redirect(loginUrl)
        }
    }

    return NextResponse.next()
}

// Only run middleware on dashboard routes
export const config = {
    matcher: ["/dashboard/:path*"],
}
