"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { User, Key, CreditCard, Bell, Shield, Trash2, Save, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { useMe, useUpdateMe } from "@/lib/query/hooks/useUser"

export default function Settings() {
    const { data: user, isLoading } = useMe()
    const { mutate: updateMe, isPending: saving } = useUpdateMe()

    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [phone, setPhone] = useState("")
    const [showApiKey, setShowApiKey] = useState(false)
    const [notifications, setNotifications] = useState({
        emailNotifications: true,
        smsNotifications: false,
        weeklyReports: true,
        marketingEmails: false,
    })

    // Sync form fields when user data loads
    useEffect(() => {
        if (!user) return
        const parts = (user.name ?? "").split(" ")
        setFirstName(parts[0] ?? "")
        setLastName(parts.slice(1).join(" "))
        setPhone(user.phone ?? "")
    }, [user])

    const initials = user
        ? (((user.name ?? "").split(" ")[0]?.[0] ?? "") + ((user.name ?? "").split(" ")[1]?.[0] ?? "")).toUpperCase() || "??"
        : "??"

    const handleSave = () => {
        const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ")
        updateMe(
            { name: fullName, phone },
            {
                onSuccess: () => toast.success("Profile updated"),
                onError: (err: any) => toast.error(err.message),
            }
        )
    }

    const handleDeleteAccount = () => {
        toast.error("Account deletion request has been submitted. You will receive a confirmation email.")
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account settings and preferences.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Profile Information</CardTitle>
                    <CardDescription>Update your personal information and profile details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                                <Skeleton className="h-20 w-20 rounded-full" />
                                <Skeleton className="h-8 w-28" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center space-x-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src="/placeholder-user.jpg" alt="Profile" />
                                    <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-2">
                                    <Button variant="outline" size="sm">Change Photo</Button>
                                    <p className="text-xs text-muted-foreground">JPG, GIF or PNG. 1MB max.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" value={user?.email ?? ""} disabled />
                                <p className="text-[0.8rem] text-muted-foreground">Email cannot be changed here.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea id="bio" placeholder="Tell us about yourself..." />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Security</CardTitle>
                    <CardDescription>Manage your password and security preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="currentPassword">Current Password</Label><Input id="currentPassword" type="password" /></div>
                        <div className="space-y-2"><Label htmlFor="newPassword">New Password</Label><Input id="newPassword" type="password" /></div>
                        <div className="space-y-2"><Label htmlFor="confirmPassword">Confirm New Password</Label><Input id="confirmPassword" type="password" /></div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Two-Factor Authentication</h4>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm">Enable 2FA for your account</p>
                                <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                            </div>
                            <Switch />
                        </div>
                    </div>
                </CardContent>
            </Card>


            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notifications</CardTitle>
                    <CardDescription>Choose what notifications you want to receive.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        {[
                            { key: "emailNotifications", label: "Email Notifications", desc: "Receive notifications about form submissions" },
                            { key: "smsNotifications", label: "SMS Notifications", desc: "Get instant SMS alerts for important events" },
                            { key: "weeklyReports", label: "Weekly Reports", desc: "Receive weekly analytics reports" },
                            { key: "marketingEmails", label: "Marketing Emails", desc: "Receive updates about new features and tips" },
                        ].map(({ key, label, desc }) => (
                            <div key={key} className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">{label}</p>
                                    <p className="text-xs text-muted-foreground">{desc}</p>
                                </div>
                                <Switch
                                    checked={notifications[key as keyof typeof notifications]}
                                    onCheckedChange={(checked) => setNotifications({ ...notifications, [key]: checked })}
                                />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>


            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" />Danger Zone</CardTitle>
                    <CardDescription>Irreversible and destructive actions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-4 border border-destructive/20 rounded-lg">
                        <h4 className="font-medium text-destructive mb-2">Delete Account</h4>
                        <p className="text-sm text-muted-foreground mb-4">Once you delete your account, there is no going back. All your data, forms, and responses will be permanently deleted.</p>
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive">Delete Account</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone. This will permanently delete your account and remove your data from our servers.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete my account</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} size="lg" disabled={saving || isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    )
}
