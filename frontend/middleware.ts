import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const token = request.cookies.get("accessToken")?.value

    // Root "/" → redirect to dashboard (authenticated) or login (unauthenticated)
    if (pathname === "/") {
        if (token) {
            return NextResponse.redirect(new URL("/dashboard", request.url))
        } else {
            return NextResponse.redirect(new URL("/login", request.url))
        }
    }

    // Protect all dashboard routes
    if (pathname.startsWith("/dashboard")) {
        if (!token) {
            const loginUrl = new URL("/login", request.url)
            loginUrl.searchParams.set("callbackUrl", pathname)
            return NextResponse.redirect(loginUrl)
        }
    }

    return NextResponse.next()
}

// Only run middleware on dashboard routes and the root path
export const config = {
    matcher: ["/", "/dashboard/:path*"],
}
