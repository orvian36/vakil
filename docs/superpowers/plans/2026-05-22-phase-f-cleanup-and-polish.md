# Phase F — Cleanup & Polish · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the LLM-balance verification scaffolding, restore the AI-Split workshop's editable from/to page inputs, land a consistent failure visual on document canvases, and ship three follow-ups from PR #12 — all on one consolidated phase branch.

**Architecture:** Seven work items (F1–F7) on `feat/phase-f-cleanup-and-polish`. Each task is self-contained (TDD where applicable), independently committable. JWT auth (middleware, lib/auth, login/register) is explicitly preserved.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind v4 inline `@theme`, Vitest (node + happy-dom projects), @testing-library/react, framer-motion, Radix UI primitives, lucide-react, pdf-lib + pdfjs-dist, Prisma + SQLite.

**Spec:** `docs/superpowers/specs/2026-05-22-phase-f-cleanup-and-polish-design.md`

---

## Prereqs

- [ ] **Verify branch and clean state**

```bash
git status
git rev-parse --abbrev-ref HEAD
```

Expected: clean working tree, branch is `feat/phase-f-cleanup-and-polish` (already created with the spec commit). If not, switch:

```bash
git checkout feat/phase-f-cleanup-and-polish
```

- [ ] **Confirm baseline tests pass**

```bash
npm test -- --run
```

Expected: 130 tests pass, 63 files. If anything else, stop and reconcile before starting.

---

## F1 — Strip LLM-balance verification

### Task 1.1: Delete the verify-token call sites and the dialog

**Files:**
- Modify: `components/steps/Step1Evidence/index.tsx`
- Modify: `components/steps/Step3Particulars/index.tsx`
- Modify: `components/steps/Step4Chronology/index.tsx`
- Modify: `components/review/ReviewLayout.tsx`
- Delete: `components/modals/InsufficientBalanceDialog.tsx`
- Delete: `tests/components/InsufficientBalanceDialog.test.tsx`

- [ ] **Step 1: Strip verify block from Step1Evidence**

In `components/steps/Step1Evidence/index.tsx`:
- Remove the `InsufficientBalanceDialog` import.
- Remove the `showInsufficientBalanceDialog` state (`useState`) and its setter.
- Remove the entire pre-check block (the `try { const verifyTokenResponse = await fetch("/api/tokens/verify" ... } catch ... }` block — currently ~lines 177–194 starting with `// Pre-check: token balance` and ending before `// Update UI immediately`).
- Remove the `<InsufficientBalanceDialog .../>` element from the JSX tree.

- [ ] **Step 2: Strip verify block from Step3Particulars**

In `components/steps/Step3Particulars/index.tsx`:
- Remove the `InsufficientBalanceDialog` import.
- Remove the `showInsufficientBalanceDialog` state and setter.
- Remove the `try { const verifyTokenResponse = await fetch("/api/tokens/verify" ... if (!result.is_enough_balance) { setShowInsufficientBalanceDialog(true); return; } }` block at the top of `generateParticulars` (~lines 73–82).
- Remove the `<InsufficientBalanceDialog .../>` element.

- [ ] **Step 3: Strip verify block from Step4Chronology**

In `components/steps/Step4Chronology/index.tsx`:
- Same three removals as Step3, applied to the chronology equivalents (around lines 73–82 of `generateChronology`).

- [ ] **Step 4: Strip verify block from ReviewLayout**

In `components/review/ReviewLayout.tsx`:
- Remove the `InsufficientBalanceDialog` import.
- Remove the `showInsufficientBalanceDialog` state and setter.
- Remove the verify-token block at the top of `generateContent` (~lines 178–187).
- Remove the `<InsufficientBalanceDialog ... />` from the JSX tail.

- [ ] **Step 5: Delete the dialog component and its test**

```bash
rm components/modals/InsufficientBalanceDialog.tsx
rm tests/components/InsufficientBalanceDialog.test.tsx
```

- [ ] **Step 6: Run the full test suite to surface broken mocks**

```bash
npm test -- --run
```

Expected: tests that previously mocked `/api/tokens/verify` as a fixture may now fail differently (the first network call is now to `/api/generate/...`). Fix each by adding the missing mock for the actual generate endpoint, or removing the verify mock if it was the only setup needed.

- [ ] **Step 7: Strip the deduct call from analyze-pdf-split**

In `app/api/analyze-pdf-split/route.ts` find the block calling `${supabaseUrl}/api/tokens/deduct` (search for `tokens/deduct`) and delete the entire fetch + error-handling block. The route still returns its analysis result; nothing else depends on the deduct succeeding.

- [ ] **Step 8: Strip the deduct call from pdfAnalysisService**

In `services/pdfAnalysisService.ts` find the same `tokens/deduct` block and delete it identically.

- [ ] **Step 9: Run tests again**

```bash
npm test -- --run
```

Expected: all tests pass. Test count drops by ~2 (deleted dialog test).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(billing): strip LLM-balance verification across the app

Removes the four frontend pre-check calls to /api/tokens/verify
(Step1Evidence, Step3Particulars, Step4Chronology, ReviewLayout), the
matching is_enough_balance branches, the InsufficientBalanceDialog and
its test, and the /api/tokens/deduct calls from analyze-pdf-split and
pdfAnalysisService. JWT auth is untouched.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## F2 — Restore editable from/to page inputs

### Task 2.1: Pure helper — applyPageRangeEdit

