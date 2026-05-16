# Phase 5 — UI redesign (serif + warm palette)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. **Additionally, invoke `ui-ux-pro-max` at the start of every component-redesign task** — it provides current best-practice component patterns and style libraries that will save time vs. designing from scratch.

**Pre-requisite:** Phase 4 PR merged. The brand is "Vakil" everywhere, witness translation is Bangla, but the UI still uses the default Tailwind palette and Geist fonts.

**Goal:** Replace the visual identity end-to-end with the system spec'd in `docs/superpowers/specs/2026-05-17-vakil-rebrand-design.md` §5–§6: Fraunces serif headings, Inter body, warm ink-navy + saffron + cream palette, cards with 1px hairlines instead of shadows. Redesign auth pages, cases dashboard, wizard stepper, and document tabs.

**Architecture:** No new infrastructure. Design tokens land in `app/globals.css` via Tailwind v4's `@theme`. Fraunces and Inter come from `next/font/google`. Every surface gets restyled with the new tokens — no component logic changes.

---

## File Structure

**Modified:**
- `app/globals.css` — design tokens via `@theme`; replace any default Tailwind utility overrides
- `app/layout.tsx` — swap Geist for Fraunces + Inter; remove unused font CSS vars
- `tailwind.config.ts` — minimal, since v4 reads tokens from `@theme`; delete if unused
- `app/login/page.tsx`, `app/register/page.tsx` — apply tokens, serif headline
- `app/page.tsx` — redesign cases dashboard (hero + card grid)
- `app/case/[case_id]/page.tsx` — redesign 5-step stepper + step shell
- `components/Navbar.tsx` — Fraunces wordmark, user avatar dropdown
- `components/CreateCaseModal.tsx`, `EditCaseModal.tsx` — restyle inputs/buttons with new tokens
- `components/tabs/*.tsx` — adopt left-rail layout with wide reading column
- `components/steps/Step*.tsx` — cream card shell, saffron accents
- `components/Footer.tsx` — already simplified in Phase 4; restyle minimally

**Removed:**
- Any unused legacy CSS classes referencing Tailwind defaults the new system doesn't carry over

---

## Task 1: Branch

- [ ] `git checkout main && git pull origin main && git status` (clean)
- [ ] `git checkout -b feat/phase-5-ui`

---

## Task 2: Invoke ui-ux-pro-max for design-token + typography setup

The `ui-ux-pro-max` skill provides current best-practice patterns for Tailwind v4 token systems, font-pairing recipes, and design-system primitives. Invoke it now to bootstrap Tasks 3 and 4 with patterns appropriate to React 19 + Tailwind v4.

- [ ] **Step 1: Invoke the skill** (Claude Code: use the `Skill` tool with `skill: "ui-ux-pro-max"` and a prompt like *"I'm establishing a design system for a Next.js 15 + Tailwind v4 app. Tokens already chosen: ink-navy + saffron + cream, Fraunces (display) + Inter (body). Need: (1) the exact `@theme` CSS block, (2) recommended utility helpers, (3) component patterns I should adopt for buttons, inputs, cards, chips."*

- [ ] **Step 2: Capture any divergence from the spec's tokens**

If `ui-ux-pro-max` recommends adjustments (e.g. additional grey shades for borders, an extra emphasis hue), apply them. The spec is the contract — extend it via the spec file if the change is material, otherwise just include the additions in the token block below.

---

## Task 3: Design tokens in `app/globals.css`

- [ ] **Step 1: Replace `app/globals.css`**

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-ink-950: #0F1B2D;
  --color-ink-800: #1A2A44;
  --color-ink-700: #2A3F5F;
  --color-ink-500: #4F627E;
  --color-ink-300: #8A9AB1;

  --color-cream-50: #FAF7F2;
  --color-cream-100: #F3EDE2;
  --color-cream-200: #E8DEC9;

  --color-saffron-400: #ECA459;
  --color-saffron-500: #E08E2B;
  --color-saffron-600: #B8731F;

  --color-emerald-500: #2F8F6F;
  --color-rose-500:    #C44A4A;

  --color-line: rgba(15, 27, 45, 0.08);
  --color-line-strong: rgba(15, 27, 45, 0.18);

  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-body:    "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;

  --radius-card:   12px;
  --radius-button: 8px;
  --radius-chip:   999px;
}

/* Page defaults */
:root {
  color-scheme: light;
}

body {
  background: var(--color-cream-50);
  color: var(--color-ink-800);
  font-family: var(--font-body);
  font-feature-settings: "ss01", "ss02";
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
  color: var(--color-ink-950);
  letter-spacing: -0.01em;
}

