# Editorial Court · Phase E · Review + Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Step 5 Review on the document-rail + paper-canvas pattern, theme the MDX renderer/editor and citation tooltips for cream paper, finish remaining overlay primitives (PdfViewerDialog, ErrorDialog), apply a motion polish pass app-wide with `prefers-reduced-motion` audit, remove the dev demo route, and update `CLAUDE.md`.

**Architecture:** New `components/review/` directory hosts ReviewLayout (state owner), DocumentRail, DocumentRailItem, PaperToolbar, PaperCanvas. The five existing tab components (`components/tabs/*Tab.tsx`) keep their generation/save/regenerate logic but lose their inline toolbars — those move into PaperToolbar driven by `ReviewLayout`. `MdxRenderer` and `MdxEditor` gain a cream-paper-aware variant (or implicit theming via the surrounding `Card variant="cream-paper"`). `Hoverable` and `Citation` get cream-paper-aware classes. `PDFViewerModal` becomes `PdfViewerDialog` wrapping `Dialog size="full"`. `ErrorDialog` is added for Step 5's error surfaces. A motion pass adds `fadeUp` / `stageReveal` to page roots and a `prefers-reduced-motion` audit confirms all transforms degrade. The `/dev/primitives` demo route is removed.

**Tech Stack:** Next.js 15.4, React 19, Tailwind v4, framer-motion, Phase A/B/C/D primitives, Radix UI.

**Spec reference:** `docs/superpowers/specs/2026-05-17-editorial-court-ui-redesign-design.md` — Sections 8 (Review), 9 (Modals), 2 (Motion language).

**Out of scope for Phase E:** Anything not in the spec. No backend / API / schema changes.

---

## Decisions made in this plan

- **ReviewLayout owns generation state.** It mounts the SSE-driven `generateContent()` flow that currently lives in `Step5Review.tsx`. The Witness Bengali toggle state also lifts to ReviewLayout so the rail's En/বাংলা switch can drive it without re-mounting the Witness tab.
- **Tabs become pure render-only views.** Each `*Tab.tsx` continues to receive `content`, `bengaliContent` (Witness only), and `isGenerating`. Their inline `Regenerate` / `Download` / `Edit` toolbars are removed — those buttons now live in `PaperToolbar`, which dispatches actions back up via callbacks `onRegenerate(docId)` / `onDownload(docId)` / `onCopy(docId)`.
- **MdxRenderer + MdxEditor cream-paper variant.** Both components add a `variant: "ink" | "paper"` prop. Paper variant sets text color, link color, code background, blockquote border to ink-on-cream values. The default stays `"ink"` so any pre-existing usage (if any survives) is unaffected.
- **Citation + Hoverable** gain paper-aware classes via the same variant prop. They're only used inside document surfaces, so passing `variant="paper"` is the normal case.
- **PdfViewerDialog** is a thin wrapper around `<Dialog size="full">` that hosts the existing PDF viewer logic. The legacy `PDFViewerModal` component is rewritten internally in place (filename and export name unchanged → no caller updates needed); it just becomes a Dialog wrapper.
- **ErrorDialog** is a new primitive — a small Dialog with rose accent, used by Step 5 for generation errors and as a future-proof error surface.
- **Motion pass:** the only places where motion is added in this phase are:
  - Page-root fade-up via `motion.div variants={fadeUp}` on dashboard, wizard, workshop, review
  - Stage-reveal transition between wizard steps (handled in `CaseShell` via `AnimatePresence`)
  - Scan-line on Step 5 document generation: when a tab transitions from "generating" to "drafted", the cream paper shows a scan-line for ~700ms
  - Confirm: `prefers-reduced-motion: reduce` actually flattens these
- **Dead-code sweep:** legacy color references (`var(--color-saffron-*)`, `var(--color-cream-*)` outside cream-paper utility class, hardcoded gray/blue/red Tailwind palette colors) should be zero at end of phase. Phase E owns the final purge.
- **`/dev/primitives` removal** is the very last commit before the PR — gives reviewers a chance to eyeball the primitives one last time.
- **`CLAUDE.md` update** moves Phase A's primitive-library convention to be a load-bearing rule for future contributors.

---

## File structure

### New files

