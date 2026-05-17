# Editorial Court · Phase A · Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the foundation for the Editorial Court redesign — design tokens, motion presets, primitive component library (`components/ui/*`), and a developer-only demo route. No production screen changes in this phase.

**Architecture:** Dark editorial theme tokens replace cream-default in `app/globals.css`. A small CVA-style helper in `lib/utils/cva.ts` powers variant-driven primitives. Headless mechanics (Dialog, Tooltip, Select, Tabs, Switch, Checkbox, Radio) wrap Radix UI for a11y; visual styling is all Tailwind. Component tests use Vitest's `projects` config to run `.test.tsx` files under happy-dom while existing service tests continue under node.

**Tech Stack:** Next.js 15.4, React 19, Tailwind v4 (inline `@theme`), framer-motion (already installed), Radix UI primitives (new), Vitest + @testing-library/react (new).

**Spec reference:** `docs/superpowers/specs/2026-05-17-editorial-court-ui-redesign-design.md`

**Out of scope for Phase A:** Auth/dashboard/wizard/PDF Split/Review changes. Those are Phases B–E.

---

## Decisions made in this plan

- **Headless mechanics:** Radix UI primitives. Industry standard, ensures a11y, matches the `shadcn` pattern hinted at by the existing `shadcn` dep in `package.json`.
- **CVA helper:** Homegrown in `lib/utils/cva.ts` (~25 LOC) plus a tiny `cn(...)` joiner. No `class-variance-authority` / `clsx` / `tailwind-merge` deps. The spec called for this and 25 LOC is honest. If Tailwind class conflicts surface during Phase B, swap to `tailwind-merge` then.
- **Toast library:** Build on top of `@radix-ui/react-toast`. No `sonner` dep — keeps the dep surface small.
- **Test infra:** Vitest `projects` config splits node service tests from happy-dom component tests. Component test files use `.test.tsx`, node tests stay `.test.ts`.
- **Tooltip:** Radix tooltip. Used for chrome only — `Hoverable` (citations on cream paper) is a different beast and keeps its own implementation in Phase E.

---

## File structure

### New files

```
lib/
  motion.ts                                  framer-motion presets
  utils/
    cn.ts                                    className joiner (~5 LOC)
    cva.ts                                   variant helper (~25 LOC)

components/
  ui/
    Button.tsx
    Input.tsx
    Textarea.tsx
    Card.tsx
    StatusPill.tsx
    EmptyState.tsx
    SectionHeader.tsx
    KeyboardHint.tsx
    Shimmer.tsx
    ScanLine.tsx
    Switch.tsx
    Checkbox.tsx
    Radio.tsx
    Select.tsx
    Tabs.tsx
    Tooltip.tsx
    Dialog.tsx
    Drawer.tsx
    Toast.tsx
    ConfirmDialog.tsx
    index.ts                                 barrel re-exports

app/
  _dev/
    primitives/
      page.tsx                               demo showcase route

tests/
  components/                                .test.tsx happy-dom tests
    Button.test.tsx
    Input.test.tsx
    Textarea.test.tsx
    Card.test.tsx
    StatusPill.test.tsx
    EmptyState.test.tsx
    SectionHeader.test.tsx
    KeyboardHint.test.tsx
    Shimmer.test.tsx
    ScanLine.test.tsx
    Switch.test.tsx
    Checkbox.test.tsx
    Radio.test.tsx
    Select.test.tsx
    Tabs.test.tsx
    Tooltip.test.tsx
    Dialog.test.tsx
    Drawer.test.tsx
    Toast.test.tsx
    ConfirmDialog.test.tsx
  helpers/
    setupDom.ts                              imports @testing-library/jest-dom
```

### Modified files

- `vitest.config.ts` — split into two projects (node + dom)
- `package.json` — add testing-library, happy-dom, radix-ui deps
- `app/globals.css` — replace cream-default tokens with dark editorial tokens
- `app/layout.tsx` — add JetBrains Mono font
- `CLAUDE.md` — update conventions section (palette, motion tokens, primitives, cream-paper rule)

### Untouched in this phase

- Every existing screen (`app/page.tsx`, `app/case/[case_id]/page.tsx`, `app/login`, `app/register`, `components/steps/*`, `components/tabs/*`, `components/modals/*`, `components/PdfSplit*.tsx`, etc.) — Phase A ships in isolation.
- Existing service tests under `tests/services/*.test.ts` — they continue to pass under node.

---

## Tests legend

Each primitive task uses one Vitest smoke test under happy-dom. Tests verify:
- Component renders without throwing
- Variants/props produce expected output (where applicable)
- One key interaction (click, change, keyboard) where applicable

These are **smoke tests, not exhaustive**. Visual variants are eyeballed at `/_dev/primitives` in the final task.

---

## Task 1: Component test infrastructure

**Files:**
- Modify: `package.json` (add devDeps)
- Modify: `vitest.config.ts`
- Create: `tests/helpers/setupDom.ts`

- [ ] **Step 1.1: Install testing libraries**

Run:
```bash
npm install --save-dev @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14 happy-dom@^15
```
Expected: 4 packages added under devDependencies, no peer-dep warnings beyond the usual.

- [ ] **Step 1.2: Create `tests/helpers/setupDom.ts`**

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 1.3: Rewrite `vitest.config.ts` with projects**

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/components/**"],
          setupFiles: ["tests/helpers/testDb.ts"],
          fileParallelism: false,
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "happy-dom",
          include: ["tests/components/**/*.test.tsx"],
          setupFiles: ["tests/helpers/setupDom.ts"],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

- [ ] **Step 1.4: Sanity-check existing service tests still run**

Run: `npm test -- --project=node`
Expected: existing service tests pass (same count as before).

- [ ] **Step 1.5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/helpers/setupDom.ts
git commit -m "test(infra): add happy-dom + testing-library, split vitest into node/dom projects"
```

---

## Task 2: Radix UI dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 2.1: Install Radix UI primitives**

Run:
```bash
npm install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-tooltip @radix-ui/react-toast @radix-ui/react-dropdown-menu @radix-ui/react-slot
```
Expected: 10 packages added under dependencies.

- [ ] **Step 2.2: Verify build still passes**

Run: `npm run build`
Expected: build completes without errors.

- [ ] **Step 2.3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add radix-ui primitives for Phase A component library"
```

---

## Task 3: Design tokens in globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 3.1: Replace `app/globals.css` with the dark editorial tokens**

