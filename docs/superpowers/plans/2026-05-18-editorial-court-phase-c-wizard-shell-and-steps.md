# Editorial Court · Phase C · Case Wizard Shell + Steps 1–4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the case wizard chrome on the new left-rail-stepper pattern (`CaseShell` + `CaseHeader` + `StepRail` + `WizardFooter`) and rewrite Steps 1–4 internals to the new editorial visual language. Replace the three legacy regenerate modals with one parameterised `RegenerateDialog`. Replace the legacy `FileSizeModal` and `InsufficientBalanceModal` (inline JSX inside Step 1) with proper Dialog-based components.

**Architecture:** New `components/wizard/` directory hosts the wizard chrome. `app/case/[case_id]/page.tsx` is rewritten to compose `CaseShell` instead of the inline header/progress-bar/footer it has today. Each step component (`Step1Evidence`, `Step2Process`, `Step3Particulars`, `Step4Chronology`) is rebuilt internal-only — the prop contracts the page passes them are preserved. All wizard guards (`hasPendingUploads`, `hasProcessingFiles`, `isEditingParticulars`, `isEditingChronology`, `isGenerating`, `isStepLoading`) remain byte-for-byte. Cream-paper documents land in Steps 3 and 4 via `Card variant="cream-paper"` wrappers around the existing `MdxRenderer` / `MdxEditor` — the MDX internals themselves are NOT touched in this phase (deferred to Phase E if they need theme work).

**Tech Stack:** Next.js 15.4 App Router, React 19, Tailwind v4 (inline `@theme`), framer-motion, Phase A primitives (`components/ui/*`), Radix UI underneath.

**Spec reference:** `docs/superpowers/specs/2026-05-17-editorial-court-ui-redesign-design.md` — Sections 4 (CaseShell), 6 (Step internals), 9 (Modals).

**Out of scope for Phase C:** Step 5 Review (Phase E). PDF Split workshop (Phase D). MDX renderer/editor theme overhaul (Phase E). Hoverable/Citation re-skin (Phase E). The "AI Split PDF" button in Step 1 keeps wiring to the existing `PdfSplitDrawer` until Phase D replaces the route — we restyle the trigger but don't touch the drawer it opens.

---

## Decisions made in this plan

- **MDX internals untouched.** `MdxRenderer.tsx` and `MdxEditor.tsx` continue rendering with their existing styles. Wrapping them in a cream-paper `Card` overrides background, border, and text-color via inheritance, which is enough for Phase C. Toolbar buttons / inline link colors might still feel slightly off — Phase E will hit those.
- **StepRail uses the existing 5-step sequence** from the current wizard: Evidence → Process → Particulars → Chronology → Review. Step 5 (Review) is part of the rail click target but its INTERNALS are not changed in Phase C — Phase E rebuilds them. The page's step routing logic for Step 5 keeps using the existing `Step5Review` until then.
- **Step rail navigation:** clicks on complete steps jump back; clicks on upcoming steps are no-ops (rail stays an indicator + back-nav only, no forward jumps). Forward progress is still gated through Next.
- **`isStepLoading` preserved** with the same 500ms timeout (the page-level skeleton-during-step-mount behaviour ships in WizardFooter for Previous/Next disable; the actual step content renders normally).
- **`RegenerateDialog` is one parameterised component** that takes a `documentType: "particulars" | "chronology" | "document"` prop. It replaces all three of `components/modals/RegenerateModal.tsx`, `RegenerateParticularsModal.tsx`, `RegenerateChronologyModal.tsx`. The legacy modals are deleted in the final task.
- **`FileSizeDialog` + `InsufficientBalanceDialog`** are new primitive-built dialogs that replace the inline `{showFileSizeModal && <div...>}` blocks currently embedded inside `Step1Evidence.tsx` and `PdfSplitDrawer.tsx`. PdfSplitDrawer is Phase D scope; for Phase C we update the Step 1 call site to use the new dialogs. PdfSplitDrawer keeps its inline duplicate until Phase D.
- **The "AI Split PDF" button in Step 1** stays wired to the existing `PdfSplitDrawer` (which still looks off-brand). We restyle the button itself to be a gold-accent ghost in the SectionHeader — visually Phase C, behaviourally still Phase A/legacy. Phase D will swap the underlying handler from drawer-open to `router.push("/case/[id]/split")`.
- **`onPendingUploadsChange` / `onIncompleteFilesChange` / `onGeneratingStateChange` / `onEditingStateChange` / `onNextStep`** — every callback the current step components emit is preserved with the same payload shape so the page-level guards keep working.
- **No new API endpoints. No new service methods. No DB changes.** All Phase C work is UI-only.

---

## File structure

### New files

```
components/
  wizard/
    CaseHeader.tsx           sticky header with back, title, type chip, party chips
    StepRail.tsx             left rail: 5 steps with status + meta + back-nav
    StepRailItem.tsx         one rail row
    CaseShell.tsx            composition: <CaseHeader/> + <div grid><StepRail/><main/></div> + <WizardFooter/>
    WizardFooter.tsx         sticky bottom: Previous + Next (uses existing guard props)
  modals/
    RegenerateDialog.tsx     parameterised by documentType
    FileSizeDialog.tsx       100MB exceeded warning
    InsufficientBalanceDialog.tsx
  steps/
    Step1Evidence/
      index.tsx              ← replaces components/steps/Step1Evidence.tsx
      EvidenceTypeCard.tsx
      EvidenceFileRow.tsx
      EvidenceDropzone.tsx
      AddCustomTypeRow.tsx
    Step2Process/
      index.tsx              ← replaces components/steps/Step2Process.tsx
      FileTimelineRow.tsx
    Step3Particulars/
      index.tsx              ← replaces components/steps/Step3Particulars.tsx
      DocumentToolbar.tsx
    Step4Chronology/
      index.tsx              ← replaces components/steps/Step4Chronology.tsx
                             (reuses DocumentToolbar from Step3Particulars/)

tests/components/
  CaseHeader.test.tsx
  StepRail.test.tsx
  WizardFooter.test.tsx
  CaseShell.test.tsx
  RegenerateDialog.test.tsx
  FileSizeDialog.test.tsx
  InsufficientBalanceDialog.test.tsx
  Step1Evidence.test.tsx     (smoke: renders bento grid given evidence types)
  Step2Process.test.tsx      (smoke: renders timeline)
  Step3Particulars.test.tsx  (smoke: renders cream paper + toolbar)
  Step4Chronology.test.tsx   (smoke: renders cream paper + toolbar)
```

### Modified files

```
app/case/[case_id]/page.tsx  rewrite outer chrome on CaseShell; keep all state/guards
```

### Deleted files

```
components/steps/Step1Evidence.tsx       (moved to Step1Evidence/index.tsx)
components/steps/Step2Process.tsx        (moved to Step2Process/index.tsx)
components/steps/Step3Particulars.tsx    (moved to Step3Particulars/index.tsx)
components/steps/Step4Chronology.tsx     (moved to Step4Chronology/index.tsx)
components/modals/RegenerateModal.tsx
components/modals/RegenerateParticularsModal.tsx
components/modals/RegenerateChronologyModal.tsx
```

### Untouched in this phase

