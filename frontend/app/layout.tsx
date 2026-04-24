import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"
import { Toaster } from "sonner"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import type React from "react"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: "Forms YSM Infosolution - Dynamic Data Collection Platform",
    description: "Create and manage events with custom feedback forms and payment collection",
    generator: 'Austin Makasare',
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://forms.ysminfosolution.com/',
        title: "Forms YSM Infosolution - Dynamic Data Collection Platform",
        description: "Create and manage events with custom feedback forms and payment collection",
        siteName: 'forms.ysminfosolution.com',
        images: [
            {
                url: '/preview.png',
                width: 1200,
                height: 630,
                alt: "Forms YSM Infosolution - Dynamic Data Collection Platform",
            },
        ],
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
                    <Providers>
                        {children}
                    </Providers>
                    <Toaster richColors position="top-right" />
                </ThemeProvider>
            </body>
        </html>
    )
}
