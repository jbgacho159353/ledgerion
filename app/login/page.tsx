"use client";

import Image from "next/image";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { authenticate } from "@/lib/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function LoginPage() {
  const [error, formAction] = useFormState(authenticate, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-card w-full max-w-md animate-fade-up p-8">
        <Image src="/lion-logo.png" alt="Ledgerion" width={72} height={72} className="mx-auto h-[72px] w-[72px] object-contain" priority />
        <h1 className="mt-4 text-center font-sans text-2xl font-semibold text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">Log in to your trading journal.</p>

        <form action={formAction} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-slate-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-field"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-slate-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-loss/30 bg-loss-soft px-3 py-2 text-sm text-loss">
              {error}
            </p>
          )}

          <SubmitButton />
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-neutral hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