- `components/steps/Step5Review.tsx` and `components/tabs/*` (Phase E)
- `components/PdfSplitDrawer.tsx`, `components/PdfSplitter.tsx`, `components/SplitRangeDisplay.tsx` (Phase D)
- `components/MdxEditor.tsx`, `components/MdxRenderer.tsx`, `components/Hoverable.tsx`, `components/Citation.tsx`, `components/PDFViewerModal.tsx` (Phase E)
- All services, API routes, middleware, LangGraph, Prisma — unchanged.

---

## Behavior preserved verbatim

- All page-level guard logic: `isPreviousDisabled`, `isNextDisabled`, `getNextButtonText` and the 500ms `isStepLoading` timeout in `handleStepChange`.
- Step 1: token balance verification before upload, 100MB file-size check, evidence-type fetch + create + update API calls, "AI Split PDF" still opens `PdfSplitDrawer`, `onPendingUploadsChange` lifts to page.
- Step 2: file processing status display, `onIncompleteFilesChange(hasIncomplete, hasProcessing, hasFailed)` callback shape.
- Step 3 / 4: `handleSave`, `handleRegenerate` flows, generated-content load from `/api/soc_analysis/*`, MdxRenderer / MdxEditor rendering, `onGeneratingStateChange` / `onEditingStateChange` / `onNextStep` callbacks.
- Bengali toggle on Witness Statement → not touched (lives in Step 5, Phase E).
- Markdown preprocessing pipeline (`remarkFixVoidTags`, `verify_markdown`).
- Token verification, file size and segment validation rules.

---

## Task 1: Baseline verify

**Files:** none

- [ ] **Step 1.1:** `git log --oneline -1 && npm test 2>&1 | tail -5 && npm run build 2>&1 | tail -5`
- [ ] **Step 1.2:** No commit (verify-only)

---

## Task 2: CaseHeader

**Files:**
- Create: `components/wizard/CaseHeader.tsx`
- Create: `tests/components/CaseHeader.test.tsx`

**Test:**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseHeader } from "@/components/wizard/CaseHeader";

const sample = {
  id: "c1",
  title: "Rahman v. State",
  caseType: "SOC",
  status: "draft",
  parties: [
    { id: "p1", name: "Rahman", role: "plaintiff", type: "person", bengaliName: null },
    { id: "p2", name: "State", role: "defendant", type: "person", bengaliName: null },
  ],
  court: "District Court",
  caseNumber: "",
  files: [],
} as any;

