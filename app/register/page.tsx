"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button, Input } from "@/components/ui";

function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5 mb-2">
        <h1 className="text-3xl font-display text-ink-100">Create your account</h1>
        <p className="text-sm text-ink-400">Start drafting in under a minute.</p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink-300">
          Your name{" "}
          <span className="font-normal text-ink-400">(optional)</span>
        </span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Aarav Khan"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink-300">Email</span>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@firm.com"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink-300">
          Password{" "}
          <span className="font-normal text-ink-400">(8+ chars)</span>
        </span>
        <Input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Creating…" : "Create account"}
      </Button>

      <p className="text-sm text-center text-ink-400 pt-2">
        Have an account?{" "}
        <Link
          href="/login"
          className="text-gold-500 underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell tagline="Drafts while you strategise.">
      <RegisterForm />
    </AuthShell>
  );
}
