"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ErrorBoundary } from "@/components/error-boundary"
import { queryClient } from "@/lib/query/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

export default function Layout({ children }: { children: React.ReactNode }) {
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem("accessToken")
        if (!token) {
            router.replace("/login")
        }
    }, [router])

    return (
        <DashboardLayout>
            <QueryClientProvider client={queryClient}>
                <ErrorBoundary onReset={() => window.location.reload()}>
                    {children}
                </ErrorBoundary>
                <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
        </DashboardLayout>
    )
}