describe("CaseHeader", () => {
  it("renders the case title", () => {
    render(<CaseHeader caseData={sample} onBack={() => {}} />);
    expect(screen.getByText("Rahman v. State")).toBeInTheDocument();
  });

  it("renders type label and court", () => {
    render(<CaseHeader caseData={sample} onBack={() => {}} />);
    expect(screen.getByText(/Statement of Claim/i)).toBeInTheDocument();
    expect(screen.getByText(/District Court/)).toBeInTheDocument();
  });

  it("calls onBack when back button clicked", async () => {
    const u = userEvent.setup();
    const onBack = vi.fn();
    render(<CaseHeader caseData={sample} onBack={onBack} />);
    await u.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
```

Run, FAIL.

**Implement:**

```tsx
"use client";

import { ArrowLeft } from "lucide-react";
import { Case } from "@/types/case";
import { StatusPill, type Status } from "@/components/ui";

interface CaseHeaderProps {
  caseData: Case;
  onBack: () => void;
}

function statusFromCase(c: Case): Status {
  switch (c.status) {
    case "completed":
      return "complete";
    case "processing":
      return "processing";
    case "draft":
    default:
      return "draft";
  }
}

function typeLabel(t: string): string {
  return t === "DEFENCE" ? "Defence" : "Statement of Claim";
}

export function CaseHeader({ caseData, onBack }: CaseHeaderProps) {
  const plaintiffs = caseData.parties
    .filter((p) => p.role === "plaintiff")
    .map((p) => p.name)
    .filter(Boolean);
  const defendants = caseData.parties
    .filter((p) => p.role === "defendant")
    .map((p) => p.name)
    .filter(Boolean);

  return (
    <header className="border-b border-line-soft bg-ink-900 px-6 py-5 relative">
      <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-gold-500" aria-hidden />
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to dashboard"
            className="mt-1 p-1.5 rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-800 focus-gold"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-2xl text-ink-100 truncate">
              {caseData.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
              <span>{typeLabel(caseData.caseType)}</span>
              {caseData.court && (
                <>
                  <span aria-hidden>·</span>
                  <span>{caseData.court}</span>
                </>
              )}
              {plaintiffs.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>plaintiffs: {plaintiffs.join(", ")}</span>
                </>
              )}
              {defendants.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>defendants: {defendants.join(", ")}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {caseData.status && <StatusPill status={statusFromCase(caseData)} />}
      </div>
    </header>
  );
}
```

Run, PASS (3 tests).

**Commit:**

```
git add components/wizard/CaseHeader.tsx tests/components/CaseHeader.test.tsx
git commit -m "feat(ui): add CaseHeader for wizard chrome with gold accent rule"
```

---

## Task 3: StepRailItem + StepRail

**Files:**
- Create: `components/wizard/StepRailItem.tsx`
- Create: `components/wizard/StepRail.tsx`
- Create: `tests/components/StepRail.test.tsx`

**Test:**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepRail } from "@/components/wizard/StepRail";

const steps = [
  { number: 1, title: "Evidence", meta: "9 files" },
  { number: 2, title: "Process", meta: "OCR ✓✓✓" },
  { number: 3, title: "Particulars" },
  { number: 4, title: "Chronology" },
  { number: 5, title: "Review" },
];

describe("StepRail", () => {
  it("renders all 5 steps with titles", () => {
    render(<StepRail steps={steps} currentStep={2} onStepClick={() => {}} />);
    expect(screen.getByText("Evidence")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("renders meta sub-line on steps that have it", () => {
    render(<StepRail steps={steps} currentStep={2} onStepClick={() => {}} />);
    expect(screen.getByText("9 files")).toBeInTheDocument();
    expect(screen.getByText("OCR ✓✓✓")).toBeInTheDocument();
  });

  it("calls onStepClick when clicking a completed step", async () => {
    const u = userEvent.setup();
    const onStepClick = vi.fn();
    render(<StepRail steps={steps} currentStep={3} onStepClick={onStepClick} />);
    await u.click(screen.getByRole("button", { name: /Evidence/i }));
    expect(onStepClick).toHaveBeenCalledWith(1);
  });

  it("does not call onStepClick when clicking upcoming step", async () => {
    const u = userEvent.setup();
    const onStepClick = vi.fn();
    render(<StepRail steps={steps} currentStep={2} onStepClick={onStepClick} />);
    // Step 5 is upcoming; click should be ignored.
    const review = screen.getByText("Review").closest("button, div")!;
    await u.click(review);
    expect(onStepClick).not.toHaveBeenCalled();
  });
});
```

Run, FAIL.

**Implement `components/wizard/StepRailItem.tsx`:**

```tsx
"use client";

import { Check } from "lucide-react";
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
  onClick: () => void;
}

export function StepRailItem({ step, state, disabled, onClick }: ItemProps) {
  const clickable = state === "complete" && !disabled;
  const Wrapper = clickable ? "button" : "div";

  return (
    <Wrapper
      type={clickable ? "button" : undefined}
      onClick={clickable ? onClick : undefined}
      aria-current={state === "current" ? "step" : undefined}
      disabled={!clickable}
      className={cn(
        "relative w-full text-left flex items-start gap-3 py-3 px-4 rounded-[var(--radius-md)] transition-colors",
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
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-medium",
          state === "complete" && "bg-gold-500 text-ink-950",
          state === "current" && "bg-ink-700 border border-gold-500 text-ink-100",
          state === "upcoming" && "bg-ink-700 border border-line-soft text-ink-400",
        )}
      >
        {state === "complete" ? <Check className="h-3 w-3" /> : step.number}
      </span>
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
    </Wrapper>
  );
}
```

**Implement `components/wizard/StepRail.tsx`:**

```tsx
"use client";

import { StepRailItem, type RailStep } from "./StepRailItem";

interface StepRailProps {
  steps: RailStep[];
  currentStep: number;
  onStepClick: (n: number) => void;
  disabled?: boolean;
}

export function StepRail({ steps, currentStep, onStepClick, disabled }: StepRailProps) {
  return (
    <nav aria-label="Wizard steps" className="w-60 shrink-0 bg-ink-900 border-r border-line-soft p-3 self-stretch">
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

Run, PASS (4 tests).

**Commit:**

```
git add components/wizard/StepRail.tsx components/wizard/StepRailItem.tsx tests/components/StepRail.test.tsx
git commit -m "feat(ui): add StepRail + StepRailItem for left-rail wizard stepper"
```

---

## Task 4: WizardFooter

**Files:**
- Create: `components/wizard/WizardFooter.tsx`
- Create: `tests/components/WizardFooter.test.tsx`

**Test:**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardFooter } from "@/components/wizard/WizardFooter";

describe("WizardFooter", () => {
  it("renders Previous and Next buttons", () => {
    render(
      <WizardFooter
        currentStep={2}
        totalSteps={5}
        previousDisabled={false}
        nextDisabled={false}
        nextLabel="Next"
        onPrevious={() => {}}
        onNext={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next/i })).toBeInTheDocument();
  });

  it("hides Previous on step 1", () => {
    render(
      <WizardFooter
        currentStep={1}
        totalSteps={5}
        previousDisabled
        nextDisabled={false}
        nextLabel="Next"
        onPrevious={() => {}}
        onNext={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /Previous/i })).not.toBeInTheDocument();
  });

  it("hides Next when on the last step", () => {
    render(
      <WizardFooter
        currentStep={5}
        totalSteps={5}
        previousDisabled={false}
        nextDisabled={false}
        nextLabel="Complete"
        onPrevious={() => {}}
        onNext={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /Next|Complete/i })).not.toBeInTheDocument();
  });

  it("calls onPrevious / onNext", async () => {
    const u = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <WizardFooter
        currentStep={3}
        totalSteps={5}
        previousDisabled={false}
        nextDisabled={false}
        nextLabel="Next"
        onPrevious={onPrev}
        onNext={onNext}
      />,
    );
    await u.click(screen.getByRole("button", { name: /Previous/i }));
    await u.click(screen.getByRole("button", { name: /Next/i }));
    expect(onPrev).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
  });
});
```

Run, FAIL.

**Implement:**

```tsx
"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

interface WizardFooterProps {
  currentStep: number;
  totalSteps: number;
  previousDisabled: boolean;
  nextDisabled: boolean;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
}

export function WizardFooter({
  currentStep,
  totalSteps,
  previousDisabled,
  nextDisabled,
  nextLabel,
  onPrevious,
  onNext,
}: WizardFooterProps) {
  const showPrev = currentStep > 1;
  const showNext = currentStep < totalSteps;
  return (
    <div className="sticky bottom-0 border-t border-line-soft bg-ink-900 px-6 py-3 z-20">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          {showPrev && (
            <Button
              variant="ghost"
              onClick={onPrevious}
              disabled={previousDisabled}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Previous
            </Button>
          )}
        </div>
        <div>
          {showNext && (
            <Button
              onClick={onNext}
              disabled={nextDisabled}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {nextLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

Run, PASS (4 tests).

**Commit:**

```
git add components/wizard/WizardFooter.tsx tests/components/WizardFooter.test.tsx
git commit -m "feat(ui): add WizardFooter with Previous/Next buttons"
```

---

## Task 5: CaseShell composition

**Files:**
- Create: `components/wizard/CaseShell.tsx`
- Create: `tests/components/CaseShell.test.tsx`

**Test:**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CaseShell } from "@/components/wizard/CaseShell";

const sample = {
  id: "c1",
  title: "Rahman v. State",
  caseType: "SOC",
  status: "draft",
  parties: [],
  files: [],
  court: "",
  caseNumber: "",
} as any;

const steps = [
  { number: 1, title: "Evidence" },
  { number: 2, title: "Process" },
  { number: 3, title: "Particulars" },
  { number: 4, title: "Chronology" },
  { number: 5, title: "Review" },
];

describe("CaseShell", () => {
  it("renders header, rail, content area and footer", () => {
    render(
      <CaseShell
        caseData={sample}
        steps={steps}
        currentStep={2}
        previousDisabled={false}
        nextDisabled={false}
        nextLabel="Next"
        onBack={() => {}}
        onStepClick={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
      >
        <div data-testid="content">Step content</div>
      </CaseShell>,
    );
    expect(screen.getByText("Rahman v. State")).toBeInTheDocument();
    expect(screen.getByText("Evidence")).toBeInTheDocument(); // rail
    expect(screen.getByText("Step content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Previous/i })).toBeInTheDocument();
  });
});
```

Run, FAIL.

**Implement:**

```tsx
"use client";

import { ReactNode } from "react";
import { Case } from "@/types/case";
import { CaseHeader } from "./CaseHeader";
import { StepRail } from "./StepRail";
import { WizardFooter } from "./WizardFooter";
import type { RailStep } from "./StepRailItem";

interface CaseShellProps {
  caseData: Case;
  steps: RailStep[];
  currentStep: number;
  previousDisabled: boolean;
  nextDisabled: boolean;
  nextLabel: string;
  onBack: () => void;
  onStepClick: (n: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  children: ReactNode;
}

export function CaseShell({
  caseData,
  steps,
  currentStep,
  previousDisabled,
  nextDisabled,
  nextLabel,
  onBack,
  onStepClick,
  onPrevious,
  onNext,
  children,
}: CaseShellProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <CaseHeader caseData={caseData} onBack={onBack} />
      <div className="flex-1 flex">
        <StepRail
          steps={steps}
          currentStep={currentStep}
          onStepClick={onStepClick}
          disabled={previousDisabled && nextDisabled}
        />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
      <WizardFooter
        currentStep={currentStep}
        totalSteps={steps.length}
        previousDisabled={previousDisabled}
        nextDisabled={nextDisabled}
        nextLabel={nextLabel}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </div>
  );
}
```

Run, PASS (1 test).

**Commit:**

```
git add components/wizard/CaseShell.tsx tests/components/CaseShell.test.tsx
git commit -m "feat(ui): compose CaseShell from CaseHeader + StepRail + WizardFooter"
```

---

## Task 6: RegenerateDialog

**Files:**
- Create: `components/modals/RegenerateDialog.tsx`
- Create: `tests/components/RegenerateDialog.test.tsx`

**Test:**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegenerateDialog } from "@/components/modals/RegenerateDialog";

describe("RegenerateDialog", () => {
  it("renders title for particulars by default", () => {
    render(
      <RegenerateDialog open onOpenChange={() => {}} documentType="particulars" onConfirm={async () => {}} />,
    );
    expect(screen.getByText(/Regenerate Particulars/i)).toBeInTheDocument();
  });

  it("passes the comment to onConfirm", async () => {
    const u = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <RegenerateDialog
        open
        onOpenChange={() => {}}
        documentType="chronology"
        onConfirm={onConfirm}
      />,
    );
    await u.type(screen.getByRole("textbox"), "make it sharper");
    await u.click(screen.getByRole("button", { name: /Regenerate/i }));
    expect(onConfirm).toHaveBeenCalledWith("make it sharper");
  });
});
```

Run, FAIL.

**Implement:**

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Textarea,
} from "@/components/ui";

type DocumentType = "particulars" | "chronology" | "document";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType;
  onConfirm: (comment: string) => Promise<void> | void;
}

const TITLES: Record<DocumentType, string> = {
  particulars: "Regenerate Particulars",
  chronology: "Regenerate Chronology",
  document: "Regenerate document",
};

const PLACEHOLDERS: Record<DocumentType, string> = {
  particulars: "Anything Vakil should keep in mind this time? (e.g., emphasise the timeline of injuries)",
  chronology: "Anything Vakil should keep in mind this time? (e.g., merge the duplicate August events)",
  document: "Anything Vakil should keep in mind this time?",
};

export function RegenerateDialog({ open, onOpenChange, documentType, onConfirm }: Props) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm(comment);
      onOpenChange(false);
      setComment("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setComment("");
      }}
    >
      <DialogContent size="md">
        <DialogTitle>{TITLES[documentType]}</DialogTitle>
        <DialogDescription>
          Vakil will redraft based on the same evidence and any extra guidance you provide.
        </DialogDescription>
        <div className="mt-4">
          <Textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={PLACEHOLDERS[documentType]}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={busy}>
            Regenerate ▸
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Run, PASS (2 tests).

**Commit:**

```
git add components/modals/RegenerateDialog.tsx tests/components/RegenerateDialog.test.tsx
git commit -m "feat(ui): add RegenerateDialog parameterised by document type"
```

---

## Task 7: FileSizeDialog

**Files:**
- Create: `components/modals/FileSizeDialog.tsx`
- Create: `tests/components/FileSizeDialog.test.tsx`

**Test:**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileSizeDialog } from "@/components/modals/FileSizeDialog";

describe("FileSizeDialog", () => {
  it("renders the list of oversized files", () => {
    render(
      <FileSizeDialog
        open
        onOpenChange={() => {}}
        files={[
          { name: "big.pdf", size: 150 * 1024 * 1024 },
          { name: "huge.pdf", size: 250 * 1024 * 1024 },
        ]}
      />,
    );
    expect(screen.getByText(/big.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/huge.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/150.0 MB/i)).toBeInTheDocument();
  });
});
```

Run, FAIL.

**Implement:**

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

interface OversizedFile {
  name: string;
  size: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: OversizedFile[];
}

export function FileSizeDialog({ open, onOpenChange, files }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-rose-500/15 text-rose-500 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle>File too large</DialogTitle>
            <DialogDescription>
              The following file{files.length === 1 ? "" : "s"} exceed the 100 MB limit and cannot be uploaded:
            </DialogDescription>
          </div>
        </div>
        <ul className="mt-4 rounded-[var(--radius-md)] border border-rose-500/30 bg-rose-500/10 p-3 space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-start justify-between gap-2 text-sm text-rose-500">
              <span className="break-all flex-1">• {f.name}</span>
              <span className="text-xs text-rose-500/80">
                {(f.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-400">
          Try splitting these PDFs with the AI splitter or compressing them before re-uploading.
        </p>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Run, PASS (1 test).

**Commit:**

```
git add components/modals/FileSizeDialog.tsx tests/components/FileSizeDialog.test.tsx
git commit -m "feat(ui): add FileSizeDialog on Dialog primitive"
```

---

## Task 8: InsufficientBalanceDialog

**Files:**
- Create: `components/modals/InsufficientBalanceDialog.tsx`
- Create: `tests/components/InsufficientBalanceDialog.test.tsx`

**Test:**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InsufficientBalanceDialog } from "@/components/modals/InsufficientBalanceDialog";

describe("InsufficientBalanceDialog", () => {
  it("renders the insufficient balance message", () => {
    render(
      <InsufficientBalanceDialog open onOpenChange={() => {}} onTopUp={() => {}} />,
    );
    expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
  });

  it("calls onTopUp when Top up clicked", async () => {
    const u = userEvent.setup();
    const onTopUp = vi.fn();
    render(
      <InsufficientBalanceDialog open onOpenChange={() => {}} onTopUp={onTopUp} />,
    );
    await u.click(screen.getByRole("button", { name: /Top up/i }));
    expect(onTopUp).toHaveBeenCalled();
  });
});
```

Run, FAIL.

**Implement:**

```tsx
"use client";

import { CircleDollarSign } from "lucide-react";
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
  /** Top-up flow is not wired up in Vakil yet — this is a no-op CTA. */
  onTopUp: () => void;
}

export function InsufficientBalanceDialog({ open, onOpenChange, onTopUp }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-gold-500/15 text-gold-500 shrink-0">
            <CircleDollarSign className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle>Insufficient balance</DialogTitle>
            <DialogDescription>
              You do not have enough tokens to upload more files. Top up your account to continue.
            </DialogDescription>
          </div>
        </div>
        <div className="mt-4 rounded-[var(--radius-md)] border border-gold-500/30 bg-gold-500/10 p-3 text-xs text-gold-500">
          Need more tokens? Visit your account settings to purchase additional tokens.
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onTopUp}>Top up account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Run, PASS (2 tests).

**Commit:**

```
git add components/modals/InsufficientBalanceDialog.tsx tests/components/InsufficientBalanceDialog.test.tsx
git commit -m "feat(ui): add InsufficientBalanceDialog on Dialog primitive"
```

---

## Task 9: Rewrite wizard page chrome

**Files:**
- Modify: `app/case/[case_id]/page.tsx`

**Read the current file first** to understand state and guards. Keep the exact same:
- All `useState` declarations and their initial values
- `handlePendingUploadsChange`, `handleIncompleteFilesChange`, `handleEditingStateChange`, `handleChronologyEditingStateChange`
- `isPreviousDisabled`, `isNextDisabled`, `getNextButtonText` logic
- `handleStepChange` w/ 500ms timeout
- `useEffect` that fetches the case
- The loading + not-found render branches

**Replace** the chrome (header, step bar, content card, navigation buttons) but **keep all step component invocations + props unchanged**. New file:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Case } from '@/types/case';
import { Loader2 } from 'lucide-react';

import { CaseShell } from '@/components/wizard/CaseShell';
import Step1Evidence from '@/components/steps/Step1Evidence';
import Step2Process from '@/components/steps/Step2Process';
import Step3Particulars from '@/components/steps/Step3Particulars';
import Step4Chronology from '@/components/steps/Step4Chronology';
import Step5Review from '@/components/steps/Step5Review';

const STEPS = [
  { number: 1, title: 'Evidence' },
  { number: 2, title: 'Process' },
  { number: 3, title: 'Particulars' },
  { number: 4, title: 'Chronology' },
  { number: 5, title: 'Review' },
];

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = params.case_id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [generatedContent] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasPendingUploads, setHasPendingUploads] = useState(false);
  const [hasIncompleteFiles, setHasIncompleteFiles] = useState(false);
  const [hasProcessingFiles, setHasProcessingFiles] = useState(false);
  const [hasFailedFiles, setHasFailedFiles] = useState(false);
  const [generatingAction] = useState<string | null>(null);
  const [isEditingParticulars, setIsEditingParticulars] = useState(false);
  const [isEditingChronology, setIsEditingChronology] = useState(false);
  const [isStepLoading, setIsStepLoading] = useState(false);

  const handlePendingUploadsChange = (hasPending: boolean) => setHasPendingUploads(hasPending);
  const handleIncompleteFilesChange = (hasIncomplete: boolean, hasProcessing: boolean, hasFailed: boolean) => {
    setHasIncompleteFiles(hasIncomplete);
    setHasProcessingFiles(hasProcessing);
    setHasFailedFiles(hasFailed);
  };
  const handleEditingStateChange = (isEditing: boolean) => setIsEditingParticulars(isEditing);
  const handleChronologyEditingStateChange = (isEditing: boolean) => setIsEditingChronology(isEditing);

  const isPreviousDisabled = () => {
    if (isStepLoading) return true;
    if (currentStep === 1) return true;
    return isGenerating || isEditingParticulars || isEditingChronology;
  };

  const isNextDisabled = () => {
    if (isStepLoading) return true;
    if (currentStep >= STEPS.length) return true;
    if (currentStep === 1) return hasPendingUploads;
    if (currentStep === 2) return hasProcessingFiles;
    if (currentStep === 3) return isGenerating || isEditingParticulars;
    if (currentStep === 4) return isGenerating || isEditingChronology;
    return false;
  };

  const getNextButtonText = () => {
    if (isStepLoading) return 'Loading…';
    if (currentStep >= STEPS.length) return 'Complete';
    if (currentStep === 1) return hasPendingUploads ? 'Uploading…' : 'Next';
    if (currentStep === 2) return hasProcessingFiles ? 'Processing…' : 'Next';
    if (currentStep === 3) {
      if (isGenerating) return 'Generating…';
      if (isEditingParticulars) return 'Editing…';
      return 'Next';
    }
    if (currentStep === 4) {
      if (isGenerating) return 'Generating…';
      if (isEditingChronology) return 'Editing…';
      return 'Next';
    }
    return 'Next';
  };

  const handleBackClick = () => router.push('/');

  const handleStepChange = (newStep: number) => {
    setIsStepLoading(true);
    setCurrentStep(newStep);
    setTimeout(() => setIsStepLoading(false), 500);
  };

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const response = await fetch(`/api/cases/${caseId}`);
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        setCaseData({
          ...data,
          files: data.files.map((file: any) => ({
            id: file.id,
            type: file.type,
            fileName: file.fileName,
            status: file.status,
            entities: file.entities,
            documentDate: file.documentDate,
          })),
        });
      } catch (error) {
        console.error('Error fetching case:', error);
      } finally {
        setLoading(false);
      }
    };
    if (caseId) fetchCase();
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
        <div className="text-center">
          <h2 className="text-xl font-display text-ink-100 mb-2">Case not found</h2>
          <p className="text-ink-400">The requested case could not be found.</p>
        </div>
      </div>
    );
  }

  const stepsWithMeta = STEPS.map((s) => ({
    ...s,
    meta:
      s.number === 1 && caseData.files?.length
        ? `${caseData.files.length} file${caseData.files.length === 1 ? '' : 's'}`
        : undefined,
  }));

  return (
    <CaseShell
      caseData={caseData}
      steps={stepsWithMeta}
      currentStep={currentStep}
      previousDisabled={isPreviousDisabled()}
      nextDisabled={isNextDisabled()}
      nextLabel={getNextButtonText()}
      onBack={handleBackClick}
      onStepClick={(n) => {
        if (n < currentStep) handleStepChange(n);
      }}
      onPrevious={() => handleStepChange(Math.max(1, currentStep - 1))}
      onNext={() => handleStepChange(Math.min(STEPS.length, currentStep + 1))}
    >
      {currentStep === 1 && (
        <Step1Evidence caseData={caseData} onPendingUploadsChange={handlePendingUploadsChange} />
      )}
      {currentStep === 2 && (
        <Step2Process
          caseId={caseId}
          generatedContent={generatedContent}
          onGenerateContent={() => {}}
          onGeneratingStateChange={() => {}}
          hasPendingUploads={hasPendingUploads}
          generatingAction={generatingAction}
          onOcrStateReset={() => {}}
          onIncompleteFilesChange={handleIncompleteFilesChange}
        />
      )}
      {currentStep === 3 && (
        <Step3Particulars
          caseId={caseId}
          generatedContent={generatedContent}
          onGeneratingStateChange={setIsGenerating}
          onEditingStateChange={handleEditingStateChange}
          onNextStep={() => setCurrentStep(4)}
        />
      )}
      {currentStep === 4 && (
        <Step4Chronology
          caseId={caseId}
          generatedContent={generatedContent}
          onGeneratingStateChange={setIsGenerating}
          onEditingStateChange={handleChronologyEditingStateChange}
          onNextStep={() => setCurrentStep(5)}
        />
      )}
      {currentStep === 5 && <Step5Review caseId={caseId} caseData={caseData} />}
    </CaseShell>
  );
}
```

Verify: `npm test 2>&1 | tail -5` and `npm run build 2>&1 | tail -10` — clean.

**Commit:**

```
git add app/case/[case_id]/page.tsx
git commit -m "feat(ui): rewrite case wizard chrome on CaseShell + left-rail stepper"
```

---

## Task 10: Step 1 Evidence — restructure to bento

This is the largest step rewrite. Split the legacy `Step1Evidence.tsx` (~740 lines) into focused files under `components/steps/Step1Evidence/`.

**Files:**
- Create: `components/steps/Step1Evidence/index.tsx`
- Create: `components/steps/Step1Evidence/EvidenceTypeCard.tsx`
- Create: `components/steps/Step1Evidence/EvidenceFileRow.tsx`
- Create: `components/steps/Step1Evidence/EvidenceDropzone.tsx`
- Create: `components/steps/Step1Evidence/AddCustomTypeRow.tsx`
- Create: `tests/components/Step1Evidence.test.tsx`
- Delete: `components/steps/Step1Evidence.tsx`

### Behavior preserved

- Fetch evidence types from `/api/cases/[id]/evidence-types`
- Token balance verification before upload (`POST /api/tokens/verify`)
- 100 MB max-file-size check (now → `FileSizeDialog`)
- Insufficient balance handling (now → `InsufficientBalanceDialog`)
- File upload via `POST /api/storage/upload` with FormData fields `files`, `caseId`, `evidenceType`
- File delete via `DELETE /api/files/[id]` (no `window.confirm` — use Dialog/`ConfirmDialog`)
- Add custom evidence type via `POST /api/cases/[id]/evidence-types`
- Update custom evidence type via `PATCH /api/cases/[id]/evidence-types`
- `onPendingUploadsChange(hasPending)` callback fires whenever an upload is in flight
- 3-second success message after upload completes
- "AI Split PDF" button opens `PdfSplitDrawer` (unchanged until Phase D)

### New structure

```
┌─ SectionHeader ─────────────────────────────────────────────────┐
│ Evidence                              [⚡ AI-split PDF ▸]         │
│ Upload supporting documents · max 100 MB per file               │
└─────────────────────────────────────────────────────────────────┘