```css
@import "tailwindcss";

@theme {
  /* INK — page chrome */
  --color-ink-950: #0A1322;
  --color-ink-900: #0F1B2D;
  --color-ink-800: #122036;
  --color-ink-700: #1A2B45;
  --color-ink-600: #243556;
  --color-ink-500: #4F627E;
  --color-ink-400: #7B8DA8;
  --color-ink-300: #B8C3D6;
  --color-ink-100: #E8DEC9;

  /* GOLD — accent */
  --color-gold-300: #F4C988;
  --color-gold-500: #F0B040;
  --color-gold-700: #B07A1F;

  /* CREAM — document surfaces only */
  --color-cream-50:  #FAF7F2;
  --color-cream-100: #F3EDE2;
  --color-cream-200: #E8DEC9;
  --color-paper-ink: #0F1B2D;

  /* STATE */
  --color-emerald-500: #2F8F6F;
  --color-rose-500:    #C44A4A;
  --color-amber-500:   #E0A92B;

  /* LINES */
  --color-line-soft:   rgba(232, 222, 201, 0.08);
  --color-line-strong: rgba(232, 222, 201, 0.18);
  --color-line-gold:   rgba(240, 176, 64, 0.40);
  --color-line-paper:  rgba(15, 27, 45, 0.08);

  /* FONTS */
  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-body:    "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, monospace;

  /* RADII */
  --radius-pill: 9999px;
  --radius-md:   10px;
  --radius-lg:   14px;
  --radius-xl:   20px;
  --radius-2xl:  28px;

  /* MOTION */
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-stage:     cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast:  120ms;
  --duration-base:  200ms;
  --duration-slow:  420ms;
  --duration-cine:  700ms;
}

:root {
  color-scheme: dark;
}

body {
  background: var(--color-ink-950);
  color: var(--color-ink-300);
  font-family: var(--font-body);
  font-feature-settings: "ss01", "ss02";
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
  color: var(--color-ink-100);
  letter-spacing: -0.01em;
}

/* Gold focus ring helper for inputs/buttons */
.focus-gold:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(240, 176, 64, 0.40);
  border-color: var(--color-gold-500);
}

::placeholder {
  color: var(--color-ink-400);
  opacity: 1;
}

/* Cream-paper utility: applied to document surfaces */
.cream-paper {
  background: var(--color-cream-50);
  color: var(--color-paper-ink);
  border: 1px solid var(--color-line-paper);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
}

/* Pre-rebrand legacy: hide third-party "insights" panels if any tooling injects them */
[class*="quick-insights"],
[class*="QuickInsights"],
[id*="quick-insights"],
[id*="QuickInsights"],
.insights-panel,
.financial-insights,
.confidence-score-panel,
[class*="insights-overlay"],
[class*="insights-popup"],
[aria-label*="Confidence Score"],
[title*="Confidence Score"],
[data-testid*="insights"] {
  display: none !important;
}

/* prefers-reduced-motion: opacity-only fallbacks */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3.2: Run dev server, eyeball that body is now dark**

Run: `npm run dev` (Ctrl-C after verifying)
Expected: app background is ink-950 (very dark navy). Pre-existing screens look broken because they still reference cream-default classes — this is expected. Phase A doesn't fix those screens.

- [ ] **Step 3.3: Commit**

```bash
git add app/globals.css
git commit -m "feat(theme): replace cream-default tokens with dark editorial palette"
```

---

## Task 4: JetBrains Mono font

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 4.1: Add JetBrains Mono to `app/layout.tsx`**

Read current file then replace the font imports block. The new top of the file:

```typescript
import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthProvider";
import Footer from "@/components/Footer";

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
```

And update the `<html>` className:

```typescript
<html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
```

- [ ] **Step 4.2: Verify build still passes**

Run: `npm run build`
Expected: build completes without errors. JetBrains Mono shows in build output as a fetched font.

- [ ] **Step 4.3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(theme): load JetBrains Mono for mono token"
```

---

## Task 5: cn, cva, and motion helpers

**Files:**
- Create: `lib/utils/cn.ts`
- Create: `lib/utils/cva.ts`
- Create: `lib/motion.ts`

- [ ] **Step 5.1: Create `lib/utils/cn.ts`**

```typescript
/** Joins class names, filtering falsy values. */
export function cn(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(" ");
}
```

- [ ] **Step 5.2: Create `lib/utils/cva.ts`**

```typescript
import { cn } from "./cn";

type VariantValue = string | string[];
type VariantConfig = Record<string, Record<string, VariantValue>>;

type VariantProps<C extends VariantConfig> = {
  [K in keyof C]?: keyof C[K];
};

/**
 * Tiny class-variance helper. Inspired by class-variance-authority but
 * dependency-free. Returns a function that takes variant selections and
 * returns the merged className.
 *
 *   const button = cva("base", {
 *     variants: {
 *       variant: { primary: "bg-gold-500", ghost: "bg-transparent" },
 *       size: { sm: "h-8", md: "h-10" },
 *     },
 *     defaultVariants: { variant: "primary", size: "md" },
 *   });
 *   button({ variant: "ghost" }); // "base bg-transparent h-10"
 */
export function cva<C extends VariantConfig>(
  base: string,
  config: { variants: C; defaultVariants?: VariantProps<C> },
) {
  return function variantFn(
    props?: VariantProps<C> & { className?: string },
  ): string {
    const out: string[] = [base];
    const merged = { ...config.defaultVariants, ...props };
    for (const key of Object.keys(config.variants) as (keyof C)[]) {
      const selection = merged[key];
      if (selection == null) continue;
      const value = config.variants[key][selection as string];
      if (value == null) continue;
      out.push(Array.isArray(value) ? value.join(" ") : value);
    }
    if (props?.className) out.push(props.className);
    return cn(...out);
  };
}

export type { VariantProps };
```

- [ ] **Step 5.3: Create `lib/motion.ts`**

```typescript
import type { Transition, Variants } from "framer-motion";

/** Default spring for hover / press micro-motion. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 28,
};

/** Spring for wizard step transitions. */
export const springStage: Transition = {
  type: "spring",
  stiffness: 180,
  damping: 30,
  mass: 1,
};

/** Spring for cream-paper document reveal. */
export const springPaper: Transition = {
  type: "spring",
  stiffness: 140,
  damping: 24,
};

export const easeOutQuint = [0.22, 1, 0.36, 1] as const;
export const easeStage = [0.16, 1, 0.3, 1] as const;

export const durations = {
  fast: 0.12,
  base: 0.2,
  slow: 0.42,
  cine: 0.7,
} as const;

/** Fade-up entrance used by page roots and modals. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.base, ease: easeOutQuint as unknown as number[] },
  },
};

/** Stage-style reveal for content swaps (wizard step changes). */
export const stageReveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easeStage as unknown as number[] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: durations.base, ease: easeStage as unknown as number[] },
  },
};

/** Stagger children for parents with multiple animated items. */
export const staggerChildren: Variants = {
  visible: { transition: { staggerChildren: 0.04 } },
};
```

- [ ] **Step 5.4: Write a smoke test for the cva helper**

Create `tests/components/cva.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { cva } from "@/lib/utils/cva";

describe("cva", () => {
  const button = cva("base", {
    variants: {
      variant: { primary: "bg-gold-500", ghost: "bg-transparent" },
      size: { sm: "h-8", md: "h-10" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  });

  it("applies defaults when no props passed", () => {
    expect(button()).toBe("base bg-gold-500 h-10");
  });

  it("overrides defaults when prop given", () => {
    expect(button({ variant: "ghost" })).toBe("base bg-transparent h-10");
  });

  it("appends arbitrary className", () => {
    expect(button({ className: "extra" })).toBe("base bg-gold-500 h-10 extra");
  });
});
```

- [ ] **Step 5.5: Run cva test, expect PASS**

Run: `npm test -- --project=dom -t cva`
Expected: 3 tests pass.

- [ ] **Step 5.6: Commit**

```bash
git add lib/utils/cn.ts lib/utils/cva.ts lib/motion.ts tests/components/cva.test.tsx
git commit -m "feat(ui): add cn + cva utilities and motion presets"
```

---

## Task 6: Button primitive

**Files:**
- Create: `components/ui/Button.tsx`
- Test: `tests/components/Button.test.tsx`

- [ ] **Step 6.1: Write the failing test**

```tsx
// tests/components/Button.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders with default primary variant", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: "Click me" });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toMatch(/bg-gold-500/);
  });

  it("applies destructive variant class", () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toMatch(/bg-rose-500/);
  });

  it("fires onClick", async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(<Button onClick={() => clicks++}>Go</Button>);
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(clicks).toBe(1);
  });

  it("disables click when loading", async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(
      <Button loading onClick={() => clicks++}>
        Go
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(clicks).toBe(0);
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

Run: `npm test -- --project=dom -t Button`
Expected: FAIL — `Cannot find module '@/components/ui/Button'`.

- [ ] **Step 6.3: Implement `components/ui/Button.tsx`**

```tsx
"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "@/lib/utils/cva";
import { cn } from "@/lib/utils/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-colors focus-gold disabled:opacity-50 disabled:cursor-not-allowed select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-gold-500 text-ink-950 hover:bg-gold-300 active:bg-gold-700",
        secondary:
          "bg-ink-700 text-ink-100 hover:bg-ink-600 border border-line-strong",
        ghost:
          "bg-transparent text-ink-300 hover:text-ink-100 hover:bg-ink-800",
        destructive:
          "bg-rose-500 text-ink-100 hover:opacity-90 active:opacity-80",
        link: "bg-transparent text-gold-500 hover:underline underline-offset-4 p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariantsMap> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "link";
  size?: "sm" | "md" | "lg" | "icon";
}

const buttonVariantsMap = {
  variant: { primary: "", secondary: "", ghost: "", destructive: "", link: "" },
  size: { sm: "", md: "", lg: "", icon: "" },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      loading,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(button({ variant, size }), className)}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);
```

- [ ] **Step 6.4: Run test to verify it passes**

Run: `npm test -- --project=dom -t Button`
Expected: 4 tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add components/ui/Button.tsx tests/components/Button.test.tsx
git commit -m "feat(ui): add Button primitive"
```

