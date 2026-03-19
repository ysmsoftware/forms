"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { ErrorBoundary } from "@/components/error-boundary"

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 1000 * 60 * 2,
                        gcTime: 1000 * 60 * 10,
                        retry: 2,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    )

    return (
        <QueryClientProvider client={queryClient}>
            <ErrorBoundary onReset={() => window.location.reload()}>
                {children}
            </ErrorBoundary>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    )
}