EVIDENCE TYPES (responsive bento grid, 1 → 2 → 3 cols)
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ <EvidenceTypeCard│ │ <EvidenceTypeCard│ │ <EvidenceTypeCard│
│  expanded={false}│ │  expanded={false}│ │  expanded={false}│
│ />               │ │ />               │ │ />               │
└──────────────────┘ └──────────────────┘ └──────────────────┘
                  When clicked, expands to:
┌─────────────────────────────────────────────────────────────────┐
│ Type title + count                           [Collapse ▴]       │
│ ─────────────────────────────────────────────────────────────── │
│ <EvidenceDropzone />                                             │
│ <EvidenceFileRow ... />  (one per uploaded file)                 │
└─────────────────────────────────────────────────────────────────┘

<AddCustomTypeRow /> at bottom: gold ghost button + inline edit form

Optional: <FileSizeDialog />, <InsufficientBalanceDialog /> rendered
at root, controlled by local state.
```

### Implement

The implementation is substantial. Each file is small (≤80 LOC):

**`EvidenceFileRow.tsx`** (replaces inline file list item, uses ConfirmDialog for delete):

```tsx
"use client";

import { useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { ConfirmDialog, Button } from "@/components/ui";
import { CaseFile } from "@/types/case";

interface Props {
  file: CaseFile;
  onDelete: (fileId: string) => Promise<void>;
}

export function EvidenceFileRow({ file, onDelete }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-ink-800 border border-line-soft px-3 py-2 text-sm text-ink-300">
      <FileText className="h-4 w-4 text-ink-400 shrink-0" />
      <span className="flex-1 truncate" title={file.fileName}>
        {file.fileName}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setConfirmOpen(true)}
        aria-label="Delete file"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this file?"
        description="The file will be removed from this case. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => onDelete(file.id)}
      />
    </div>
  );
}
```

**`EvidenceDropzone.tsx`** — gold-bordered dashed surface, drag-and-drop with `react-dropzone` (already a dep):

```tsx
"use client";

