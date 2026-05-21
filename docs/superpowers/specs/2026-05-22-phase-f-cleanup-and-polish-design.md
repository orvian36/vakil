# Phase F — Cleanup & Polish · Design Spec

**Date:** 2026-05-22
**Branch (target):** `feat/phase-f-cleanup-and-polish` → `main`
**Predecessors:** Phases A–E (PRs #8–#12, all merged)

---

## 1. Purpose

The Editorial Court redesign (Phases A–E) shipped the visual language and primitive library across the whole app. This phase removes the LLM-balance verification scaffolding that never had a backing route, restores the AI-Split workshop's editable from/to page numbers, lands a consistent failure state for the document canvases, and ships the three follow-ups flagged in PR #12.

It is intentionally **one consolidated phase**: every concern is localized to 1–4 files, and a single review surface keeps the test sweep cheap.

## 2. Decisions (brainstorming outcomes)

| Question | Decision |
|---|---|
| Shipping cadence | One consolidated Phase F PR |
| Split workshop inputs | Editable number inputs inline in each Segment card; changes recompute cuts |
| Failure visual on canvas | Centered ErrorState inside the same cream-paper card |
| Step rail collapse | Collapse to ~56px icon-only rail, chevron toggle, persisted to localStorage |
| Token-removal scope | LLM-balance verification only. JWT auth (middleware, lib/auth, login/register) stays untouched |
| Evidence-type edit | Pencil button on hover/active card → inline-edit title + description |
| ⌘K | Global search dialog over cases + quick actions |
| PDFViewerModal rename | Rename file + class **and** wrap in the Dialog primitive |

## 3. Work items

The phase is structured as seven independent work items (F1–F7). Each is a self-contained unit with its own files, tests, and a Conventional Commit. They can land in any order within the phase branch.

### F1 — Strip LLM-balance verification

**Goal:** No code path in the app calls `/api/tokens/verify` or `/api/tokens/deduct`, and no UI surface signals an "insufficient balance" state. JWT access-token auth is preserved verbatim.

**Files modified:**
- `components/steps/Step1Evidence/index.tsx` — remove the `/api/tokens/verify` pre-check block (lines ~177–194), remove `showInsufficientBalanceDialog` state, remove `<InsufficientBalanceDialog>` mount, remove the `InsufficientBalanceDialog` import.
- `components/steps/Step3Particulars/index.tsx` — same.
- `components/steps/Step4Chronology/index.tsx` — same.
- `components/review/ReviewLayout.tsx` — same.
- `app/api/analyze-pdf-split/route.ts` — remove the `/api/tokens/deduct` fetch and the surrounding try-catch; replace with a comment-free no-op (request succeeds as before from the user's view).
- `services/pdfAnalysisService.ts` — same removal of the deduct call.

**Files deleted:**
- `components/modals/InsufficientBalanceDialog.tsx`
- `tests/components/InsufficientBalanceDialog.test.tsx`

**Test impact:** Existing step tests don't mock the verify route, so the network call currently runs against a non-existent endpoint and fails the `result.is_enough_balance` truthiness check, blocking the rest of the flow. Removal will make those flows reach their generate endpoints. Tests that assert "balance dialog appears" must be deleted (the dedicated InsufficientBalanceDialog test); step tests that didn't mock verify must be updated to add the missing mocks for downstream calls.

**Out of scope (explicit):** `middleware.ts`, `lib/auth/*`, `app/api/auth/*`, `useAuth`, `login`/`register` pages. None of these are LLM-balance related.

### F2 — Restore from/to page inputs in Split workshop

**Goal:** Each segment card in the workshop shows two small editable number inputs (From / To) alongside Name + Category. Editing them recomputes the cut boundaries so the viewer stays in sync.

**Key invariant:** Segments are derived from cuts; the cuts model is canonical. Editing from/to must round-trip through cuts, not bypass them.

**Conversion logic:**
- Segment `i` spans pages `cuts[i-1]+1` through `cuts[i]` (with `cuts[-1] = 0` and `cuts[n] = totalPages`).
- Editing `fromPage` on segment `i`: replaces the `cuts[i-1]` boundary with `fromPage - 1` (and shifts the previous segment's `toPage` accordingly).
- Editing `toPage` on segment `i`: replaces the `cuts[i]` boundary with `toPage` (and shifts the next segment's `fromPage` accordingly).
- Invalid edits (from > to, from <= prior segment's from, to >= next segment's to, from < 1, to > totalPages) display inline validation; cuts are not mutated until valid.

**Files modified:**
- `components/pdf-split/SegmentRow.tsx` — replace the static `Pages X–Y` label with two `<Input type="number">` inputs in a row. Add a `onPageRangeChange(from: number, to: number)` callback. Keep Name + Category. Add per-row validation error display via `error` prop on `Input`.
- `components/pdf-split/Workshop.tsx` — add `handlePageRangeChange(segmentId, fromPage, toPage)` that:
  1. Validates against neighbors and totalPages.
  2. Computes the new cut set.
  3. Calls `cutsToSegments(...)` and updates state.
- `components/pdf-split/types.ts` — no schema change; `Segment.fromPage`/`toPage` are already part of the type.

**Files added:**
- `lib/pdf-split/cutsFromPageRange.ts` — pure helper exposing `applyPageRangeEdit(segments, cuts, segmentId, fromPage, toPage, totalPages): { cuts: Set<number>; segments: Segment[]; error?: string }`. Unit-tested in isolation.

**Test impact:**
- New `tests/lib/pdf-split/cutsFromPageRange.test.ts` covering: valid from edit, valid to edit, invalid (from > to), invalid (collides with neighbor), invalid (out of bounds), preserves names + categories on adjacent segments.
- Update `tests/components/pdf-split/SegmentRow.test.tsx` (if it exists) to assert the new inputs render and fire the callback.

### F3 — Collapsible step rail

**Goal:** Users can collapse the wizard's left rail to a narrow icon-only column to maximize working area. State persists across navigations.

**Visual states:**
- **Expanded** (default, current): 240px, full step titles and meta, current state and gold accent intact.
- **Collapsed**: ~56px, only the numbered/checked circles visible, vertical layout intact, current step still gets its gold accent bar on the left. Step title becomes a `Tooltip` on hover.

**Toggle UX:**
- A small chevron button sits at the top-right of the rail surface (a few pixels of padding inside the rail). Icon: `ChevronLeft` when expanded, `ChevronRight` when collapsed. `aria-label="Collapse steps"` / `"Expand steps"`.
- Click toggles state. State is persisted to `localStorage.vakil_step_rail_collapsed` and read on mount.
- Transition: width animates over 200ms using the existing `springSoft` duration token; respects `prefers-reduced-motion` via the existing MotionConfig in AppShell.

**Files modified:**
- `components/wizard/StepRail.tsx` — adds the `collapsed` state, the chevron toggle button, localStorage read/write, and a `cn(...)` width switch (`w-60` ↔ `w-14`). Passes `collapsed` down to `StepRailItem`.
- `components/wizard/StepRailItem.tsx` — accepts `collapsed?: boolean`. When collapsed: hide the text block and meta, keep only the circle, wrap the circle in `Tooltip` showing `{step.title}` to the right.

**Files added:** None.

**Test impact:** Add `tests/components/StepRail.collapsed.test.tsx` covering: toggle button rendered, click switches width class, title hidden when collapsed, localStorage persistence.

### F4 — ErrorState component + apply to steps 3/4/5

**Goal:** When generation fails on the document canvases (Particulars, Chronology, Review), the cream-paper card itself shows the failure with a centered icon, headline, message, and Retry button — instead of the current empty-text fallback.

**New primitive:** `components/ui/ErrorState.tsx`
- Props: `title?: string; message?: string; onRetry?: () => void; variant?: 'paper' | 'ink';`
- Layout: centered column with an `AlertOctagon` icon (`text-rose-500`), a display-font headline (default: "Generation failed"), a body paragraph (token-aware ink color), and an optional `<Button>` for Retry.
- `variant='paper'` uses `text-paper-ink` family tokens; `variant='ink'` uses `text-ink-100`.

**Files modified:**
- `components/steps/Step3Particulars/index.tsx` — replace the rose-banner block AND the empty-state block with a single conditional: if `errorMessage` → render `<ErrorState variant="paper" title="Particulars failed" message={errorMessage} onRetry={...} />` inside the Card. Otherwise empty-state copy stays as-is.
- `components/steps/Step4Chronology/index.tsx` — same pattern.
- `components/review/ReviewLayout.tsx` — when `error && !isGenerating && activeId's content is empty`, the active tab renders `<ErrorState variant="paper" ... onRetry={handleRetryGeneration} />` inside the PaperCanvas. The existing `ErrorDialog` stays (covers the "I clicked Regenerate and the stream blew up" mid-flight error).

**Files added:**
- `components/ui/ErrorState.tsx`
- Export from `components/ui/index.ts`.

**Test impact:**
- New `tests/components/ErrorState.test.tsx`.
- Step3/Step4/ReviewLayout tests: add cases that assert the ErrorState renders when the generation endpoint returns 500.

### F5 — Inline edit affordance for custom evidence types

**Goal:** Users can rename and re-describe custom evidence types from the Step 1 cards. The PATCH endpoint at `app/api/cases/[id]/evidence-types/route.ts` already exists.

**UX:**
- On the `EvidenceTypeCard` for **custom** types only (default types remain non-editable, matching the API constraint), a pencil `<Button size="icon" variant="ghost">` appears in the card's top-right corner on hover or when the card is expanded.
- Click toggles an inline edit mode: the `<h3>{type.title}</h3>` and `<p>{type.description}</p>` swap to `<Input>` and `<Textarea>` (Textarea primitive exists), with Save / Cancel buttons appended.
- Save calls `PATCH /api/cases/{caseId}/evidence-types` with `{ evidenceTypeId, title, description }`. On success the parent reloads evidence types; on failure show an inline error below the inputs.
- Cancel reverts.
- Pressing Enter in the title input commits; Escape cancels.

**Identifying "custom"**: `CaseEvidenceType.isDefault: boolean` (confirmed in `prisma/schema.prisma` and exposed by `services/evidenceTypeService.ts.getEvidenceTypesByCase`). The pencil renders only when `!type.isDefault`. The PATCH endpoint already enforces "cannot update default" — the UI mirror is purely a hiding rule.

**Files modified:**
- `components/steps/Step1Evidence/EvidenceTypeCard.tsx` — add edit mode, pencil button, Save/Cancel handlers, parent callback `onRename(typeId, title, description)`.
- `components/steps/Step1Evidence/index.tsx` — add `handleRenameType(typeId, title, description)` that calls the PATCH and refetches.

**Files added:** None.

**Test impact:** New tests assert: pencil renders only for custom; click → input swap; Save → PATCH call; Cancel → revert; Escape → cancel; Enter → save.

### F6 — Rename PDFViewerModal → PdfViewerDialog (Dialog primitive)

**Goal:** The bespoke PDF viewer modal uses the same Dialog primitive as the rest of the app, gaining focus trap, Escape handling, and the consistent animation tokens.

**Migration:**
- Rename `components/PDFViewerModal.tsx` → `components/PdfViewerDialog.tsx`.
- Default export renamed: `PDFViewerModal` → `PdfViewerDialog`.
- Replace the bespoke overlay (likely a `<div className="fixed inset-0 ...">`) with `<Dialog open={isOpen} onOpenChange={...}>` from `components/ui/Dialog.tsx`. The interior keeps its viewer + side-panel structure verbatim.
- Update three (verified) import sites: `app/case/[case_id]/page.tsx` if used, Step1Evidence flow if used — exact list to confirm during implementation via grep.

**Files modified:**
- All call sites: update import path + identifier.

**Files added:** None.
**Files deleted:** The old `components/PDFViewerModal.tsx`.

**Test impact:** Update any existing PDFViewerModal test file's import path + identifier. The behavior contract (open/close, file index, save callback) is unchanged.

### F7 — ⌘K global search dialog

**Goal:** Anywhere in the authed app, pressing `⌘K` (macOS) / `Ctrl+K` (Win) opens a search dialog over cases + quick actions. The dashboard's inline search input stays as a secondary affordance.

**Component:** `components/dashboard/CommandPalette.tsx`
- Built on the Dialog primitive.
- Input at the top, list below. List sections: **Cases** (typeahead over `/api/cases/user/{userId}?search=...`, debounced 200ms) and **Actions** (static: "New case", "Logout").
- Keyboard nav: `↑/↓` moves selection, `Enter` activates, `Escape` closes. Mouse hover also selects.
- Actions dispatch to the same handlers as the dashboard (`router.push('/case/{id}')`, `setCreateOpen(true)`, `/api/auth/logout`).

**Mount point:** `components/layout/AppShell.tsx` — mount the palette globally (so it's available on case pages too). The keyboard listener registers on `window` with `e.metaKey || e.ctrlKey` and `e.key === 'k'`.

**Authoring constraint:** The palette needs `userId` to query cases, but AppShell wraps both authed and unauthed routes. Solution: the palette reads `useAuth().user?.id` and renders **nothing** if no user (i.e., login/register). No flash, no SSR mismatch (`useAuth` is client-only).

**Files added:**
- `components/dashboard/CommandPalette.tsx`
- `tests/components/CommandPalette.test.tsx`

**Files modified:**
- `components/layout/AppShell.tsx` — mount the palette.
- `app/page.tsx` — optionally add a `<kbd>⌘K</kbd>` hint next to the search input (low priority).

## 4. Architecture concerns

**Token-removal blast radius:** F1 touches 4 page-level components but does not change any API contract (the verify endpoint doesn't exist, so removing its callers is purely additive to user success). The remaining "deduct" calls in two backend files are fire-and-forget against a remote URL; removing them is invisible.

**Split workshop state shape:** F2 keeps the existing `cuts: Set<number>` + `segments: Segment[]` model. The new helper is a pure function — no new state, no parallel store. Cuts remain canonical.

**Step rail layout:** F3 changes width but not parent flex behavior; `CaseShell`'s `<main className="flex-1 ...">` already grows to fill. Tests that hard-code `w-60` width assumptions need spot fixes.

**ErrorState boundary:** F4 keeps the cream-paper card mounted in all states (loading → success → failure). This matches the "surface rule" in CLAUDE.md (cream surfaces are reserved for legal-document content). The error becomes the legal-document content in failure mode.

**Evidence-type API edge:** F5 PATCH endpoint already returns 403 for default types. The UI mirrors this by hiding the pencil; if the API rejects anyway (race condition where a type's default-ness changes), we surface the error inline.

**PDF viewer migration:** F6 is mostly mechanical. The risk is that the Dialog primitive sets focus-trap behavior that breaks the Toast UI editor's keyboard handling (the dialog might capture keys the editor wants). Mitigation: configure the Dialog with `modal={true}` but verify Toast editor still handles Tab/Enter correctly during implementation; if not, add `onOpenAutoFocus={(e) => e.preventDefault()}`.

**Command palette + auth:** F7 uses `useAuth` which returns `{ user, isLoading }`. The palette short-circuits to `null` when no user, so it's a no-op on login/register. No global keyboard listener side-effects when unmounted (effect cleans up on unmount).

## 5. Testing strategy

- Tests added: F2 helper (1 file), F3 rail collapse (1 file), F4 ErrorState (1 file) + 3 step tests updated, F5 evidence-type edit (1 file or extending the existing card test), F7 CommandPalette (1 file).
- Tests deleted: `tests/components/InsufficientBalanceDialog.test.tsx`.
- Test infra (vitest projects: node + dom) is unchanged. No new dev dependencies.
- Total expected test count after Phase F: ~135 (current 130 + ~7 new − 2 deleted).

## 6. Out of scope (explicit)

- Migration off SQLite / Vercel deployment compatibility — same out-of-scope as prior phases.
- Any change to JWT auth, refresh-token rotation, login/register flow, or session middleware.
- Any change to the LangGraph orchestration or LLM client.
- Bilingual UI chrome (Bengali remains content-only).
- Custom cursor, magnetic-hover, parallax — same as prior deferral.

## 7. File map

**New files (5):**
- `components/ui/ErrorState.tsx`
- `lib/pdf-split/cutsFromPageRange.ts`
- `components/dashboard/CommandPalette.tsx`
- `components/PdfViewerDialog.tsx` (replacing PDFViewerModal.tsx)
- Spec doc: this file.

**Modified (≈14):**
- `components/steps/Step1Evidence/index.tsx`
- `components/steps/Step1Evidence/EvidenceTypeCard.tsx`
- `components/steps/Step3Particulars/index.tsx`
- `components/steps/Step4Chronology/index.tsx`
- `components/review/ReviewLayout.tsx`
- `components/wizard/StepRail.tsx`
- `components/wizard/StepRailItem.tsx`
- `components/pdf-split/SegmentRow.tsx`
- `components/pdf-split/Workshop.tsx`
- `components/layout/AppShell.tsx`
- `components/ui/index.ts` (export ErrorState)
- `app/api/analyze-pdf-split/route.ts`
- `services/pdfAnalysisService.ts`
- `app/page.tsx` (optional ⌘K hint)

**Deleted (3):**
- `components/PDFViewerModal.tsx` (replaced by PdfViewerDialog.tsx)
- `components/modals/InsufficientBalanceDialog.tsx`
- `tests/components/InsufficientBalanceDialog.test.tsx`

## 8. Commit / PR flow

- Branch off `main`: `feat/phase-f-cleanup-and-polish`.
- One Conventional Commit per work item (F1–F7), in any order. Suggested:
  - `chore(billing): strip LLM-balance verification across the app`
  - `feat(pdf-split): restore editable from/to page inputs in segment cards`
  - `feat(wizard): collapsible step rail with persisted state`
  - `feat(ui): ErrorState primitive; apply to Particulars / Chronology / Review canvases`
  - `feat(evidence): inline edit affordance for custom evidence types`
  - `refactor(pdf-viewer): rename PDFViewerModal → PdfViewerDialog and wrap in Dialog primitive`
  - `feat(ux): ⌘K command palette over cases + actions`
- PR title: `feat: Phase F — cleanup & polish`
- Merge to `main` via `gh pr merge --squash` or fast-forward — match prior phases' pattern.
