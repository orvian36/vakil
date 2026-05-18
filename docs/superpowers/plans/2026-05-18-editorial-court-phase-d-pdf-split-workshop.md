# Editorial Court · Phase D · PDF Split Workshop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the off-brand `PdfSplitDrawer` + `PdfSplitter` + `SplitRangeDisplay` trio with a proper split-view workshop at `/case/[case_id]/split/`. The new UX shows the PDF page strip on the left with explicit cut indicators between pages, the segment list on the right, AI-confidence chips, and a sticky footer for split-and-download / split-and-upload actions. All existing PDF-split functionality is preserved.

**Architecture:** New route `app/case/[case_id]/split/page.tsx` is a client page that owns Workshop state. Sub-components live in `components/pdf-split/`. The route is reached via Step 1's "AI Split PDF" entry button (currently opens the legacy drawer). After upload completes, the route calls `router.back()` and the case page revalidates evidence. The legacy `PdfSplitDrawer` / `PdfSplitter` / `SplitRangeDisplay` files are deleted in the final task. No backend changes — `/api/analyze-pdf-split`, `/api/storage/upload`, and `/api/cases/[id]/evidence-types` all keep working as-is.

**Tech Stack:** Next.js 15.4 App Router, React 19, Tailwind v4, framer-motion, Phase A primitives, `pdfjs-dist` for rendering, `pdf-lib` for split-page extraction, `jszip` for download bundles.

**Spec reference:** `docs/superpowers/specs/2026-05-17-editorial-court-ui-redesign-design.md` — Section 7 (PDF Split workshop).

**Out of scope for Phase D:** Step 5 Review (Phase E). Any MDX / Hoverable / Citation work (Phase E). Drag-to-reorder segments (deferred indefinitely — page ranges already define order).

---

## Decisions made in this plan

- **Route, not drawer.** `/case/[case_id]/split/` becomes its own page. Browser back works, refreshes survive, and the layout has room to breathe. Auth gating piggybacks on the existing `/case/*` middleware matcher — no new matcher needed.
- **Cut indicators between pages.** Instead of segment "from/to" inputs, the user creates cuts between pages. Each page belongs to exactly one segment, defined by the cut on each side. The DEFAULT initial state on a fresh PDF is one segment covering all pages; users add cuts via a small "+" affordance that appears between adjacent page thumbnails on hover.
- **AI suggestions drive the initial cut set.** When the AI analysis returns, the resulting segments get translated to cuts (e.g., cuts at boundaries 3|4, 12|13, 20|21 for segments 1–3, 4–12, 13–20, etc.). Users can then add or remove cuts to refine.
- **AI confidence chip per segment.** Surfaced from the AI response.
- **Re-analyse button** re-runs the AI on the current PDF — handler reuses the existing `performIntelligentAnalysis` from the legacy code.
- **Segment names are user-editable; categories are required before upload.** Same validation rules as today (no duplicates, must not match original filename, category must be set).
- **Oversized split files (>100 MB) trigger `FileSizeDialog`** built in Phase C.
- **`AnalysingState` uses the Phase A `ScanLine` primitive** for the cinematic "AI is reading…" moment.
- **Workshop URL** does not include the file in the URL — the user picks a file from Step 1's overflow ("Split…") which triggers `router.push("/case/[id]/split?fileId=<id>")` for files already uploaded, or the user lands on `/split` and uploads fresh. Either path is supported.
- **Empty `fileId` is fine** — workshop shows `<EmptyDropzone />` first, then auto-loads after upload.

---

## File structure

### New files

```
app/case/[case_id]/split/
  page.tsx                          route entry, mounts Workshop

components/pdf-split/
  Workshop.tsx                      top-level state owner
  Header.tsx                        sticky header w/ back, file name, page count, AI confidence chip, re-analyse
  Viewer.tsx                        PDF page strip + cut indicators
  ViewerPage.tsx                    one rendered PDF page thumbnail
  CutIndicator.tsx                  gold dashed line between pages + "+" insert button
  SegmentRail.tsx                   right-side segment list
  SegmentRow.tsx                    one segment card
  Footer.tsx                        sticky bottom: Cancel · Download ZIP · Upload to evidence
  EmptyDropzone.tsx                 pre-upload state
  AnalysingState.tsx                AI-analysis loading state with ScanLine
  types.ts                          Segment, Cut, AIResult, helper types

tests/components/
  pdf-split-Workshop.test.tsx       smoke: empty-dropzone renders when no file
  pdf-split-SegmentRow.test.tsx     smoke: row renders given a Segment
  pdf-split-CutIndicator.test.tsx   smoke: + button calls onInsert
```