```
components/review/
  ReviewLayout.tsx            top-level state + SSE generation owner
  DocumentRail.tsx            left rail listing the 5 documents
  DocumentRailItem.tsx        one rail row (status, action, optional Bengali switch)
  PaperToolbar.tsx            sticky toolbar above the cream paper
  PaperCanvas.tsx             cream paper wrapper around the active tab's content
  documentTypes.ts            Document interface, helpers to map config/tabs.json
components/modals/
  PdfViewerDialog.tsx         replacement for components/PDFViewerModal.tsx (filename change)
  ErrorDialog.tsx             generic error surface used by Step 5
tests/components/
  ReviewLayout.test.tsx
  DocumentRail.test.tsx
  PaperToolbar.test.tsx
  PaperCanvas.test.tsx
  PdfViewerDialog.test.tsx
  ErrorDialog.test.tsx
  MdxRenderer.paper.test.tsx     (smoke: paper variant renders without raw gray classes)
  Hoverable.paper.test.tsx
```

### Modified files

```
components/steps/Step5Review.tsx           rewrite to mount ReviewLayout
components/tabs/WritOfSummonsTab.tsx       remove inline toolbar
components/tabs/StatementOfClaimTab.tsx    remove inline toolbar
components/tabs/StatementOfDamagesTab.tsx  remove inline toolbar
components/tabs/PreActionLetterTab.tsx     remove inline toolbar
components/tabs/WitnessStatementTab.tsx    remove inline toolbar; expose pure render
components/MdxRenderer.tsx                 add variant: "ink" | "paper"
components/MdxEditor.tsx                   add variant: "ink" | "paper"
components/Hoverable.tsx                   add variant: "ink" | "paper"
components/Citation.tsx                    paper-aware styling
CLAUDE.md                                  finalise editorial-court conventions
```

### Deleted files

```
components/PDFViewerModal.tsx             (replaced by components/modals/PdfViewerDialog.tsx)
app/dev/primitives/page.tsx
app/dev/                                  (now empty)
```

### Untouched in this phase

- All services, API routes, middleware, LangGraph, Prisma — unchanged.
- `config/tabs.json` — unchanged (used to drive DocumentRail items).
- Auth, dashboard, wizard chrome (Phases A–C).
- PDF Split workshop (Phase D).

---

## Behavior preserved verbatim

- Step 5 generation flow: `POST /api/orchestrate` (or current endpoint), SSE event handling, agent statuses map to documents.
- localStorage cache key `orchestration_content_${caseId}` and rehydration logic.
- Bengali toggle on Witness Statement: toggle position remembered for the session, swaps between `witnessStatement` and `witnessStatementBengali`.
- Each tab's existing `apiEndpoint` (load), `generateEndpoint` (regenerate), `exportFunction` (DOCX download) — referenced via `config/tabs.json`.
- `Hoverable` tooltip text and Citation document-anchor behaviour.
- The markdown post-processing pipeline (`remarkFixVoidTags`, `verify_markdown`).
- All wizard guards from Phase C remain untouched.

---

## Task 1: Baseline verify

`git log --oneline -1 && npm test 2>&1 | tail -5 && npm run build 2>&1 | tail -5`. No commit.

---

## Task 2: documentTypes helper

**Files:**
- Create: `components/review/documentTypes.ts`

```tsx
import tabsConfig from "@/config/tabs.json";

export type DocumentId =
  | "writ-of-summons"
  | "witness-statement"
  | "statement-of-claim"
  | "statement-of-damages"
  | "pre-action-letter";

export type DocumentStatus =
  | "pending"
  | "generating"
  | "drafted"
  | "failed";

export interface DocumentDef {
  id: DocumentId;
  label: string;
  title: string;
  apiEndpoint: string;
  generateEndpoint: string;
  exportFunction: string;
  promptFile: string;
}

export const DOCUMENTS = (tabsConfig as any).tabs as DocumentDef[];

/** Stable display order: matches config/tabs.json. */
export const DOCUMENT_ORDER: DocumentId[] = DOCUMENTS.map((d) => d.id as DocumentId);
```

**Commit:**

```
git add components/review/documentTypes.ts
git commit -m "feat(review): expose typed Document list driven by config/tabs.json"
```

---

## Task 3: PaperCanvas

**Files:**
- Create: `components/review/PaperCanvas.tsx`
- Create: `tests/components/PaperCanvas.test.tsx`

PaperCanvas is the cream-paper wrapper. It hosts the soft shadow signature elevation (defined as the `.cream-paper` utility class in `app/globals.css`). It optionally plays a scan-line when its `generating` prop is `true`.