/* Helper for the saffron focus ring used on inputs and buttons */
.focus-saffron:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(224, 142, 43, 0.35);
  border-color: var(--color-saffron-500);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat(ui): design tokens — ink + cream + saffron + serif typography"
```

---

## Task 4: Fonts in `app/layout.tsx`

- [ ] **Step 1: Replace Geist with Fraunces + Inter**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthProvider";
import Footer from "@/components/Footer";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vakil — AI legal drafter",
  description: "An AI paralegal that drafts while you strategize.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">
        <AuthProvider>
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Remove the Geist imports throughout** if any other file references `geistSans` / `geistMono`.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(ui): switch fonts to fraunces (display) + inter (body)"
```

---

## Task 5: Redesign `/login` and `/register`

- [ ] **Step 1: Invoke `ui-ux-pro-max`** for "centred auth-card patterns, serif headline + cream card, single-column form".

- [ ] **Step 2: `app/login/page.tsx`**

Keep the existing form logic. Restyle:

```tsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
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
    if (!res.ok) { setError("Invalid email or password"); return; }
    router.push(search.get("next") ?? "/");
    router.refresh();
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-[var(--radius-card)] bg-[var(--color-cream-100)] border border-[var(--color-line)] p-8 space-y-5">
        <div className="space-y-1.5">
          <h1 className="text-3xl">Welcome back</h1>
          <p className="text-sm text-[var(--color-ink-500)]">Sign in to continue drafting.</p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink-700)]">Email</span>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="focus-saffron w-full bg-white border border-[var(--color-line)] rounded-[var(--radius-button)] px-3 py-2 text-[var(--color-ink-950)]"
            placeholder="you@firm.com"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink-700)]">Password</span>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
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
          <Link href="/register" className="text-[var(--color-saffron-600)] underline-offset-2 hover:underline">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: `app/register/page.tsx`** — same shell, three inputs (name, email, password). Headline: "Create your Vakil account".

- [ ] **Step 4: Dev-boot and eyeball both pages.**

```bash
npm run dev
# visit /login and /register
```

- [ ] **Step 5: Commit**

```bash
git add app/login/page.tsx app/register/page.tsx
git commit -m "feat(ui): redesign /login and /register with cream cards + saffron CTAs"
```

---

## Task 6: Redesign Navbar

- [ ] **Step 1: Invoke `ui-ux-pro-max`** for "minimal top-nav with serif wordmark, right-side user avatar dropdown".

- [ ] **Step 2: Rewrite `components/Navbar.tsx`**

```tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { User } from "@/types/auth";

interface Props {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  onLogout: () => Promise<void>;
}

