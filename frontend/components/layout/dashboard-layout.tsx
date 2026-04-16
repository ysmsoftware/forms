"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModeToggle } from "@/components/mode-toggle"
import { LayoutDashboard, Plus, BarChart3, Settings, Send, Menu, X, FormInput, MessageSquare, LogOut, Award } from "lucide-react"
import AuthGuard from "@/components/auth-guard"
import { useAuth } from "@/lib/hooks/useAuth"

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Create Event", href: "/dashboard/create-event", icon: Plus },
    { name: "Manage Events", href: "/dashboard/events", icon: FormInput },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Contact", href: "/dashboard/contact", icon: MessageSquare },
    { name: "Messages", href: "/dashboard/messages", icon: Send },
    { name: "Certificates", href: "/dashboard/certificates", icon: Award },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

interface DashboardLayoutProps {
    children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const pathname = usePathname()
    const { user, logout } = useAuth()



    return (
        <AuthGuard>
            <div className="min-h-screen bg-background">
                {/* Mobile sidebar */}
                <div className={cn("fixed inset-0 z-50 lg:hidden", sidebarOpen ? "block" : "hidden")}>
                    <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed left-0 top-0 h-full w-64 bg-card border-r">
                        <div className="flex h-16 items-center justify-between px-4">
                            <Link href="/dashboard" className="flex items-center space-x-2">
                                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                    <FormInput className="h-5 w-5 text-primary-foreground" />
                                </div>
                                <span className="text-xl font-bold">YSM Forms</span>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <nav className="flex flex-col h-[calc(100%-4rem)] px-4 py-4 space-y-4">
                            <div className="flex-1 space-y-1">
                                {navigation.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                            pathname === item.href
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                        )}
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        <span>{item.name}</span>
                                    </Link>
                                ))}
                            </div>
                            <div className="mt-auto pt-4 border-t">
                                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src="/placeholder-user.jpg" alt="User" />
                                        <AvatarFallback>{user?.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-medium leading-none truncate">{user?.name ?? "User"}</span>
                                        <span className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => logout()}
                                >
                                    <LogOut className="mr-2 h-5 w-5" />
                                    Log Out
                                </Button>
                            </div>
                        </nav>
                    </div>
                </div>

                {/* Desktop sidebar */}
                <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
                    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card border-r px-6 py-4">
                        <Link href="/dashboard" className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                <FormInput className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-bold">YSM Forms</span>
                        </Link>
                        <nav className="flex flex-1 flex-col">
                            <ul role="list" className="flex flex-1 flex-col gap-y-2">
                                {navigation.map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                                pathname === item.href
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                            )}
                                        >
                                            <item.icon className="h-5 w-5" />
                                            <span>{item.name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-auto pt-4 border-t">
                                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src="/placeholder-user.jpg" alt="User" />
                                        <AvatarFallback>{user?.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-medium leading-none truncate">{user?.name ?? "User"}</span>
                                        <span className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => logout()}
                                >
                                    <LogOut className="mr-2 h-5 w-5" />
                                    Log Out
                                </Button>
                            </div>
                        </nav>
                    </div>
                </div>

                {/* Main content */}
                <div className="lg:pl-64">
                    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
                        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                            <Menu className="h-5 w-5" />
                        </Button>

                        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                            <div className="flex flex-1" />
                            <div className="flex items-center gap-x-4 lg:gap-x-6">
                                <ModeToggle />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src="/placeholder-user.jpg" alt="Admin" />
                                                <AvatarFallback>{user?.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56" align="end" forceMount>
                                        <DropdownMenuLabel className="font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-medium leading-none">{user?.name ?? "User"}</p>
                                                <p className="text-xs leading-none text-muted-foreground">{user?.email ?? ""}</p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link href="/dashboard/settings">Settings</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => logout()}>Log out</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>

                    <main className="py-8">
                        <div className="px-4 sm:px-6 lg:px-8">{children}</div>
                    </main>
                </div>
            </div>
        </AuthGuard>
    )
}