---

## Task 7: Input primitive

**Files:**
- Create: `components/ui/Input.tsx`
- Test: `tests/components/Input.test.tsx`

- [ ] **Step 7.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/Input";

describe("Input", () => {
  it("renders with placeholder", () => {
    render(<Input placeholder="Search…" />);
    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
  });

  it("shows error helper text and rose border when error provided", () => {
    render(<Input error="Required field" />);
    expect(screen.getByText("Required field")).toBeInTheDocument();
    const input = screen.getByRole("textbox");
    expect(input.className).toMatch(/border-rose-500/);
  });

  it("captures typing", async () => {
    const user = userEvent.setup();
    let value = "";
    render(<Input onChange={(e) => (value = e.target.value)} />);
    await user.type(screen.getByRole("textbox"), "hi");
    expect(value).toBe("hi");
  });
});
```

- [ ] **Step 7.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Input`
Expected: FAIL.

- [ ] **Step 7.3: Implement `components/ui/Input.tsx`**

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helper?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { className, error, helper, leadingIcon, trailingIcon, ...rest },
    ref,
  ) {
    return (
      <div className="w-full">
        <div className="relative">
          {leadingIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full h-10 rounded-[var(--radius-md)] bg-ink-800 text-ink-100 border focus-gold transition-colors placeholder:text-ink-400",
              leadingIcon ? "pl-9" : "pl-3",
              trailingIcon ? "pr-9" : "pr-3",
              error ? "border-rose-500" : "border-line-strong",
              className,
            )}
            {...rest}
          />
          {trailingIcon && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
              {trailingIcon}
            </span>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
        {!error && helper && <p className="mt-1.5 text-xs text-ink-400">{helper}</p>}
      </div>
    );
  },
);
```

- [ ] **Step 7.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t Input`
Expected: 3 tests pass.

- [ ] **Step 7.5: Commit**

```bash
git add components/ui/Input.tsx tests/components/Input.test.tsx
git commit -m "feat(ui): add Input primitive"
```

---

## Task 8: Textarea primitive

**Files:**
- Create: `components/ui/Textarea.tsx`
- Test: `tests/components/Textarea.test.tsx`

- [ ] **Step 8.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Textarea } from "@/components/ui/Textarea";

describe("Textarea", () => {
  it("renders with placeholder", () => {
    render(<Textarea placeholder="Notes" />);
    expect(screen.getByPlaceholderText("Notes")).toBeInTheDocument();
  });

  it("shows error message when error prop set", () => {
    render(<Textarea error="too short" />);
    expect(screen.getByText("too short")).toBeInTheDocument();
  });
});
```

- [ ] **Step 8.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Textarea`
Expected: FAIL.

- [ ] **Step 8.3: Implement `components/ui/Textarea.tsx`**

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  helper?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, error, helper, rows = 3, ...rest }, ref) {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          rows={rows}
          className={cn(
            "w-full rounded-[var(--radius-md)] bg-ink-800 text-ink-100 border px-3 py-2 focus-gold transition-colors placeholder:text-ink-400 resize-vertical",
            error ? "border-rose-500" : "border-line-strong",
            className,
          )}
          {...rest}
        />
        {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
        {!error && helper && <p className="mt-1.5 text-xs text-ink-400">{helper}</p>}
      </div>
    );
  },
);
```

- [ ] **Step 8.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t Textarea`
Expected: 2 tests pass.

- [ ] **Step 8.5: Commit**

```bash
git add components/ui/Textarea.tsx tests/components/Textarea.test.tsx
git commit -m "feat(ui): add Textarea primitive"
```

---

## Task 9: Card primitive

**Files:**
- Create: `components/ui/Card.tsx`
- Test: `tests/components/Card.test.tsx`

- [ ] **Step 9.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/ui/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>hello</Card>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("applies gold-accent variant", () => {
    render(<Card variant="gold-accent" data-testid="card">x</Card>);
    expect(screen.getByTestId("card").className).toMatch(/border-line-gold/);
  });

  it("applies cream-paper variant", () => {
    render(<Card variant="cream-paper" data-testid="card">x</Card>);
    expect(screen.getByTestId("card").className).toMatch(/cream-paper/);
  });
});
```

- [ ] **Step 9.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Card`
Expected: FAIL.

- [ ] **Step 9.3: Implement `components/ui/Card.tsx`**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "@/lib/utils/cva";
import { cn } from "@/lib/utils/cn";

const card = cva(
  "rounded-[var(--radius-lg)] p-5 transition-colors",
  {
    variants: {
      variant: {
        chrome: "bg-ink-800 border border-line-soft",
        "chrome-raised": "bg-ink-700 border border-line-strong",
        "gold-accent":
          "bg-ink-800 border border-line-gold shadow-[inset_0_1px_0_rgba(240,176,64,0.08)]",
        "cream-paper": "cream-paper",
      },
    },
    defaultVariants: { variant: "chrome" },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariantsMap> {
  variant?: "chrome" | "chrome-raised" | "gold-accent" | "cream-paper";
}

const cardVariantsMap = {
  variant: { chrome: "", "chrome-raised": "", "gold-accent": "", "cream-paper": "" },
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, ...rest },
  ref,
) {
  return <div ref={ref} className={cn(card({ variant }), className)} {...rest} />;
});
```

- [ ] **Step 9.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t Card`
Expected: 3 tests pass.

- [ ] **Step 9.5: Commit**

```bash
git add components/ui/Card.tsx tests/components/Card.test.tsx
git commit -m "feat(ui): add Card primitive with chrome/cream-paper variants"
```

---

## Task 10: StatusPill primitive

**Files:**
- Create: `components/ui/StatusPill.tsx`
- Test: `tests/components/StatusPill.test.tsx`

- [ ] **Step 10.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "@/components/ui/StatusPill";

describe("StatusPill", () => {
  it("renders status text", () => {
    render(<StatusPill status="drafted" />);
    expect(screen.getByText("Drafted")).toBeInTheDocument();
  });

  it("applies emerald color for drafted", () => {
    render(<StatusPill status="drafted" data-testid="pill" />);
    expect(screen.getByTestId("pill").className).toMatch(/emerald-500/);
  });

  it("applies rose for failed", () => {
    render(<StatusPill status="failed" data-testid="pill" />);
    expect(screen.getByTestId("pill").className).toMatch(/rose-500/);
  });
});
```

- [ ] **Step 10.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t StatusPill`
Expected: FAIL.

- [ ] **Step 10.3: Implement `components/ui/StatusPill.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type Status =
  | "draft"
  | "drafting"
  | "drafted"
  | "processing"
  | "complete"
  | "failed"
  | "ai-suggested";

const styles: Record<Status, { bg: string; text: string; label: string }> = {
  draft:        { bg: "bg-ink-700",          text: "text-ink-300",      label: "Draft" },
  drafting:     { bg: "bg-amber-500/15",     text: "text-amber-500",    label: "Drafting" },
  drafted:      { bg: "bg-emerald-500/15",   text: "text-emerald-500",  label: "Drafted" },
  processing:   { bg: "bg-amber-500/15",     text: "text-amber-500",    label: "Processing" },
  complete:     { bg: "bg-emerald-500/15",   text: "text-emerald-500",  label: "Complete" },
  failed:       { bg: "bg-rose-500/15",      text: "text-rose-500",     label: "Failed" },
  "ai-suggested": { bg: "bg-gold-500/15",    text: "text-gold-500",     label: "AI" },
};

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  status: Status;
  children?: React.ReactNode;
}

export function StatusPill({
  status,
  className,
  children,
  ...rest
}: StatusPillProps) {
  const s = styles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-pill)] text-xs font-medium",
        s.bg,
        s.text,
        className,
      )}
      {...rest}
    >
      {children ?? s.label}
    </span>
  );
}
```

- [ ] **Step 10.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t StatusPill`
Expected: 3 tests pass.

- [ ] **Step 10.5: Commit**

```bash
git add components/ui/StatusPill.tsx tests/components/StatusPill.test.tsx
git commit -m "feat(ui): add StatusPill primitive"
```

---

## Task 11: EmptyState primitive

**Files:**
- Create: `components/ui/EmptyState.tsx`
- Test: `tests/components/EmptyState.test.tsx`

- [ ] **Step 11.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="Nothing here" description="add something" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("add something")).toBeInTheDocument();
  });

  it("renders action slot when given", () => {
    render(<EmptyState title="t" action={<button>Go</button>} />);
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 11.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t EmptyState`
Expected: FAIL.