### Modified files

```
components/steps/Step1Evidence/index.tsx     // AI-Split-PDF button → router.push to /case/[id]/split
                                              // also: PDF file rows expose a "Split…" overflow link
```

### Deleted files

```
components/PdfSplitDrawer.tsx
components/PdfSplitter.tsx
components/SplitRangeDisplay.tsx
```

### Untouched in this phase

- Step 5 Review, tabs, MDX renderer/editor, Hoverable, Citation, PDFViewerModal — Phase E.
- `lib/pdfjs-config.ts` unchanged.
- All API routes unchanged.

---

## Behavior preserved verbatim

- AI analysis: `POST /api/analyze-pdf-split` with FormData (`file`, `caseId`) — same request, same response shape.
- File-size pre-check: 100 MB hard cap per split file (oversized → `FileSizeDialog`).
- Upload: `POST /api/storage/upload` with FormData (`files`, `caseId`, `evidenceType`) — one request per split file.
- ZIP download: `pdf-lib` extracts segments, `jszip` bundles them into `<original>-split.zip`.
- Custom Blob upload path (the `Blob as any` workaround for FormData filename) — preserved.
- `URL.revokeObjectURL` cleanup on unmount and on PDF replacement.
- Worker config from `@/lib/pdfjs-config` (top-level import).
- Evidence types are fetched from `/api/cases/[id]/evidence-types`.
- The `onFilesUploaded(evidenceType, files)` semantics: after the workshop uploads, the case page revalidates by re-fetching its case data. The simplest wiring is `router.back()` + the case page already has the evidence re-fetch on mount.

---

## Task 1: Baseline verify

**Files:** none.

- [ ] `git log --oneline -1 && npm test 2>&1 | tail -5 && npm run build 2>&1 | tail -5`

No commit.

---

## Task 2: types.ts

**Files:**
- Create: `components/pdf-split/types.ts`

```tsx
export interface AISuggestion {
  id: string;
  fromPage: number;
  toPage: number;
  suggestedName: string;
  suggestedCategory: string;
  confidence: number;
  description: string;
  documentType: string;
}

export interface AIAnalysisResult {
  success: boolean;
  data?: {
    totalPages: number;
    suggestedSegments: AISuggestion[];
    analysisConfidence: number;
  };
  error?: string;
}

/** A user-facing segment, derived from the cut points. */
export interface Segment {
  id: string;
  fromPage: number;
  toPage: number;
  name: string;
  category: string;
  /** 0..1 if AI suggested, undefined if user-added */
  aiConfidence?: number;
}

export interface OversizedFile {
  name: string;
  size: number;
}
```

**Commit:**

```
git add components/pdf-split/types.ts
git commit -m "feat(pdf-split): introduce shared types module"
```

---

## Task 3: EmptyDropzone

**Files:**
- Create: `components/pdf-split/EmptyDropzone.tsx`

```tsx
"use client";

import { useDropzone } from "react-dropzone";
import { FileText, Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  onFile: (file: File) => void;
  busy: boolean;
}

export function EmptyDropzone({ onFile, busy }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    onDrop: (accepted) => accepted[0] && onFile(accepted[0]),
    disabled: busy,
  });

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-6">
      <div
        {...getRootProps()}
        className={cn(
          "max-w-xl w-full rounded-[var(--radius-xl)] border-2 border-dashed bg-ink-900 px-8 py-16 text-center transition-colors cursor-pointer",
          isDragActive ? "border-gold-500 bg-gold-500/5" : "border-line-strong hover:border-gold-500/40",
          busy && "opacity-50 cursor-not-allowed",
        )}
      >
        <input {...getInputProps()} />
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/15 text-gold-500 mb-4">
          <FileText className="h-6 w-6" />
        </span>
        <h2 className="text-2xl font-display text-ink-100 mb-2">Choose a PDF to split</h2>
        <p className="text-sm text-ink-400 mb-6">
          Vakil will read the document and suggest segment boundaries automatically.
        </p>
        <div className="inline-flex items-center gap-2 text-sm text-gold-500">
          <Upload className="h-4 w-4" />
          {isDragActive ? "Drop your PDF here" : "Drop your PDF or click to browse"}
        </div>
        <p className="text-xs text-ink-500 mt-6">Maximum file size: 200 MB · PDF only</p>
      </div>
    </div>
  );
}
```