import { useDropzone } from "react-dropzone";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  onFiles: (files: File[]) => void;
  uploading: boolean;
  disabled?: boolean;
}

export function EvidenceDropzone({ onFiles, uploading, disabled }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"], "image/*": [".jpg", ".jpeg", ".png", ".gif"] },
    onDrop: onFiles,
    disabled: disabled || uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-[var(--radius-md)] px-4 py-6 text-center transition-colors cursor-pointer",
        isDragActive
          ? "border-gold-500 bg-gold-500/10"
          : "border-line-strong bg-ink-800 hover:border-gold-500/40 hover:bg-ink-700",
        (disabled || uploading) && "opacity-50 cursor-not-allowed",
      )}
    >
      <input {...getInputProps()} />
      <div className="flex items-center justify-center gap-2 text-sm text-ink-300">
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-gold-500" />
            <span>Uploading…</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 text-ink-400" />
            <span>{isDragActive ? "Drop files here" : "Drop files or click to upload"}</span>
          </>
        )}
      </div>
    </div>
  );
}
```

**`EvidenceTypeCard.tsx`** — collapsed and expanded states:

```tsx
"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { CaseFile, CaseEvidenceType } from "@/types/case";
import { cn } from "@/lib/utils/cn";
import { EvidenceDropzone } from "./EvidenceDropzone";
import { EvidenceFileRow } from "./EvidenceFileRow";

interface Props {
  type: CaseEvidenceType;
  files: CaseFile[];
  uploading: boolean;
  expanded: boolean;
  onToggle: () => void;
  onUpload: (files: File[]) => void;
  onDelete: (fileId: string) => Promise<void>;
}

export function EvidenceTypeCard({
  type,
  files,
  uploading,
  expanded,
  onToggle,
  onUpload,
  onDelete,
}: Props) {
  const count = files.length;
  return (
    <Card variant={expanded ? "chrome-raised" : "chrome"} className={cn(expanded && "md:col-span-2 lg:col-span-3")}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-ink-100">{type.title || "Untitled"}</h3>
          {type.description && (
            <p className="text-xs text-ink-400 mt-1 line-clamp-2">{type.description}</p>
          )}
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-gold-500" />
            ))}
            <span className="ml-1.5 text-xs text-ink-400">
              {count === 0 ? "no files" : `${count} file${count === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-ink-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-ink-400 shrink-0" />
        )}
      </button>

      {expanded && (
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

**`AddCustomTypeRow.tsx`** — inline edit form for adding/editing custom evidence types:

```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Input, Textarea } from "@/components/ui";

interface Props {
  onCreate: (title: string, description: string) => Promise<void>;
}

export function AddCustomTypeRow({ onCreate }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onCreate(title.trim(), description.trim());
      setTitle("");
      setDescription("");
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <Button variant="ghost" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing(true)}>
        Add custom evidence type
      </Button>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-line-gold bg-ink-800 p-3 space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Type title" />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={save} loading={busy} disabled={!title.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}
```

**`index.tsx`** — the orchestrator. Reads the original `Step1Evidence.tsx` to copy verbatim: the fetch+update logic for evidence types, `uploadFile`, `handleFileUpload`, `handleDeleteFile`, `addNewRow`/`saveEditing`, the token-balance pre-check, the size pre-check, the AI-split-drawer wiring, and the `onPendingUploadsChange` lift. Replace the inline modals with `<FileSizeDialog />` and `<InsufficientBalanceDialog />`. Replace the table with the bento grid. Render `<EvidenceTypeCard />` for each type and track `expandedKey` state.

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Scissors } from "lucide-react";
import {
  SectionHeader,
  Button,
  ConfirmDialog,
  Shimmer,
} from "@/components/ui";
import { Case, CaseEvidenceType, CaseFile } from "@/types/case";
import PdfSplitDrawer from "../../PdfSplitDrawer";
import { FileSizeDialog } from "@/components/modals/FileSizeDialog";
import { InsufficientBalanceDialog } from "@/components/modals/InsufficientBalanceDialog";
import { EvidenceTypeCard } from "./EvidenceTypeCard";
import { AddCustomTypeRow } from "./AddCustomTypeRow";

interface EvidenceState {
  files: File[];
  uploading: boolean;
  uploadedFiles: CaseFile[];
  showSuccess: boolean;
}

interface Props {
  caseData: Case;
  onPendingUploadsChange?: (hasPending: boolean) => void;
}

export default function Step1Evidence({ caseData, onPendingUploadsChange }: Props) {
  // … (state, fetch evidence types, expandedKey, dialogs)
  // PORT the body of the legacy Step1Evidence.tsx, replacing:
  //   - the <table> markup with: <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{types.map(t => <EvidenceTypeCard ... />)}</div>
  //   - the file-size modal with <FileSizeDialog />
  //   - the insufficient-balance modal with <InsufficientBalanceDialog />
  //   - the inline add-row with <AddCustomTypeRow />
  //   - the AI-Split-PDF button (top-right of section header) with a gold-accent ghost <Button>
  //   - window.confirm in handleDeleteFile → already handled by EvidenceFileRow's ConfirmDialog
  // Keep uploadFile, handleFileUpload, addNewRow, saveEditing exactly.
  // ...
}
```

The implementer should refer to the existing `Step1Evidence.tsx` for the exact API calls and state machine, but lay out the UI per the new structure.

**Test** (`tests/components/Step1Evidence.test.tsx`):

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Step1Evidence from "@/components/steps/Step1Evidence";

// Mock fetch for evidence types
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [
        { id: "1", key: "medical", title: "Medical records", description: "Reports", isDefault: true, displayOrder: 1, caseId: "c1" },
      ],
    }),
  }) as any;
});

const sample = {
  id: "c1",
  title: "X",
  caseType: "SOC",
  status: "draft",
  parties: [],
  court: "",
  caseNumber: "",
  files: [],
} as any;

describe("Step1Evidence", () => {
  it("renders section header and at least one type card", async () => {
    render(<Step1Evidence caseData={sample} />);
    expect(screen.getByText(/Evidence/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Medical records/)).toBeInTheDocument();
    });
  });
});
```

Verify build + test pass.

**Commit:**

```
git rm components/steps/Step1Evidence.tsx
git add components/steps/Step1Evidence/
git add tests/components/Step1Evidence.test.tsx
git commit -m "feat(ui): restructure Step1Evidence as bento grid with focused sub-components"
```

---

## Task 11: Step 2 Process — timeline

**Files:**
- Create: `components/steps/Step2Process/index.tsx`
- Create: `components/steps/Step2Process/FileTimelineRow.tsx`
- Create: `tests/components/Step2Process.test.tsx`
- Delete: `components/steps/Step2Process.tsx`

### Behavior preserved

- Fetch case files + their `processingStatus` (`pending`, `processing`, `completed`, `failed`)
- Polling cadence and refresh mechanism that exists in legacy Step2 (read the legacy file to copy verbatim)
- `onIncompleteFilesChange(hasIncomplete, hasProcessing, hasFailed)` callback signature
- Retry handler for failed files (existing API endpoint)
- File counts and OCR completion ✓ summary

### Structure

```
┌─ SectionHeader ─────────────────────────────────────────┐
│ Process evidence                                         │
│ Vakil is reading every page. This takes a minute or two. │
└─────────────────────────────────────────────────────────┘

TIMELINE  (vertical list, ink-800 cards w/ status icons)
  ◉ medical-report-aug.pdf       ✓ Ready · 12 pages · 4s
  ◐ contract-master.pdf          …Processing page 14/47   ← ScanLine
  △ x-rays.pdf                   Retry · file blank

Footer chip: "All ready ✓" (gold pulse once when last completes)
```

**`FileTimelineRow.tsx`**: 80-LOC row component with the four states (queued/processing/complete/failed). The processing row renders a `<ScanLine />` overlay. The failed row exposes a Retry button. Status icon is a Lucide `Circle`, `Loader2`, `CheckCircle`, or `AlertTriangle`.

**`index.tsx`**: orchestrator. Port the legacy file's effects + state machine; replace the per-file render with `<FileTimelineRow />`.

**Test**: smoke — renders the section header and at least one row given a mocked case file response.

**Commit:**

```
git rm components/steps/Step2Process.tsx
git add components/steps/Step2Process/ tests/components/Step2Process.test.tsx
git commit -m "feat(ui): restructure Step2Process as vertical timeline with scan-line on active row"
```

---

## Task 12: Step 3 Particulars — paper canvas + DocumentToolbar

**Files:**
- Create: `components/steps/Step3Particulars/index.tsx`
- Create: `components/steps/Step3Particulars/DocumentToolbar.tsx`
- Create: `tests/components/Step3Particulars.test.tsx`
- Delete: `components/steps/Step3Particulars.tsx`

### Behavior preserved

- Fetch particulars from `/api/case_analysis/[id]/particulars` (or whatever endpoint the legacy file uses — copy it)
- Generate particulars: legacy POST endpoint and SSE handling preserved
- `handleSave` flow (PATCH to save edited markdown)
- `handleRegenerate` flow → open `RegenerateDialog`
- `setIsEditing(true)` mounts the `MdxEditor`, `setIsEditing(false)` mounts the `MdxRenderer`
- `onGeneratingStateChange` and `onEditingStateChange` callbacks
- `onNextStep` advances the wizard

### Structure

```
┌─ SectionHeader ────────────────────────────────────────┐
│ Particulars                                             │
│ AI extracted from your evidence · review before drafting│
└────────────────────────────────────────────────────────┘

<DocumentToolbar>  (sticky to top, ink-900 background)
  [⟳ Regenerate]  [✎ Edit]  [✓ Looks good — continue]
  Saved · click Edit to revise
</DocumentToolbar>

<Card variant="cream-paper" className="px-10 py-12 max-w-3xl mx-auto">
  {isEditing ? <MdxEditorComponent /> : <MdxRenderer content={...} />}
</Card>

<RegenerateDialog ... />
```

**`DocumentToolbar.tsx`** (~50 LOC):

```tsx
"use client";

import { RefreshCw, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui";

interface Props {
  status: "saved" | "editing" | "saving" | "generating";
  onRegenerate: () => void;
  onToggleEdit: () => void;
  onContinue?: () => void;
  hideContinue?: boolean;
}

export function DocumentToolbar({ status, onRegenerate, onToggleEdit, onContinue, hideContinue }: Props) {
  return (
    <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-ink-900/95 backdrop-blur border-b border-line-soft mb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={onRegenerate}
            disabled={status === "generating" || status === "saving"}
          >
            Regenerate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Edit2 className="h-4 w-4" />}
            onClick={onToggleEdit}
            disabled={status === "generating" || status === "saving"}
          >
            {status === "editing" ? "Save" : "Edit"}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-400">
            {status === "saving" && "Saving…"}
            {status === "saved" && "Saved · click Edit to revise"}
            {status === "editing" && "Editing — click Save when done"}
            {status === "generating" && "Vakil is drafting…"}
          </span>
          {!hideContinue && onContinue && (
            <Button size="sm" leftIcon={<Check className="h-4 w-4" />} onClick={onContinue}>
              Looks good — continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**`index.tsx`** — port the legacy `Step3Particulars.tsx` body, replacing only the visual envelope:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import MdxRenderer from "../../MdxRenderer";
import dynamic from "next/dynamic";
import Citation from "../../Citation";
import MdxEditorComponent from "../../MdxEditor";

import { SectionHeader, Card, Shimmer } from "@/components/ui";
import { DocumentToolbar } from "./DocumentToolbar";
import { RegenerateDialog } from "@/components/modals/RegenerateDialog";

// Keep the dynamic imports from the legacy file but swap saffron→gold spinner
const Editor = dynamic(
  () => import("@toast-ui/react-editor").then((m) => m.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
);

interface Step3Props {
  caseId: string;
  action?: string | null;
  generatedContent?: string | null;
  onGenerateContent?: (action: string) => void;
  onGeneratingStateChange?: (isGenerating: boolean) => void;
  onEditingStateChange?: (isEditing: boolean) => void;
  onNextStep?: () => void;
}

export default function Step3Particulars(props: Step3Props) {
  // === Port the legacy file's state machine verbatim ===
  // particularsContent, originalParticularsContent, isGeneratingParticulars,
  // hasGeneratedParticulars, isRegenerateModalOpen → renamed regenerateOpen,
  // isEditing, isSaving, isLoadingFromDatabase, errorMessage,
  // showInsufficientBalanceModal, etc.
  // Port all useEffects + handlers exactly.
  // Replace JSX wrappers with the new layout described above.
  // ...
  return null; // placeholder — implementer fills in
}
```

The implementer must read `components/steps/Step3Particulars.tsx` carefully and translate the entire body. Only the JSX shell changes — every fetch/save/regenerate/SSE handler stays.

**Test**: smoke (renders header + paper canvas placeholder when no content yet).

**Commit:**

```
git rm components/steps/Step3Particulars.tsx
git add components/steps/Step3Particulars/ tests/components/Step3Particulars.test.tsx
git commit -m "feat(ui): restructure Step3Particulars on cream paper canvas + DocumentToolbar"
```

---

## Task 13: Step 4 Chronology

**Files:**
- Create: `components/steps/Step4Chronology/index.tsx`
- Create: `tests/components/Step4Chronology.test.tsx`
- Delete: `components/steps/Step4Chronology.tsx`

Same shape as Task 12. Reuses `DocumentToolbar` from `Step3Particulars/`:

```tsx
import { DocumentToolbar } from "../Step3Particulars/DocumentToolbar";
```

Substitute:
- Title: "Chronology"
- Subtitle: "AI extracted timeline of events · review before drafting"
- API endpoints: chronology equivalents (read legacy file)
- `RegenerateDialog documentType="chronology"`
- Callback: `onEditingStateChange` mapped to `isEditingChronology` via the page

**Commit:**

```
git rm components/steps/Step4Chronology.tsx
git add components/steps/Step4Chronology/ tests/components/Step4Chronology.test.tsx
git commit -m "feat(ui): restructure Step4Chronology on cream paper canvas"
```

---

## Task 14: Delete legacy Regenerate*Modal files

**Files:**
- Delete: `components/modals/RegenerateModal.tsx`
- Delete: `components/modals/RegenerateParticularsModal.tsx`
- Delete: `components/modals/RegenerateChronologyModal.tsx`

- [ ] **Step 14.1: Confirm no imports remain**

```bash
grep -rE "from\s+['\"]@/components/modals/Regenerate(|Particulars|Chronology)Modal" --include="*.tsx" --include="*.ts" .
```
Expected: empty.

If anything remains, STOP and report — Step 5 Review may still import `RegenerateModal`. If so, defer this task to Phase E and skip to Task 15.

- [ ] **Step 14.2: Delete + commit**

```
git rm components/modals/RegenerateModal.tsx components/modals/RegenerateParticularsModal.tsx components/modals/RegenerateChronologyModal.tsx
git commit -m "chore(ui): delete legacy Regenerate*Modal in favour of RegenerateDialog"
```

---

## Task 15: Final verification + PR

- [ ] **Step 15.1: Tests + build**

```bash
npm test 2>&1 | tail -10
npm run build 2>&1 | tail -10
```

- [ ] **Step 15.2: Token sweep**

```bash
grep -rE "(bg|text|border)-(blue|gray|red|green|yellow|indigo)-[0-9]" components/wizard components/steps components/modals app/case 2>/dev/null
```
Expected: empty.

- [ ] **Step 15.3: Phase D/E surfaces untouched**

```bash
git diff --stat main..HEAD -- components/PdfSplit*.tsx components/SplitRangeDisplay.tsx components/tabs components/Step5Review.tsx components/MdxEditor.tsx components/MdxRenderer.tsx components/Hoverable.tsx components/Citation.tsx components/PDFViewerModal.tsx
```
Expected: empty.

- [ ] **Step 15.4: Commit log overview**

```bash
git log --oneline main..HEAD
```

- [ ] **Step 15.5: Open PR**

```bash
git push -u origin feat/phase-c-wizard-shell-and-steps
"/c/Program Files/GitHub CLI/gh.exe" pr create --title "feat(ui): Phase C · wizard shell + Steps 1–4" --body "$(cat <<'EOF'
## Summary
- New CaseShell + CaseHeader + StepRail + WizardFooter
- Wizard page rewritten on left-rail stepper (all guards preserved)
- RegenerateDialog parameterised by document type (replaces 3 legacy modals)
- FileSizeDialog + InsufficientBalanceDialog on Dialog primitive
- Step 1 Evidence restructured as bento grid with EvidenceTypeCard / Dropzone / FileRow / AddCustomTypeRow
- Step 2 Process restructured as vertical timeline with scan-line on active row
- Steps 3/4 wrapped in cream-paper canvas with DocumentToolbar
- Legacy Regenerate*Modal files deleted

No Step 5 Review / PDF Split / MDX-internal changes — Phases D and E.

## Test plan
- [x] npm test green
- [x] npm run build clean
- [ ] Walk a real case through steps 1→4 with the seeded user
- [ ] Verify regenerate, save, edit transitions on Steps 3 + 4
- [ ] Verify file upload, AI-split drawer still opens (Phase D rewires it)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

(Controller may merge with `gh pr merge <n> --merge --delete-branch`.)

---

## Self-review

**Spec coverage:**
- §4 CaseShell + StepRail + WizardFooter → Tasks 2–5 ✓
- §6 Step 1 bento → Task 10 ✓
- §6 Step 2 timeline → Task 11 ✓
- §6 Steps 3/4 cream paper + toolbar → Tasks 12–13 ✓
- §9 RegenerateDialog → Task 6, FileSizeDialog → Task 7, InsufficientBalanceDialog → Task 8 ✓

**Placeholder scan:** Task 10's `index.tsx` and Tasks 11–13's `index.tsx` are intentionally outlines — implementers must port the legacy file's body verbatim. The plan is explicit about that and lists each handler that must survive. This is a deliberate "verbatim port" instruction, not a TBD.

**Type consistency:** `RailStep`, `CaseHeader caseData: Case`, `CaseShell` props all align. The wizard guard callback signatures (`onPendingUploadsChange(hasPending)`, `onIncompleteFilesChange(hasIncomplete, hasProcessing, hasFailed)`, etc.) match the existing page's expectations.

**Open follow-ups for Phase E:**
- MDX renderer/editor cream-paper variant — Phase E
- `Hoverable`, `Citation` cream-paper-aware re-skin — Phase E
- Step 5 Review entire rebuild — Phase E
- Toolbar buttons inside `MdxEditor` may still feel slightly off-brand on cream paper — Phase E polish