**Files:**
- Create: `lib/pdf-split/cutsFromPageRange.ts`
- Test: `tests/lib/pdf-split/cutsFromPageRange.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/pdf-split/cutsFromPageRange.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { applyPageRangeEdit } from "@/lib/pdf-split/cutsFromPageRange";
import type { Segment } from "@/components/pdf-split/types";

function seg(id: string, fromPage: number, toPage: number, extras: Partial<Segment> = {}): Segment {
  return { id, fromPage, toPage, name: "", category: "", ...extras };
}

describe("applyPageRangeEdit", () => {
  const totalPages = 10;

  it("edits the 'to' page and shifts the next segment's 'from'", () => {
    const segments: Segment[] = [seg("a", 1, 3), seg("b", 4, 7), seg("c", 8, 10)];
    const cuts = new Set<number>([3, 7]);
    const result = applyPageRangeEdit(segments, cuts, "a", 1, 5, totalPages);
    expect(result.error).toBeUndefined();
    expect(Array.from(result.cuts).sort((x, y) => x - y)).toEqual([5, 7]);
    expect(result.segments).toEqual([
      expect.objectContaining({ id: "a", fromPage: 1, toPage: 5 }),
      expect.objectContaining({ fromPage: 6, toPage: 7 }),
      expect.objectContaining({ fromPage: 8, toPage: 10 }),
    ]);
  });

  it("edits the 'from' page and shifts the prior segment's 'to'", () => {
    const segments: Segment[] = [seg("a", 1, 3), seg("b", 4, 7), seg("c", 8, 10)];
    const cuts = new Set<number>([3, 7]);
    const result = applyPageRangeEdit(segments, cuts, "b", 5, 7, totalPages);
    expect(result.error).toBeUndefined();
    expect(Array.from(result.cuts).sort((x, y) => x - y)).toEqual([4, 7]);
  });

  it("rejects from > to", () => {
    const segments: Segment[] = [seg("a", 1, 10)];
    const cuts = new Set<number>();
    const result = applyPageRangeEdit(segments, cuts, "a", 5, 3, totalPages);
    expect(result.error).toMatch(/from.*greater.*to/i);
    expect(Array.from(result.cuts)).toEqual([]);
  });

  it("rejects from < 1", () => {
    const segments: Segment[] = [seg("a", 1, 10)];
    const cuts = new Set<number>();
    const result = applyPageRangeEdit(segments, cuts, "a", 0, 10, totalPages);
    expect(result.error).toMatch(/at least 1/i);
  });

  it("rejects to > totalPages", () => {
    const segments: Segment[] = [seg("a", 1, 10)];
    const cuts = new Set<number>();
    const result = applyPageRangeEdit(segments, cuts, "a", 1, 11, totalPages);
    expect(result.error).toMatch(/exceed.*10/i);
  });

  it("rejects collision with prior segment", () => {
    // Editing 'b' from=4→3 would collide with 'a' which already ends at 3
    const segments: Segment[] = [seg("a", 1, 3), seg("b", 4, 7)];
    const cuts = new Set<number>([3]);
    const result = applyPageRangeEdit(segments, cuts, "b", 3, 7, totalPages);
    expect(result.error).toMatch(/overlap|prior|previous/i);
  });

  it("preserves names + categories on adjacent segments", () => {
    const segments: Segment[] = [
      seg("a", 1, 3, { name: "Cover", category: "k1" }),
      seg("b", 4, 7, { name: "Body",  category: "k2" }),
    ];
    const cuts = new Set<number>([3]);
    const result = applyPageRangeEdit(segments, cuts, "a", 1, 5, totalPages);
    expect(result.error).toBeUndefined();
    expect(result.segments[0].name).toBe("Cover");
    expect(result.segments[0].category).toBe("k1");
    expect(result.segments[1].name).toBe("Body");
    expect(result.segments[1].category).toBe("k2");
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- --run tests/lib/pdf-split/cutsFromPageRange.test.ts
```

Expected: import resolution fails or "applyPageRangeEdit is not a function".

- [ ] **Step 3: Implement the helper**

Create `lib/pdf-split/cutsFromPageRange.ts`:

```typescript
import type { Segment } from "@/components/pdf-split/types";

export interface PageRangeEditResult {
  cuts: Set<number>;
  segments: Segment[];
  error?: string;
}

/**
 * Apply an edit to a segment's from/to page range, returning a new cuts set and
 * recomputed segments. Returns an error string if the edit is invalid; the
 * original cuts/segments are returned unchanged in that case.
 */
export function applyPageRangeEdit(
  segments: Segment[],
  cuts: Set<number>,
  segmentId: string,
  newFromPage: number,
  newToPage: number,
  totalPages: number,
): PageRangeEditResult {
  if (!Number.isInteger(newFromPage) || !Number.isInteger(newToPage)) {
    return { cuts, segments, error: "Page numbers must be whole numbers." };
  }
  if (newFromPage < 1) {
    return { cuts, segments, error: "Page must be at least 1." };
  }
  if (newToPage > totalPages) {
    return { cuts, segments, error: `Page cannot exceed ${totalPages}.` };
  }
  if (newFromPage > newToPage) {
    return { cuts, segments, error: "'From' page cannot be greater than 'To' page." };
  }

  const index = segments.findIndex((s) => s.id === segmentId);
  if (index < 0) return { cuts, segments, error: "Segment not found." };

  const target = segments[index];
  const prior = index > 0 ? segments[index - 1] : null;
  const next = index < segments.length - 1 ? segments[index + 1] : null;

  if (prior && newFromPage <= prior.fromPage) {
    return {
      cuts,
      segments,
      error: "Range would overlap the previous segment.",
    };
  }
  if (next && newToPage >= next.toPage) {
    return {
      cuts,
      segments,
      error: "Range would overlap the next segment.",
    };
  }

  // Compute the new cut set.
  // A segment spans (cuts[i-1] + 1) .. cuts[i]. Editing fromPage replaces
  // cuts[i-1] with newFromPage - 1; editing toPage replaces cuts[i] with newToPage.
  const nextCuts = new Set(cuts);
  if (prior) {
    nextCuts.delete(prior.toPage);
    nextCuts.add(newFromPage - 1);
  }
  if (next) {
    nextCuts.delete(target.toPage);
    nextCuts.add(newToPage);
  }

  // Recompute segments from cuts, preserving carry-over metadata by id where the range matches.
  const sortedCuts = Array.from(nextCuts).sort((a, b) => a - b);
  const boundaries = [0, ...sortedCuts, totalPages];
  const out: Segment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const fromPage = boundaries[i] + 1;
    const toPage = boundaries[i + 1];
    if (fromPage > toPage) continue;
    // Match by overlap with prior segments to preserve name/category/aiConfidence.
    const carry =
      segments.find((s) => s.fromPage <= fromPage && s.toPage >= toPage) ??
      segments.find((s) => s.fromPage === fromPage) ??
      null;
    out.push({
      id: carry?.id ?? `seg-${fromPage}-${toPage}`,
      fromPage,
      toPage,
      name: carry?.name ?? "",
      category: carry?.category ?? "",
      aiConfidence: carry?.aiConfidence,
    });
  }
  return { cuts: nextCuts, segments: out };
}
```

- [ ] **Step 4: Run test, expect PASS**

```bash
npm test -- --run tests/lib/pdf-split/cutsFromPageRange.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/pdf-split/cutsFromPageRange.ts tests/lib/pdf-split/cutsFromPageRange.test.ts
git commit -m "$(cat <<'EOF'
feat(pdf-split): applyPageRangeEdit helper for editable segment ranges

Pure function that takes a from/to edit on a single segment and returns
the recomputed cuts + segments (or an error). Preserves names and
categories across the recomputation.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 2.2: Wire editable inputs into SegmentRow + Workshop

**Files:**
- Modify: `components/pdf-split/SegmentRow.tsx`
- Modify: `components/pdf-split/Workshop.tsx`
- Test: `tests/components/pdf-split/SegmentRow.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/pdf-split/SegmentRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SegmentRow } from "@/components/pdf-split/SegmentRow";
import type { Segment } from "@/components/pdf-split/types";

const segment: Segment = {
  id: "s1",
  fromPage: 2,
  toPage: 5,
  name: "",
  category: "",
};