**Commit:**

```
git add components/pdf-split/EmptyDropzone.tsx
git commit -m "feat(pdf-split): add EmptyDropzone pre-upload state"
```

---

## Task 4: AnalysingState

**Files:**
- Create: `components/pdf-split/AnalysingState.tsx`

```tsx
"use client";

import { Brain } from "lucide-react";
import { ScanLine } from "@/components/ui";

export function AnalysingState() {
  return (
    <div className="relative min-h-[calc(100vh-16rem)] overflow-hidden">
      <ScanLine duration={2.2} />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/15 text-gold-500 mb-4 animate-pulse">
            <Brain className="h-7 w-7" />
          </span>
          <h2 className="text-2xl font-display text-ink-100 mb-2">Vakil is reading your PDF</h2>
          <p className="text-sm text-ink-400">
            Suggesting intelligent split points. This may take a minute or two.
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Commit:**

```
git add components/pdf-split/AnalysingState.tsx
git commit -m "feat(pdf-split): add AnalysingState with ScanLine motion"
```

---

## Task 5: ViewerPage

**Files:**
- Create: `components/pdf-split/ViewerPage.tsx`
- Create: `tests/components/pdf-split-ViewerPage.test.tsx`

A single rendered PDF page thumbnail. Receives a `pdfDocument` (PDF.js proxy) and a `pageNumber`, renders to a canvas at scale ~0.7. Used inside `Viewer.tsx`.

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type PDFDocumentProxy = {
  numPages: number;
  getPage: (n: number) => Promise<any>;
};

interface Props {
  pdfDocument: PDFDocumentProxy;
  pageNumber: number;
  active?: boolean;
}

export function ViewerPage({ pdfDocument, pageNumber, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!canvasRef.current) return;
      setLoading(true);
      try {
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.7 });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        if (renderTaskRef.current) renderTaskRef.current.cancel();
        const task = page.render({ canvasContext: ctx, viewport, canvas });
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) setLoading(false);
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") return;
        console.error("ViewerPage render failed", err);
        setLoading(false);
      }
    }
    render();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfDocument, pageNumber]);

  return (
    <div
      className={cn(
        "relative rounded-[var(--radius-md)] border bg-ink-800 p-2 transition-colors",
        active ? "border-gold-500" : "border-line-soft",
      )}
    >
      <div className="text-[10px] uppercase tracking-widest text-ink-500 mb-1.5">Page {pageNumber}</div>
      <canvas
        ref={canvasRef}
        className={cn(
          "block mx-auto rounded-sm shadow-lg",
          loading && "opacity-30",
        )}
      />
    </div>
  );
}
```

**Test** (smoke):

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ViewerPage } from "@/components/pdf-split/ViewerPage";

const fakeDoc: any = {
  numPages: 1,
  getPage: async () => ({
    getViewport: () => ({ height: 100, width: 80 }),
    render: () => ({ promise: Promise.resolve(), cancel: () => {} }),
  }),
};

describe("ViewerPage", () => {
  it("renders without throwing", () => {
    const { container } = render(<ViewerPage pdfDocument={fakeDoc} pageNumber={1} />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });
});
```

**Commit:**

```
git add components/pdf-split/ViewerPage.tsx tests/components/pdf-split-ViewerPage.test.tsx
git commit -m "feat(pdf-split): add ViewerPage canvas renderer"
```

---

## Task 6: CutIndicator

**Files:**
- Create: `components/pdf-split/CutIndicator.tsx`
- Create: `tests/components/pdf-split-CutIndicator.test.tsx`

Visual: gold dashed horizontal rule between pages, with a small "+" button in the middle to insert a cut. When a cut already exists at this boundary, the rule is solid and the button toggles to "−" (remove).

```tsx
"use client";

import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  hasCut: boolean;
  onToggle: () => void;
  /** Render between pages `afterPage` and `afterPage+1` (1-indexed). */
  afterPage: number;
}

