"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Registration failed");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-[var(--radius-card)] bg-[var(--color-cream-100)] border border-[var(--color-line)] p-8 space-y-5"
      >
        <div className="space-y-1.5">
          <h1 className="text-3xl">Create your Vakil account</h1>
          <p className="text-sm text-[var(--color-ink-500)]">Start drafting in under a minute.</p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink-700)]">
            Your name <span className="text-[var(--color-ink-500)] font-normal">(optional)</span>
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aarav Khan"
            className="focus-saffron w-full bg-white border border-[var(--color-line)] rounded-[var(--radius-button)] px-3 py-2 text-[var(--color-ink-950)]"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink-700)]">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@firm.com"
            className="focus-saffron w-full bg-white border border-[var(--color-line)] rounded-[var(--radius-button)] px-3 py-2 text-[var(--color-ink-950)]"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink-700)]">
            Password <span className="text-[var(--color-ink-500)] font-normal">(8+ chars)</span>
          </span>
          <input
            type="password"
            required
            minLength={8}
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
          {loading ? "Creating…" : "Create account"}
        </button>

        <p className="text-sm text-center text-[var(--color-ink-500)]">
          Have an account?{" "}
          <Link
            href="/login"
            className="text-[var(--color-saffron-600)] underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