export default function Navbar({ user, isAuthenticated, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b border-[var(--color-line)] bg-[var(--color-cream-50)]/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-[var(--font-display)] text-2xl text-[var(--color-ink-950)] tracking-tight">
          Vakil
        </Link>

        {isAuthenticated && user && (
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="focus-saffron flex items-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-line)] bg-white px-3 py-1.5 text-sm"
            >
              <span className="w-7 h-7 rounded-full bg-[var(--color-saffron-500)] text-[var(--color-ink-950)] grid place-items-center font-medium">
                {(user.name ?? user.email).slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden sm:inline text-[var(--color-ink-700)]">{user.name ?? user.email}</span>
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-48 rounded-[var(--radius-card)] bg-white border border-[var(--color-line)] shadow-sm p-1.5">
                <div className="px-3 py-2 text-xs text-[var(--color-ink-500)] border-b border-[var(--color-line)]">{user.email}</div>
                <button
                  onClick={onLogout}
                  className="w-full text-left text-sm px-3 py-2 rounded-[var(--radius-button)] hover:bg-[var(--color-cream-100)] text-[var(--color-ink-800)]"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Navbar.tsx
git commit -m "feat(ui): minimal navbar with vakil wordmark and user dropdown"
```

---

## Task 7: Redesign cases dashboard (`app/page.tsx`)

- [ ] **Step 1: Invoke `ui-ux-pro-max`** for "card-grid dashboard with hero strip + search/filter row + empty state, serif headings, cream cards".

- [ ] **Step 2: Restructure `app/page.tsx`**

Keep all existing logic (auth, fetch, search, create/edit/delete handlers). Replace the JSX shell:

```tsx
return (
  <div className="max-w-7xl mx-auto px-6 py-10">
    <section className="rounded-[var(--radius-card)] bg-[var(--color-cream-100)] border border-[var(--color-line)] p-8 mb-8 flex items-start justify-between gap-6">
      <div>
        <h1 className="text-3xl mb-1">Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.</h1>
        <p className="text-[var(--color-ink-500)]">Your AI paralegal is ready. Open a case or start a new one.</p>
      </div>
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="self-start bg-[var(--color-saffron-500)] hover:bg-[var(--color-saffron-600)] text-[var(--color-ink-950)] font-medium px-4 py-2.5 rounded-[var(--radius-button)] focus-saffron"
      >
        + New case
      </button>
    </section>

    <div className="flex items-center gap-3 mb-6">
      <div className="relative flex-1 max-w-md">
        <input
          type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search cases…"
          className="focus-saffron w-full bg-white border border-[var(--color-line)] rounded-[var(--radius-button)] pl-9 pr-3 py-2"
        />
        {/* Search icon absolutely positioned at left-3 */}
      </div>
      <span className="text-sm text-[var(--color-ink-500)]">{loading ? "Loading…" : `${cases.length} cases`}</span>
    </div>

    {loading ? (
      <SkeletonGrid />
    ) : cases.length === 0 ? (
      <EmptyState onCreate={() => setIsCreateModalOpen(true)} />
    ) : (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {cases.map((c) => <CaseCard key={c.id} caseItem={c} onOpen={handleViewCase} onEdit={handleEditCase} onDelete={handleDeleteCase} />)}
      </div>
    )}

    {/* keep existing CreateCaseModal / EditCaseModal mount */}
  </div>
);
```

Define `CaseCard`, `EmptyState`, `SkeletonGrid` inline in this file (or in `components/dashboard/` if you prefer). Card shape:

```tsx
function CaseCard({ caseItem, onOpen, onEdit, onDelete }: { caseItem: Case; onOpen: (id: string) => void; onEdit: (c: Case) => void; onDelete: (id: string) => void }) {
  const plaintiffs = caseItem.parties.filter((p) => p.role === "plaintiff").map((p) => p.name).join(", ");
  const defendants = caseItem.parties.filter((p) => p.role === "defendant").map((p) => p.name).join(", ");
  return (
    <article
      onClick={() => onOpen(caseItem.id)}
      className="cursor-pointer group rounded-[var(--radius-card)] bg-[var(--color-cream-100)] border border-[var(--color-line)] p-5 hover:border-[var(--color-line-strong)] transition"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-lg font-medium">{caseItem.title}</h3>
        <StatusChip status={caseItem.status ?? "draft"} />
      </div>
      <p className="text-sm text-[var(--color-ink-500)] mb-4 line-clamp-2">{caseItem.summary || "No summary."}</p>
      <dl className="text-sm space-y-1 text-[var(--color-ink-700)]">
        <div><dt className="inline text-[var(--color-ink-500)]">Plaintiffs:</dt> <dd className="inline">{plaintiffs || "—"}</dd></div>
        <div><dt className="inline text-[var(--color-ink-500)]">Defendants:</dt> <dd className="inline">{defendants || "—"}</dd></div>
      </dl>
      {/* edit / delete actions in a small row at the bottom — stopPropagation onClick */}
    </article>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft:     "bg-[var(--color-ink-950)]/10 text-[var(--color-ink-800)]",
    processing:"bg-[var(--color-saffron-500)]/15 text-[var(--color-saffron-600)]",
    completed: "bg-[var(--color-emerald-500)]/15 text-[var(--color-emerald-500)]",
    failed:    "bg-[var(--color-rose-500)]/15 text-[var(--color-rose-500)]",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-[var(--radius-chip)] ${map[status] ?? map.draft}`}>
      {status[0].toUpperCase() + status.slice(1)}
    </span>
  );
}
```

- [ ] **Step 3: Dev-boot, verify** — create a case, see the card appear; empty state with no cases; search filter narrows the grid.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(ui): redesign cases dashboard — hero, card grid, status chips"
```

---

## Task 8: Redesign the wizard stepper

`app/case/[case_id]/page.tsx` currently renders a default-styled step indicator. Replace it with a serif numbered stepper.

- [ ] **Step 1: Invoke `ui-ux-pro-max`** for "horizontal stepper with serif numerals, current/completed/upcoming states, no fancy animation".

- [ ] **Step 2: Stepper component**

Add (or extract to `components/Stepper.tsx`):

```tsx
function Stepper({ steps, current }: { steps: { number: number; title: string }[]; current: number }) {
  return (
    <ol className="flex items-center gap-0 sm:gap-2 mb-8">
      {steps.map((s, i) => {
        const state = s.number < current ? "done" : s.number === current ? "current" : "upcoming";
        return (
          <li key={s.number} className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <span
              className={`grid place-items-center w-9 h-9 rounded-full text-sm font-medium font-[var(--font-display)] ${
                state === "done"     ? "bg-[var(--color-saffron-500)] text-[var(--color-ink-950)]"
              : state === "current"  ? "border-2 border-[var(--color-saffron-500)] text-[var(--color-ink-950)]"
              :                        "border border-[var(--color-line)] text-[var(--color-ink-500)]"
              }`}
            >{s.number}</span>
            <span className={`text-sm truncate ${state === "upcoming" ? "text-[var(--color-ink-500)]" : "text-[var(--color-ink-950)]"}`}>{s.title}</span>
            {i < steps.length - 1 && (
              <span className={`hidden sm:block flex-1 h-px ${state === "done" ? "bg-[var(--color-saffron-500)]" : "bg-[var(--color-line)]"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 3: Step body shell**

Each step renders inside a cream card:

```tsx
<section className="rounded-[var(--radius-card)] bg-[var(--color-cream-100)] border border-[var(--color-line)] p-6 min-h-[400px]">
  {/* existing Step1Evidence / Step2Process / etc */}
</section>
```

- [ ] **Step 4: Sticky footer with prev/next**

```tsx
<div className="sticky bottom-0 bg-[var(--color-cream-50)] border-t border-[var(--color-line)] py-4 mt-6 flex justify-between">
  <button onClick={() => setCurrentStep(currentStep - 1)} disabled={isPreviousDisabled()} className="px-4 py-2 rounded-[var(--radius-button)] border border-[var(--color-line)] text-[var(--color-ink-700)] disabled:opacity-40">Previous</button>
  <button onClick={() => setCurrentStep(currentStep + 1)} disabled={isNextDisabled()} className="px-4 py-2 rounded-[var(--radius-button)] bg-[var(--color-saffron-500)] hover:bg-[var(--color-saffron-600)] text-[var(--color-ink-950)] font-medium disabled:opacity-40">Next</button>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add app/case/[case_id]/page.tsx components/Stepper.tsx
git commit -m "feat(ui): serif numbered stepper + cream step shell + sticky nav"
```

---

## Task 9: Redesign document tabs (`components/tabs/`)

The current layout uses a top tab strip. Switch to a left rail + wide reading column. Each tab component (`WritOfSummonsTab`, `WitnessStatementTab`, etc.) keeps its data-fetching logic; only the wrapper layout changes.

- [ ] **Step 1: Invoke `ui-ux-pro-max`** for "left-rail tabs with reading column, sticky tab list, top-right action group inside the reading column".

- [ ] **Step 2: Wrapper layout**

In `components/steps/Step5Review.tsx` (or wherever the tabs are mounted), replace the strip with:

```tsx
<div className="grid grid-cols-[200px_1fr] gap-6 min-h-[600px]">
  <aside className="space-y-1 sticky top-20 self-start">
    {TABS.map((t) => (
      <button
        key={t.id}
        onClick={() => setActiveTab(t.id)}
        className={`w-full text-left px-3 py-2 rounded-[var(--radius-button)] text-sm transition ${
          activeTab === t.id
            ? "bg-[var(--color-ink-950)] text-[var(--color-cream-50)]"
            : "text-[var(--color-ink-700)] hover:bg-[var(--color-cream-100)]"
        }`}
      >
        {t.label}
      </button>
    ))}
  </aside>

  <div className="rounded-[var(--radius-card)] bg-white border border-[var(--color-line)] p-6">
    {/* Each tab renders its content here */}
  </div>
</div>
```

- [ ] **Step 3: Inside each tab component**, header row:

```tsx
<header className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--color-line)]">
  <h2 className="text-2xl">{title}</h2>
  <div className="flex items-center gap-2">
    {/* Regenerate button (saffron outline), Export-DOCX button (saffron filled), Bengali toggle (Witness Statement only) */}
  </div>
</header>
```

- [ ] **Step 4: Reading column typography**

Markdown content inside the column should use display font for headings (already handled by `globals.css`) and a max-width:

```tsx
<article className="prose prose-ink max-w-[68ch] [&_h1]:font-[var(--font-display)] [&_h2]:font-[var(--font-display)]">
  {renderedMarkdown}
</article>
```

If `@tailwindcss/typography` isn't installed, install it: `npm install -D @tailwindcss/typography` and load it from `globals.css`.

- [ ] **Step 5: Commit**

```bash
git add components/tabs/ components/steps/Step5Review.tsx
git commit -m "feat(ui): left-rail document tabs with wide reading column"
```

---

## Task 10: Polish modals (Create/Edit case)

- [ ] **Step 1: Apply token classes to `CreateCaseModal.tsx` and `EditCaseModal.tsx`**

- Modal panel: `bg-[var(--color-cream-100)] border border-[var(--color-line)] rounded-[var(--radius-card)]`
- Inputs: `focus-saffron bg-white border-[var(--color-line)] rounded-[var(--radius-button)]`
- Primary CTA: saffron filled; cancel: outline
- Section headers in display font

Don't change the form data flow. Just visual.

- [ ] **Step 2: Commit**

```bash
git add components/CreateCaseModal.tsx components/EditCaseModal.tsx
git commit -m "feat(ui): apply tokens to create/edit case modals"
```

---

## Task 11: Tidy step components

`components/steps/Step1Evidence.tsx` ... `Step5Review.tsx` each have their own internal styling. Walk through them:

- [ ] **Step 1: For each step**

- Replace hardcoded `bg-gray-50`, `bg-white shadow`, `text-blue-600`, `bg-blue-600` with token-based equivalents.
- Buttons follow the same saffron / outline / ghost rules from Task 5.
- Dropzones (Step 1) get a dashed `border-[var(--color-line-strong)]` border on cream.

- [ ] **Step 2: Commit each step file as you go**

```bash
git add components/steps/Step1Evidence.tsx; git commit -m "feat(ui): tokens on Step1Evidence"
# ...repeat for each step
```

---

## Task 12: Smoke pass

- [ ] **Step 1: Dev boot and click through every surface**

```bash
npm run dev
```

Walk:
1. `/login` — looks polished, saffron CTA, no Geist visible.
2. Sign in.
3. Dashboard — hero strip, card grid, status chips, empty state if applicable.
4. Create a case via modal — every input themed.
5. Open the case — stepper across the top, cream card body, sticky footer.
6. Click each step — all tokens consistent.
7. Step 5 — left rail tabs, wide reading column, header with action buttons.
8. Witness Statement tab — English/বাংলা toggle visible.
9. Sign out — back to login.

- [ ] **Step 2: Build**

```bash
npm run build
```
Must succeed; no Tailwind warnings about missing utilities.

- [ ] **Step 3: Capture screenshots** (you'll need them for Phase 6)

Take screenshots of:
- `/login`, `/register`
- Dashboard with cards
- Wizard step 1 (Evidence) and step 5 (Review with tabs)
- Witness Statement tab in English and in বাংলা

Save them to `docs/screenshots/`. Names: `01-login.png`, `02-dashboard.png`, `03-wizard-evidence.png`, `04-wizard-review.png`, `05-witness-en.png`, `06-witness-bn.png`.

- [ ] **Step 4: Commit screenshots**

```bash
git add docs/screenshots/
git commit -m "docs: capture UI screenshots after redesign"
```

---

## Task 13: PR + merge

- [ ] **Step 1: Push**

```bash
git push -u origin feat/phase-5-ui
```

- [ ] **Step 2: PR body** (`docs/superpowers/plans/.pr-body.md`):

```markdown
## Summary

Visual identity rebuild per spec §5–§6: serif (Fraunces) + sans (Inter), ink-navy + saffron + cream palette, cream cards with hairline borders, no shadow-heavy UI.

## Highlights
- Tokens in `app/globals.css` via Tailwind v4 `@theme`.
- Fonts swapped to Fraunces (display) + Inter (body); Geist removed.
- `/login`, `/register`, navbar, dashboard, wizard stepper, document tabs all redesigned.
- New surface patterns: cream cards, saffron CTAs, status chips, left-rail tabs with reading column.
- Screenshots committed under `docs/screenshots/` for the Phase 6 README.

## Test plan
- [x] `npm run build` clean
- [x] Manual click-through every surface (see Task 12)
- [x] Lighthouse pass at acceptable contrast (ink-700 on cream-100 is ≥4.5:1)

## Out of scope
Demo seed + portfolio README (Phase 6).
```

- [ ] **Step 3: Open, merge, sync**

```bash
gh pr create --base main --head feat/phase-5-ui \
  --title "feat: phase 5 — vakil visual identity (serif + warm palette)" \
  --body-file docs/superpowers/plans/.pr-body.md
gh pr merge --merge --delete-branch
git checkout main && git pull origin main
```

---

**Phase 5 complete.** Proceed to [Phase 6 — demo seed + portfolio README](./2026-05-17-vakil-rebrand-phase-6-demo-readme.md).
