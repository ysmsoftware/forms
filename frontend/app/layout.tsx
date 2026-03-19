import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import type React from "react"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: "Forms YSM Infosolutions - Dynamic Data Collection Platform",
    description: "Create and manage events with custom feedback forms and payment collection",
    generator: 'Austin Makasare',
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://forms.ysminfosolutions.com/',
        title: "Forms YSM Infosolutions - Dynamic Data Collection Platform",
        description: "Create and manage events with custom feedback forms and payment collection",
        siteName: 'forms.ysminfosolutions.com',
        images: [
            {
                url: '/preview.png',
                width: 1200,
                height: 630,
                alt: "Forms YSM Infosolutions - Dynamic Data Collection Platform",
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
                    {children}
                    <Toaster richColors position="top-right" />
                </ThemeProvider>
            </body>
        </html>
    )
}