```tsx
"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ScanLine } from "@/components/ui";
import { springPaper } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

interface Props {
  children: ReactNode;
  generating?: boolean;
  className?: string;
}

export function PaperCanvas({ children, generating, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPaper}
      className={cn(
        "relative cream-paper overflow-hidden",
        "px-10 py-12 md:px-14 md:py-16",
        "rounded-[var(--radius-xl)]",
        "max-w-3xl mx-auto",
        className,
      )}
    >
      {generating && <ScanLine duration={1.6} />}
      {children}
    </motion.div>
  );
}
```

**Test** (smoke):

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaperCanvas } from "@/components/review/PaperCanvas";

describe("PaperCanvas", () => {
  it("renders children", () => {
    render(<PaperCanvas><p>hello</p></PaperCanvas>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
  it("applies the cream-paper utility class", () => {
    const { container } = render(<PaperCanvas><p>x</p></PaperCanvas>);
    expect(container.firstElementChild?.className).toMatch(/cream-paper/);
  });
});
```

**Commit:**

```
git add components/review/PaperCanvas.tsx tests/components/PaperCanvas.test.tsx
git commit -m "feat(review): add PaperCanvas with scan-line on generation"
```

---

## Task 4: PaperToolbar

**Files:**
- Create: `components/review/PaperToolbar.tsx`
- Create: `tests/components/PaperToolbar.test.tsx`

```tsx
"use client";

import { RefreshCw, Download, Copy } from "lucide-react";
import { Button, Switch } from "@/components/ui";

interface Props {
  documentLabel: string;
  status: "pending" | "generating" | "drafted" | "failed";
  onRegenerate: () => void;
  onDownload: () => void;
  onCopy: () => void;
  /** Witness only: render En ⌁ বাংলা toggle. */
  bengaliMode?: boolean;
  onBengaliToggle?: (next: boolean) => void;
}

export function PaperToolbar({
  documentLabel,
  status,
  onRegenerate,
  onDownload,
  onCopy,
  bengaliMode,
  onBengaliToggle,
}: Props) {
  const busy = status === "generating";
  return (
    <div className="sticky top-0 z-10 -mx-6 px-6 py-3 mb-6 bg-ink-900/95 backdrop-blur border-b border-line-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-sm font-medium text-ink-100 truncate">{documentLabel}</h3>
          <span className="text-xs text-ink-400 shrink-0">
            {status === "drafted" && "Drafted"}
            {status === "generating" && "Generating…"}
            {status === "failed" && "Failed"}
            {status === "pending" && "Queued"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onBengaliToggle && (
            <label className="flex items-center gap-2 text-xs text-ink-300">
              <span>En</span>
              <Switch checked={!!bengaliMode} onCheckedChange={onBengaliToggle} aria-label="English to Bengali" />
              <span>বাংলা</span>
            </label>
          )}
          <Button size="sm" variant="ghost" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={onRegenerate} disabled={busy}>
            Regenerate
          </Button>
          <Button size="sm" variant="ghost" leftIcon={<Copy className="h-4 w-4" />} onClick={onCopy} disabled={busy}>
            Copy
          </Button>
          <Button size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={onDownload} disabled={busy}>
            DOCX
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Test:** smoke — renders the document label and buttons.

**Commit:**

```
git add components/review/PaperToolbar.tsx tests/components/PaperToolbar.test.tsx
git commit -m "feat(review): add PaperToolbar with regenerate/copy/DOCX + Witness toggle"
```

---

## Task 5: DocumentRailItem + DocumentRail

**Files:**
- Create: `components/review/DocumentRailItem.tsx`
- Create: `components/review/DocumentRail.tsx`
- Create: `tests/components/DocumentRail.test.tsx`

**`DocumentRailItem.tsx`:**

```tsx
"use client";

import { CheckCircle2, Loader2, AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DocumentStatus } from "./documentTypes";

interface Props {
  label: string;
  status: DocumentStatus;
  active: boolean;
  onSelect: () => void;
}

export function DocumentRailItem({ label, status, active, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full flex items-start gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-left transition-colors",
        active ? "bg-ink-800" : "hover:bg-ink-800/60",
      )}
    >
      {active && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gold-500" />}
      <span className="mt-0.5 text-ink-400">
        {status === "drafted" && <CheckCircle2 className="h-4 w-4 text-gold-500" />}
        {status === "generating" && <Loader2 className="h-4 w-4 animate-spin text-gold-500" />}
        {status === "failed" && <AlertCircle className="h-4 w-4 text-rose-500" />}
        {status === "pending" && <Circle className="h-4 w-4" />}
      </span>
      <span className="min-w-0">
        <span className={cn("block text-sm font-medium", active ? "text-ink-100" : "text-ink-300")}>{label}</span>
        <span className="block text-xs text-ink-400 mt-0.5">
          {status === "drafted" && "Drafted"}
          {status === "generating" && "Generating…"}
          {status === "failed" && "Retry"}
          {status === "pending" && "Queued"}
        </span>
      </span>
    </button>
  );
}
```

**`DocumentRail.tsx`:**

```tsx
"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { DocumentRailItem } from "./DocumentRailItem";
import { DOCUMENTS, DocumentId, DocumentStatus } from "./documentTypes";

interface Props {
  statuses: Record<DocumentId, DocumentStatus>;
  activeId: DocumentId;
  onSelect: (id: DocumentId) => void;
  onRegenerateAll: () => void;
}

export function DocumentRail({ statuses, activeId, onSelect, onRegenerateAll }: Props) {
  const draftedCount = Object.values(statuses).filter((s) => s === "drafted").length;
  return (
    <aside className="w-72 shrink-0 bg-ink-900 border-r border-line-soft p-3">
      <p className="px-3 text-xs uppercase tracking-widest text-ink-400 mb-1">Drafts</p>
      <p className="px-3 text-xs text-ink-500 mb-3">
        {draftedCount} of {DOCUMENTS.length} ready
      </p>
      <div className="space-y-1">
        {DOCUMENTS.map((d) => (
          <DocumentRailItem
            key={d.id}
            label={d.label}
            status={statuses[d.id as DocumentId] ?? "pending"}
            active={d.id === activeId}
            onSelect={() => onSelect(d.id as DocumentId)}
          />
        ))}
      </div>
      <div className="border-t border-line-soft mt-3 pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={onRegenerateAll}
        >
          Regenerate all
        </Button>
      </div>
    </aside>
  );
}
```

**Test** (smoke): renders 5 rail items, active item has the gold accent, click changes selection.

**Commit:**

```
git add components/review/DocumentRail.tsx components/review/DocumentRailItem.tsx tests/components/DocumentRail.test.tsx
git commit -m "feat(review): add DocumentRail + DocumentRailItem with status states"
```

---

## Task 6: MdxRenderer paper variant

**Files:**
- Modify: `components/MdxRenderer.tsx`
- Create: `tests/components/MdxRenderer.paper.test.tsx`

Read the current `components/MdxRenderer.tsx` first. Add a `variant?: "ink" | "paper"` prop defaulted to `"ink"`. When `variant === "paper"`, switch the wrapper's prose-color classes to ink-on-cream values. Concretely:

- The wrapper element (currently probably `<div className="prose ...">`) becomes:
  ```tsx
  <div className={cn(
    "prose max-w-none",
    variant === "paper"
      ? "prose-headings:text-ink-950 prose-p:text-ink-800 prose-li:text-ink-800 prose-a:text-gold-700 prose-code:text-ink-900 prose-blockquote:border-gold-500 prose-blockquote:text-ink-700"
      : "prose-invert",
  )}>
  ```
- If the file uses `react-markdown` or `markdown-to-jsx` with custom components, audit those for hardcoded colors and pass through the `variant`.

**Test:**

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MdxRenderer from "@/components/MdxRenderer";

describe("MdxRenderer paper variant", () => {
  it("does not use prose-invert when variant=paper", () => {
    const { container } = render(<MdxRenderer content="# Hello" variant="paper" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).not.toMatch(/prose-invert/);
    expect(wrapper.className).toMatch(/prose-headings:text-ink-950/);
  });
});
```

Verify no caller breaks (`MdxRenderer` is used by every tab and by Step 3/4).

**Commit:**

```
git add components/MdxRenderer.tsx tests/components/MdxRenderer.paper.test.tsx
git commit -m "feat(ui): add paper variant to MdxRenderer for cream-paper surfaces"
```

---

## Task 7: MdxEditor paper variant

**Files:**
- Modify: `components/MdxEditor.tsx`

Add the same `variant?: "ink" | "paper"` prop. The toast-ui editor renders in an iframe-ish container — paper variant should pass through to its inline styles or wrap it in a cream-paper-bg div so the editing surface matches the read view. The minimal change: when `variant === "paper"`, wrap the editor in a div with `bg-cream-50 text-paper-ink` and let the editor inherit. The toolbar may still look ink-themed — that's acceptable for Phase E.

Smoke test: render the editor with `variant="paper"`, assert the outer wrapper has `bg-cream-50`.

**Commit:**

```
git add components/MdxEditor.tsx tests/components/MdxEditor.paper.test.tsx
git commit -m "feat(ui): add paper variant to MdxEditor surface"
```

---

## Task 8: Hoverable + Citation paper variants

**Files:**
- Modify: `components/Hoverable.tsx`
- Modify: `components/Citation.tsx`
- Create: `tests/components/Hoverable.paper.test.tsx`

Read both files. Add `variant?: "ink" | "paper"` to each. Paper variant uses dark ink text on cream tooltip surfaces. Concretely, change the tooltip surface from `bg-ink-800 text-ink-100` to `bg-cream-100 text-paper-ink` when `variant === "paper"`.

Both components are used exclusively inside document surfaces, so callers in tab components should pass `variant="paper"`. The default stays `"ink"` for safety.

Smoke test: render `<Hoverable variant="paper" searchText="x">hi</Hoverable>` and assert the tooltip container has `bg-cream-100`.

**Commit:**

```
git add components/Hoverable.tsx components/Citation.tsx tests/components/Hoverable.paper.test.tsx
git commit -m "feat(ui): paper variants for Hoverable + Citation cream-surface use"
```

---

## Task 9: PdfViewerDialog (replace PDFViewerModal)

**Files:**
- Create: `components/modals/PdfViewerDialog.tsx`
- Create: `tests/components/PdfViewerDialog.test.tsx`
- Delete: `components/PDFViewerModal.tsx`

Read the current `PDFViewerModal.tsx`. Port its PDF rendering logic into the new wrapper:

```tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName?: string;
}

export function PdfViewerDialog({ open, onOpenChange, fileUrl, fileName }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full">
        <DialogTitle>{fileName ?? "Document"}</DialogTitle>
        <div className="mt-4 h-[calc(100vh-8rem)]">
          <iframe
            src={fileUrl}
            className="w-full h-full rounded-[var(--radius-md)] bg-ink-800"
            title={fileName ?? "PDF preview"}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

If the legacy `PDFViewerModal` did anything fancier (page navigation, zoom controls), port that logic — read the file to verify. The straightforward approach above is acceptable for now.

Update any callers that import `PDFViewerModal`:

```bash
grep -rE "from\s+['\"]@/components/PDFViewerModal" --include="*.tsx" --include="*.ts" .
```

Change imports to `@/components/modals/PdfViewerDialog` and update prop names (most likely just renaming `isOpen` → `open`, `onClose` → `onOpenChange(false)`).

**Test:** smoke — renders title when open.

**Commit:**

```
git add components/modals/PdfViewerDialog.tsx tests/components/PdfViewerDialog.test.tsx
git rm components/PDFViewerModal.tsx
# also update any caller imports
git commit -m "feat(ui): replace PDFViewerModal with PdfViewerDialog on Dialog primitive"
```

---

## Task 10: ErrorDialog

**Files:**
- Create: `components/modals/ErrorDialog.tsx`
- Create: `tests/components/ErrorDialog.test.tsx`

```tsx
"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@/components/ui";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorDialog({ open, onOpenChange, title = "Something went wrong", message, onRetry }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-rose-500/15 text-rose-500 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          {onRetry && <Button onClick={onRetry}>Retry</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Test** (smoke): renders message; Retry button calls onRetry.

**Commit:**

```
git add components/modals/ErrorDialog.tsx tests/components/ErrorDialog.test.tsx
git commit -m "feat(ui): add ErrorDialog generic error surface"
```

---

## Task 11: Strip toolbars from tab components

**Files:**
- Modify: `components/tabs/WritOfSummonsTab.tsx`
- Modify: `components/tabs/StatementOfClaimTab.tsx`
- Modify: `components/tabs/StatementOfDamagesTab.tsx`
- Modify: `components/tabs/PreActionLetterTab.tsx`
- Modify: `components/tabs/WitnessStatementTab.tsx`

For each tab:
1. Read the current file.
2. Remove the inline toolbar JSX (Regenerate, Download, Copy buttons + their handlers if they're only used by the toolbar).
3. Keep all save/regenerate/SSE/export handlers but expose them via callbacks the parent passes in. New prop contract per tab:
   ```tsx
   interface TabProps {
     caseId: string;
     content: string;
     bengaliContent?: string;          // Witness only
     isGenerating: boolean;
     bengaliMode?: boolean;             // Witness only
   }
   ```
4. The tab's render shrinks to just `<MdxRenderer content={...} variant="paper" />` (and for Witness, switch between English and Bengali by prop).
5. Citation and Hoverable components inside the rendered MDX should already get `variant="paper"` via MdxRenderer's component map (Task 6 must wire that).

For Witness Statement specifically, replace internal Bengali state with the `bengaliMode` prop. The download function (export-to-DOCX) currently lives inside the tab — extract it as a named export so ReviewLayout can call it (`exportWitness(content, bengaliMode)`). Other tabs follow the same pattern: export their `handleDownload` logic so ReviewLayout can invoke it.

**Commit (one per tab, or batch all 5):**

```
git add components/tabs/
git commit -m "refactor(review): tab components become pure renderers; actions lifted to ReviewLayout"
```

---

## Task 12: ReviewLayout

**Files:**
- Create: `components/review/ReviewLayout.tsx`
- Create: `tests/components/ReviewLayout.test.tsx`

ReviewLayout owns the state currently inside `Step5Review.tsx`:
- `generatedContent: GeneratedContent` (object with one field per document)
- `agentStatuses: Record<DocumentId, DocumentStatus>`
- `serverEvents: ServerEvent[]`
- `activeDocId: DocumentId`
- `bengaliMode: boolean` (Witness)
- `error: { title?: string; message: string } | null` → drives ErrorDialog

It runs the existing `generateContent()` SSE flow (port verbatim from `Step5Review.tsx`). It also persists to localStorage under `orchestration_content_${caseId}`.

Layout:

```tsx
return (
  <div className="flex min-h-[calc(100vh-12rem)]">
    <DocumentRail
      statuses={agentStatuses}
      activeId={activeDocId}
      onSelect={setActiveDocId}
      onRegenerateAll={handleRegenerateAll}
    />
    <main className="flex-1 px-6 py-6">
      <div className="max-w-3xl mx-auto">
        <PaperToolbar
          documentLabel={activeDoc.label}
          status={agentStatuses[activeDocId]}
          onRegenerate={() => handleRegenerate(activeDocId)}
          onDownload={() => handleDownload(activeDocId)}
          onCopy={() => handleCopy(activeDocId)}
          bengaliMode={activeDocId === "witness-statement" ? bengaliMode : undefined}
          onBengaliToggle={activeDocId === "witness-statement" ? setBengaliMode : undefined}
        />
        <PaperCanvas generating={agentStatuses[activeDocId] === "generating"}>
          {renderTab(activeDocId)}
        </PaperCanvas>
      </div>
    </main>
    <ErrorDialog
      open={error !== null}
      onOpenChange={(o) => !o && setError(null)}
      title={error?.title}
      message={error?.message ?? ""}
      onRetry={() => { setError(null); handleRegenerate(activeDocId); }}
    />
    <RegenerateDialog
      open={regenOpen}
      onOpenChange={setRegenOpen}
      documentType="document"
      onConfirm={handleRegenerateConfirm}
    />
  </div>
);
```

`renderTab(id)` switches on the document ID and returns the appropriate `<*Tab>` with the right props from state. Export helpers (`downloadWitness`, `downloadWrit`, etc.) get called from `handleDownload(id)`.

**Test** (smoke): renders the rail + active toolbar + paper canvas given a mocked initial cache.

**Commit:**

```
git add components/review/ReviewLayout.tsx tests/components/ReviewLayout.test.tsx
git commit -m "feat(review): assemble ReviewLayout state owner + composition"
```

---

## Task 13: Rewrite Step5Review to mount ReviewLayout

**Files:**
- Modify: `components/steps/Step5Review.tsx`

Replace the entire body with a thin shell:

```tsx
"use client";

import { Case } from "@/types/case";
import { ReviewLayout } from "@/components/review/ReviewLayout";

interface Props {
  caseId: string;
  caseData: Case;
}

export default function Step5Review({ caseId, caseData }: Props) {
  return <ReviewLayout caseId={caseId} caseData={caseData} />;
}
```

(If the legacy `Step5Review` exports other things that callers use, preserve them. Most likely just the default export.)

Verify the wizard page (`app/case/[case_id]/page.tsx`) still imports `Step5Review` the same way.

**Commit:**

```
git add components/steps/Step5Review.tsx
git commit -m "refactor(review): collapse Step5Review to a ReviewLayout mount"
```

---

## Task 14: Page-root motion pass

**Files:**
- Modify: `app/page.tsx` (dashboard)
- Modify: `app/case/[case_id]/page.tsx` (wizard)
- Modify: `app/case/[case_id]/split/page.tsx` (workshop)
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`

Wrap each page-root's outer container in a `motion.div` using the `fadeUp` variant from `lib/motion.ts`:

```tsx
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

// at the page root:
<motion.div initial="hidden" animate="visible" variants={fadeUp} className="...existing">
  {/* existing content */}
</motion.div>
```

For the wizard, the motion goes on the `CaseShell`'s outermost container. For the workshop, on the workshop's outer flex container. For login/register, inside the AuthShell on the form panel.

**Verify** `prefers-reduced-motion: reduce` flattens these animations. The `app/globals.css` reduced-motion block (added Phase A) handles it automatically because framer-motion respects `prefers-reduced-motion` by default when reading transforms — but if it doesn't, gate the variants:

```tsx
import { useReducedMotion } from "framer-motion";
const reduced = useReducedMotion();
const variants = reduced ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : fadeUp;
```

**Commit:**

```
git add app/
git commit -m "feat(motion): page-root fade-up across dashboard, wizard, workshop, auth"
```

---

## Task 15: Reduced-motion audit

**Files:** none.

- [ ] **Step 15.1:** Run dev server, open DevTools → Rendering → toggle "Emulate `prefers-reduced-motion: reduce`". Walk through:
  - Dashboard load
  - Step transitions in wizard
  - PDF split workshop pages (scan-line, view changes)
  - Review (scan-line on cream paper during generation)
- [ ] **Step 15.2:** Confirm motion is flat or near-instant. If any animation persists, identify the offender and either gate it with `useReducedMotion()` or replace it with an opacity-only fade.
- [ ] **Step 15.3:** No commit unless gating was needed; if so:
  ```
  git commit -m "fix(motion): respect prefers-reduced-motion in <component>"
  ```

---

## Task 16: Dead-code sweep

**Files:** none — verification only.

- [ ] **Step 16.1: Hunt down legacy color references**

```bash
grep -rE "var\(--color-(saffron|cream-100|cream-200)" components/ app/ lib/ 2>/dev/null
grep -rE "(bg|text|border)-(blue|gray|red|green|yellow|indigo)-[0-9]" components/ app/ 2>/dev/null
grep -rE "#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})" components/ app/ 2>/dev/null
```

Expected results:
- Saffron / cream-100 / cream-200 references should be ZERO outside `app/globals.css`. Cream tokens may still appear inside the `cream-paper` utility class definition.
- Raw Tailwind palette colors should be ZERO outside `app/globals.css` (which has hex values defining the tokens).
- Hex values should appear only inside `app/globals.css` and possibly inside `lib/motion.ts` ease-curve numeric tuples.

For any unexpected hits, decide:
- If it's a legitimate exception (e.g., a hex inside a comment), leave it.
- If it's a real regression, fix it in this task.

- [ ] **Step 16.2:** If fixes were needed, commit:

```
git commit -m "chore(ui): final purge of legacy color references"
```

---

## Task 17: Remove the dev demo route

**Files:**
- Delete: `app/dev/primitives/page.tsx`
- Delete: `app/dev/` directory

```bash
git rm app/dev/primitives/page.tsx
rmdir app/dev/primitives 2>/dev/null
rmdir app/dev 2>/dev/null
npm run build 2>&1 | tail -10
```

Verify the route table no longer contains `/dev/primitives`.

**Commit:**

```
git commit -m "chore(ui): remove /dev/primitives demo route"
```

---

## Task 18: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

In the "Conventions" section, append a closing summary bullet that reflects the now-mature design system:

```markdown
- **Editorial Court (dark theme):** The app's visual language is locked to ink (chrome) + gold (accent) + cream (document surfaces). All new screens compose `components/ui/*` primitives over the layout shells (`AppShell`, `AuthShell`, `CaseShell`). The only shadow in the app belongs to cream-paper documents — it is the signature elevation. Never re-introduce raw Tailwind palette colors (`bg-blue-*`, `text-gray-*`, etc.) — extend the design tokens in `app/globals.css` if a new shade is needed.
```

If any earlier convention bullet has stale wording (e.g., still mentioning "saffron" or "cream surfaces" loosely), tighten it.

Verify the file renders cleanly — no broken markdown.

**Commit:**

```
git add CLAUDE.md
git commit -m "docs: lock in Editorial Court design-system conventions"
```

---

## Task 19: Final verification + PR

- [ ] **Step 19.1: Tests + build**

```bash
npm test 2>&1 | tail -10
npm run build 2>&1 | tail -15
```

Expect all tests green and a clean build. Confirm `/dev/primitives` is gone from the route table.

- [ ] **Step 19.2: Final-screen smoke**

Visit each public surface with `npm run dev`:
- `/login` and `/register` — AuthShell with editorial side panel
- `/` — Spotlight + CaseTable
- `/case/[id]` — wizard with left-rail stepper, Steps 1→5 all functional
- `/case/[id]/split` — workshop with PDF viewer + segment rail
- Step 5 Review — document rail + paper canvas, Bengali toggle works on Witness

- [ ] **Step 19.3: Open PR**

```
git push -u origin feat/phase-e-review-and-polish
"/c/Program Files/GitHub CLI/gh.exe" pr create --title "feat(ui): Phase E · Review + polish" --body "$(cat <<'EOF'
## Summary
Phase E completes the Editorial Court redesign.

- ReviewLayout state owner + DocumentRail + PaperToolbar + PaperCanvas
- Step 5 Review rewritten on the rail + paper-canvas pattern
- All five tab components stripped of inline toolbars (now pure renderers)
- MdxRenderer, MdxEditor, Hoverable, Citation gain cream-paper variants
- PdfViewerDialog replaces legacy PDFViewerModal
- ErrorDialog primitive added
- Page-root fade-up motion across dashboard, wizard, workshop, auth
- prefers-reduced-motion audit confirms graceful degradation
- Dead-code sweep: zero raw Tailwind palette colors, zero stale saffron/cream-100 references
- /dev/primitives demo route removed
- CLAUDE.md updated with locked-in Editorial Court conventions

## Test plan
- [x] npm test all green
- [x] npm run build clean
- [ ] End-to-end demo on the seeded case: create → upload evidence → split → process → particulars → chronology → review all 5 documents → toggle Witness Bengali → export DOCX
- [ ] prefers-reduced-motion DevTools emulation — all animations flatten

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

(Controller may merge with `gh pr merge <n> --merge --delete-branch`.)

---

## Self-review

**Spec coverage:**
- §8 ReviewLayout + DocumentRail + PaperToolbar + PaperCanvas → Tasks 3–5, 12 ✓
- §8 Tabs stripped to pure renderers, Witness Bengali lifted → Task 11 ✓
- §8 Step5Review collapses to mount → Task 13 ✓
- §9 PdfViewerDialog + ErrorDialog → Tasks 9–10 ✓
- §6/§8 MdxRenderer + MdxEditor + Hoverable + Citation cream-paper → Tasks 6–8 ✓
- §2 Motion language pass + reduced-motion → Tasks 14–15 ✓
- Phase E cleanup: dead-code sweep + /dev/primitives removal + CLAUDE.md → Tasks 16–18 ✓

**Placeholder scan:** Tasks 11 (tab refactor) and 12 (ReviewLayout) refer to "port the legacy state machine verbatim" — same intentional verbatim-port pattern as Phases C and D. Implementer must read the legacy files and translate the body while preserving SSE handling, localStorage cache, and the API contracts.

**Type consistency:** `DocumentId`, `DocumentStatus`, `DocumentDef` defined in Task 2 and reused throughout. `TabProps` shape (`caseId`, `content`, `bengaliContent?`, `isGenerating`, `bengaliMode?`) consistent across tab refactors. PaperToolbar's `bengaliMode` prop matches the tab prop.

**Open follow-ups (post-Phase E):**
- Magnetic-cursor / parallax / custom-cursor — explicitly out of scope.
- `⌘K` global search modal beyond the basic dashboard input — deferred indefinitely.
- Drag-to-reorder PDF segments — deferred.
- The Workshop's `?fileId=...` pre-load route param — implement if needed.

**End of phasing:** This plan completes the Editorial Court redesign. After Phase E merges, every user-facing surface has been redesigned, every primitive has tests, and every legacy color reference is gone. The 5-phase rollout is complete.
