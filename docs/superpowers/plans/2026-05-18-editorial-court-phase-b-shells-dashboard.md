# Editorial Court · Phase B · Shells & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the chrome shells (`AppShell`, `AuthShell`) and rebuild the first set of public-facing screens (login, register, dashboard) on top of the Phase A primitive library. Replace existing `CreateCaseModal` / `EditCaseModal` with token-aware dialogs. Replace every `window.confirm()` with `ConfirmDialog`.

**Architecture:** New `components/layout/` directory hosts shell + chrome components. New `components/dashboard/` directory hosts Spotlight + CaseTable. New `components/modals/` (creates: directory may already exist) hosts dialog rewrites. `app/layout.tsx` wraps everything in `AppShell` via `AuthProvider`. Auth routes use `AuthShell` directly. The dashboard at `app/page.tsx` is rewritten with the editorial spotlight + table pattern.

**Tech Stack:** Next.js 15.4 App Router, React 19, Tailwind v4 (inline `@theme`), framer-motion, `components/ui/` primitives (Phase A), Radix UI underneath.

**Spec reference:** `docs/superpowers/specs/2026-05-17-editorial-court-ui-redesign-design.md` — Sections 4 (Shells), 5 (Dashboard), 9 (Modals).

**Out of scope for Phase B:** Case wizard chrome (`CaseShell`, `StepRail`, `WizardFooter`) and any step internals — those are Phase C. PDF Split workshop is Phase D. Review documents are Phase E. The `⌘K` global search modal beyond the basic case-search behavior already on the dashboard.

---

## Decisions made in this plan

