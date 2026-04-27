"use client";

import { publicClient } from "@/lib/api/client";
import { useState } from "react";
import Link  from 'next/link';


export default function ForgotPasswordPage() {

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async() => {
        setLoading(true);
        setError("");
        try {

            await publicClient("/auth/forgot-password", {
                method: "POST",
                body: JSON.stringify({ email }),
            });
            setSubmitted(true);

        } catch(e: any) {
            setError(e.messsage);
        } finally {
            setLoading(false);
        }
    }
     if (submitted) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="w-full max-w-sm space-y-4 p-6 text-center">
                    <h1 className="text-2xl font-semibold">Check your email</h1>
                    <p className="text-sm text-muted-foreground">
                        If an account exists for <strong>{email}</strong>, we've sent a
                        password reset link. Check your inbox and spam folder.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        The link expires in 15 minutes.
                    </p>
                    <Link href="/login" className="text-sm text-primary hover:underline">
                        Back to login
                    </Link>
                </div>
            </div>
        );
    }

     return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-sm space-y-4 p-6">
                <h1 className="text-2xl font-semibold">Forgot password</h1>
                <p className="text-sm text-muted-foreground">
                    Enter your account email and we'll send you a reset link.
                </p>
                <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm"
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                    onClick={handleSubmit}
                    disabled={loading || !email}
                    className="w-full rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                    {loading ? "Sending..." : "Send reset link"}
                </button>
                <div className="text-center">
                    <Link href="/login" className="text-sm text-primary hover:underline">
                        Back to login
                    </Link>
                </div>
            </div>
        </div>
    );

}