- [ ] **Step 11.3: Implement `components/ui/EmptyState.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-[var(--radius-lg)] bg-ink-800 border border-line-soft px-6 py-12",
        className,
      )}
      {...rest}
    >
      {icon && (
        <div className="mb-4 text-ink-400" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="text-lg font-display text-ink-100 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-ink-400 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 11.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t EmptyState`
Expected: 2 tests pass.

- [ ] **Step 11.5: Commit**

```bash
git add components/ui/EmptyState.tsx tests/components/EmptyState.test.tsx
git commit -m "feat(ui): add EmptyState primitive"
```

---

## Task 12: SectionHeader primitive

**Files:**
- Create: `components/ui/SectionHeader.tsx`
- Test: `tests/components/SectionHeader.test.tsx`

- [ ] **Step 12.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionHeader } from "@/components/ui/SectionHeader";

describe("SectionHeader", () => {
  it("renders title and meta", () => {
    render(<SectionHeader title="Evidence" meta="Step 1 of 5" />);
    expect(screen.getByText("Evidence")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });

  it("renders actions slot", () => {
    render(<SectionHeader title="t" actions={<button>Go</button>} />);
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 12.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t SectionHeader`
Expected: FAIL.

- [ ] **Step 12.3: Implement `components/ui/SectionHeader.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SectionHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export function SectionHeader({
  title,
  meta,
  actions,
  className,
  ...rest
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 mb-6",
        className,
      )}
      {...rest}
    >
      <div className="min-w-0">
        <h2 className="text-2xl md:text-3xl font-display text-ink-100 leading-tight">
          {title}
        </h2>
        {meta && (
          <p className="text-sm text-ink-400 mt-1.5">{meta}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 12.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t SectionHeader`
Expected: 2 tests pass.

- [ ] **Step 12.5: Commit**

```bash
git add components/ui/SectionHeader.tsx tests/components/SectionHeader.test.tsx
git commit -m "feat(ui): add SectionHeader primitive"
```

---

## Task 13: KeyboardHint primitive

**Files:**
- Create: `components/ui/KeyboardHint.tsx`
- Test: `tests/components/KeyboardHint.test.tsx`

- [ ] **Step 13.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KeyboardHint } from "@/components/ui/KeyboardHint";

describe("KeyboardHint", () => {
  it("renders provided keys", () => {
    render(<KeyboardHint keys={["⌘", "K"]} />);
    expect(screen.getByText("⌘")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
  });
});
```

- [ ] **Step 13.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t KeyboardHint`
Expected: FAIL.

- [ ] **Step 13.3: Implement `components/ui/KeyboardHint.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface KeyboardHintProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  keys: string[];
}

export function KeyboardHint({ keys, className, ...rest }: KeyboardHintProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-[11px] text-ink-400",
        className,
      )}
      {...rest}
    >
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="mx-0.5 text-ink-500">+</span>}
          <span className="px-1.5 py-0.5 rounded bg-ink-700 border border-line-soft text-ink-300">
            {k}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}
```

- [ ] **Step 13.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t KeyboardHint`
Expected: 1 test passes.

- [ ] **Step 13.5: Commit**

```bash
git add components/ui/KeyboardHint.tsx tests/components/KeyboardHint.test.tsx
git commit -m "feat(ui): add KeyboardHint primitive"
```

---

## Task 14: Shimmer primitive

**Files:**
- Create: `components/ui/Shimmer.tsx`
- Test: `tests/components/Shimmer.test.tsx`

- [ ] **Step 14.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Shimmer } from "@/components/ui/Shimmer";

describe("Shimmer", () => {
  it("renders with default class", () => {
    render(<Shimmer data-testid="s" />);
    expect(screen.getByTestId("s").className).toMatch(/animate-pulse/);
  });

  it("forwards className", () => {
    render(<Shimmer className="h-4 w-12" data-testid="s" />);
    expect(screen.getByTestId("s").className).toMatch(/h-4/);
    expect(screen.getByTestId("s").className).toMatch(/w-12/);
  });
});
```

- [ ] **Step 14.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Shimmer`
Expected: FAIL.

- [ ] **Step 14.3: Implement `components/ui/Shimmer.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Shimmer({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-md)] bg-ink-700/60",
        className,
      )}
      {...rest}
    />
  );
}
```

- [ ] **Step 14.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t Shimmer`
Expected: 2 tests pass.

- [ ] **Step 14.5: Commit**

```bash
git add components/ui/Shimmer.tsx tests/components/Shimmer.test.tsx
git commit -m "feat(ui): add Shimmer skeleton primitive"
```

---

## Task 15: ScanLine primitive

**Files:**
- Create: `components/ui/ScanLine.tsx`
- Test: `tests/components/ScanLine.test.tsx`

- [ ] **Step 15.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScanLine } from "@/components/ui/ScanLine";

describe("ScanLine", () => {
  it("renders a container with role presentation", () => {
    render(<ScanLine data-testid="scan" />);
    expect(screen.getByTestId("scan")).toBeInTheDocument();
  });
});
```

- [ ] **Step 15.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t ScanLine`
Expected: FAIL.

- [ ] **Step 15.3: Implement `components/ui/ScanLine.tsx`**

The scan-line motion is a gold linear-gradient beam that animates from top to bottom over its parent's height. Used by AI generation and PDF analysis.

```tsx
"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface ScanLineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Duration of one top→bottom sweep in seconds. Defaults to 1.6s. */
  duration?: number;
  /** When true (default), the scan-line loops. When false, it plays once. */
  loop?: boolean;
}

export function ScanLine({
  duration = 1.6,
  loop = true,
  className,
  ...rest
}: ScanLineProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden
      {...rest}
    >
      <motion.div
        initial={{ y: "-100%" }}
        animate={{ y: "100%" }}
        transition={{
          duration,
          repeat: loop ? Infinity : 0,
          ease: "easeInOut",
        }}
        className="absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-gold-500/30 to-transparent"
      />
    </div>
  );
}
```

- [ ] **Step 15.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t ScanLine`
Expected: 1 test passes.

- [ ] **Step 15.5: Commit**

```bash
git add components/ui/ScanLine.tsx tests/components/ScanLine.test.tsx
git commit -m "feat(ui): add ScanLine motion primitive for AI/scanning moments"
```

---

## Task 16: Switch primitive (Radix)

**Files:**
- Create: `components/ui/Switch.tsx`
- Test: `tests/components/Switch.test.tsx`

- [ ] **Step 16.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "@/components/ui/Switch";

describe("Switch", () => {
  it("toggles state on click", async () => {
    const user = userEvent.setup();
    let checked = false;
    render(
      <Switch
        checked={checked}
        onCheckedChange={(v) => (checked = v)}
        aria-label="theme"
      />,
    );
    await user.click(screen.getByRole("switch"));
    expect(checked).toBe(true);
  });
});
```

- [ ] **Step 16.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Switch`
Expected: FAIL.

- [ ] **Step 16.3: Implement `components/ui/Switch.tsx`**

```tsx
"use client";

import * as React from "react";
import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils/cn";

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof RadixSwitch.Root> {}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch({ className, ...rest }, ref) {
    return (
      <RadixSwitch.Root
        ref={ref}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-[var(--radius-pill)] border border-line-strong bg-ink-700 transition-colors data-[state=checked]:bg-gold-500 focus-gold",
          className,
        )}
        {...rest}
      >
        <RadixSwitch.Thumb className="block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-ink-100 transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-ink-950" />
      </RadixSwitch.Root>
    );
  },
);
```

