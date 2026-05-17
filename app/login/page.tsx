"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Invalid email or password");
      return;
    }
    router.push(search.get("next") ?? "/");
    router.refresh();
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-[var(--radius-card)] bg-[var(--color-cream-100)] border border-[var(--color-line)] p-8 space-y-5"
      >
        <div className="space-y-1.5">
          <h1 className="text-3xl">Welcome back</h1>
          <p className="text-sm text-[var(--color-ink-500)]">Sign in to continue drafting.</p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink-700)]">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-saffron w-full bg-white border border-[var(--color-line)] rounded-[var(--radius-button)] px-3 py-2 text-[var(--color-ink-950)]"
            placeholder="you@firm.com"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink-700)]">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-saffron w-full bg-white border border-[var(--color-line)] rounded-[var(--radius-button)] px-3 py-2 text-[var(--color-ink-950)]"
          />
        </label>

        {error && <p className="text-sm text-[var(--color-rose-500)]">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-[var(--color-saffron-500)] hover:bg-[var(--color-saffron-600)] text-[var(--color-ink-950)] font-medium py-2.5 rounded-[var(--radius-button)] transition disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-sm text-center text-[var(--color-ink-500)]">
          New here?{" "}
          <Link
            href="/register"
            className="text-[var(--color-saffron-600)] underline-offset-2 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
