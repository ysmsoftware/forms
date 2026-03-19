import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Providers } from "@/components/providers"

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardLayout>
            <Providers>
                {children}
            </Providers>
        </DashboardLayout>
    )
}