- [ ] **Step 16.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t Switch`
Expected: 1 test passes.

- [ ] **Step 16.5: Commit**

```bash
git add components/ui/Switch.tsx tests/components/Switch.test.tsx
git commit -m "feat(ui): add Switch primitive on radix-ui"
```

---

## Task 17: Checkbox primitive (Radix)

**Files:**
- Create: `components/ui/Checkbox.tsx`
- Test: `tests/components/Checkbox.test.tsx`

- [ ] **Step 17.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "@/components/ui/Checkbox";

describe("Checkbox", () => {
  it("toggles on click", async () => {
    const user = userEvent.setup();
    let checked: boolean | "indeterminate" = false;
    render(
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => (checked = v)}
        aria-label="ok"
      />,
    );
    await user.click(screen.getByRole("checkbox"));
    expect(checked).toBe(true);
  });
});
```

- [ ] **Step 17.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Checkbox`
Expected: FAIL.

- [ ] **Step 17.3: Implement `components/ui/Checkbox.tsx`**

```tsx
"use client";

import * as React from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof RadixCheckbox.Root> {}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  function Checkbox({ className, ...rest }, ref) {
    return (
      <RadixCheckbox.Root
        ref={ref}
        className={cn(
          "h-4 w-4 shrink-0 rounded border border-line-strong bg-ink-800 transition-colors data-[state=checked]:bg-gold-500 data-[state=checked]:border-gold-500 focus-gold disabled:opacity-50",
          className,
        )}
        {...rest}
      >
        <RadixCheckbox.Indicator className="flex items-center justify-center text-ink-950">
          <Check className="h-3 w-3" strokeWidth={3} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
    );
  },
);
```

- [ ] **Step 17.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t Checkbox`
Expected: 1 test passes.

- [ ] **Step 17.5: Commit**

```bash
git add components/ui/Checkbox.tsx tests/components/Checkbox.test.tsx
git commit -m "feat(ui): add Checkbox primitive on radix-ui"
```

---

## Task 18: Radio primitive (Radix)

**Files:**
- Create: `components/ui/Radio.tsx`
- Test: `tests/components/Radio.test.tsx`

- [ ] **Step 18.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioGroup, RadioItem } from "@/components/ui/Radio";

describe("Radio", () => {
  it("selects a value", async () => {
    const user = userEvent.setup();
    let value = "";
    render(
      <RadioGroup value={value} onValueChange={(v) => (value = v)}>
        <RadioItem value="a" aria-label="a" />
        <RadioItem value="b" aria-label="b" />
      </RadioGroup>,
    );
    await user.click(screen.getByRole("radio", { name: "b" }));
    expect(value).toBe("b");
  });
});
```

- [ ] **Step 18.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Radio`
Expected: FAIL.

- [ ] **Step 18.3: Implement `components/ui/Radio.tsx`**

```tsx
"use client";

import * as React from "react";
import * as RadixRadio from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils/cn";

export const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixRadio.Root>
>(function RadioGroup({ className, ...rest }, ref) {
  return (
    <RadixRadio.Root
      ref={ref}
      className={cn("grid gap-2", className)}
      {...rest}
    />
  );
});

export const RadioItem = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof RadixRadio.Item>
>(function RadioItem({ className, ...rest }, ref) {
  return (
    <RadixRadio.Item
      ref={ref}
      className={cn(
        "h-4 w-4 rounded-full border border-line-strong bg-ink-800 transition-colors data-[state=checked]:border-gold-500 focus-gold disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      <RadixRadio.Indicator className="flex h-full w-full items-center justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
      </RadixRadio.Indicator>
    </RadixRadio.Item>
  );
});
```

- [ ] **Step 18.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t Radio`
Expected: 1 test passes.

- [ ] **Step 18.5: Commit**

```bash
git add components/ui/Radio.tsx tests/components/Radio.test.tsx
git commit -m "feat(ui): add RadioGroup + RadioItem primitives on radix-ui"
```

---

## Task 19: Select primitive (Radix)

**Files:**
- Create: `components/ui/Select.tsx`
- Test: `tests/components/Select.test.tsx`

- [ ] **Step 19.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";

describe("Select", () => {
  it("renders trigger and opens content on click", async () => {
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label="fruit">
          <SelectValue placeholder="pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="pear">Pear</SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox", { name: "fruit" }));
    expect(await screen.findByText("Apple")).toBeInTheDocument();
  });
});
```

- [ ] **Step 19.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Select`
Expected: FAIL.

- [ ] **Step 19.3: Implement `components/ui/Select.tsx`**

```tsx
"use client";

import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Select = RadixSelect.Root;
export const SelectValue = RadixSelect.Value;

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger>
>(function SelectTrigger({ className, children, ...rest }, ref) {
  return (
    <RadixSelect.Trigger
      ref={ref}
      className={cn(
        "flex h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-line-strong bg-ink-800 px-3 text-sm text-ink-100 focus-gold disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      {children}
      <RadixSelect.Icon asChild>
        <ChevronDown className="h-4 w-4 text-ink-400" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
});

export const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Content>
>(function SelectContent({ className, children, ...rest }, ref) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        ref={ref}
        position="popper"
        sideOffset={4}
        className={cn(
          "z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius-md)] border border-line-strong bg-ink-800 shadow-xl",
          className,
        )}
        {...rest}
      >
        <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
});

export const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Item>
>(function SelectItem({ className, children, ...rest }, ref) {
  return (
    <RadixSelect.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-sm text-ink-300 outline-none data-[highlighted]:bg-ink-700 data-[highlighted]:text-ink-100 data-[state=checked]:text-gold-500",
        className,
      )}
      {...rest}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="ml-auto">
        <Check className="h-4 w-4" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
});
```

- [ ] **Step 19.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t Select`
Expected: 1 test passes.

- [ ] **Step 19.5: Commit**

```bash
git add components/ui/Select.tsx tests/components/Select.test.tsx
git commit -m "feat(ui): add Select primitive on radix-ui"
```

---

## Task 20: Tabs primitive (Radix)

**Files:**
- Create: `components/ui/Tabs.tsx`
- Test: `tests/components/Tabs.test.tsx`

- [ ] **Step 20.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

describe("Tabs", () => {
  it("switches between tab contents", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">first</TabsContent>
        <TabsContent value="b">second</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText("first")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "B" }));
    expect(screen.getByText("second")).toBeInTheDocument();
  });
});
```

- [ ] **Step 20.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Tabs`
Expected: FAIL.

- [ ] **Step 20.3: Implement `components/ui/Tabs.tsx`**

```tsx
"use client";

import * as React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils/cn";

export const Tabs = RadixTabs.Root;

export const TabsList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(function TabsList({ className, ...rest }, ref) {
  return (
    <RadixTabs.List
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 border-b border-line-soft",
        className,
      )}
      {...rest}
    />
  );
});

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(function TabsTrigger({ className, ...rest }, ref) {
  return (
    <RadixTabs.Trigger
      ref={ref}
      className={cn(
        "relative px-3 py-2 text-sm font-medium text-ink-400 transition-colors hover:text-ink-100 focus-gold data-[state=active]:text-gold-500",
        "after:absolute after:left-3 after:right-3 after:-bottom-px after:h-0.5 after:bg-transparent data-[state=active]:after:bg-gold-500",
        className,
      )}
      {...rest}
    />
  );
});

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(function TabsContent({ className, ...rest }, ref) {
  return (
    <RadixTabs.Content
      ref={ref}
      className={cn("pt-4 focus:outline-none", className)}
      {...rest}
    />
  );
});
```

- [ ] **Step 20.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t Tabs`
Expected: 1 test passes.

- [ ] **Step 20.5: Commit**

```bash
git add components/ui/Tabs.tsx tests/components/Tabs.test.tsx
git commit -m "feat(ui): add Tabs primitive on radix-ui"
```

---

## Task 21: Tooltip primitive (Radix)

**Files:**
- Create: `components/ui/Tooltip.tsx`
- Test: `tests/components/Tooltip.test.tsx`

- [ ] **Step 21.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/Tooltip";

describe("Tooltip", () => {
  it("renders trigger without errors", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>hover me</TooltipTrigger>
          <TooltipContent>tip!</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByText("hover me")).toBeInTheDocument();
  });
});
```

- [ ] **Step 21.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Tooltip`
Expected: FAIL.

- [ ] **Step 21.3: Implement `components/ui/Tooltip.tsx`**

```tsx
"use client";

import * as React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils/cn";