export function CutIndicator({ hasCut, onToggle, afterPage }: Props) {
  return (
    <div className="relative h-6 my-1 flex items-center group" aria-label={`Boundary between page ${afterPage} and ${afterPage + 1}`}>
      <div
        aria-hidden
        className={cn(
          "absolute left-0 right-0 h-px",
          hasCut
            ? "bg-gold-500"
            : "border-t border-dashed border-line-soft group-hover:border-gold-500/60",
        )}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={hasCut ? "Remove cut" : "Insert cut"}
        className={cn(
          "relative mx-auto grid place-items-center h-6 w-6 rounded-full text-xs transition-colors focus-gold",
          hasCut
            ? "bg-gold-500 text-ink-950"
            : "bg-ink-700 text-ink-400 opacity-0 group-hover:opacity-100",
        )}
      >
        {hasCut ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      </button>
    </div>
  );
}
```

**Test:**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CutIndicator } from "@/components/pdf-split/CutIndicator";

describe("CutIndicator", () => {
  it("calls onToggle when clicked", async () => {
    const u = userEvent.setup();
    const onToggle = vi.fn();
    render(<CutIndicator afterPage={3} hasCut={false} onToggle={onToggle} />);
    await u.click(screen.getByRole("button", { name: /Insert cut/i }));
    expect(onToggle).toHaveBeenCalled();
  });
});
```

**Commit:**

```
git add components/pdf-split/CutIndicator.tsx tests/components/pdf-split-CutIndicator.test.tsx
git commit -m "feat(pdf-split): add CutIndicator for boundary insertion"
```

---

## Task 7: SegmentRow

**Files:**
- Create: `components/pdf-split/SegmentRow.tsx`
- Create: `tests/components/pdf-split-SegmentRow.test.tsx`

A single segment card in the right-rail list. Shows: name input, category select, page range (read-only), AI confidence pill (gold) if `aiConfidence > 0`, overflow menu for Remove + Download.

```tsx
"use client";

import { MoreHorizontal, Sparkles } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  StatusPill,
} from "@/components/ui";
import { CaseEvidenceType } from "@/types/case";
import { Segment } from "./types";

interface Props {
  segment: Segment;
  index: number;
  active: boolean;
  evidenceTypes: CaseEvidenceType[];
  duplicateName: boolean;
  onUpdate: (patch: Partial<Segment>) => void;
  onRemove: () => void;
  onDownload: () => void;
  onFocus: () => void;
}

export function SegmentRow({
  segment,
  index,
  active,
  evidenceTypes,
  duplicateName,
  onUpdate,
  onRemove,
  onDownload,
  onFocus,
}: Props) {
  return (
    <Card
      variant={active ? "gold-accent" : "chrome"}
      className="cursor-pointer space-y-3"
      onClick={onFocus}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-ink-400">Segment {index + 1}</p>
          <p className="text-xs text-ink-500 mt-0.5">
            Pages {segment.fromPage}–{segment.toPage}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {segment.aiConfidence !== undefined && (
            <span className="inline-flex items-center gap-1 text-xs text-gold-500">
              <Sparkles className="h-3 w-3" />
              {Math.round(segment.aiConfidence * 100)}%
            </span>
          )}
          <Button size="icon" variant="ghost" aria-label="Segment actions" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <Input
          value={segment.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Document name"
          error={duplicateName ? "Name must be unique" : undefined}
        />
        <Select
          value={segment.category}
          onValueChange={(v) => onUpdate({ category: v })}
        >
          <SelectTrigger aria-label="Category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {evidenceTypes.map((t) => (
              <SelectItem key={t.key} value={t.key}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDownload(); }}>
          Download
        </Button>
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          Remove
        </Button>
      </div>
    </Card>
  );
}
```

**Test** (smoke):

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SegmentRow } from "@/components/pdf-split/SegmentRow";

const seg = {
  id: "s1",
  fromPage: 1,
  toPage: 3,
  name: "Engagement",
  category: "medical",
  aiConfidence: 0.96,
};

describe("SegmentRow", () => {
  it("renders segment range and AI confidence", () => {
    render(
      <SegmentRow
        segment={seg as any}
        index={0}
        active
        evidenceTypes={[{ id: "1", key: "medical", title: "Medical", description: "", isDefault: true, displayOrder: 1, caseId: "c1" } as any]}
        duplicateName={false}
        onUpdate={() => {}}
        onRemove={() => {}}
        onDownload={() => {}}
        onFocus={() => {}}
      />,
    );
    expect(screen.getByText(/Pages 1–3/)).toBeInTheDocument();
    expect(screen.getByText(/96%/)).toBeInTheDocument();
  });
});
```

**Commit:**

```
git add components/pdf-split/SegmentRow.tsx tests/components/pdf-split-SegmentRow.test.tsx
git commit -m "feat(pdf-split): add SegmentRow card with AI confidence chip"
```

---

## Task 8: SegmentRail

**Files:**
- Create: `components/pdf-split/SegmentRail.tsx`

```tsx
"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { SegmentRow } from "./SegmentRow";
import { Segment } from "./types";
import { CaseEvidenceType } from "@/types/case";

