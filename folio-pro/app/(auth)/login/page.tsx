"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function Page() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);

  const ensureConfigured = () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      toast.error("Add the Supabase environment variables first.");
      return false;
    }
    return true;
  };

  const signInWithGoogle = async () => {
    if (!ensureConfigured()) return;
    setBusy("google");

    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      },
    });

    if (error) {
      setBusy(null);
      toast.error(error.message);
    }
  };

  const signInWithEmail = async () => {
    if (!ensureConfigured()) return;
    if (!email.trim()) {
      toast.error("Enter your email address.");
      return;
    }

    setBusy("email");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      },
    });

    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success("Check your email for the secure sign-in link.");
  };

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="glass w-full max-w-md rounded-3xl p-7">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-emerald-400 text-zinc-950">
            <TrendingUp />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Welcome to Arth’s Portfolios</h1>
            <p className="text-sm text-zinc-500">Your investments, understood.</p>
          </div>
        </div>

        <Button className="w-full" onClick={signInWithGoogle} disabled={busy !== null}>
          {busy === "google" ? <Loader2 className="mr-2 size-4 animate-spin" /> : (
            <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.232c1.891-1.741 2.981-4.305 2.981-7.351Z" />
              <path fill="currentColor" d="M12 22c2.7 0 4.964-.895 6.619-2.423l-3.232-2.509c-.895.6-2.041.955-3.387.955-2.605 0-4.81-1.759-5.6-4.123H3.059v2.591A10 10 0 0 0 12 22Z" />
              <path fill="currentColor" d="M6.4 13.9A6.01 6.01 0 0 1 6.091 12c0-.659.114-1.3.309-1.9V7.509H3.059A10 10 0 0 0 2 12c0 1.614.386 3.141 1.059 4.491L6.4 13.9Z" />
              <path fill="currentColor" d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.959 2.991 14.695 2 12 2a10 10 0 0 0-8.941 5.509L6.4 10.1C7.19 7.736 9.395 5.977 12 5.977Z" />
            </svg>
          )}
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-zinc-600">
          <div className="h-px flex-1 bg-zinc-800" />
          <span>Email fallback</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <label className="text-sm text-zinc-400">Email address</label>
        <Input
          className="mt-2"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          type="email"
          onKeyDown={(event) => { if (event.key === "Enter") void signInWithEmail(); }}
        />
        <Button className="mt-3 w-full" variant="outline" onClick={signInWithEmail} disabled={busy !== null}>
          {busy === "email" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Mail className="mr-2 size-4" />}
          Send email sign-in link
        </Button>

        <p className="mt-5 text-center text-xs leading-5 text-zinc-600">
          Google sign-in avoids email-link rate limits. The email option remains available as a backup.
        </p>
      </div>
    </main>
  );
}