export const TooltipProvider = RadixTooltip.Provider;
export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixTooltip.Content>
>(function TooltipContent({ className, sideOffset = 6, ...rest }, ref) {
  return (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-[var(--radius-md)] border border-line-strong bg-ink-800 px-2.5 py-1.5 text-xs text-ink-100 shadow-lg",
          className,
        )}
        {...rest}
      />
    </RadixTooltip.Portal>
  );
});
```

- [ ] **Step 21.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t Tooltip`
Expected: 1 test passes.

- [ ] **Step 21.5: Commit**

```bash
git add components/ui/Tooltip.tsx tests/components/Tooltip.test.tsx
git commit -m "feat(ui): add Tooltip primitive on radix-ui"
```

---

## Task 22: Dialog primitive (Radix)

**Files:**
- Create: `components/ui/Dialog.tsx`
- Test: `tests/components/Dialog.test.tsx`

- [ ] **Step 22.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";

describe("Dialog", () => {
  it("opens on trigger click", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>body</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("open"));
    expect(await screen.findByText("Title")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});
```

- [ ] **Step 22.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Dialog`
Expected: FAIL.

- [ ] **Step 22.3: Implement `components/ui/Dialog.tsx`**

```tsx
"use client";

import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

type Size = "sm" | "md" | "lg" | "full";

const sizeMap: Record<Size, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  full: "max-w-[calc(100vw-2rem)] h-[calc(100vh-2rem)]",
};

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof RadixDialog.Content> {
  size?: Size;
  hideClose?: boolean;
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(
    { className, size = "md", hideClose, children, ...rest },
    ref,
  ) {
    return (
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className="fixed inset-0 z-50 bg-ink-950/72 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
        />
        <RadixDialog.Content
          ref={ref}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full rounded-[var(--radius-lg)] border border-line-strong bg-ink-900 p-6 shadow-2xl outline-none",
            sizeMap[size],
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            className,
          )}
          {...rest}
        >
          {children}
          {!hideClose && (
            <RadixDialog.Close asChild>
              <button
                aria-label="Close"
                className="absolute right-4 top-4 rounded-md p-1 text-ink-400 hover:text-ink-100 focus-gold"
              >
                <X className="h-4 w-4" />
              </button>
            </RadixDialog.Close>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    );
  },
);

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(function DialogTitle({ className, ...rest }, ref) {
  return (
    <RadixDialog.Title
      ref={ref}
      className={cn("font-display text-xl text-ink-100", className)}
      {...rest}
    />
  );
});

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(function DialogDescription({ className, ...rest }, ref) {
  return (
    <RadixDialog.Description
      ref={ref}
      className={cn("text-sm text-ink-400 mt-1.5", className)}
      {...rest}
    />
  );
});

export const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function DialogFooter({ className, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={cn("mt-6 flex items-center justify-end gap-2", className)}
      {...rest}
    />
  );
});
```

- [ ] **Step 22.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t Dialog`
Expected: 1 test passes.

- [ ] **Step 22.5: Commit**

```bash
git add components/ui/Dialog.tsx tests/components/Dialog.test.tsx
git commit -m "feat(ui): add Dialog primitive on radix-ui"
```

---

## Task 23: Drawer primitive (side sheet)

**Files:**
- Create: `components/ui/Drawer.tsx`
- Test: `tests/components/Drawer.test.tsx`

- [ ] **Step 23.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/Drawer";

describe("Drawer", () => {
  it("opens on trigger click", async () => {
    const user = userEvent.setup();
    render(
      <Drawer>
        <DrawerTrigger>open</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>side</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    await user.click(screen.getByText("open"));
    expect(await screen.findByText("side")).toBeInTheDocument();
  });
});
```

- [ ] **Step 23.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Drawer`
Expected: FAIL.

- [ ] **Step 23.3: Implement `components/ui/Drawer.tsx`**

The Drawer is a side-sheet built on Radix Dialog with a slide animation from the right.

```tsx
"use client";

import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Drawer = RadixDialog.Root;
export const DrawerTrigger = RadixDialog.Trigger;
export const DrawerClose = RadixDialog.Close;

export interface DrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof RadixDialog.Content> {
  side?: "left" | "right";
  width?: string;
}

export const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  function DrawerContent(
    { className, side = "right", width = "min(28rem,100vw)", children, ...rest },
    ref,
  ) {
    const sideClasses =
      side === "right"
        ? "right-0 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
        : "left-0 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left";
    return (
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink-950/72 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <RadixDialog.Content
          ref={ref}
          style={{ width }}
          className={cn(
            "fixed top-0 bottom-0 z-50 bg-ink-900 border-l border-line-strong p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out",
            sideClasses,
            className,
          )}
          {...rest}
        >
          {children}
          <RadixDialog.Close asChild>
            <button
              aria-label="Close"
              className="absolute right-4 top-4 rounded-md p-1 text-ink-400 hover:text-ink-100 focus-gold"
            >
              <X className="h-4 w-4" />
            </button>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    );
  },
);

export const DrawerTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(function DrawerTitle({ className, ...rest }, ref) {
  return (
    <RadixDialog.Title
      ref={ref}
      className={cn("font-display text-xl text-ink-100", className)}
      {...rest}
    />
  );
});
```

- [ ] **Step 23.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t Drawer`
Expected: 1 test passes.

- [ ] **Step 23.5: Commit**

```bash
git add components/ui/Drawer.tsx tests/components/Drawer.test.tsx
git commit -m "feat(ui): add Drawer primitive (side sheet) on radix-ui"
```

---

## Task 24: Toast primitive (Radix)

**Files:**
- Create: `components/ui/Toast.tsx`
- Test: `tests/components/Toast.test.tsx`

- [ ] **Step 24.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/components/ui/Toast";

function Probe() {
  const { toast } = useToast();
  return (
    <button onClick={() => toast({ title: "hi", description: "world" })}>
      go
    </button>
  );
}

describe("Toast", () => {
  it("renders a toast when triggered", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    );
    await user.click(screen.getByText("go"));
    expect(await screen.findByText("hi")).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
  });
});
```

- [ ] **Step 24.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t Toast`
Expected: FAIL.

- [ ] **Step 24.3: Implement `components/ui/Toast.tsx`**

The ToastProvider exposes a `useToast()` hook returning a `toast()` function. Built on Radix Toast for accessibility and queueing.

```tsx
"use client";

import * as React from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { cn } from "@/lib/utils/cn";

type Variant = "info" | "success" | "warn" | "error" | "ai";

interface ToastInput {
  title: string;
  description?: string;
  variant?: Variant;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface Ctx {
  toast: (input: ToastInput) => void;
}

const ToastCtx = React.createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const variantStyles: Record<Variant, string> = {
  info: "border-line-strong",
  success: "border-emerald-500/40",
  warn: "border-amber-500/40",
  error: "border-rose-500/40",
  ai: "border-line-gold",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const toast = React.useCallback((input: ToastInput) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, ...input }]);
  }, []);

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {items.map((t) => (
          <RadixToast.Root
            key={t.id}
            duration={t.duration ?? 4000}
            onOpenChange={(open) => {
              if (!open) remove(t.id);
            }}
            className={cn(
              "bg-ink-800 border rounded-[var(--radius-md)] p-3 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right",
              variantStyles[t.variant ?? "info"],
            )}
          >
            <RadixToast.Title className="text-sm font-medium text-ink-100">
              {t.title}
            </RadixToast.Title>
            {t.description && (
              <RadixToast.Description className="text-sm text-ink-400 mt-1">
                {t.description}
              </RadixToast.Description>
            )}
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed top-4 right-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastCtx.Provider>
  );
}
```

- [ ] **Step 24.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t Toast`
Expected: 1 test passes.

- [ ] **Step 24.5: Commit**

```bash
git add components/ui/Toast.tsx tests/components/Toast.test.tsx
git commit -m "feat(ui): add Toast + ToastProvider on radix-ui with useToast hook"
```

---

## Task 25: ConfirmDialog primitive

**Files:**
- Create: `components/ui/ConfirmDialog.tsx`
- Test: `tests/components/ConfirmDialog.test.tsx`

- [ ] **Step 25.1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("calls onConfirm when primary button clicked", async () => {
    const user = userEvent.setup();
    let confirmed = false;
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Delete case?"
        confirmLabel="Delete"
        onConfirm={() => (confirmed = true)}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(confirmed).toBe(true);
  });

  it("renders description", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Are you sure?"
        description="This cannot be undone."
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 25.2: Run test, expect FAIL**

Run: `npm test -- --project=dom -t ConfirmDialog`
Expected: FAIL.

- [ ] **Step 25.3: Implement `components/ui/ConfirmDialog.tsx`**

```tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./Dialog";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = React.useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            onClick={handleConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 25.4: Run test, expect PASS**