- **`AuthProvider` shape:** It currently renders `<Navbar />` inline. We move Navbar into `AppShell`. `AuthProvider` becomes pure context. This is a small refactor but it keeps shell composition clean.
- **AppShell wraps EVERYTHING by default** (in `app/layout.tsx`), and auth routes opt OUT by replacing the `<main>` content with `AuthShell`. This means logged-out users on `/login` still see the navbar — we hide it via the existing `isAuthenticated && user` guard already inside Navbar. The Footer is also conditionally rendered in `AppShell` so auth pages don't get it.
- **Dashboard "spotlight" rule:** spotlight renders only when at least one case has `status !== "completed"`. If no active cases but ≥1 complete: spotlight becomes a "Start a new case" CTA card. If zero cases entirely: spotlight is replaced by the standard `EmptyState`.
- **CaseTable** is a real `<table>` element for semantics and a11y; row hover gets a gold left border via CSS `:hover` on `<tr>`. No sorting in this phase (column headers don't click).
- **CreateCaseDialog** is the spec's two-step internal flow (basics → parties). EditCaseDialog stays single-form (same fields, no stepping).
- **`window.confirm()` audit:** find every call site, replace with `ConfirmDialog`. Each call site needs `open`/`onOpenChange` state lifted to the parent component. List of known sites: delete case on dashboard (`app/page.tsx`), delete file in `Step1Evidence.tsx`. Step1 is Phase C scope — for THIS phase we only touch the dashboard's confirm.
- **Old files**: After the dialogs ship, `components/CreateCaseModal.tsx` and `components/EditCaseModal.tsx` are deleted in the final task. `components/Navbar.tsx` and `components/Footer.tsx` are rewritten in place (not moved to `components/layout/`) to keep import paths stable for the auth provider; the new `components/layout/` directory hosts the new shell components only.

---

## File structure

### New files

```
components/
  layout/
    AppShell.tsx              chrome shell: <Navbar/> + <main/> + <Footer/>
    AuthShell.tsx             auth-route shell: form panel + optional editorial side panel
  dashboard/
    Spotlight.tsx             top hero card showing most-recent active case
    CaseTable.tsx             editorial table
    CaseTableRow.tsx          one row component (hover gold accent, click → open case, overflow menu)
  modals/
    CreateCaseDialog.tsx      replaces CreateCaseModal — 2-step internal flow
    EditCaseDialog.tsx        replaces EditCaseModal — single form

tests/components/
  AppShell.test.tsx
  AuthShell.test.tsx
  Spotlight.test.tsx
  CaseTable.test.tsx
  CreateCaseDialog.test.tsx
  EditCaseDialog.test.tsx
```

### Modified files

```
app/layout.tsx                wrap children in AppShell via AuthProvider
app/page.tsx                  rewrite dashboard with Spotlight + CaseTable + modals
app/login/page.tsx            re-skin form on AuthShell + ui primitives
app/register/page.tsx         re-skin form on AuthShell + ui primitives
components/Navbar.tsx         rewrite for dark ink chrome + ⌘K search chip placeholder
components/Footer.tsx         re-skin with tokens (currently uses raw bg-gray-200 / text-gray-600)
contexts/AuthProvider.tsx     remove inline <Navbar/> — pure context provider
```

### Deleted files

```
components/CreateCaseModal.tsx
components/EditCaseModal.tsx
```

### Untouched in this phase

- The entire wizard: `app/case/[case_id]/page.tsx`, `components/steps/*`, `components/tabs/*`, `components/modals/Regenerate*Modal.tsx` (those existing files survive Phase B; rewritten in Phase C).
- PDF Split flow: `components/PdfSplit*.tsx`, `components/SplitRangeDisplay.tsx` — Phase D.
- Editor / viewer: `components/MdxEditor.tsx`, `components/MdxRenderer.tsx`, `components/PDFViewerModal.tsx`, `components/Citation.tsx`, `components/Hoverable.tsx` — Phase E.
- The `/dev/primitives` demo route — unchanged.
- All services, API routes, middleware, LangGraph, Prisma, auth library — unchanged.

---

## Behavior preserved verbatim

- Auth flow: cookie-based JWT, refresh rotation, redirect on 401.
- API contracts: `GET /api/cases/user/[id]`, `POST /api/cases`, `PUT /api/cases/[id]`, `DELETE /api/cases/[id]` — all called identically.
- Case-search query semantics (`?search=foo`) and the 500ms debounce.
- The two-party data shape (plaintiff vs defendant, person vs company, bengaliName).
- Status values: `draft | processing | completed | failed`.
- Navigation on dashboard click → `/case/[id]`.

---

## Task 1: Setup baseline

**Files:** none (verification only)

- [ ] **Step 1.1: Confirm clean baseline**

Run:
```bash
git log --oneline -1
npm test 2>&1 | tail -5
npm run build 2>&1 | tail -5
```
Expected: tests pass (69), build clean. If not, stop and report.

- [ ] **Step 1.2: No commit (verification only)**

---

## Task 2: Restyle Footer

**Files:**
- Modify: `components/Footer.tsx`
- Test: `tests/components/Footer.test.tsx` (NEW)

- [ ] **Step 2.1: Write the failing test**

```tsx
// tests/components/Footer.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "@/components/Footer";

describe("Footer", () => {
  it("renders copyright with author link", () => {
    render(<Footer />);
    expect(screen.getByText(/Vakil/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Habibur Rahman/i });
    expect(link).toHaveAttribute("href", "https://github.com/orvian36");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("uses dark editorial chrome tokens (no raw gray)", () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector("footer")!;
    // No legacy gray-* classes
    expect(footer.className).not.toMatch(/border-gray-/);
    expect(footer.className).not.toMatch(/text-gray-/);
  });
});
```

- [ ] **Step 2.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Footer`
Expected: second test fails (current Footer uses `border-gray-200` + `text-gray-600`).

- [ ] **Step 2.3: Rewrite `components/Footer.tsx`**

```tsx
export default function Footer() {
  return (
    <footer className="border-t border-line-soft mt-12 py-4 text-sm text-center text-ink-400">
      © 2026 Vakil · Built by{" "}
      <a
        href="https://github.com/orvian36"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gold-500 underline-offset-2 hover:underline"
      >
        Habibur Rahman
      </a>
    </footer>
  );
}
```

- [ ] **Step 2.4: Run test, expect PASS** (2 tests).

- [ ] **Step 2.5: Commit**

```bash
git add components/Footer.tsx tests/components/Footer.test.tsx
git commit -m "feat(ui): restyle Footer with dark editorial tokens"
```

---

## Task 3: Rewrite Navbar

**Files:**
- Modify: `components/Navbar.tsx`
- Test: `tests/components/Navbar.test.tsx` (NEW)

- [ ] **Step 3.1: Write the failing test**

```tsx
// tests/components/Navbar.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "@/components/Navbar";

describe("Navbar", () => {
  it("renders the Vakil wordmark linking home", () => {
    render(<Navbar />);
    const wordmark = screen.getByRole("link", { name: /Vakil/i });
    expect(wordmark).toHaveAttribute("href", "/");
  });

  it("shows user menu trigger when authenticated", () => {
    const user = { id: "u1", email: "a@b.c", name: "Test User" } as any;
    render(<Navbar user={user} isAuthenticated isLoading={false} />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("hides user menu when not authenticated", () => {
    render(<Navbar isAuthenticated={false} isLoading={false} />);
    expect(screen.queryByText("Test User")).not.toBeInTheDocument();
  });

  it("calls onLogout when Sign out is clicked", async () => {
    const u = userEvent.setup();
    let loggedOut = false;
    const user = { id: "u1", email: "a@b.c", name: "Test" } as any;
    render(
      <Navbar
        user={user}
        isAuthenticated
        isLoading={false}
        onLogout={async () => {
          loggedOut = true;
        }}
      />,
    );
    await u.click(screen.getByRole("button", { name: /Test/ }));
    await u.click(screen.getByRole("button", { name: /Sign out/i }));
    expect(loggedOut).toBe(true);
  });
});
```

- [ ] **Step 3.2: Run test, expect FAIL** (current Navbar uses cream/saffron tokens which no longer exist — Phase A removed them — so visual classes will be stale; also auth-menu open behavior may still work but classes are off).

Run: `npm test -- --project=dom -t Navbar`

- [ ] **Step 3.3: Rewrite `components/Navbar.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { User } from "@/types/auth";
import { KeyboardHint } from "@/components/ui";

interface NavbarProps {
  user?: User | null;
  isLoading?: boolean;
  isAuthenticated?: boolean;
  onLogout?: () => Promise<void>;
}

export default function Navbar({
  user,
  isLoading = false,
  isAuthenticated = false,
  onLogout,
}: NavbarProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".user-menu-container")) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    if (onLogout) await onLogout();
  };

  const initials = (user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase();
  const displayName = user?.name ?? user?.email ?? "User";

  return (
    <header className="border-b border-line-soft bg-ink-900/85 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-2xl tracking-tight text-ink-100 font-display"
        >
          Vakil
        </Link>

        {isAuthenticated && user && (
          <>
            <button
              type="button"
              className="hidden md:flex items-center gap-2 rounded-[var(--radius-md)] border border-line-soft bg-ink-800 px-3 h-9 text-sm text-ink-400 hover:text-ink-100 hover:border-line-strong transition-colors focus-gold"
              aria-label="Search cases"
              onClick={() => {
                // ⌘K modal opens here in a future phase; for now no-op
              }}
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search cases</span>
              <KeyboardHint keys={["⌘", "K"]} />
            </button>

            <div className="relative user-menu-container">
              <button
                onClick={() => setOpen((v) => !v)}
                disabled={isLoading}
                className="focus-gold flex items-center gap-2 rounded-[var(--radius-md)] border border-line-strong bg-ink-800 px-3 py-1.5 text-sm text-ink-300 hover:text-ink-100"
              >
                <span className="w-7 h-7 rounded-full bg-gold-500 text-ink-950 grid place-items-center font-medium">
                  {initials}
                </span>
                <span className="hidden sm:inline">{displayName}</span>
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-56 rounded-[var(--radius-lg)] bg-ink-800 border border-line-strong shadow-xl p-1.5">
                  <div className="px-3 py-2 text-xs text-ink-400 border-b border-line-soft truncate">
                    {user.email}
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="w-full text-left text-sm px-3 py-2 rounded-[var(--radius-md)] hover:bg-ink-700 text-ink-300 hover:text-ink-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 3.4: Run test, expect PASS** (4 tests).

- [ ] **Step 3.5: Verify build still passes**

Run: `npm run build 2>&1 | tail -5`

- [ ] **Step 3.6: Commit**

```bash
git add components/Navbar.tsx tests/components/Navbar.test.tsx
git commit -m "feat(ui): rewrite Navbar for dark editorial chrome + ⌘K search chip"
```

---

## Task 4: Pure-context AuthProvider

**Files:**
- Modify: `contexts/AuthProvider.tsx`

The current `AuthProvider` renders `<Navbar />` inline. After Task 5 introduces `AppShell`, Navbar lives there. This task strips Navbar out of AuthProvider WITHOUT yet moving it — we leave Navbar dangling until Task 5 adds it back via AppShell.

- [ ] **Step 4.1: Rewrite `contexts/AuthProvider.tsx`**

```tsx
"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthContextType } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
```

- [ ] **Step 4.2: Verify the existing test suite still passes**

Run: `npm test 2>&1 | tail -5`
Expected: all tests still pass. (No tests directly depend on AuthProvider rendering Navbar.)

- [ ] **Step 4.3: Verify the build still passes**

Run: `npm run build 2>&1 | tail -5`
Expected: clean. The dashboard / wizard pages will lose their Navbar visually until Task 5 wires it back via AppShell, but the build itself is fine.

- [ ] **Step 4.4: Commit**

```bash
git add contexts/AuthProvider.tsx
git commit -m "refactor(layout): strip Navbar out of AuthProvider; AppShell will host it"
```

---

## Task 5: AppShell

**Files:**
- Create: `components/layout/AppShell.tsx`
- Test: `tests/components/AppShell.test.tsx`

- [ ] **Step 5.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";

describe("AppShell", () => {
  it("renders children inside main", () => {
    render(
      <AppShell>
        <div data-testid="content">hello</div>
      </AppShell>,
    );
    expect(screen.getByTestId("content")).toBeInTheDocument();
    expect(screen.getByText("hello").closest("main")).not.toBeNull();
  });

  it("renders navbar + footer chrome by default", () => {
    const { container } = render(
      <AppShell>
        <div>x</div>
      </AppShell>,
    );
    expect(container.querySelector("header")).not.toBeNull();
    expect(container.querySelector("footer")).not.toBeNull();
  });

  it("omits chrome when hideChrome is true", () => {
    const { container } = render(
      <AppShell hideChrome>
        <div>x</div>
      </AppShell>,
    );
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("footer")).toBeNull();
  });
});
```

- [ ] **Step 5.2: Run test, expect FAIL** (module not found).

Run: `npm test -- --project=dom -t AppShell`

- [ ] **Step 5.3: Implement `components/layout/AppShell.tsx`**

```tsx
"use client";

import { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuthContext } from "@/contexts/AuthProvider";

interface AppShellProps {
  children: ReactNode;
  hideChrome?: boolean;
}

export function AppShell({ children, hideChrome = false }: AppShellProps) {
  const auth = useAuthContext();
  return (
    <div className="min-h-screen flex flex-col">
      {!hideChrome && (
        <Navbar
          user={auth.user}
          isLoading={auth.isLoading}
          isAuthenticated={auth.isAuthenticated}
          onLogout={auth.logout}
        />
      )}
      <main className="flex-1">{children}</main>
      {!hideChrome && <Footer />}
    </div>
  );
}
```

Note: tests will fail because `useAuthContext` throws when not inside an `AuthProvider`. To make the test pass without wrapping every test in AuthProvider, AppShell must tolerate missing context. Add a safe fallback:

Refine the implementation:

```tsx
"use client";

import { ReactNode, useContext } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

interface AppShellProps {
  children: ReactNode;
  hideChrome?: boolean;
}

export function AppShell({ children, hideChrome = false }: AppShellProps) {
  // useAuth reads from context internally; if no provider, it returns
  // default unauthenticated state without throwing
  let auth: ReturnType<typeof useAuth> | null = null;
  try {
    auth = useAuth();
  } catch {
    auth = null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {!hideChrome && (
        <Navbar
          user={auth?.user}
          isLoading={auth?.isLoading ?? false}
          isAuthenticated={auth?.isAuthenticated ?? false}
          onLogout={auth?.logout}
        />
      )}
      <main className="flex-1">{children}</main>
      {!hideChrome && <Footer />}
    </div>
  );
}
```

If `useAuth` reads via context internally and tolerates missing provider (test it first by reading `hooks/useAuth.ts`), simplify. Otherwise this try/catch approach keeps the test isolated.

If `useAuth` throws when used outside `AuthProvider`, the safer pattern for the test is to wrap with `AuthProvider`. Update the test:

```tsx
import { AuthProvider } from "@/contexts/AuthProvider";

// inside each test, wrap:
render(
  <AuthProvider>
    <AppShell>...</AppShell>
  </AuthProvider>
);
```

Pick whichever path works: (a) make AppShell tolerant of missing context, or (b) wrap tests in AuthProvider. Implementer choice — both are fine.

- [ ] **Step 5.4: Run test, expect PASS** (3 tests).

- [ ] **Step 5.5: Verify build**

Run: `npm run build 2>&1 | tail -5`

- [ ] **Step 5.6: Commit**

```bash
git add components/layout/AppShell.tsx tests/components/AppShell.test.tsx
git commit -m "feat(ui): add AppShell with optional chrome (hides Navbar+Footer for auth)"
```

---

## Task 6: Apply AppShell to root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 6.1: Modify `app/layout.tsx`**

The new file replaces the existing `<main className="flex-1">{children}</main><Footer />` with `<AppShell>{children}</AppShell>`.

Full new file:

```tsx
import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vakil — AI legal drafter",
  description:
    "An AI paralegal that drafts while you strategize. Turn case evidence into court-ready first drafts.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6.2: Verify all tests + build**

Run:
```bash
npm test 2>&1 | tail -5
npm run build 2>&1 | tail -10
```
Expected: tests green, build clean. Visiting `/` should now show the new Navbar + Footer (Navbar will be skeletal because the dashboard isn't rewritten yet — that's Task 11+).

- [ ] **Step 6.3: Commit**

```bash
git add app/layout.tsx
git commit -m "refactor(layout): wrap children in AppShell from root layout"
```

---

## Task 7: AuthShell

**Files:**
- Create: `components/layout/AuthShell.tsx`
- Test: `tests/components/AuthShell.test.tsx`

- [ ] **Step 7.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthShell } from "@/components/layout/AuthShell";

describe("AuthShell", () => {
  it("renders children as the form panel", () => {
    render(
      <AuthShell>
        <div data-testid="form">form content</div>
      </AuthShell>,
    );
    expect(screen.getByTestId("form")).toBeInTheDocument();
  });

  it("renders the editorial tagline on the side panel", () => {
    render(
      <AuthShell tagline="Drafts while you strategise.">
        <div>x</div>
      </AuthShell>,
    );
    expect(
      screen.getByText("Drafts while you strategise."),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 7.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t AuthShell`

- [ ] **Step 7.3: Implement `components/layout/AuthShell.tsx`**

```tsx
import { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  tagline?: string;
}

export function AuthShell({
  children,
  tagline = "Drafts while you strategise.",
}: AuthShellProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink-950">
      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      {/* Editorial side panel — hidden on small screens */}
      <aside className="hidden lg:flex items-center justify-center bg-ink-900 border-l border-line-soft p-12 relative">
        <div className="absolute top-12 left-12 w-12 h-px bg-gold-500" />
        <h2 className="text-5xl font-display text-ink-100 leading-tight max-w-md">
          {tagline}
        </h2>
        <div className="absolute bottom-12 left-12 text-xs uppercase tracking-widest text-ink-400">
          Vakil · AI paralegal
        </div>
      </aside>
    </div>
  );
}
```

- [ ] **Step 7.4: Run test, expect PASS** (2 tests).

- [ ] **Step 7.5: Commit**

```bash
git add components/layout/AuthShell.tsx tests/components/AuthShell.test.tsx
git commit -m "feat(ui): add AuthShell with editorial tagline side panel"
```

---

## Task 8: Rewrite login page

**Files:**
- Modify: `app/login/page.tsx`

- [ ] **Step 8.1: Replace `app/login/page.tsx`**

```tsx
"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button, Input } from "@/components/ui";

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
    <form onSubmit={onSubmit} className="space-y-5">
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
    </form>
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
```

Important: this page now renders `AuthShell` directly. But `app/layout.tsx` wraps everything in `AppShell` which includes Navbar + Footer. The login page would end up with both chromes. Fix: the `AppShell` we created supports `hideChrome`. To make it conditional per route, we apply `hideChrome` from the layout using usePathname:

- [ ] **Step 8.2: Update `app/layout.tsx` to conditionally hide chrome on auth routes**

Actually the cleanest path is to make `app/(auth)/layout.tsx` a route group with no AppShell. But that requires re-organising routes. Simpler approach: have `AppShell` check `usePathname()` itself and skip chrome for auth routes.

Modify `components/layout/AppShell.tsx`:

```tsx
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

const AUTH_ROUTES = ["/login", "/register"];

interface AppShellProps {
  children: ReactNode;
  hideChrome?: boolean;
}

export function AppShell({ children, hideChrome }: AppShellProps) {
  const pathname = usePathname();
  const autoHide = AUTH_ROUTES.some((r) => pathname?.startsWith(r));
  const effectiveHide = hideChrome ?? autoHide;

  let auth: ReturnType<typeof useAuth> | null = null;
  try {
    auth = useAuth();
  } catch {
    auth = null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {!effectiveHide && (
        <Navbar
          user={auth?.user}
          isLoading={auth?.isLoading ?? false}
          isAuthenticated={auth?.isAuthenticated ?? false}
          onLogout={auth?.logout}
        />
      )}
      <main className="flex-1">{children}</main>
      {!effectiveHide && <Footer />}
    </div>
  );
}
```

Update test if needed — adding a third test:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/login",
}));

describe("AppShell (auto-hide on auth routes)", () => {
  it("hides chrome on /login automatically", () => {
    const { container } = render(<AppShell><div /></AppShell>);
    expect(container.querySelector("header")).toBeNull();
  });
});
```

Decision point: vi.mock is module-scoped; combining it with the existing 3 tests is awkward. Easier — split into two test files or use a different approach. Simplest: add a new test file `tests/components/AppShell.autoHide.test.tsx` that mocks `usePathname`:

```tsx
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/login",
}));

import { render } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";

describe("AppShell auto-hide", () => {
  it("hides chrome on /login automatically", () => {
    const { container } = render(<AppShell><div /></AppShell>);
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("footer")).toBeNull();
  });
});
```

And in the original `tests/components/AppShell.test.tsx`, mock `usePathname` to return `/` so chrome shows:

```tsx
import { vi } from "vitest";
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
// ... rest of file as before
```

- [ ] **Step 8.3: Run tests**

Run:
```bash
npm test -- --project=dom -t AppShell
npm test -- --project=dom -t login
```
Expected: AppShell tests pass (existing + new auto-hide); the login route renders without nested chrome.

- [ ] **Step 8.4: Verify build**

Run: `npm run build 2>&1 | tail -5`

- [ ] **Step 8.5: Commit**

```bash
git add app/login/page.tsx components/layout/AppShell.tsx tests/components/AppShell.test.tsx tests/components/AppShell.autoHide.test.tsx
git commit -m "feat(ui): rewrite login on AuthShell; AppShell auto-hides chrome on auth routes"
```

---

## Task 9: Rewrite register page

**Files:**
- Modify: `app/register/page.tsx`

- [ ] **Step 9.1: Read current register page**

Run: cat the existing file to understand the form fields (probably name, email, password, confirm password).

- [ ] **Step 9.2: Replace `app/register/page.tsx`**

Use the same shape as the new login page — AuthShell + Input + Button — but with register-specific fields and POST to `/api/auth/register`. Keep the existing field set EXACTLY. If the current file has confirm-password validation, password-length validation, etc., preserve it. Replace inputs with `<Input />`, buttons with `<Button />`, errors with `text-rose-500`, links with `text-gold-500 hover:underline`.

The shell wrapper is identical:

```tsx
return (
  <AuthShell>
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  </AuthShell>
);
```

- [ ] **Step 9.3: Verify build + manual route visit (build-only)**

Run: `npm run build 2>&1 | tail -5`. Both `/login` and `/register` should be in the route table as `○ /login` and `○ /register`.

- [ ] **Step 9.4: Commit**

```bash
git add app/register/page.tsx
git commit -m "feat(ui): rewrite register on AuthShell with primitives"
```

---

## Task 10: Spotlight dashboard component

**Files:**
- Create: `components/dashboard/Spotlight.tsx`
- Test: `tests/components/Spotlight.test.tsx`

- [ ] **Step 10.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spotlight } from "@/components/dashboard/Spotlight";

const baseCase = {
  id: "c1",
  title: "Rahman v. State",
  caseType: "SOC",
  status: "draft",
  summary: "",
  parties: [
    { id: "p1", name: "Rahman", role: "plaintiff", type: "person", bengaliName: null },
    { id: "p2", name: "State", role: "defendant", type: "person", bengaliName: null },
  ],
  court: "Dhaka District Judge",
  caseNumber: "",
  files: [],
  updatedAt: new Date().toISOString(),
} as any;

describe("Spotlight", () => {
  it("renders active case title", () => {
    render(<Spotlight caseItem={baseCase} onResume={() => {}} />);
    expect(screen.getByText("Rahman v. State")).toBeInTheDocument();
  });

  it("renders Start a new case CTA when no active case", () => {
    render(<Spotlight caseItem={null} onResume={() => {}} onCreate={() => {}} />);
    expect(screen.getByRole("button", { name: /New case/i })).toBeInTheDocument();
  });

  it("calls onResume when Resume clicked", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const u = userEvent.setup();
    let resumed = false;
    render(<Spotlight caseItem={baseCase} onResume={() => (resumed = true)} />);
    await u.click(screen.getByRole("button", { name: /Resume/i }));
    expect(resumed).toBe(true);
  });
});
```

- [ ] **Step 10.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Spotlight`

- [ ] **Step 10.3: Implement `components/dashboard/Spotlight.tsx`**

```tsx
"use client";

import { ArrowRight } from "lucide-react";
import { Case } from "@/types/case";
import { Card, Button } from "@/components/ui";

interface SpotlightProps {
  caseItem: Case | null;
  onResume: (id: string) => void;
  onCreate?: () => void;
}

function formatRelative(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function Spotlight({ caseItem, onResume, onCreate }: SpotlightProps) {
  if (!caseItem) {
    return (
      <Card
        variant="gold-accent"
        className="relative px-8 py-10 border-l-2 border-l-gold-500"
      >
        <div className="flex items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-display text-ink-100 mb-2">
              Start a new case
            </h2>
            <p className="text-sm text-ink-400">
              Your AI paralegal is ready. Open a case or start a new one.
            </p>
          </div>
          {onCreate && (
            <Button onClick={onCreate} rightIcon={<ArrowRight className="h-4 w-4" />}>
              + New case
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const court = caseItem.court || "Court not specified";
  const typeLabel = caseItem.caseType === "DEFENCE" ? "Defence" : "Statement of Claim";
  const fileCount = caseItem.files?.length ?? 0;
  const updatedRel = (caseItem as any).updatedAt
    ? formatRelative((caseItem as any).updatedAt)
    : "recently";

  return (
    <Card
      variant="gold-accent"
      className="relative px-8 py-10 border-l-2 border-l-gold-500"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-gold-500 mb-2">
            Most recent
          </p>
          <h2 className="text-2xl md:text-3xl font-display text-ink-100 mb-2 truncate">
            {caseItem.title}
          </h2>
          <p className="text-sm text-ink-400 mb-4">
            {typeLabel} · before {court}
          </p>
          <p className="text-xs text-ink-500">
            Last edited {updatedRel} · {fileCount} evidence file{fileCount === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          onClick={() => onResume(caseItem.id)}
          rightIcon={<ArrowRight className="h-4 w-4" />}
          className="shrink-0"
        >
          Resume
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 10.4: Run test, expect PASS** (3 tests).

- [ ] **Step 10.5: Commit**

```bash
git add components/dashboard/Spotlight.tsx tests/components/Spotlight.test.tsx
git commit -m "feat(ui): add Spotlight dashboard hero with most-recent-case state"
```

---

## Task 11: CaseTable + CaseTableRow

**Files:**
- Create: `components/dashboard/CaseTable.tsx`
- Create: `components/dashboard/CaseTableRow.tsx`
- Test: `tests/components/CaseTable.test.tsx`

- [ ] **Step 11.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseTable } from "@/components/dashboard/CaseTable";

const cases = [
  {
    id: "c1",
    title: "Rahman v. State",
    caseType: "SOC",
    status: "draft",
    parties: [
      { id: "p1", name: "Rahman", role: "plaintiff", type: "person", bengaliName: null },
      { id: "p2", name: "State", role: "defendant", type: "person", bengaliName: null },
    ],
    files: [],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c2",
    title: "Choudhury v. ABS",
    caseType: "DEFENCE",
    status: "completed",
    parties: [],
    files: [],
    updatedAt: new Date().toISOString(),
  },
] as any;

describe("CaseTable", () => {
  it("renders each case as a row with title", () => {
    render(
      <CaseTable
        cases={cases}
        onOpen={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Rahman v. State")).toBeInTheDocument();
    expect(screen.getByText("Choudhury v. ABS")).toBeInTheDocument();
  });

  it("opens a case when row clicked", async () => {
    const u = userEvent.setup();
    let openedId = "";
    render(
      <CaseTable
        cases={cases}
        onOpen={(id) => (openedId = id)}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    await u.click(screen.getByText("Rahman v. State"));
    expect(openedId).toBe("c1");
  });
});
```

- [ ] **Step 11.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t CaseTable`

- [ ] **Step 11.3: Implement `components/dashboard/CaseTableRow.tsx`**

```tsx
"use client";

import { Edit, Trash2 } from "lucide-react";
import { Case } from "@/types/case";
import { StatusPill, type Status } from "@/components/ui";

function statusFromCase(c: Case): Status {
  switch (c.status) {
    case "completed":
      return "complete";
    case "processing":
      return "processing";
    case "failed":
      return "failed";
    case "draft":
    default:
      return "draft";
  }
}

function typeLabel(t: string): string {
  return t === "DEFENCE" ? "Defence" : "Claim";
}

function relTime(d: any): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

interface RowProps {
  caseItem: Case;
  onOpen: (id: string) => void;
  onEdit: (c: Case) => void;
  onDelete: (id: string) => void;
}

export function CaseTableRow({ caseItem, onOpen, onEdit, onDelete }: RowProps) {
  return (
    <tr
      onClick={() => onOpen(caseItem.id)}
      className="group cursor-pointer border-b border-line-soft hover:bg-ink-800/60 transition-colors"
    >
      <td className="px-4 py-3.5 text-sm text-ink-100 group-hover:text-gold-500 transition-colors max-w-md truncate">
        {caseItem.title}
      </td>
      <td className="px-4 py-3.5 text-sm text-ink-400">{typeLabel(caseItem.caseType)}</td>
      <td className="px-4 py-3.5">
        <StatusPill status={statusFromCase(caseItem)} />
      </td>
      <td className="px-4 py-3.5 text-xs text-ink-400">
        {relTime((caseItem as any).updatedAt)}
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(caseItem);
            }}
            className="p-1.5 rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-700 focus-gold"
            title="Edit case"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(caseItem.id);
            }}
            className="p-1.5 rounded-md text-ink-400 hover:text-rose-500 hover:bg-ink-700 focus-gold"
            title="Delete case"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
```

- [ ] **Step 11.4: Implement `components/dashboard/CaseTable.tsx`**

```tsx
"use client";

import { Case } from "@/types/case";
import { CaseTableRow } from "./CaseTableRow";

interface CaseTableProps {
  cases: Case[];
  onOpen: (id: string) => void;
  onEdit: (c: Case) => void;
  onDelete: (id: string) => void;
}

export function CaseTable({ cases, onOpen, onEdit, onDelete }: CaseTableProps) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-ink-900 border border-line-soft overflow-hidden">
      <table className="w-full">
        <thead className="bg-ink-800/60">
          <tr className="text-left text-xs uppercase tracking-widest text-ink-400">
            <th className="px-4 py-3 font-medium">Case</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Edited</th>
            <th className="px-4 py-3 font-medium w-32" />
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <CaseTableRow
              key={c.id}
              caseItem={c}
              onOpen={onOpen}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 11.5: Run test, expect PASS** (2 tests).

- [ ] **Step 11.6: Commit**

```bash
git add components/dashboard/CaseTable.tsx components/dashboard/CaseTableRow.tsx tests/components/CaseTable.test.tsx
git commit -m "feat(ui): add CaseTable + CaseTableRow editorial-table primitives"
```

---

## Task 12: CreateCaseDialog (2-step internal flow)

**Files:**
- Create: `components/modals/CreateCaseDialog.tsx`
- Test: `tests/components/CreateCaseDialog.test.tsx`

- [ ] **Step 12.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateCaseDialog } from "@/components/modals/CreateCaseDialog";

describe("CreateCaseDialog", () => {
  it("renders step A title and case-type radios when open", () => {
    render(
      <CreateCaseDialog open onOpenChange={() => {}} onSubmit={async () => {}} />,
    );
    expect(screen.getByLabelText(/Case title/i)).toBeInTheDocument();
    expect(screen.getByText(/Plaintiff/i)).toBeInTheDocument();
    expect(screen.getByText(/Defendant/i)).toBeInTheDocument();
  });

  it("advances to step B when Next clicked with valid title", async () => {
    const u = userEvent.setup();
    render(
      <CreateCaseDialog open onOpenChange={() => {}} onSubmit={async () => {}} />,
    );
    await u.type(screen.getByLabelText(/Case title/i), "Test Case");
    await u.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByText(/Plaintiffs/)).toBeInTheDocument();
    expect(screen.getByText(/Defendants/)).toBeInTheDocument();
  });

  it("blocks Next when title is blank", async () => {
    const u = userEvent.setup();
    render(
      <CreateCaseDialog open onOpenChange={() => {}} onSubmit={async () => {}} />,
    );
    await u.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it("submits via onSubmit on final step", async () => {
    const u = userEvent.setup();
    let submitted: any = null;
    render(
      <CreateCaseDialog
        open
        onOpenChange={() => {}}
        onSubmit={async (data) => {
          submitted = data;
        }}
      />,
    );
    await u.type(screen.getByLabelText(/Case title/i), "C1");
    await u.click(screen.getByRole("button", { name: /Next/i }));
    // Step B: at least one plaintiff and one defendant
    await u.type(screen.getAllByPlaceholderText(/plaintiff name/i)[0], "P1");
    await u.type(screen.getAllByPlaceholderText(/defendant name/i)[0], "D1");
    await u.click(screen.getByRole("button", { name: /Create case/i }));
    expect(submitted).not.toBeNull();
    expect(submitted.title).toBe("C1");
  });
});
```

- [ ] **Step 12.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t CreateCaseDialog`

- [ ] **Step 12.3: Implement `components/modals/CreateCaseDialog.tsx`**

The component is large. Build it carefully — reuse the data shapes from the legacy `CreateCaseModal` (title, caseType: SOC|DEFENCE, parties[] of {id, name, bengaliName, role, type}, court, caseNumber, summary). Steps:
- Step A: title + radio caseType + court (select) + caseNumber + summary.
- Step B: dynamic plaintiff list + dynamic defendant list with add/remove buttons. Each defendant has a person/company select. Names support `English (বাংলা)` parsing.
- Footer: Back (only on step B) + Cancel + Next (on A) / Create case (on B).

```tsx
"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  RadioGroup,
  RadioItem,
} from "@/components/ui";
import { CaseParty } from "@/types/case";

export interface CreateCaseData {
  title: string;
  caseType: "SOC" | "DEFENCE";
  parties: CaseParty[];
  summary: string;
  court: string;
  caseNumber: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCaseData) => Promise<void> | void;
  initialData?: Partial<CreateCaseData>;
  /** When true, title becomes "Edit case" and Next/Create become Save. */
  editMode?: boolean;
}

const COURTS = [
  "District Court",
  "High Court (Court of First Instance)",
  "Court of Appeal",
  "Court of Final Appeal",
];

function parseNameInput(input: string): { englishName: string; bengaliName: string | null } {
  const match = input.match(/(.*)\((.*)\)/);
  if (match) {
    return { englishName: match[1].trim(), bengaliName: match[2].trim() };
  }
  return { englishName: input, bengaliName: null };
}

export function CreateCaseDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  editMode,
}: Props) {
  const [step, setStep] = useState<"A" | "B">("A");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [data, setData] = useState<CreateCaseData>({
    title: initialData?.title ?? "",
    caseType: initialData?.caseType ?? "SOC",
    parties: initialData?.parties?.map((p) => ({ ...p, id: p.id ?? crypto.randomUUID() })) ?? [
      { id: crypto.randomUUID(), name: "", bengaliName: null, role: "plaintiff", type: "person" },
      { id: crypto.randomUUID(), name: "", bengaliName: null, role: "defendant", type: "person" },
    ],
    summary: initialData?.summary ?? "",
    court: initialData?.court ?? "",
    caseNumber: initialData?.caseNumber ?? "",
  });

  function update<K extends keyof CreateCaseData>(key: K, value: CreateCaseData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) setErrors((prev) => ({ ...prev, [key as string]: "" }));
  }

  function addParty(role: "plaintiff" | "defendant") {
    update("parties", [
      ...data.parties,
      { id: crypto.randomUUID(), name: "", bengaliName: null, role, type: "person" },
    ]);
  }

  function removeParty(id: string) {
    update("parties", data.parties.filter((p) => p.id !== id));
  }

  function updatePartyName(id: string, value: string) {
    const { englishName, bengaliName } = parseNameInput(value);
    update(
      "parties",
      data.parties.map((p) => (p.id === id ? { ...p, name: englishName, bengaliName } : p)),
    );
  }

  function updatePartyType(id: string, type: "person" | "company") {
    update("parties", data.parties.map((p) => (p.id === id ? { ...p, type } : p)));
  }

  function validateA(): boolean {
    const next: Record<string, string> = {};
    if (!data.title.trim()) next.title = "Case title is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateB(): boolean {
    const next: Record<string, string> = {};
    const plaintiffs = data.parties.filter((p) => p.role === "plaintiff" && p.name.trim());
    const defendants = data.parties.filter((p) => p.role === "defendant" && p.name.trim());
    if (plaintiffs.length === 0) next.parties = "At least one plaintiff is required";
    if (defendants.length === 0) {
      next.parties = (next.parties ? next.parties + ", " : "") + "At least one defendant";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext() {
    if (validateA()) setStep("B");
  }

  async function handleSubmit() {
    if (!validateB()) return;
    setBusy(true);
    try {
      await onSubmit({
        ...data,
        parties: data.parties.filter((p) => p.name.trim()),
      });
      onOpenChange(false);
      // reset for next open
      setStep("A");
      setData({
        title: "",
        caseType: "SOC",
        parties: [
          { id: crypto.randomUUID(), name: "", bengaliName: null, role: "plaintiff", type: "person" },
          { id: crypto.randomUUID(), name: "", bengaliName: null, role: "defendant", type: "person" },
        ],
        summary: "",
        court: "",
        caseNumber: "",
      });
      setErrors({});
    } finally {
      setBusy(false);
    }
  }

  const plaintiffs = data.parties.filter((p) => p.role === "plaintiff");
  const defendants = data.parties.filter((p) => p.role === "defendant");
  const title = editMode ? "Edit case" : "Create new case";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {step === "A" ? "Step 1 of 2 · basics" : "Step 2 of 2 · parties"}
        </DialogDescription>

        {step === "A" && (
          <div className="space-y-4 mt-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink-300">Case title *</span>
              <Input
                value={data.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Enter case title"
                error={errors.title}
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-sm font-medium text-ink-300">Role</span>
              <RadioGroup
                value={data.caseType}
                onValueChange={(v) => update("caseType", v as "SOC" | "DEFENCE")}
                className="grid grid-cols-2 gap-3"
              >
                {[
                  { value: "SOC", label: "Plaintiff", hint: "Filing a claim" },
                  { value: "DEFENCE", label: "Defendant", hint: "Responding to claim" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer ${
                      data.caseType === opt.value
                        ? "border-gold-500 bg-gold-500/10"
                        : "border-line-soft hover:border-line-strong"
                    }`}
                  >
                    <RadioItem value={opt.value} />
                    <div>
                      <div className="text-sm text-ink-100 font-medium">{opt.label}</div>
                      <div className="text-xs text-ink-400">{opt.hint}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-ink-300">Court</span>
                <Select
                  value={data.court}
                  onValueChange={(v) => update("court", v)}
                >
                  <SelectTrigger aria-label="Court">
                    <SelectValue placeholder="Select a court" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURTS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-ink-300">Case number</span>
                <Input
                  value={data.caseNumber}
                  onChange={(e) => update("caseNumber", e.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink-300">Summary (optional)</span>
              <Textarea
                value={data.summary}
                onChange={(e) => update("summary", e.target.value)}
                placeholder="Key facts, dates, damages…"
                rows={3}
              />
            </label>
          </div>
        )}

        {step === "B" && (
          <div className="space-y-6 mt-4">
            {errors.parties && (
              <p className="text-sm text-rose-500">{errors.parties}</p>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-ink-300">Plaintiffs</span>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => addParty("plaintiff")}
                  type="button"
                >
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {plaintiffs.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        value={p.name + (p.bengaliName ? ` (${p.bengaliName})` : "")}
                        onChange={(e) => updatePartyName(p.id, e.target.value)}
                        placeholder="plaintiff name (বাংলা optional)"
                      />
                    </div>
                    {plaintiffs.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => removeParty(p.id)}
                        aria-label="Remove plaintiff"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-ink-300">Defendants</span>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => addParty("defendant")}
                  type="button"
                >
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {defendants.map((d) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        value={d.name + (d.bengaliName ? ` (${d.bengaliName})` : "")}
                        onChange={(e) => updatePartyName(d.id, e.target.value)}
                        placeholder="defendant name (বাংলা optional)"
                      />
                    </div>
                    <div className="w-32">
                      <Select
                        value={d.type}
                        onValueChange={(v) => updatePartyType(d.id, v as "person" | "company")}
                      >
                        <SelectTrigger aria-label="Type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="person">Person</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {defendants.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => removeParty(d.id)}
                        aria-label="Remove defendant"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "B" && (
            <Button variant="ghost" onClick={() => setStep("A")} disabled={busy}>
              Back
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          {step === "A" ? (
            <Button onClick={handleNext}>Next ▸</Button>
          ) : (
            <Button onClick={handleSubmit} loading={busy}>
              {editMode ? "Save case" : "Create case"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 12.4: Run test, expect PASS** (4 tests).

- [ ] **Step 12.5: Commit**

```bash
git add components/modals/CreateCaseDialog.tsx tests/components/CreateCaseDialog.test.tsx
git commit -m "feat(ui): add CreateCaseDialog with 2-step internal flow"
```

---

## Task 13: EditCaseDialog

**Files:**
- Create: `components/modals/EditCaseDialog.tsx`
- Test: `tests/components/EditCaseDialog.test.tsx`

`EditCaseDialog` is `CreateCaseDialog` in `editMode={true}` with a different title and a single non-stepped form. The simplest implementation is to expose a `singleStep` prop on `CreateCaseDialog` OR just wrap it. We'll wrap to keep the dialogs independent and easier to evolve.

- [ ] **Step 13.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditCaseDialog } from "@/components/modals/EditCaseDialog";

const seedCase = {
  title: "Existing",
  caseType: "SOC" as const,
  parties: [],
  summary: "",
  court: "",
  caseNumber: "",
};

describe("EditCaseDialog", () => {
  it("renders edit title and pre-fills data", () => {
    render(
      <EditCaseDialog
        open
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        caseData={seedCase}
      />,
    );
    expect(screen.getByText(/Edit case/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing")).toBeInTheDocument();
  });
});
```

- [ ] **Step 13.2: Run test, expect FAIL**

- [ ] **Step 13.3: Implement `components/modals/EditCaseDialog.tsx`**

```tsx
"use client";

import { CreateCaseDialog, type CreateCaseData } from "./CreateCaseDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCaseData) => Promise<void> | void;
  caseData: Partial<CreateCaseData> | null;
}

export function EditCaseDialog({ open, onOpenChange, onSubmit, caseData }: Props) {
  return (
    <CreateCaseDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      initialData={caseData ?? {}}
      editMode
    />
  );
}
```

- [ ] **Step 13.4: Run test, expect PASS**.

- [ ] **Step 13.5: Commit**

```bash
git add components/modals/EditCaseDialog.tsx tests/components/EditCaseDialog.test.tsx
git commit -m "feat(ui): add EditCaseDialog wrapping CreateCaseDialog in editMode"
```

---

## Task 14: Rewrite dashboard page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 14.1: Replace `app/page.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Case } from "@/types/case";
import { useRouter } from "next/navigation";
import { Search, Plus, Loader2 } from "lucide-react";
import {
  Button,
  Input,
  ConfirmDialog,
  EmptyState,
  Shimmer,
} from "@/components/ui";
import { Spotlight } from "@/components/dashboard/Spotlight";
import { CaseTable } from "@/components/dashboard/CaseTable";
import { CreateCaseDialog } from "@/components/modals/CreateCaseDialog";
import { EditCaseDialog } from "@/components/modals/EditCaseDialog";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const userId = user?.id;

  async function fetchCases(uid: string, search?: string) {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        sort_by: "created_at",
        sort_order: "desc",
      });
      if (search) params.append("search", search);
      const response = await fetch(`/api/cases/user/${uid}?${params}`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setCases(await response.json());
    } catch (err) {
      console.error("Error fetching cases:", err);
      setCases([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId) fetchCases(userId);
  }, [userId]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (userId) fetchCases(userId, searchTerm);
    }, 500);
    return () => clearTimeout(t);
  }, [searchTerm, userId]);

  async function handleCreate(data: any) {
    const response = await fetch("/api/cases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, userId }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (userId) await fetchCases(userId, searchTerm);
  }

  async function handleUpdate(data: any) {
    if (!editingCase) return;
    const response = await fetch(`/api/cases/${editingCase.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (userId) await fetchCases(userId, searchTerm);
  }

  function requestDelete(id: string) {
    setDeletingId(id);
    setDeleteOpen(true);
  }

  async function handleDeleteConfirmed() {
    if (!deletingId) return;
    const response = await fetch(`/api/cases/${deletingId}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (userId) await fetchCases(userId, searchTerm);
    setDeletingId(null);
  }

  const spotlightCase =
    cases.find((c) => c.status !== "completed") ?? null;

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-display text-ink-100 mb-1">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-sm text-ink-400">
          Your AI paralegal is ready. Open a case or start a new one.
        </p>
      </div>

      <div className="mb-8">
        {loading ? (
          <Shimmer className="h-32 w-full" />
        ) : (
          <Spotlight
            caseItem={spotlightCase}
            onResume={(id) => router.push(`/case/${id}`)}
            onCreate={() => setCreateOpen(true)}
          />
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search cases…"
            leadingIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <span className="text-sm text-ink-400">
          {loading ? "Loading…" : `${cases.length} cases`}
        </span>
        <div className="flex-1" />
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
          New case
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Shimmer className="h-12 w-full" />
          <Shimmer className="h-12 w-full" />
          <Shimmer className="h-12 w-full" />
        </div>
      ) : cases.length === 0 ? (
        <EmptyState
          title={searchTerm ? "No matching cases" : "No cases yet"}
          description={
            searchTerm
              ? "Try a different search term."
              : "Create your first case to start drafting."
          }
          action={
            !searchTerm && (
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                New case
              </Button>
            )
          }
        />
      ) : (
        <CaseTable
          cases={cases}
          onOpen={(id) => router.push(`/case/${id}`)}
          onEdit={(c) => {
            setEditingCase(c);
            setEditOpen(true);
          }}
          onDelete={requestDelete}
        />
      )}

      <CreateCaseDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreate} />
      <EditCaseDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditingCase(null);
        }}
        onSubmit={handleUpdate}
        caseData={editingCase}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setDeletingId(null);
        }}
        title="Delete this case?"
        description="This cannot be undone. All evidence, drafts, and analysis for this case will be removed."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
}
```

- [ ] **Step 14.2: Verify build + visit**

Run:
```bash
npm run build 2>&1 | tail -15
```
Expected: clean. `/` is in the route table.

If running interactively, you'd visit `http://localhost:3000/` after `npm run dev` and confirm the dashboard loads. For automated execution, build alone is enough.

- [ ] **Step 14.3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(ui): rewrite dashboard with Spotlight, CaseTable, dialogs"
```

---

## Task 15: Delete old modal components

**Files:**
- Delete: `components/CreateCaseModal.tsx`
- Delete: `components/EditCaseModal.tsx`

- [ ] **Step 15.1: Confirm no imports remain**

Run:
```bash
grep -rE "from\s+['\"]@/components/(Create|Edit)CaseModal" --include="*.tsx" --include="*.ts" .
```
Expected: empty output (no callers).

If anything still imports them, STOP and report — there's a screen we missed.

- [ ] **Step 15.2: Delete the files**

```bash
git rm components/CreateCaseModal.tsx components/EditCaseModal.tsx
```

- [ ] **Step 15.3: Verify build still passes**

Run: `npm run build 2>&1 | tail -5`

- [ ] **Step 15.4: Commit**

```bash
git commit -m "chore(ui): delete legacy CreateCaseModal + EditCaseModal"
```

---

## Task 16: Final verification + PR

- [ ] **Step 16.1: All tests, both projects**

Run: `npm test 2>&1 | tail -10`
Expected: existing service tests (32) + Phase A primitive tests (~37) + new Phase B component tests pass.

- [ ] **Step 16.2: Production build**

Run: `npm run build 2>&1 | tail -10`
Expected: clean. Routes include `/`, `/login`, `/register`, `/case/[case_id]`, `/dev/primitives`.

- [ ] **Step 16.3: Token hygiene sweep**

Run:
```bash
grep -rE "(bg|text|border)-(blue|gray|red|green|yellow|indigo)-[0-9]" components/dashboard components/layout components/modals app/page.tsx app/login app/register components/Footer.tsx components/Navbar.tsx 2>/dev/null
```
Expected: empty. If hits → token regressions, fix before PR.

- [ ] **Step 16.4: Confirm Phase C surfaces are untouched**

Run:
```bash
git diff --stat main..HEAD -- app/case components/steps components/tabs components/PdfSplit components/SplitRangeDisplay.tsx components/MdxEditor.tsx components/MdxRenderer.tsx components/PDFViewerModal.tsx
```
Expected: empty.

- [ ] **Step 16.5: Open PR**

(The controller may handle this manually instead of the implementer.)

```bash
git push -u origin feat/phase-b-shells-dashboard
gh pr create --title "feat(ui): Phase B · shells + dashboard + auth + dialogs" --body "$(cat <<'EOF'
## Summary
- New `AppShell` + `AuthShell` layouts
- Restyled Navbar (with ⌘K search chip) and Footer in editorial chrome
- Login + register rewritten on AuthShell + primitives
- Dashboard rewritten with `Spotlight` hero + editorial `CaseTable` + primitives
- `CreateCaseDialog` (2-step internal flow) and `EditCaseDialog` replace legacy modals
- `ConfirmDialog` adopted on dashboard delete (replacing `window.confirm`)
- Legacy `CreateCaseModal` + `EditCaseModal` deleted

No wizard / PDF Split / Review screens touched in this phase — Phases C–E.

Spec: docs/superpowers/specs/2026-05-17-editorial-court-ui-redesign-design.md
Plan: docs/superpowers/plans/2026-05-18-editorial-court-phase-b-shells-dashboard.md

## Test plan
- [x] npm test — all projects green
- [x] npm run build — clean
- [ ] Visit / — spotlight + table render
- [ ] Sign out → /login lands on AuthShell
- [ ] Create case (2-step flow) → row appears
- [ ] Edit case (pre-filled form) → row updates
- [ ] Delete case → ConfirmDialog → row removed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

(Controller may use the absolute path to `gh.exe` on Windows.)

---

## Self-review

**Spec coverage** (Sections 4, 5, 9 of the spec):
- §4 AppShell + Navbar + Footer + AuthShell → Tasks 2–9 ✓
- §5 Dashboard editorial spotlight + table → Tasks 10–11, 14 ✓
- §9 CreateCaseDialog, EditCaseDialog, ConfirmDialog usage → Tasks 12–14 ✓

**Placeholder scan:** No "TBD" or "TODO" remains. All step bodies contain actual code or actual commands.

**Type consistency:** `CreateCaseData` and `CaseParty` shapes match the existing types. `Case` from `@/types/case` used consistently. `StatusPill` `Status` type imported from the barrel.

**Open follow-ups for Phase C (not blockers):**
- `Step1Evidence.tsx` still has `window.confirm` for file delete — Phase C scope.
- The wizard page (`app/case/[case_id]/page.tsx`) still shows the old top-tabs stepper — Phase C rewrites it on `CaseShell`.
- The Navbar's `⌘K` button is a placeholder no-op — actual search modal is deferred (basic search already works in the dashboard input).
