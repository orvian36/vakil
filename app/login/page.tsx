"use client";
import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button, Input } from "@/components/ui";
import { fadeUp } from "@/lib/motion";

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
    <motion.form
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      onSubmit={onSubmit}
      className="space-y-5"
    >
      <div className="space-y-1.5 mb-2">
        <h1 className="text-3xl font-display text-ink-100">Welcome back</h1>
        <p className="text-sm text-ink-400">Sign in to continue drafting.</p>
      </div>

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
        <span className="text-sm font-medium text-ink-300">Password</span>
        <Input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-sm text-center text-ink-400 pt-2">
        New here?{" "}
        <Link
          href="/register"
          className="text-gold-500 underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </motion.form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