Run: `npm test -- --project=dom -t ConfirmDialog`
Expected: 2 tests pass.

- [ ] **Step 25.5: Commit**

```bash
git add components/ui/ConfirmDialog.tsx tests/components/ConfirmDialog.test.tsx
git commit -m "feat(ui): add ConfirmDialog composed on Dialog + Button"
```

---

## Task 26: Barrel export

**Files:**
- Create: `components/ui/index.ts`

- [ ] **Step 26.1: Create `components/ui/index.ts`**

```typescript
export { Button } from "./Button";
export type { ButtonProps } from "./Button";

export { Input } from "./Input";
export type { InputProps } from "./Input";

export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";

export { Card } from "./Card";
export type { CardProps } from "./Card";

export { StatusPill } from "./StatusPill";
export type { StatusPillProps, Status } from "./StatusPill";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

export { SectionHeader } from "./SectionHeader";
export type { SectionHeaderProps } from "./SectionHeader";

export { KeyboardHint } from "./KeyboardHint";
export type { KeyboardHintProps } from "./KeyboardHint";

export { Shimmer } from "./Shimmer";
export { ScanLine } from "./ScanLine";
export type { ScanLineProps } from "./ScanLine";

export { Switch } from "./Switch";
export type { SwitchProps } from "./Switch";

export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";

export { RadioGroup, RadioItem } from "./Radio";

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./Select";

export { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";

export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./Tooltip";

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./Dialog";
export type { DialogContentProps } from "./Dialog";

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "./Drawer";
export type { DrawerContentProps } from "./Drawer";

export { ToastProvider, useToast } from "./Toast";

export { ConfirmDialog } from "./ConfirmDialog";
export type { ConfirmDialogProps } from "./ConfirmDialog";
```

- [ ] **Step 26.2: Verify build still passes**

Run: `npm run build`
Expected: build completes without errors.

- [ ] **Step 26.3: Commit**

```bash
git add components/ui/index.ts
git commit -m "feat(ui): barrel exports for components/ui"
```

---

## Task 27: Demo route at `/_dev/primitives`

**Files:**
- Create: `app/_dev/primitives/page.tsx`

- [ ] **Step 27.1: Create the demo page**

```tsx
"use client";

import * as React from "react";
import { Search, Trash2, Sparkles } from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Card,
  StatusPill,
  EmptyState,
  SectionHeader,
  KeyboardHint,
  Shimmer,
  ScanLine,
  Switch,
  Checkbox,
  RadioGroup,
  RadioItem,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  ToastProvider,
  useToast,
  ConfirmDialog,
} from "@/components/ui";

function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className="flex gap-2 flex-wrap">
      <Button onClick={() => toast({ title: "Info", description: "Heads up." })}>
        Info
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({ title: "Saved", description: "Case saved.", variant: "success" })
        }
      >
        Success
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          toast({ title: "AI thinking", description: "Drafting…", variant: "ai" })
        }
      >
        AI
      </Button>
      <Button
        variant="destructive"
        onClick={() =>
          toast({
            title: "Failed",
            description: "Could not delete.",
            variant: "error",
          })
        }
      >
        Error
      </Button>
    </div>
  );
}

export default function PrimitivesDemo() {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [switchOn, setSwitchOn] = React.useState(false);
  const [check, setCheck] = React.useState<boolean | "indeterminate">(false);
  const [radio, setRadio] = React.useState("a");

  return (
    <ToastProvider>
      <TooltipProvider>
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">
          <SectionHeader
            title="Editorial Court · Primitives"
            meta="Phase A demo · /_dev/primitives"
            actions={<KeyboardHint keys={["⌘", "K"]} />}
          />

          {/* BUTTONS */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Buttons
            </h3>
            <div className="flex gap-2 flex-wrap">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive" leftIcon={<Trash2 className="h-4 w-4" />}>
                Delete
              </Button>
              <Button variant="link">Read more</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </section>

          {/* INPUTS */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Inputs
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <Input placeholder="Search cases…" leadingIcon={<Search className="h-4 w-4" />} />
              <Input placeholder="Email" />
              <Input placeholder="Required" error="This field is required" />
              <Textarea placeholder="Notes" />
            </div>
          </section>

          {/* SELECTORS + TOGGLES */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Selectors
            </h3>
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <Select>
                <SelectTrigger aria-label="evidence type">
                  <SelectValue placeholder="Pick evidence type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical">Medical records</SelectItem>
                  <SelectItem value="police">Police reports</SelectItem>
                  <SelectItem value="witness">Witness letters</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-3">
                <Switch
                  checked={switchOn}
                  onCheckedChange={setSwitchOn}
                  aria-label="english/bengali"
                />
                <span className="text-sm text-ink-300">
                  {switchOn ? "বাংলা" : "English"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox checked={check} onCheckedChange={setCheck} aria-label="ok" />
                <span className="text-sm text-ink-300">I agree</span>
              </div>
              <RadioGroup value={radio} onValueChange={setRadio} className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-ink-300">
                  <RadioItem value="a" /> Option A
                </label>
                <label className="flex items-center gap-2 text-sm text-ink-300">
                  <RadioItem value="b" /> Option B
                </label>
              </RadioGroup>
            </div>
          </section>

          {/* CARDS + STATUS */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Cards & status
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <h4 className="font-display text-lg text-ink-100">Chrome card</h4>
                <p className="text-sm text-ink-400 mt-1">Default surface.</p>
              </Card>
              <Card variant="gold-accent">
                <h4 className="font-display text-lg text-ink-100">Gold-accent</h4>
                <p className="text-sm text-ink-400 mt-1">For AI / spotlight.</p>
              </Card>
              <Card variant="cream-paper">
                <h4 className="font-display text-lg">Cream paper</h4>
                <p className="text-sm mt-1">Documents only.</p>
              </Card>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="draft" />
              <StatusPill status="drafting" />
              <StatusPill status="drafted" />
              <StatusPill status="processing" />
              <StatusPill status="complete" />
              <StatusPill status="failed" />
              <StatusPill status="ai-suggested" />
            </div>
          </section>

          {/* TABS + TOOLTIP */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Tabs & tooltip
            </h3>
            <Tabs defaultValue="a">
              <TabsList>
                <TabsTrigger value="a">Writ</TabsTrigger>
                <TabsTrigger value="b">Statement of Claim</TabsTrigger>
                <TabsTrigger value="c">Witness</TabsTrigger>
              </TabsList>
              <TabsContent value="a">
                <Card variant="cream-paper">Writ content lives here.</Card>
              </TabsContent>
              <TabsContent value="b">
                <Card variant="cream-paper">SoC content.</Card>
              </TabsContent>
              <TabsContent value="c">
                <Card variant="cream-paper">Witness statement.</Card>
              </TabsContent>
            </Tabs>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>Some helper text.</TooltipContent>
            </Tooltip>
          </section>

          {/* DIALOG + DRAWER + CONFIRM */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Overlays
            </h3>
            <div className="flex gap-2 flex-wrap">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Open dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>New case</DialogTitle>
                  <DialogDescription>
                    Set up a case in two quick steps.
                  </DialogDescription>
                  <DialogFooter>
                    <Button variant="ghost">Cancel</Button>
                    <Button>Continue ▸</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="secondary">Open drawer</Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerTitle>Side sheet</DrawerTitle>
                  <p className="text-sm text-ink-400 mt-2">Slides in from the right.</p>
                </DrawerContent>
              </Drawer>

              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                Delete case
              </Button>
              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete this case?"
                description="This cannot be undone."
                confirmLabel="Delete"
                onConfirm={() => new Promise((r) => setTimeout(r, 400))}
              />
            </div>
          </section>

          {/* TOASTS */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Toasts
            </h3>
            <ToastDemo />
          </section>

          {/* LOADING */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Loading
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <Shimmer className="h-5 w-3/4 mb-3" />
                <Shimmer className="h-4 w-full mb-2" />
                <Shimmer className="h-4 w-5/6" />
              </Card>
              <Card className="relative overflow-hidden h-32 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-gold-500" />
                <ScanLine />
              </Card>
            </div>
          </section>

          {/* EMPTY */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Empty state
            </h3>
            <EmptyState
              icon={<Search className="h-8 w-8" />}
              title="No cases yet"
              description="Create your first case to start drafting."
              action={<Button>+ New case</Button>}
            />
          </section>
        </div>
      </TooltipProvider>
    </ToastProvider>
  );
}
```