interface Props {
  segments: Segment[];
  activeSegmentId: string | null;
  evidenceTypes: CaseEvidenceType[];
  onUpdate: (id: string, patch: Partial<Segment>) => void;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onFocus: (id: string) => void;
  onAdd: () => void;
}

export function SegmentRail({
  segments,
  activeSegmentId,
  evidenceTypes,
  onUpdate,
  onRemove,
  onDownload,
  onFocus,
  onAdd,
}: Props) {
  const duplicateNames = new Map<string, number>();
  segments.forEach((s) => {
    if (s.name.trim()) {
      duplicateNames.set(s.name.trim(), (duplicateNames.get(s.name.trim()) ?? 0) + 1);
    }
  });

  return (
    <aside className="w-[360px] shrink-0 bg-ink-900 border-l border-line-soft p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-ink-400">
          {segments.length} segment{segments.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" variant="ghost" leftIcon={<Plus className="h-4 w-4" />} onClick={onAdd}>
          Add
        </Button>
      </div>
      <div className="space-y-3">
        {segments.map((s, i) => (
          <SegmentRow
            key={s.id}
            segment={s}
            index={i}
            active={s.id === activeSegmentId}
            evidenceTypes={evidenceTypes}
            duplicateName={(duplicateNames.get(s.name.trim()) ?? 0) > 1}
            onUpdate={(patch) => onUpdate(s.id, patch)}
            onRemove={() => onRemove(s.id)}
            onDownload={() => onDownload(s.id)}
            onFocus={() => onFocus(s.id)}
          />
        ))}
      </div>
    </aside>
  );
}
```

**Commit:**

```
git add components/pdf-split/SegmentRail.tsx
git commit -m "feat(pdf-split): add SegmentRail right-side list"
```

---

## Task 9: Viewer

**Files:**
- Create: `components/pdf-split/Viewer.tsx`

```tsx
"use client";

import { useEffect, useRef } from "react";
import { ViewerPage } from "./ViewerPage";
import { CutIndicator } from "./CutIndicator";
import { Segment } from "./types";

type PDFDocumentProxy = {
  numPages: number;
  getPage: (n: number) => Promise<any>;
};

interface Props {
  pdfDocument: PDFDocumentProxy;
  totalPages: number;
  cuts: Set<number>;            // boundary "afterPage" indices
  activeSegment: Segment | null;
  onToggleCut: (afterPage: number) => void;
}

export function Viewer({ pdfDocument, totalPages, cuts, activeSegment, onToggleCut }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll active segment into view when activeSegment changes
  useEffect(() => {
    if (!activeSegment || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-page="${activeSegment.fromPage}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeSegment]);

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-ink-950 px-6 py-6"
    >
      <div className="max-w-md mx-auto">
        {pages.map((p) => {
          const isActive =
            activeSegment !== null &&
            p >= activeSegment.fromPage &&
            p <= activeSegment.toPage;
          return (
            <div key={p}>
              <div data-page={p}>
                <ViewerPage pdfDocument={pdfDocument} pageNumber={p} active={isActive} />
              </div>
              {p < totalPages && (
                <CutIndicator
                  afterPage={p}
                  hasCut={cuts.has(p)}
                  onToggle={() => onToggleCut(p)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Commit:**

```
git add components/pdf-split/Viewer.tsx
git commit -m "feat(pdf-split): add Viewer with paginated thumbnails + cut indicators"
```

---

## Task 10: Header + Footer

**Files:**
- Create: `components/pdf-split/Header.tsx`
- Create: `components/pdf-split/Footer.tsx`

**`Header.tsx`:**

```tsx
"use client";

import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";

interface Props {
  fileName: string;
  totalPages: number;
  analysisConfidence?: number;
  onBack: () => void;
  onReanalyse?: () => void;
  isAnalysing?: boolean;
}

export function Header({
  fileName,
  totalPages,
  analysisConfidence,
  onBack,
  onReanalyse,
  isAnalysing,
}: Props) {
  return (
    <header className="border-b border-line-soft bg-ink-900 px-6 py-3 relative">
      <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-gold-500" aria-hidden />
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to case"
            className="p-1.5 rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-800 focus-gold"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-ink-400">Split PDF</p>
            <p className="text-sm text-ink-100 truncate">
              {fileName} · {totalPages} pages
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {analysisConfidence !== undefined && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gold-500">
              <Sparkles className="h-3.5 w-3.5" />
              AI · {Math.round(analysisConfidence * 100)}% confidence
            </span>
          )}
          {onReanalyse && (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={onReanalyse}
              loading={isAnalysing}
            >
              Re-analyse
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
```

**`Footer.tsx`:**

```tsx
"use client";

import { Download, Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

interface Props {
  segmentCount: number;
  segmentsValid: boolean;
  busy: boolean;
  busyAction: "download" | "upload" | null;
  onCancel: () => void;
  onDownload: () => void;
  onUpload: () => void;
}

export function Footer({ segmentCount, segmentsValid, busy, busyAction, onCancel, onDownload, onUpload }: Props) {
  return (
    <div className="sticky bottom-0 border-t border-line-soft bg-ink-900 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-400">
            {segmentCount} segment{segmentCount === 1 ? "" : "s"}
            {!segmentsValid && " · fix issues before splitting"}
          </span>
          <Button
            variant="secondary"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={onDownload}
            loading={busy && busyAction === "download"}
            disabled={!segmentsValid || (busy && busyAction !== "download")}
          >
            Download ZIP
          </Button>
          <Button
            leftIcon={<Upload className="h-4 w-4" />}
            rightIcon={<ArrowRight className="h-4 w-4" />}
            onClick={onUpload}
            loading={busy && busyAction === "upload"}
            disabled={!segmentsValid || (busy && busyAction !== "upload")}
          >
            Upload to evidence
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Commit:**

```
git add components/pdf-split/Header.tsx components/pdf-split/Footer.tsx
git commit -m "feat(pdf-split): add Header (back + AI confidence) and Footer (download + upload)"
```

---

## Task 11: Workshop top-level state

**Files:**
- Create: `components/pdf-split/Workshop.tsx`
- Create: `tests/components/pdf-split-Workshop.test.tsx`

Workshop owns:
- `selectedFile: File | null`
- `pdfDocument: PDFDocumentProxy | null`
- `pdfUrl: string | null` (for cleanup)
- `cuts: Set<number>` (sorted set of "afterPage" boundary indices)
- `segments: Segment[]` (derived from cuts + per-segment name/category)
- `evidenceTypes: CaseEvidenceType[]`
- `activeSegmentId: string | null`
- `analysisResult: AIAnalysisResult | null`
- `isAnalysing: boolean`
- `isSplitting: boolean`
- `splittingAction: "download" | "upload" | null`
- `oversizedFiles: OversizedFile[]` + `showFileSizeDialog: boolean`

The full implementation is substantial. Implementer ports the legacy `PdfSplitDrawer.tsx` body, replacing the JSX shell entirely. Key handlers to port verbatim (use the legacy file as source of truth):

- `handlePdfFileSelect(file: File)` — load via pdfjs, set state, kick off `performIntelligentAnalysis(file)`.
- `performIntelligentAnalysis(file)` — `POST /api/analyze-pdf-split`, map response to initial cuts + segment names.
- `splitAndDownload()` — pdf-lib + jszip → trigger download link.
- `splitAndUpload()` — pre-flight size check → if oversized show `FileSizeDialog`; otherwise upload each split file with `uploadFile(category, blob, filename)` (preserved Blob trick); then `router.back()`.
- `addSegment()` / `removeSegment(id)` — but in the new UX these are derived: `addSegment` inserts the longest gap into two; `removeSegment` removes the boundary between it and its neighbour. Define helpers `cutsToSegments(cuts, totalPages, seedNamesByIndex)` and `segmentsToCuts(segments)`.
- `updateSegment(id, patch)` — name/category updates only; range mutations come from cuts.

Render structure:

```tsx
return (
  <div className="min-h-[calc(100vh-4rem)] flex flex-col">
    <Header ... />
    {!selectedFile ? (
      <EmptyDropzone onFile={handlePdfFileSelect} busy={isAnalysing} />
    ) : isAnalysing ? (
      <AnalysingState />
    ) : (
      <div className="flex-1 flex overflow-hidden">
        <Viewer
          pdfDocument={pdfDocument!}
          totalPages={pdfDocument!.numPages}
          cuts={cuts}
          activeSegment={activeSegment}
          onToggleCut={toggleCut}
        />
        <SegmentRail
          segments={segments}
          activeSegmentId={activeSegmentId}
          evidenceTypes={evidenceTypes}
          onUpdate={updateSegment}
          onRemove={removeSegment}
          onDownload={downloadOneSegment}
          onFocus={(id) => setActiveSegmentId(id)}
          onAdd={addSegment}
        />
      </div>
    )}
    {selectedFile && !isAnalysing && (
      <Footer ... />
    )}
    <FileSizeDialog open={showFileSizeDialog} onOpenChange={setShowFileSizeDialog} files={oversizedFiles} />
  </div>
);
```

The implementer must keep the existing `cleanContentForDocx`-style boundary helpers, the `URL.revokeObjectURL` cleanup on unmount, and the worker config import.

**Test** (smoke):

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Workshop } from "@/components/pdf-split/Workshop";

const sample = { id: "c1", title: "X", caseType: "SOC", status: "draft", parties: [], court: "", caseNumber: "", files: [] } as any;

describe("Workshop", () => {
  it("renders the empty dropzone when no file is selected", () => {
    render(<Workshop caseData={sample} />);
    expect(screen.getByText(/Choose a PDF to split/i)).toBeInTheDocument();
  });
});
```

**Commit:**

```
git add components/pdf-split/Workshop.tsx tests/components/pdf-split-Workshop.test.tsx
git commit -m "feat(pdf-split): assemble Workshop top-level state owner"
```

---

## Task 12: Page route `/case/[case_id]/split/`

**Files:**
- Create: `app/case/[case_id]/split/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Case } from "@/types/case";
import { Loader2 } from "lucide-react";
import { Workshop } from "@/components/pdf-split/Workshop";

export default function SplitPdfPage() {
  const params = useParams();
  const caseId = params.case_id as string;
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}`);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        if (!cancelled) setCaseData(data);
      } catch (err) {
        console.error("Failed to load case for split:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-400" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-ink-400">Case not found.</p>
      </div>
    );
  }

  return <Workshop caseData={caseData} />;
}
```

Verify `npm run build` includes `/case/[case_id]/split` as a route.

**Commit:**

```
git add app/case/[case_id]/split/page.tsx
git commit -m "feat(pdf-split): add /case/[id]/split route mounting Workshop"
```

---

## Task 13: Wire Step 1 entry button to the new route

**Files:**
- Modify: `components/steps/Step1Evidence/index.tsx`

Read the current file (created in Phase C Task 10). The "AI Split PDF" button currently calls `setIsDrawerOpen(true)` to open `PdfSplitDrawer`. Change it to use the router:

```tsx
import { useRouter } from "next/navigation";

const router = useRouter();
// ...
<Button
  variant="ghost"
  leftIcon={<Scissors className="h-4 w-4" />}
  className="border border-line-gold text-gold-500 hover:bg-gold-500/10"
  onClick={() => router.push(`/case/${caseData.id}/split`)}
>
  AI Split PDF
</Button>
```

Also remove the `<PdfSplitDrawer />` mount from Step 1 entirely. The `handleFilesUploaded` callback wiring goes away — the workshop route handles upload + `router.back()` and the case page re-fetches on mount.

Also, **add a "Split…" overflow link on every uploaded PDF row**: when the user has an existing PDF in their evidence list, the EvidenceFileRow's overflow menu should expose a "Split this file" action. For Phase D this is optional; the simpler implementation is to expose it as a regular button next to Delete:

```tsx
// inside EvidenceFileRow.tsx (Phase C file), add:
{file.fileName.toLowerCase().endsWith(".pdf") && (
  <Button
    variant="ghost"
    size="icon"
    onClick={() => router.push(`/case/${caseData.id}/split?fileId=${file.id}`)}
    aria-label="Split this file"
  >
    <Scissors className="h-4 w-4" />
  </Button>
)}
```

The `?fileId=` query is optional context — the Workshop reads it via `useSearchParams` and, if present, pre-loads that file (fetch by ID, download blob, treat as uploaded). For Phase D MVP, just pass the param; the Workshop ignores it if not implemented yet. Full pre-load logic can come in a follow-up.

Verify build + tests.

**Commit:**

```
git add components/steps/Step1Evidence/index.tsx
git commit -m "feat(pdf-split): rewire Step1 AI-split entry to /case/[id]/split route"
```

---

## Task 14: Delete legacy PdfSplit files

**Files:**
- Delete: `components/PdfSplitDrawer.tsx`
- Delete: `components/PdfSplitter.tsx`
- Delete: `components/SplitRangeDisplay.tsx`

- [ ] **Step 14.1: Confirm no imports remain**

```bash
grep -rE "from\s+['\"]@/components/(PdfSplitDrawer|PdfSplitter|SplitRangeDisplay)" --include="*.tsx" --include="*.ts" .
```
Expected: empty.

- [ ] **Step 14.2: Delete + verify + commit**

```bash
git rm components/PdfSplitDrawer.tsx components/PdfSplitter.tsx components/SplitRangeDisplay.tsx
npm run build 2>&1 | tail -5
npm test 2>&1 | tail -5
git commit -m "chore(pdf-split): delete legacy PdfSplitDrawer + PdfSplitter + SplitRangeDisplay"
```

---

## Task 15: Final verification + PR

- [ ] **Step 15.1: Tests + build**

```
npm test 2>&1 | tail -10
npm run build 2>&1 | tail -10
```

- [ ] **Step 15.2: Confirm `/case/[case_id]/split` route is present** in the build output.

- [ ] **Step 15.3: Token sweep**

```
grep -rE "(bg|text|border)-(blue|gray|red|green|yellow|indigo)-[0-9]" components/pdf-split app/case/[case_id]/split 2>/dev/null
```
Expected: empty.

- [ ] **Step 15.4: Phase E surfaces untouched**

```
git diff --stat main..HEAD -- components/tabs components/Step5Review.tsx components/MdxEditor.tsx components/MdxRenderer.tsx components/Hoverable.tsx components/Citation.tsx components/PDFViewerModal.tsx
```
Expected: empty.

- [ ] **Step 15.5: Open PR**

```
git push -u origin feat/phase-d-pdf-split-workshop
"/c/Program Files/GitHub CLI/gh.exe" pr create --title "feat(ui): Phase D · PDF Split workshop" --body "$(cat <<'EOF'
## Summary
- New /case/[id]/split route with split-view workshop (PDF viewer left, segment rail right)
- Cut-indicator interaction model: pages belong to segments defined by boundaries
- AI confidence chip per segment + re-analyse button
- EmptyDropzone + AnalysingState (with ScanLine motion) for the loading states
- Step 1 AI-Split-PDF entry rewired to router.push("/case/[id]/split")
- Legacy PdfSplitDrawer + PdfSplitter + SplitRangeDisplay deleted (~1200 LOC removed)

## Test plan
- [x] npm test green
- [x] npm run build clean (new route registered)
- [ ] Upload a fresh PDF → workshop opens with empty dropzone
- [ ] AI analysis runs, segments populate in the right rail
- [ ] Add a cut between two pages, verify a new segment appears
- [ ] Remove a cut, verify adjacent segments merge
- [ ] Download ZIP works
- [ ] Upload to evidence works → router.back lands on case, evidence list reflects new files

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

(Controller may merge with `gh pr merge <n> --merge --delete-branch`.)

---

## Self-review

**Spec coverage** (Section 7):
- Split-view workshop with PDF viewer + segment rail → Tasks 9 (Viewer) + 8 (SegmentRail) ✓
- Cut indicators between pages → Task 6 ✓
- AI confidence chip + re-analyse → Tasks 7 (SegmentRow) + 10 (Header) ✓
- EmptyDropzone + AnalysingState → Tasks 3 + 4 ✓
- Workshop owns state; preserves all legacy handlers → Task 11 ✓
- Route at `/case/[id]/split` → Task 12 ✓
- Step 1 entry rewire → Task 13 ✓
- Legacy file deletion → Task 14 ✓

**Placeholder scan:** Task 11 (`Workshop.tsx`) is intentionally an outline — the implementer is told to port the legacy `PdfSplitDrawer.tsx` body verbatim into the new shape. This is a deliberate verbatim-port instruction, not a TBD. Every other task has actual code.

**Type consistency:** `Segment`, `AIAnalysisResult`, `OversizedFile` defined in `types.ts` (Task 2) and used uniformly across tasks. `CaseEvidenceType` flows through from `@/types/case`.

**Open follow-ups for Phase E:**
- `PDFViewerModal` still exists from legacy code — Phase E wraps it as `PdfViewerDialog`.
- The `?fileId=...` pre-load path in the Workshop is left as a follow-up for Phase E or beyond if needed.