describe("SegmentRow editable page range", () => {
  it("renders from and to inputs prefilled with the page range", () => {
    render(
      <SegmentRow
        segment={segment}
        index={0}
        active={false}
        evidenceTypes={[]}
        duplicateName={false}
        onUpdate={() => {}}
        onPageRangeChange={() => {}}
        onRemove={() => {}}
        onDownload={() => {}}
        onFocus={() => {}}
      />,
    );
    const fromInput = screen.getByLabelText(/from page/i) as HTMLInputElement;
    const toInput = screen.getByLabelText(/to page/i) as HTMLInputElement;
    expect(fromInput.value).toBe("2");
    expect(toInput.value).toBe("5");
  });

  it("fires onPageRangeChange when from changes", () => {
    const onPageRangeChange = vi.fn();
    render(
      <SegmentRow
        segment={segment}
        index={0}
        active={false}
        evidenceTypes={[]}
        duplicateName={false}
        onUpdate={() => {}}
        onPageRangeChange={onPageRangeChange}
        onRemove={() => {}}
        onDownload={() => {}}
        onFocus={() => {}}
      />,
    );
    const fromInput = screen.getByLabelText(/from page/i);
    fireEvent.change(fromInput, { target: { value: "1" } });
    fireEvent.blur(fromInput);
    expect(onPageRangeChange).toHaveBeenCalledWith(1, 5);
  });

  it("displays an inline error when rangeError is set", () => {
    render(
      <SegmentRow
        segment={segment}
        index={0}
        active={false}
        evidenceTypes={[]}
        duplicateName={false}
        rangeError="From must be at least 1."
        onUpdate={() => {}}
        onPageRangeChange={() => {}}
        onRemove={() => {}}
        onDownload={() => {}}
        onFocus={() => {}}
      />,
    );
    expect(screen.getByText(/From must be at least 1/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- --run tests/components/pdf-split/SegmentRow.test.tsx
```

Expected: "onPageRangeChange is not a prop" / labels not found.

- [ ] **Step 3: Update SegmentRow**

Rewrite `components/pdf-split/SegmentRow.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
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
} from "@/components/ui";
import { CaseEvidenceType } from "@/types/case";
import { Segment } from "./types";

interface Props {
  segment: Segment;
  index: number;
  active: boolean;
  evidenceTypes: CaseEvidenceType[];
  duplicateName: boolean;
  rangeError?: string;
  onUpdate: (patch: Partial<Segment>) => void;
  onPageRangeChange: (fromPage: number, toPage: number) => void;
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
  rangeError,
  onUpdate,
  onPageRangeChange,
  onRemove,
  onDownload,
  onFocus,
}: Props) {
  // Local draft state for the page inputs so users can type freely without
  // every keystroke firing a recompute. Commit on blur or Enter.
  const [fromDraft, setFromDraft] = useState(String(segment.fromPage));
  const [toDraft, setToDraft] = useState(String(segment.toPage));

  useEffect(() => {
    setFromDraft(String(segment.fromPage));
    setToDraft(String(segment.toPage));
  }, [segment.fromPage, segment.toPage]);

  const commitRange = (from: string, to: string) => {
    const f = Number.parseInt(from, 10);
    const t = Number.parseInt(to, 10);
    if (!Number.isFinite(f) || !Number.isFinite(t)) return;
    if (f === segment.fromPage && t === segment.toPage) return;
    onPageRangeChange(f, t);
  };

  return (
    <Card
      variant={active ? "gold-accent" : "chrome"}
      className="cursor-pointer space-y-3"
      onClick={onFocus}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-ink-400">
            Segment {index + 1}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {segment.aiConfidence !== undefined && (
            <span className="inline-flex items-center gap-1 text-xs text-gold-500">
              <Sparkles className="h-3 w-3" />
              {Math.round(segment.aiConfidence * 100)}%
            </span>
          )}
          <Button
            size="icon"
            variant="ghost"
            aria-label="Segment actions"
            onClick={(e) => e.stopPropagation()}
          >
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

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">
              From page
            </label>
            <Input
              type="number"
              min={1}
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              onBlur={() => commitRange(fromDraft, toDraft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              aria-label="From page"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">
              To page
            </label>
            <Input
              type="number"
              min={1}
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              onBlur={() => commitRange(fromDraft, toDraft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              aria-label="To page"
            />
          </div>
        </div>
        {rangeError && (
          <p className="text-xs text-rose-500">{rangeError}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
        >
          Download
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          Remove
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

```bash
npm test -- --run tests/components/pdf-split/SegmentRow.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Wire Workshop to use the helper**

Open `components/pdf-split/Workshop.tsx`:

1. Add the import at the top:

```typescript
import { applyPageRangeEdit } from "@/lib/pdf-split/cutsFromPageRange";
```

2. Add `rangeErrors` state right next to `activeSegmentId`:

```typescript
const [rangeErrors, setRangeErrors] = useState<Record<string, string>>({});
```

3. Add the handler near `updateSegment`:

```typescript
const handlePageRangeChange = useCallback(
  (segmentId: string, fromPage: number, toPage: number) => {
    if (!pdfDocument) return;
    const result = applyPageRangeEdit(
      segments,
      cuts,
      segmentId,
      fromPage,
      toPage,
      pdfDocument.numPages,
    );
    if (result.error) {
      setRangeErrors((prev) => ({ ...prev, [segmentId]: result.error! }));
      return;
    }
    setRangeErrors((prev) => {
      const next = { ...prev };
      delete next[segmentId];
      return next;
    });
    setCuts(result.cuts);
    setSegments(result.segments);
  },
  [pdfDocument, segments, cuts],
);
```

4. Find the `<SegmentRail>` usage and propagate. In `SegmentRail.tsx`, props need `onPageRangeChange` + `rangeErrors`. Open `components/pdf-split/SegmentRail.tsx` and add to props + pass to each `<SegmentRow>`:

```tsx
// SegmentRail.tsx — add to Props
onPageRangeChange: (segmentId: string, fromPage: number, toPage: number) => void;
rangeErrors: Record<string, string>;

// Then in the rendered SegmentRow:
<SegmentRow
  ...
  onPageRangeChange={(from, to) => onPageRangeChange(s.id, from, to)}
  rangeError={rangeErrors[s.id]}
/>
```

5. Back in `Workshop.tsx` pass them to SegmentRail:

```tsx
<SegmentRail
  ...existing props
  onPageRangeChange={handlePageRangeChange}
  rangeErrors={rangeErrors}
/>
```

- [ ] **Step 6: Run all pdf-split tests**

```bash
npm test -- --run tests/components/pdf-split/
```

Expected: all pass. If a SegmentRail test exists and now fails for missing props, add the props to its render call.

- [ ] **Step 7: Run full suite**

```bash
npm test -- --run
```

Expected: green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(pdf-split): restore editable from/to page inputs in segment cards

Each SegmentRow now exposes two number inputs (From / To). Edits commit
on blur or Enter and round-trip through the cut-boundary model via
applyPageRangeEdit, keeping the viewer in sync. Invalid edits surface an
inline error and do not mutate state.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## F3 — Collapsible step rail

### Task 3.1: Add collapse state + chevron + icon-only StepRailItem

**Files:**
- Modify: `components/wizard/StepRail.tsx`
- Modify: `components/wizard/StepRailItem.tsx`
- Test: `tests/components/StepRail.collapsed.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/StepRail.collapsed.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepRail } from "@/components/wizard/StepRail";

const steps = [
  { number: 1, title: "Evidence" },
  { number: 2, title: "Process" },
  { number: 3, title: "Particulars" },
];

describe("StepRail collapse", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the collapse toggle button", () => {
    render(<StepRail steps={steps} currentStep={1} onStepClick={() => {}} />);
    expect(
      screen.getByRole("button", { name: /collapse steps/i }),
    ).toBeInTheDocument();
  });

  it("clicking the toggle hides step titles", () => {
    render(<StepRail steps={steps} currentStep={1} onStepClick={() => {}} />);
    expect(screen.getByText("Evidence")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /collapse steps/i }));
    expect(screen.queryByText("Evidence")).not.toBeInTheDocument();
    // Reverse label now shown
    expect(
      screen.getByRole("button", { name: /expand steps/i }),
    ).toBeInTheDocument();
  });

  it("persists collapsed state to localStorage", () => {
    const { unmount } = render(
      <StepRail steps={steps} currentStep={1} onStepClick={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /collapse steps/i }));
    expect(localStorage.getItem("vakil_step_rail_collapsed")).toBe("true");
    unmount();

    render(<StepRail steps={steps} currentStep={1} onStepClick={() => {}} />);
    // Restored collapsed: titles hidden
    expect(screen.queryByText("Evidence")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- --run tests/components/StepRail.collapsed.test.tsx
```

- [ ] **Step 3: Update StepRail**

Rewrite `components/wizard/StepRail.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { StepRailItem, type RailStep } from "./StepRailItem";

const STORAGE_KEY = "vakil_step_rail_collapsed";

interface StepRailProps {
  steps: RailStep[];
  currentStep: number;
  onStepClick: (n: number) => void;
  disabled?: boolean;
}

export function StepRail({ steps, currentStep, onStepClick, disabled }: StepRailProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  };

  return (
    <nav
      aria-label="Wizard steps"
      className={cn(
        "shrink-0 bg-ink-900 border-r border-line-soft p-3 self-stretch transition-[width] duration-200",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand steps" : "Collapse steps"}
          className="grid place-items-center h-7 w-7 rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-800 focus-gold"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
      <ul className="space-y-1">
        {steps.map((s) => {
          const state: "upcoming" | "current" | "complete" =
            s.number < currentStep ? "complete" : s.number === currentStep ? "current" : "upcoming";
          return (
            <li key={s.number}>
              <StepRailItem
                step={s}
                state={state}
                disabled={Boolean(disabled)}
                collapsed={collapsed}
                onClick={() => onStepClick(s.number)}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 4: Update StepRailItem to support collapsed**

Rewrite `components/wizard/StepRailItem.tsx`:

```tsx
"use client";

import { Check } from "lucide-react";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";

export interface RailStep {
  number: number;
  title: string;
  meta?: string;
}

interface ItemProps {
  step: RailStep;
  state: "upcoming" | "current" | "complete";
  disabled: boolean;
  collapsed?: boolean;
  onClick: () => void;
}

export function StepRailItem({ step, state, disabled, collapsed, onClick }: ItemProps) {
  const clickable = state === "complete" && !disabled;
  const Wrapper = clickable ? "button" : "div";

  const circle = (
    <span
      aria-hidden
      className={cn(
        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-medium",
        state === "complete" && "bg-gold-500 text-ink-950",
        state === "current" && "bg-ink-700 border border-gold-500 text-ink-100",
        state === "upcoming" && "bg-ink-700 border border-line-soft text-ink-400",
      )}
    >
      {state === "complete" ? <Check className="h-3 w-3" /> : step.number}
    </span>
  );

  const body = (
    <Wrapper
      type={clickable ? "button" : undefined}
      onClick={clickable ? onClick : undefined}
      aria-current={state === "current" ? "step" : undefined}
      disabled={!clickable}
      className={cn(
        "relative w-full text-left flex items-start gap-3 py-3 rounded-[var(--radius-md)] transition-colors",
        collapsed ? "px-2 justify-center" : "px-4",
        state === "current" && "bg-ink-800",
        clickable && "hover:bg-ink-800/60 cursor-pointer",
      )}
    >
      {state === "current" && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gold-500"
        />
      )}
      {circle}
      {!collapsed && (
        <span className="min-w-0">
          <span
            className={cn(
              "block text-sm font-medium",
              state === "current" ? "text-ink-100" : "text-ink-300",
            )}
          >
            {step.title}
          </span>
          {step.meta && (
            <span className="block text-xs text-ink-400 mt-0.5">{step.meta}</span>
          )}
        </span>
      )}
    </Wrapper>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>{body}</TooltipTrigger>
          <TooltipContent side="right">{step.title}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return body;
}
```

- [ ] **Step 5: Run test, expect PASS**

```bash
npm test -- --run tests/components/StepRail.collapsed.test.tsx
```

Expected: 3 tests pass. If the existing StepRail test breaks because the chevron button changes structure, update it.

- [ ] **Step 6: Run full suite**

```bash
npm test -- --run
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(wizard): collapsible step rail with persisted state

Chevron toggle at the top of the rail collapses to ~56px showing only
the numbered/checked circles with tooltips on hover. State persists to
localStorage. Width animates over 200ms; existing MotionConfig respects
prefers-reduced-motion.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## F4 — ErrorState primitive + apply

### Task 4.1: ErrorState primitive

**Files:**
- Create: `components/ui/ErrorState.tsx`
- Modify: `components/ui/index.ts`
- Test: `tests/components/ErrorState.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/ErrorState.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "@/components/ui/ErrorState";

describe("ErrorState", () => {
  it("renders title and message", () => {
    render(<ErrorState title="Boom" message="It went wrong." />);
    expect(screen.getByText("Boom")).toBeInTheDocument();
    expect(screen.getByText("It went wrong.")).toBeInTheDocument();
  });

  it("renders default title when not provided", () => {
    render(<ErrorState message="x" />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("fires onRetry when the Retry button is clicked", async () => {
    const u = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState message="x" onRetry={onRetry} />);
    await u.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("paper variant uses paper-aware text classes", () => {
    const { container } = render(
      <ErrorState message="x" variant="paper" />,
    );
    expect(container.innerHTML).toMatch(/text-paper-ink/);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- --run tests/components/ErrorState.test.tsx
```

- [ ] **Step 3: Implement ErrorState**

Create `components/ui/ErrorState.tsx`:

```tsx
import * as React from "react";
import { AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: "ink" | "paper";
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Retry",
  variant = "ink",
  className,
  ...rest
}: ErrorStateProps) {
  const headingClass =
    variant === "paper" ? "text-paper-ink" : "text-ink-100";
  const bodyClass =
    variant === "paper" ? "text-paper-ink/70" : "text-ink-400";

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center py-10",
        className,
      )}
      {...rest}
    >
      <div className="mb-4 text-rose-500" aria-hidden>
        <AlertOctagon className="h-10 w-10" />
      </div>
      <h3 className={cn("text-lg font-display mb-1", headingClass)}>{title}</h3>
      {message && (
        <p className={cn("text-sm max-w-md", bodyClass)}>{message}</p>
      )}
      {onRetry && (
        <div className="mt-5">
          <Button onClick={onRetry}>{retryLabel}</Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Export from ui/index.ts**

Append to `components/ui/index.ts`:

```typescript
export { ErrorState } from "./ErrorState";
export type { ErrorStateProps } from "./ErrorState";
```

- [ ] **Step 5: Run test, expect PASS**

```bash
npm test -- --run tests/components/ErrorState.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add components/ui/ErrorState.tsx components/ui/index.ts tests/components/ErrorState.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): ErrorState primitive (ink + paper variants)

Centered alert icon + headline + body + optional Retry button.
Paper variant uses text-paper-ink tokens for cream surfaces.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 4.2: Apply ErrorState in Step3Particulars

**Files:**
- Modify: `components/steps/Step3Particulars/index.tsx`

- [ ] **Step 1: Replace the rose banner + empty state with ErrorState**

In `components/steps/Step3Particulars/index.tsx`:

1. Add to the imports (next to other ui imports):

```typescript
import { ErrorState } from "@/components/ui";
```

2. Remove `FileText` from the lucide-react import if it's not used elsewhere in the file (it was only used in the empty state). Verify by searching the file for `FileText`.

3. Delete the entire `errorMessage && (...)` block above the Card (~lines 224–239).

4. Replace the Card body's current empty-state branch with an `ErrorState` when there is an error, else keep the existing empty state. The Card block becomes:

```tsx
<Card variant="cream-paper" className="px-10 py-12 max-w-3xl mx-auto">
  {isEditing ? (
    <MdxEditorComponent
      initialMarkdown={particularsContent}
      onChange={setParticularsContent}
      className="mb-2"
    />
  ) : errorMessage ? (
    <ErrorState
      variant="paper"
      title="Particulars failed"
      message={errorMessage}
      onRetry={() => {
        setErrorMessage(null);
        generateParticulars();
      }}
    />
  ) : particularsContent ? (
    <MdxRenderer source={particularsContent} components={{ Citation }} />
  ) : (
    <ErrorState
      variant="paper"
      title="No particulars yet"
      message="Click Regenerate to draft particulars from your evidence."
    />
  )}
</Card>
```

5. Remove the now-unused `Button` import line if Button is no longer used in this file (it was only used in the deleted banner). Re-check imports after the edit.

- [ ] **Step 2: Run the Step3 tests if they exist**

```bash
npm test -- --run tests/components/Step3
```

Update tests that asserted the old rose-banner copy to look for the new ErrorState rendering. If a test expected "Retry" button, that still works. If a test expected the rose banner div by class, switch to `getByRole("alert")` or text query.

- [ ] **Step 3: Run full suite**

```bash
npm test -- --run
```

- [ ] **Step 4: Commit**

```bash
git add components/steps/Step3Particulars/index.tsx
git commit -m "$(cat <<'EOF'
feat(step3): use ErrorState primitive inside the cream-paper card

Replaces the rose error banner + FileText empty-state with a centered
ErrorState rendered inside the same cream-paper canvas. Keeps the canvas
surface consistent across loading / success / failure / empty states.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 4.3: Apply ErrorState in Step4Chronology

**Files:**
- Modify: `components/steps/Step4Chronology/index.tsx`

- [ ] **Step 1: Same edits, applied to Step4**

Make the identical changes from Task 4.2, adapted to the chronology terms:
- Add `import { ErrorState } from "@/components/ui";`.
- Delete the `errorMessage && (...)` banner block above the Card.
- Replace the Card body's branches to match Task 4.2 with `chronologyContent`, `setChronologyContent`, `generateChronology`, "Chronology failed", "No chronology yet", "Click Regenerate to draft chronology from your evidence."

- [ ] **Step 2: Run tests + commit**

```bash
npm test -- --run
git add components/steps/Step4Chronology/index.tsx
git commit -m "$(cat <<'EOF'
feat(step4): use ErrorState primitive inside the cream-paper card

Mirrors the Step3 change: error and empty branches render an ErrorState
inside the cream-paper Card, keeping the canvas surface consistent.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 4.4: Apply ErrorState in ReviewLayout

**Files:**
- Modify: `components/review/ReviewLayout.tsx`

- [ ] **Step 1: Surface ErrorState when active tab content is empty after a failure**

In `components/review/ReviewLayout.tsx`:

1. Add to the imports:

```typescript
import { ErrorState } from "@/components/ui";
```

2. Replace the `renderActiveTab()` function — wrap each tab render so that if the document has no content AND `error || statuses[activeId] === "failed"`, we render an `ErrorState` inside the canvas instead of the empty tab. Replace the function body with:

```tsx
const renderActiveTab = () => {
  const key = CONTENT_KEY_BY_DOC[activeId];
  const content = generatedContent[key] ?? "";
  const failed = statuses[activeId] === "failed";

  if (!content && (failed || error)) {
    return (
      <ErrorState
        variant="paper"
        title="Document failed to generate"
        message={error ?? "We could not draft this document. Try regenerating."}
        onRetry={handleRetryGeneration}
      />
    );
  }

  const props = {
    caseId,
    caseData,
    isGenerating: false,
  };
  switch (activeId) {
    case "writ-of-summons":
      return <WritOfSummonsTab {...props} content={generatedContent.writOfSummons || ""} />;
    case "statement-of-claim":
      return <StatementOfClaimTab {...props} content={generatedContent.statementOfClaim || ""} />;
    case "statement-of-damages":
      return (
        <StatementOfDamagesTab {...props} content={generatedContent.statementOfDamages || ""} />
      );
    case "pre-action-letter":
      return <PreActionLetterTab {...props} content={generatedContent.preActionLetter || ""} />;
    case "witness-statement":
      return (
        <WitnessStatementTab
          {...props}
          content={generatedContent.witnessStatement || ""}
          bengaliContent={generatedContent.witnessStatementBengali || ""}
          bengaliMode={bengaliMode}
        />
      );
  }
};
```

(The `ErrorDialog` modal mount stays in place; it surfaces the message instantly during a streaming failure. The canvas ErrorState handles the persistent post-failure visual.)

- [ ] **Step 2: Run tests + commit**

```bash
npm test -- --run
git add components/review/ReviewLayout.tsx
git commit -m "$(cat <<'EOF'
feat(review): render ErrorState in the canvas when a document fails

When the orchestration finishes with an error and the active document's
content is empty, the PaperCanvas now shows an ErrorState with a Retry
control instead of an empty MdxRenderer. The ErrorDialog modal still
covers the mid-stream failure case.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## F5 — Inline edit affordance for custom evidence types

### Task 5.1: Pencil button + inline edit in EvidenceTypeCard

**Files:**
- Modify: `components/steps/Step1Evidence/EvidenceTypeCard.tsx`
- Modify: `components/steps/Step1Evidence/index.tsx`
- Test: `tests/components/EvidenceTypeCard.edit.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/EvidenceTypeCard.edit.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EvidenceTypeCard } from "@/components/steps/Step1Evidence/EvidenceTypeCard";
import type { CaseEvidenceType } from "@/types/case";

const customType: CaseEvidenceType = {
  id: "et-1",
  caseId: "c-1",
  key: "custom-1",
  title: "Witness audio",
  description: "Audio recordings",
  isDefault: false,
  displayOrder: 11,
};

const defaultType: CaseEvidenceType = {
  ...customType,
  id: "et-d",
  isDefault: true,
  key: "medical_records",
  title: "Medical Records",
};

const baseProps = {
  files: [],
  uploading: false,
  expanded: true,
  onToggle: () => {},
  onUpload: () => {},
  onDelete: async () => {},
};

describe("EvidenceTypeCard inline edit", () => {
  it("does not render the pencil button for default types", () => {
    render(
      <EvidenceTypeCard {...baseProps} type={defaultType} onRename={() => Promise.resolve()} />,
    );
    expect(screen.queryByRole("button", { name: /edit type/i })).not.toBeInTheDocument();
  });

  it("renders the pencil button for custom types", () => {
    render(
      <EvidenceTypeCard {...baseProps} type={customType} onRename={() => Promise.resolve()} />,
    );
    expect(screen.getByRole("button", { name: /edit type/i })).toBeInTheDocument();
  });

  it("swaps title to an input when pencil is clicked", async () => {
    const u = userEvent.setup();
    render(
      <EvidenceTypeCard {...baseProps} type={customType} onRename={() => Promise.resolve()} />,
    );
    await u.click(screen.getByRole("button", { name: /edit type/i }));
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it("calls onRename on Save", async () => {
    const u = userEvent.setup();
    const onRename = vi.fn().mockResolvedValue(undefined);
    render(
      <EvidenceTypeCard {...baseProps} type={customType} onRename={onRename} />,
    );
    await u.click(screen.getByRole("button", { name: /edit type/i }));
    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "New title" } });
    await u.click(screen.getByRole("button", { name: /^save$/i }));
    expect(onRename).toHaveBeenCalledWith("et-1", "New title", "Audio recordings");
  });

  it("reverts on Cancel", async () => {
    const u = userEvent.setup();
    render(
      <EvidenceTypeCard {...baseProps} type={customType} onRename={() => Promise.resolve()} />,
    );
    await u.click(screen.getByRole("button", { name: /edit type/i }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "DRAFT" } });
    await u.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
    expect(screen.getByText("Witness audio")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- --run tests/components/EvidenceTypeCard.edit.test.tsx
```

- [ ] **Step 3: Update EvidenceTypeCard**

Rewrite `components/steps/Step1Evidence/EvidenceTypeCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { CaseFile, CaseEvidenceType } from "@/types/case";
import { cn } from "@/lib/utils/cn";
import { EvidenceDropzone } from "./EvidenceDropzone";
import { EvidenceFileRow } from "./EvidenceFileRow";

interface Props {
  type: CaseEvidenceType;
  files: CaseFile[];
  uploading: boolean;
  expanded: boolean;
  showSuccess?: boolean;
  onToggle: () => void;
  onUpload: (files: File[]) => void;
  onDelete: (fileId: string) => Promise<void>;
  onRename?: (typeId: string, title: string, description: string) => Promise<void>;
}

export function EvidenceTypeCard({
  type,
  files,
  uploading,
  expanded,
  showSuccess,
  onToggle,
  onUpload,
  onDelete,
  onRename,
}: Props) {
  const count = files.length;
  const canEdit = !type.isDefault && Boolean(onRename);

  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(type.title ?? "");
  const [descDraft, setDescDraft] = useState(type.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTitleDraft(type.title ?? "");
    setDescDraft(type.description ?? "");
    setSaveError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setSaveError(null);
  };

  const save = async () => {
    if (!onRename) return;
    if (!titleDraft.trim()) {
      setSaveError("Title is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onRename(type.id, titleDraft.trim(), descDraft.trim());
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      variant={expanded ? "chrome-raised" : "chrome"}
      className={cn(expanded && "md:col-span-2 lg:col-span-3")}
    >
      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-start justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            {editing ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <div>
                  <label htmlFor={`et-title-${type.id}`} className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">
                    Title
                  </label>
                  <Input
                    id={`et-title-${type.id}`}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        save();
                      } else if (e.key === "Escape") {
                        cancel();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor={`et-desc-${type.id}`} className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">
                    Description
                  </label>
                  <Textarea
                    id={`et-desc-${type.id}`}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancel();
                    }}
                    rows={2}
                  />
                </div>
                {saveError && (
                  <p className="text-xs text-rose-500">{saveError}</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={save} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-medium text-ink-100">
                  {type.title || "Untitled"}
                </h3>
                {type.description && (
                  <p className="text-xs text-ink-400 mt-1 line-clamp-2">
                    {type.description}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-1">
                  {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                  ))}
                  <span className="ml-1.5 text-xs text-ink-400">
                    {count === 0 ? "no files" : `${count} file${count === 1 ? "" : "s"}`}
                  </span>
                  {showSuccess && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-gold-500 font-medium">
                      ✓ Uploaded
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          {!editing &&
            (expanded ? (
              <ChevronUp className="h-4 w-4 text-ink-400 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-ink-400 shrink-0" />
            ))}
        </button>

        {canEdit && !editing && (
          <Button
            size="icon"
            variant="ghost"
            aria-label="Edit type"
            onClick={startEdit}
            className="absolute right-7 top-0"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {expanded && !editing && (
        <div className="mt-4 space-y-3 border-t border-line-soft pt-4">
          <EvidenceDropzone onFiles={onUpload} uploading={uploading} />
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f) => (
                <EvidenceFileRow key={f.id} file={f} onDelete={onDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Wire onRename in Step1Evidence**

In `components/steps/Step1Evidence/index.tsx`:

1. Find where the evidence types are fetched (look for `fetch("/api/cases/${caseData.id}/evidence-types"` or similar) and extract the refetch into a callback if it isn't already named (e.g., `refetchEvidenceTypes` or wrap the existing effect).
2. Add a handler:

```typescript
const handleRenameType = useCallback(
  async (typeId: string, title: string, description: string) => {
    const response = await fetch(`/api/cases/${caseData.id}/evidence-types`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidenceTypeId: typeId, title, description }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    // Refresh evidence types so the UI shows the renamed values.
    await refetchEvidenceTypes(); // or inline the same fetch that populates state
  },
  [caseData.id],
);
```

3. Pass `onRename={handleRenameType}` to every `<EvidenceTypeCard ... />` render.

- [ ] **Step 5: Run tests, expect PASS**

```bash
npm test -- --run tests/components/EvidenceTypeCard.edit.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 6: Run full suite**

```bash
npm test -- --run
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(evidence): inline edit affordance for custom evidence types

Custom (non-default) evidence-type cards now show a pencil button that
swaps the title/description into inline Input/Textarea with Save/Cancel.
Saves through the existing PATCH endpoint. Enter saves; Escape cancels.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## F6 — Rename PDFViewerModal → PdfViewerDialog

### Task 6.1: Rename, wrap in Dialog primitive, update call sites

**Files:**
- Move: `components/PDFViewerModal.tsx` → `components/PdfViewerDialog.tsx`
- Modify: every import site

- [ ] **Step 1: List the call sites**

```bash
git grep -n "PDFViewerModal"
```

Expected: handful of import sites. Note them. The list usually includes Step1Evidence pieces or the case detail page.

- [ ] **Step 2: Rename the file**

```bash
git mv components/PDFViewerModal.tsx components/PdfViewerDialog.tsx
```

- [ ] **Step 3: Refactor the component to use the Dialog primitive**

Open `components/PdfViewerDialog.tsx`. Make these changes:

1. Replace the default export and the prop type's name:

```typescript
interface PdfViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  files: CaseFile[];
  startIndex: number;
  onSave?: (fileId: string, summary: string) => Promise<void>;
}

export default function PdfViewerDialog({ isOpen, onClose, files, startIndex, onSave }: PdfViewerDialogProps) {
  // ...existing body...
}
```

2. Import the Dialog primitive:

```typescript
import { Dialog, DialogContent } from "@/components/ui";
```

3. Replace the bespoke overlay wrapper (the outermost element that currently looks like `<div className="fixed inset-0 z-...">` or similar) with:

```tsx
return (
  <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent
      size="full"
      className="p-0 bg-ink-900"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      {/* Existing modal body — keep verbatim, only its outer wrapper is replaced */}
    </DialogContent>
  </Dialog>
);
```

The `onOpenAutoFocus` prevent keeps the Toast UI editor from losing keyboard focus to Radix's default focus target.

4. Remove the bespoke close button if Dialog's built-in close handles it. If the existing close button is also a UX element (with text "Close" or similar layout), keep it but ensure it calls `onClose()`.

- [ ] **Step 4: Update every call site**

For each file from Step 1:

```typescript
// Before
import PDFViewerModal from "@/components/PDFViewerModal";
<PDFViewerModal ... />

// After
import PdfViewerDialog from "@/components/PdfViewerDialog";
<PdfViewerDialog ... />
```

- [ ] **Step 5: Build to catch type drift**

```bash
npm run build
```

Expected: clean build. If TS errors point to old prop names (e.g., test files), fix them.

- [ ] **Step 6: Run tests**

```bash
npm test -- --run
```

Expected: green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(pdf-viewer): rename PDFViewerModal -> PdfViewerDialog (Dialog primitive)

Renames the file + default export, replaces the bespoke fixed-overlay
wrapper with the Dialog primitive (focus trap, Escape, animation tokens
all inherited). All call sites updated.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## F7 — ⌘K command palette

### Task 7.1: CommandPalette component

**Files:**
- Create: `components/dashboard/CommandPalette.tsx`
- Test: `tests/components/CommandPalette.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/CommandPalette.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "@/components/dashboard/CommandPalette";

beforeEach(() => {
  vi.restoreAllMocks();
  // @ts-ignore
  global.fetch = vi.fn().mockImplementation(async (url: string) => {
    if (String(url).includes("/api/cases/user/")) {
      return {
        ok: true,
        json: async () => [
          { id: "c1", title: "Smith v Jones", court: "District" },
          { id: "c2", title: "Park v Lee",    court: "Magistrates" },
        ],
      } as any;
    }
    return { ok: true, json: async () => ({}) } as any;
  });
});

describe("CommandPalette", () => {
  it("renders the search input when open", () => {
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        userId="u1"
        onSelectCase={() => {}}
        onAction={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText(/search cases/i)).toBeInTheDocument();
  });

  it("fetches and lists matching cases", async () => {
    const onSelectCase = vi.fn();
    const u = userEvent.setup();
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        userId="u1"
        onSelectCase={onSelectCase}
        onAction={() => {}}
      />,
    );
    await u.type(screen.getByPlaceholderText(/search cases/i), "Smith");
    await waitFor(() =>
      expect(screen.getByText("Smith v Jones")).toBeInTheDocument(),
    );
    await u.click(screen.getByText("Smith v Jones"));
    expect(onSelectCase).toHaveBeenCalledWith("c1");
  });

  it("renders quick actions", () => {
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        userId="u1"
        onSelectCase={() => {}}
        onAction={() => {}}
      />,
    );
    expect(screen.getByText(/new case/i)).toBeInTheDocument();
    expect(screen.getByText(/logout/i)).toBeInTheDocument();
  });

  it("calls onAction when an action is clicked", async () => {
    const onAction = vi.fn();
    const u = userEvent.setup();
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        userId="u1"
        onSelectCase={() => {}}
        onAction={onAction}
      />,
    );
    await u.click(screen.getByText(/new case/i));
    expect(onAction).toHaveBeenCalledWith("new-case");
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- --run tests/components/CommandPalette.test.tsx
```

- [ ] **Step 3: Implement CommandPalette**

Create `components/dashboard/CommandPalette.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, LogOut, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  Input,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";

export type PaletteAction = "new-case" | "logout";

interface CaseHit {
  id: string;
  title: string;
  court?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  onSelectCase: (caseId: string) => void;
  onAction: (action: PaletteAction) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  userId,
  onSelectCase,
  onAction,
}: Props) {
  const [query, setQuery] = useState("");
  const [cases, setCases] = useState<CaseHit[]>([]);
  const [loading, setLoading] = useState(false);

  const actions = useMemo(
    () =>
      [
        { id: "new-case" as PaletteAction, label: "New case", icon: Plus },
        { id: "logout"  as PaletteAction, label: "Logout",    icon: LogOut },
      ],
    [],
  );

  useEffect(() => {
    if (!open || !userId) return;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "20",
          sort_by: "created_at",
          sort_order: "desc",
        });
        if (query) params.append("search", query);
        const r = await fetch(`/api/cases/user/${userId}?${params}`, {
          credentials: "include",
        });
        if (r.ok) {
          const data = (await r.json()) as CaseHit[];
          setCases(data);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [open, userId, query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="p-0 overflow-hidden">
        <div className="p-3 border-b border-line-soft">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases or run an action…"
            leadingIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="max-h-96 overflow-y-auto">
          <section>
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-ink-400">
              Cases {loading && "· loading…"}
            </div>
            {cases.length === 0 && !loading ? (
              <div className="px-3 py-4 text-sm text-ink-400">
                {query ? "No matching cases." : "Type to search."}
              </div>
            ) : (
              <ul>
                {cases.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelectCase(c.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left text-sm",
                        "hover:bg-ink-800 focus-gold",
                      )}
                    >
                      <FileText className="h-4 w-4 text-ink-400 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-ink-100">
                        {c.title}
                      </span>
                      {c.court && (
                        <span className="text-xs text-ink-400">{c.court}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="border-t border-line-soft">
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-ink-400">
              Actions
            </div>
            <ul>
              {actions.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onAction(a.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left text-sm",
                        "hover:bg-ink-800 focus-gold",
                      )}
                    >
                      <Icon className="h-4 w-4 text-ink-400" />
                      <span className="text-ink-100">{a.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
npm test -- --run tests/components/CommandPalette.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/CommandPalette.tsx tests/components/CommandPalette.test.tsx
git commit -m "$(cat <<'EOF'
feat(ux): CommandPalette dialog over cases + actions

Dialog-primitive-backed palette with debounced case search via
/api/cases/user/{userId}?search=... and static quick actions
(new-case, logout). Returns ids/actions to the parent via callbacks.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 7.2: Mount globally with ⌘K keyboard shortcut

**Files:**
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Wire keyboard listener + handlers in AppShell**

Replace `components/layout/AppShell.tsx` with:

```tsx
"use client";

import { ReactNode, useEffect, useState, useCallback } from "react";
import { MotionConfig } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useOptionalAuthContext } from "@/contexts/AuthProvider";
import { CommandPalette, type PaletteAction } from "@/components/dashboard/CommandPalette";

const AUTH_ROUTES = ["/login", "/register"];

interface AppShellProps {
  children: ReactNode;
  hideChrome?: boolean;
}

export function AppShell({ children, hideChrome }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const autoHide = AUTH_ROUTES.some((r) => pathname?.startsWith(r));
  const effectiveHide = hideChrome ?? autoHide;
  const auth = useOptionalAuthContext();

  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (effectiveHide || !auth?.user?.id) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [effectiveHide, auth?.user?.id]);

  const handleSelectCase = useCallback(
    (caseId: string) => {
      setPaletteOpen(false);
      router.push(`/case/${caseId}`);
    },
    [router],
  );

  const handleAction = useCallback(
    async (action: PaletteAction) => {
      setPaletteOpen(false);
      if (action === "new-case") {
        // Bring the user to the dashboard with a flag; the dashboard opens its create dialog.
        router.push("/?create=1");
      } else if (action === "logout") {
        if (auth?.logout) {
          await auth.logout();
        } else {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
        }
      }
    },
    [auth, router],
  );

  return (
    <MotionConfig reducedMotion="user">
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
        {!effectiveHide && auth?.user?.id && (
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            userId={auth.user.id}
            onSelectCase={handleSelectCase}
            onAction={handleAction}
          />
        )}
      </div>
    </MotionConfig>
  );
}
```

- [ ] **Step 2: Honor the ?create=1 query on the dashboard**

In `app/page.tsx`, near the top of the component (after `useRouter`), add:

```typescript
useEffect(() => {
  const sp = new URLSearchParams(window.location.search);
  if (sp.get("create") === "1") {
    setCreateOpen(true);
    // Strip the param so refresh doesn't re-open.
    const url = new URL(window.location.href);
    url.searchParams.delete("create");
    window.history.replaceState({}, "", url.toString());
  }
}, []);
```

- [ ] **Step 3: Run full suite**

```bash
npm test -- --run
```

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

In the browser at `http://localhost:3000`:
- After login, press `Ctrl+K` (or `Cmd+K`). Palette opens. Type to search; click a case → navigates. Click "New case" → dashboard opens with create dialog. Click "Logout" → returns to /login.

- [ ] **Step 5: Commit**

```bash
git add components/layout/AppShell.tsx app/page.tsx
git commit -m "$(cat <<'EOF'
feat(ux): wire ⌘K / Ctrl+K global shortcut to the command palette

Mounts CommandPalette in AppShell when authenticated. The dashboard
honors a ?create=1 query to open its New case dialog from the palette's
quick-action.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase wrap-up

### Final check

- [ ] **Run the full test suite**

```bash
npm test -- --run
```

Expected: ~135 tests pass (130 baseline + 7 new − 2 deleted).

- [ ] **Run a production build**

```bash
npm run build
```

Expected: clean build. No type errors.

- [ ] **Quick grep for leftover refs**

```bash
git grep -n "tokens/verify"
git grep -n "InsufficientBalanceDialog"
git grep -n "is_enough_balance"
git grep -n "PDFViewerModal"
```

Expected: all empty (no matches). If anything turns up, fix it inline and add an amendment commit.

### Open PR + merge

- [ ] **Push branch and open PR**

```bash
git push -u origin feat/phase-f-cleanup-and-polish

gh pr create --title "feat: Phase F — cleanup & polish" --body "$(cat <<'EOF'
## Summary
- F1 strips LLM-balance verification across the app (JWT auth untouched)
- F2 restores editable from/to page inputs in the AI-Split workshop
- F3 collapsible step rail with persisted state
- F4 ErrorState primitive + applied to Particulars / Chronology / Review canvases
- F5 inline edit affordance for custom evidence types
- F6 PDFViewerModal → PdfViewerDialog (Dialog primitive)
- F7 ⌘K command palette over cases + actions

## Test plan
- [ ] `npm test -- --run` green (~135 tests)
- [ ] `npm run build` clean
- [ ] Dashboard ⌘K opens palette; case selection navigates; New case opens dialog; Logout returns to /login
- [ ] Step rail chevron collapses to icon-only; survives reload
- [ ] AI-Split workshop: edit From/To on a segment → cuts + viewer update; invalid edit shows inline error
- [ ] Step 3/4: simulate a generate failure → ErrorState renders inside the cream-paper card with Retry
- [ ] Step 5: simulate orchestration error → canvas shows ErrorState; ErrorDialog still appears for live failure
- [ ] Custom evidence-type card pencil → inline edit → PATCH updates the row

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Merge once green**

```bash
gh pr merge --merge
```

(or `--squash` to match the prior phases' merge style — confirm with the user before merging.)

- [ ] **Sync local main**

```bash
git checkout main
git pull --ff-only origin main
```
