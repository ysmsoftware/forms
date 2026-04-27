"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { publicClient } from "@/lib/api/client";
import Link from "next/link";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!token) router.replace("/forgot-password");
    }, [token, router]);

    const handleReset = async () => {
        if (password !== confirm) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await publicClient("/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({ token, newPassword: password }),
            });
            setDone(true);
            setTimeout(() => router.push("/login"), 4000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold">Password reset</h1>
                <p className="text-sm text-muted-foreground">
                    Your password has been updated. Redirecting to login...
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm space-y-4 p-6">
            <h1 className="text-2xl font-semibold">Set new password</h1>
            <input
                type="password"
                placeholder="New password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
            />
            <input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
                onClick={handleReset}
                disabled={loading || !password || !confirm}
                className="w-full rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
            >
                {loading ? "Resetting..." : "Reset password"}
            </button>
            <div className="text-center">
                <Link href="/login" className="text-sm text-primary hover:underline">
                    Back to login
                </Link>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <Suspense>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}