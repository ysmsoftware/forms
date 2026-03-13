import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 2,      // 2 min — data is fresh, no refetch
            gcTime: 1000 * 60 * 10,         // 10 min — keep in cache after unmount
            retry: 2,                        // retry once on failure
            refetchOnWindowFocus: false,     // don't spam on tab switch
        },
    },
})