- [ ] **Step 27.2: Run dev server and visit `/_dev/primitives`**

Run: `npm run dev`
Visit: `http://localhost:3000/_dev/primitives`
Expected: every primitive renders. Buttons clickable, dialog/drawer open, toasts fire, switch/checkbox/radio toggle, tabs switch, tooltip appears on hover, scan-line animates over the gold card.

Stop the server (Ctrl-C) when done eyeballing.

- [ ] **Step 27.3: Verify the production build still passes**

Run: `npm run build`
Expected: build completes without errors.

- [ ] **Step 27.4: Commit**

```bash
git add app/_dev/primitives/page.tsx
git commit -m "feat(ui): add dev-only primitives demo route at /_dev/primitives"
```

---

## Task 28: Update CLAUDE.md conventions

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 28.1: Add a "UI conventions" subsection under "Conventions"**

Find the existing "Conventions" section in `CLAUDE.md` (it currently lists Tests, Prompt files, "No shadows on cards", Markdown post-processing, Conventional Commits). Insert a new bullet **before** the "No shadows on cards" line:

```markdown
- **UI primitives:** Every chrome component (buttons, inputs, dialogs, etc.) must use the primitives in `components/ui/`. Do not write bespoke inline styles for these — extend the primitive or compose existing ones.
- **Design tokens:** Colors, fonts, radii, durations live as CSS variables defined under `@theme` in `app/globals.css`. Reference them via Tailwind utility classes (`bg-ink-800`, `text-gold-500`, `rounded-[var(--radius-md)]`). Never hard-code hex values or raw Tailwind palette colors (`bg-blue-600`, `text-gray-500`) — they break theme consistency.
- **Surface rule:** App chrome is dark (ink scale). Cream surfaces are reserved for legal-document content (`MdxEditor` / `MdxRenderer` / preview / export). Use `Card variant="cream-paper"` when in doubt.
```

And **replace** the existing "No shadows on cards" line with:

```markdown
- **No shadows on chrome.** The only shadow in the app belongs to cream-paper documents — it's the signature elevation. Chrome surfaces (ink-800/ink-900) use hairline borders only.
```

Also add a new "Motion" bullet right after:

```markdown
- **Motion:** Use the presets in `lib/motion.ts` (`springSoft`, `springStage`, `springPaper`, `fadeUp`, `stageReveal`, `staggerChildren`) and the duration tokens in `globals.css`. Always respect `prefers-reduced-motion`.
```

- [ ] **Step 28.2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update conventions for editorial-court UI primitives and tokens"
```

---

## Task 29: Final phase verification

**Files:** none modified — verification only.

- [ ] **Step 29.1: Run all tests, both projects**

Run: `npm test`
Expected: every test passes — existing service tests under node project, all 25+ new component tests under dom project. No failures, no skips.

- [ ] **Step 29.2: Verify production build**

Run: `npm run build`
Expected: build succeeds. No type errors. Bundle includes the new primitives.

- [ ] **Step 29.3: Manual smoke at `/_dev/primitives`**

Run: `npm run dev`
Visit: `http://localhost:3000/_dev/primitives`
Walk through:
  - Click every button variant — visual feedback present
  - Open the dialog, confirm dialog, drawer — all open, close, esc-close works
  - Trigger each toast variant — all four appear top-right and auto-dismiss
  - Toggle switch / checkbox / radio — state visible
  - Switch tabs — content swaps
  - Hover the tooltip trigger — content appears
  - Hover the `ScanLine` card — gold beam moves top→bottom continuously
  - Open Chrome DevTools → Rendering → Emulate `prefers-reduced-motion: reduce` → reload — animations are flat fades, scan-line still safe

- [ ] **Step 29.4: Verify no production screens were touched**

Run: `git diff --stat main..HEAD -- app/page.tsx app/case app/login app/register components/steps components/tabs components/modals components/PdfSplit* components/SplitRangeDisplay.tsx`
Expected: empty output (no files touched).

- [ ] **Step 29.5: Commit-log sanity**

Run: `git log --oneline main..HEAD | wc -l`
Expected: ~29 commits (one per task plus minor sub-commits). All commits use Conventional Commits prefix.

Run: `git log --oneline main..HEAD | head -40`
Expected: clean conventional-commits log.

- [ ] **Step 29.6: Open PR**

Run:
```bash
git push -u origin <your-phase-a-branch>
gh pr create --title "feat(ui): Phase A · foundation tokens + primitive library" --body "$(cat <<'EOF'
## Summary
- Replaces cream-default palette in `globals.css` with dark editorial tokens (ink + gold).
- Adds `lib/utils/cn.ts`, `lib/utils/cva.ts`, `lib/motion.ts`.
- Adds 20 component primitives in `components/ui/*` with Vitest smoke tests under happy-dom.
- Vitest split into two projects: existing service tests stay node, new component tests run under happy-dom.
- Adds dev-only demo route at `/_dev/primitives` to eyeball every primitive.
- No production screens changed in this phase — those land in Phases B–E.

## Test plan
- [ ] `npm test` — both node + dom projects green
- [ ] `npm run build` — no type errors
- [ ] Visit `/_dev/primitives` — every primitive renders and interacts
- [ ] Existing screens still load (will look broken because they reference cream-default classes — that's expected and is fixed in Phase B)
- [ ] `prefers-reduced-motion: reduce` emulation — animations degrade to opacity fades

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Notes

- **The `slide-in-from-right` Tailwind animation classes** used in the Drawer rely on Tailwind v4's default keyframes. If the build complains they don't exist, add `tailwindcss-animate` (`npm i tailwindcss-animate`) and reference its keyframes — Radix-UI's official examples use it. Most projects on Tailwind v4 have these baked in.
- **`shadow-2xl` / `shadow-xl`** on Dialog and Drawer is Tailwind's default and visually subtle on dark ink — that's intentional. The "no shadows on chrome" rule applies to *cards*, not dialogs. Dialogs need elevation to read as overlay.
- **Existing screens will look broken after Task 3** ships because they still use cream-default tokens (e.g., `bg-[var(--color-cream-100)]`). This is expected and acceptable for Phase A — every screen gets rebuilt in Phases B–E. If a stakeholder wants to demo the existing screens between phases, they should checkout `main` before Phase A.
- **No drag-to-reorder** in any primitive. Sortable lists are out of scope for Phase A.
- **TypeScript:** every primitive uses `React.forwardRef` where it makes sense (refs are needed for Radix integration on many of them). Props extend the appropriate `ComponentPropsWithoutRef<typeof RadixX.Y>` so all native + Radix props flow through.

---

## Self-review

**Spec coverage:**
- §2 Design tokens → Tasks 3, 4, 5 ✓
- §3 Component primitives — full list — Tasks 6–25, 26 (barrel) ✓
- §3 cva.ts, motion.ts → Task 5 ✓
- §11 Validation per phase → Task 29 ✓
- §10 Phase A scope → entirely covered ✓
- Demo route (`_dev/primitives`) → Task 27 ✓
- CLAUDE.md conventions update → Task 28 ✓

**Placeholder scan:** none found — every step has actual code or actual commands.

**Type consistency:** `cn`, `cva`, `VariantProps` are consistent across tasks. All Radix-based primitives use `ComponentPropsWithoutRef<typeof RadixX.Y>` consistently. All component prop interfaces use the `<ComponentName>Props` naming convention.

**Open follow-ups for Phase B (not blockers):**
- The `Hoverable` and `Citation` components keep their own styling (cream-paper-aware) — touched in Phase E, not A.
- `MdxRenderer` and `MdxEditor` get a cream-paper variant — Phase E.
- The `⌘K` global search modal — Phase B, uses primitives shipped in Phase A.
