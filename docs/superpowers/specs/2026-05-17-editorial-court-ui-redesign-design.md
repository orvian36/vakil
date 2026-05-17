# Editorial Court · Vakil UI/UX Redesign

**Date**: 2026-05-17
**Status**: Design — awaiting user review
**Scope**: Frontend-only. Every user-facing surface. Functionality preserved byte-for-byte.

---

## 1 · Goals & non-goals

### Goals

- One consistent visual language across every screen. The current PDF Split flow (`PdfSplitDrawer`, `PdfSplitter`, `SplitRangeDisplay`) looks like a different app — that ends.
- A premium "Editorial Court" dark theme with cream-paper document surfaces. Legal-product authenticity, distinctive, ergonomic for long reading.
- Cinematic-but-tasteful motion language (framer-motion). Hero moments — AI generation, PDF analysis, step transitions, file upload — have real choreographed motion. Hovers/presses have spring micro-motion. `prefers-reduced-motion` respected throughout.
- A primitive component library (`components/ui/`) so future screens stay consistent by default.
- Better structural UX where it matters: left-rail wizard, editorial dashboard table, split-view PDF workshop, document rail in Review.

### Non-goals

- No backend, API, schema, or LangGraph changes.
- No new product features.
- No localisation work beyond what already exists (English chrome; Bengali only appears as translated witness content).
- No Storybook setup (one demo route in Phase A is enough).
- No drag-to-reorder for PDF segments (page ranges already define order).

### Preserved verbatim

- Auth flow, JWT cookies, refresh token rotation, all API routes and their shapes.
- LangGraph orchestration, streaming, agent statuses, SSE event handling.
- Wizard guards: `hasPendingUploads`, `hasProcessingFiles`, `isEditingParticulars`, `isEditingChronology`, `isGenerating`, `isStepLoading`.
- Localstorage cache of generated content (`orchestration_content_${caseId}`).
- Bengali toggle behavior on Witness Statement.
- Markdown pipeline (`remarkFixVoidTags`, `verify_markdown`).
- Token verification before upload, file size + segment validation.
- All PDF split logic: `performIntelligentAnalysis`, `splitAndDownload`, `splitAndUpload`, oversize handling, custom Blob upload path.

---

## 2 · Design tokens

Replace the cream-default theme in `app/globals.css` with the dark editorial theme. Cream becomes the document-only surface.

### Palette

```
INK (page chrome)
  ink-950   #0A1322   page background
  ink-900   #0F1B2D   second-level surface
  ink-800   #122036   raised cards / sidebars
  ink-700   #1A2B45   hover / active
  ink-600   #243556   selected / pressed
  ink-500   #4F627E   muted text
  ink-400   #7B8DA8   placeholders
  ink-300   #B8C3D6   chrome body text
  ink-100   #E8DEC9   high-emphasis chrome text (warm)

GOLD (accent — confident, sparing)
  gold-300  #F4C988   hover / glow
  gold-500  #F0B040   primary accent, CTAs, active state
  gold-700  #B07A1F   pressed, focus ring base

CREAM (DOCUMENT SURFACES ONLY)
  cream-50  #FAF7F2   document paper
  cream-100 #F3EDE2   raised paper / chip
  cream-200 #E8DEC9   inked paper accent
  paper-ink #0F1B2D   text on cream paper

STATE
  emerald-500 #2F8F6F   success / drafted
  rose-500    #C44A4A   error / destructive
  amber-500   #E0A92B   processing / pending

LINES
  line-soft     rgba(232, 222, 201, 0.08)
  line-strong   rgba(232, 222, 201, 0.18)
  line-gold     rgba(240, 176, 64, 0.40)
  line-paper    rgba(15, 27, 45, 0.08)   /* for cream surfaces */
```

### Typography

Fonts unchanged (`Fraunces` display, `Inter` body, both loaded in `app/layout.tsx`). New scale:

```
display-2xl  Fraunces  64/68  w400  tracking -2%    (hero only)
display-xl   Fraunces  48/56  w400  tracking -2%
display-lg   Fraunces  36/44  w500  tracking -1.5%
display-md   Fraunces  28/36  w500  tracking -1%
title-lg     Fraunces  22/30  w500
title-md     Fraunces  18/26  w500
body-lg      Inter     16/26  w400
body-md      Inter     14/22  w400   (default)
body-sm      Inter     13/20  w400
label        Inter     12/16  w500  tracking +4%  UPPERCASE
mono         JetBrains 13/20  w400
```

Add JetBrains Mono via `next/font/google` alongside the existing fonts.

### Radii

```
radius-pill    9999px   chips, status pills
radius-md      10px     buttons, inputs
radius-lg      14px     cards, dialogs, dropzones
radius-xl      20px     cream paper documents
radius-2xl     28px     hero spotlight on dashboard
```

### Motion tokens

```
ease-out-quint   cubic-bezier(0.22, 1, 0.36, 1)
ease-stage       cubic-bezier(0.16, 1, 0.3, 1)

duration-fast    120ms   button presses, dropdown reveals
duration-base    200ms   most fades / slides
duration-slow    420ms   stage reveals
duration-cine    700ms   AI document materialise

spring-soft      { stiffness: 220, damping: 28 }   default hover / press
spring-stage     { stiffness: 180, damping: 30, mass: 1 }   step transitions
spring-paper     { stiffness: 140, damping: 24 }   document reveal
```

### Motion choreography

| Moment | Behavior |
|---|---|
| Page enter | content fade-up 12px, 200ms, staggered children 40ms |
| Wizard step change | rail dot fills gold w/ spring, content cross-fades 320ms, footer re-balances |
| AI document materialise | gold scan-line travels top→bottom over cream paper as MDX streams in; Fraunces title fades up first |
| File upload accepted | dropzone pulses gold once, then card spring-drops into the file list w/ check mark |
| PDF analysis (split flow) | gold horizontal scan beam moves down the PDF viewer; segments fade in as suggestions land |
| Modal open | scrim fade 160ms; modal scale 0.96→1, fade-up 12px, 220ms, ease-stage |
| Card hover | border transitions line-soft → line-gold over 180ms; subtle translateY(-1px) |
| Destructive confirm | rose pulse |
| `prefers-reduced-motion` | all transforms become opacity-only fades; cinematic reveals capped at 200ms |

### Surfaces & elevation

```
chrome surface:   ink-800 bg, line-soft border, no shadow
chrome raised:    ink-700 bg, line-strong border, no shadow
gold-accent:      ink-800 bg, 1px line-gold border, gold-500/8 inner glow
cream document:   cream-50 bg, line-paper hairline,
                  0 24px 48px rgba(0,0,0,0.35) shadow
                  (the only shadow in the whole app — the signature)
```

### Where tokens live

- Tokens defined in `app/globals.css` under `@theme` (Tailwind v4 pattern, same as today).
- Motion tokens in `lib/motion.ts` exporting typed framer-motion presets (`spring`, `transitions`, `variants`).
- `tailwind.config` not used (Tailwind v4 inline theme — already the pattern).

---

## 3 · Component primitives (`components/ui/`)

Every screen rebuilds on these. Each primitive ~80–150 LOC, headless, variants via a small CVA helper in `lib/utils/cva.ts` (~20 LOC, no new dependency).

| File | Variants / notes |
|---|---|
| `Button.tsx` | `primary` (gold) · `secondary` (ink-700) · `ghost` · `destructive` (rose) · `link`. Sizes `sm/md/lg/icon`. Loading w/ spinner. `leftIcon`/`rightIcon`. Spring press scale 0.97. |
| `Input.tsx` | Text input, leading/trailing icon, error state, helper text, gold focus ring. |
| `Textarea.tsx` | Auto-grow to N lines. |
| `Select.tsx` | Headless trigger + portal menu, keyboard nav. Used by category picker, evidence type picker. |
| `Checkbox.tsx` + `Radio.tsx` | Gold accent. |
| `Switch.tsx` | Used by Witness En ⌁ বাংলা toggle. |
| `Card.tsx` | Surface variants: `chrome` · `chrome-raised` · `gold-accent` · `cream-paper`. Optional title (Fraunces) + meta + actions slot. |
| `StatusPill.tsx` | `draft` · `drafting` · `drafted` · `processing` · `complete` · `failed` · `ai-suggested` (gold). |
| `Tabs.tsx` | Headless. Gold underline indicator animates between tabs (`layoutId`). |
| `Dialog.tsx` | Scrim + content, focus trap, esc-close, built-in cinematic open/close. Sizes `sm/md/lg/full`. |
| `Drawer.tsx` | Side-sheet variant (fallback / future utility). |
| `Tooltip.tsx` | Chrome tooltips. Cream paper keeps its own `Hoverable` for citations. |
| `Toast.tsx` + `ToastProvider` | Replaces every `alert()` and the DOM-injected yellow notification in `PdfSplitDrawer`. Variants `info/success/warn/error/ai`. |
| `ConfirmDialog.tsx` | Wraps `Dialog`. Replaces every `window.confirm()`. |
| `EmptyState.tsx` | Standard "no cases / no files / no documents yet." |
| `SectionHeader.tsx` | Fraunces title + meta + actions row. Top of every step and modal. |
| `ScanLine.tsx` | The gold scan-line primitive. Used by AI document materialise and PDF analysis. |
| `Shimmer.tsx` | Skeleton primitive. |
| `KeyboardHint.tsx` | `⌘K`-style chip; dashboard search and future shortcuts. |

### Existing component disposition

| Current | What happens |
|---|---|
| `CreateCaseModal`, `EditCaseModal` | Rewritten on `Dialog` + `Input` + `Button`. Create becomes a 2-step internal flow (basics → parties). |
| `modals/Regenerate*Modal` (3 files) | Collapsed into one `RegenerateDialog` parameterised by `documentType`. |
| `PDFViewerModal` | Wraps `Dialog size="full"`. |
| `Navbar`, `Footer` | Restyled. Navbar gains a `⌘K` search chip. |
| `FileRow` | Folded into a new `EvidenceFileRow` inside Step 1. |
| `Hoverable`, `Citation` | Restyled — cream-paper-aware (they only appear inside document surfaces). |
| `MdxRenderer`, `MdxEditor` | Theme-aware: cream-paper variant default. |
| `SplitRangeDisplay`, `PdfSplitter` | **Deleted.** Replaced by `components/pdf-split/*`. |
| `PdfSplitDrawer` | **Deleted.** PDF Split becomes a route `/case/[case_id]/split/`. |

### Folder layout

```
components/
  ui/                primitive library (Phase A)
  layout/            AppShell, AuthShell, CaseShell, Navbar, Footer
  dashboard/         Spotlight, CaseTable, CaseTableRow
  wizard/            StepRail, CaseHeader, WizardFooter
  steps/             retained, internals rewritten in Phase C
  pdf-split/         Workshop, Header, Viewer, SegmentRail, SegmentRow,
                     Footer, EmptyDropzone, AnalysingState
  review/            ReviewLayout, DocumentRail, DocumentRailItem,
                     PaperToolbar, PaperCanvas
  tabs/              retained, toolbars stripped (PaperToolbar owns actions)
  modals/            CreateCaseDialog, EditCaseDialog, RegenerateDialog,
                     ConfirmDialog, FileSizeDialog,
                     InsufficientBalanceDialog, PdfViewerDialog, ErrorDialog
lib/
  motion.ts          framer-motion presets
  utils/
    cva.ts           class-variance helper (~20 LOC)
```

---

## 4 · Layout shells

### `AppShell`

Wraps every authenticated route.

```
┌─ AppShell ─────────────────────────────────────────┐
│  Navbar (sticky, ink-900, line-soft bottom, 64px) │
│    Vakil    search ⌘K    + New case    avatar ▾   │
│                                                    │
│  <main>  ink-950 page, fade-up on route change    │
│                                                    │
│  Footer (ink-900, label-style copyright)          │
└────────────────────────────────────────────────────┘
```

- `⌘K` chip opens a basic case search modal (existing `/api/cases/user/[id]?search=`).
- Avatar dropdown: account email, "Sign out." Cream-on-ink, hairline border.

### `AuthShell`

Login / register. No navbar, no footer. Form card on the left (ink-800, line-soft); on `lg:` a quiet editorial panel on the right with a Fraunces tagline ("Drafts while you strategise.") over an ink-800 panel with a single gold hairline rule. Panel drops on mobile.

### `CaseShell`

Wizard chrome. Replaces ad-hoc layout in `app/case/[case_id]/page.tsx`.

```
┌─ CaseShell ────────────────────────────────────────────┐
│  CaseHeader  (ink-900, gold left rule)                  │
│   ◂ back     Rahman v. State        [Drafting]  Civil  │
│              plaintiff · defendant · court (chips)      │
├──────────────┬─────────────────────────────────────────┤
│  StepRail    │  Step content stage                     │
│  (240px,     │  ink-950, generous padding              │
│   ink-900)   │                                         │
│              │  SectionHeader (Fraunces) + step content│
├──────────────┴─────────────────────────────────────────┤
│  WizardFooter  (sticky, ink-900, line-soft top)         │
│    ◂ Previous                                  Next ▸   │
└─────────────────────────────────────────────────────────┘
```

### `StepRail`

- 5 rows: status icon + step number + title + sub-meta.
- Status: `○` upcoming · `◐` current (gold filled) · `◉` complete (gold) · `△` warning.
- Sub-meta strings come from each step (e.g., "9 files", "OCR ✓✓✓", "Drafted 2m ago").
- Active step: 2px gold left rule + ink-800 bg.
- Hover on complete step: cursor-pointer + line-gold border; click jumps back.
- "Save & exit" ghost button at the bottom of the rail.
- Disabled during `isStepLoading` / `isGenerating`.

### `WizardFooter`

Preserves all current guard logic and Next-button label adaptation (`Uploading…`, `Processing…`, `Generating…`, `Editing…`, `Next`, `Complete`). The current wizard has no auto-save — Steps 3 and 4 save explicitly via their own Save buttons. Footer stays simple: Previous on the left, Next on the right. Per-step save status (e.g., "Unsaved changes") lives in each step's own toolbar (Section 6), not the footer.

---

## 5 · Dashboard

The editorial table + spotlight pattern.

```
Welcome back, Faisal.                          (Fraunces display-lg)
Your AI paralegal is ready.                    (Inter body-md)

┌─ SPOTLIGHT · MOST RECENT ──────────────────────────┐
│                                                    │
│   RAHMAN v. STATE                  [ Resume ▸ ]    │
│   Civil Suit · before Dhaka District Judge         │
│                                                    │
│   ●●●●○  4 of 5 drafts ready                       │
│   Last edited 2h ago · 9 evidence files            │
│                                                    │
└────────────────────────────────────────────────────┘
   ink-800 · gold 1px left rule · radius-2xl
   "Resume" is gold-filled · cinematic fade-up on mount

ALL CASES · 12              search ⌘K · + New case
─────────────────────────────────────────────────────
 Case                Type      Status      Edited
 ──────────────────  ────────  ──────────  ────────
▸ Choudhury v. ABS   Tort      ● Complete  1d
▸ Mostafa & Co       Contract  ◐ Evidence  3d
▸ Akter v. Karim     Family    ◐ Drafting  5d
─────────────────────────────────────────────────────
   row hover → gold left accent · click → /case/[id]
   ⋯ overflow at end of row reveals Edit · Delete
```

### Rules

- Spotlight renders only when at least one case has `status !== 'completed'`.
- If user has 0 active cases but ≥1 complete: spotlight shows "Start a new case."
- If user has 0 cases: quiet empty state — "Your first case is one click away." + gold CTA.
- Loading: shimmer spotlight + 3 ghost table rows.
- Search returns 0: inline empty row inside the table.

### Components

- `Spotlight.tsx` — uses `Card variant="gold-accent"` w/ custom layout.
- `CaseTable.tsx`, `CaseTableRow.tsx` — sortable headers, click-to-open, overflow menu.

---

## 6 · Wizard step internals

All steps open with `SectionHeader` (Fraunces title + meta).

### Step 1 · Evidence

Table → responsive bento grid. Splits *types* from *uploads*.

```
SECTION HEADER
  Evidence                             [⚡ AI-split PDF ▸]
  Upload supporting documents · max 100 MB per file

EVIDENCE TYPES GRID
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Medical records  │ │ Police reports   │ │ Witness letters  │
│ Hospital, X-ray… │ │ FIR, GD entry    │ │ Statements…      │
│                  │ │                  │ │                  │
│ 3 files ●●●      │ │ no files         │ │ 1 file ●         │
│ [+ Upload]       │ │ [+ Upload]       │ │ [+ Upload]       │
└──────────────────┘ └──────────────────┘ └──────────────────┘

+ Add custom evidence type   (gold-bordered ghost row)
```

- Click card → expands inline; others collapse. No modals for upload.
- Drag-and-drop via existing `react-dropzone` dep, gold-bordered ink-800 dashed surface; drop pulses gold.
- Uploaded files render as `EvidenceFileRow` (icon, name, size, ⋯ overflow with Download/Delete/View). PDF rows expose `Split…` → opens the workshop pre-loaded with that file.
- Custom-type edit/save inline within the expanded card.
- AI Split PDF entry: gold-accent ghost button in the section header, also from any PDF's overflow.

### Step 2 · Process

Vertical timeline of file processing.

```
TIMELINE
  ◉ medical-report-aug.pdf       ✓ Ready · 12 pages · 4s
  ◉ FIR-2042.pdf                 ✓ Ready · 6 pages · 3s
  ◐ contract-master.pdf          …Processing page 14/47 (gold scan)
  △ x-rays.pdf                   Retry · the file appears blank
  ○ witness-akter.docx           Queued
```

- Each row is ink-800 + status icon.
- Processing row has a thin gold scan-line crossing left→right.
- "All ready ✓" footer chip pulses gold once when the last file completes.

### Step 3 · Particulars · Step 4 · Chronology

Siblings. Cream-paper document moment.

```
SECTION HEADER
  Particulars (or Chronology)
  AI extracted from your evidence · review before drafting

TOOLBAR (sticky on scroll)
  [⟳ Regenerate]  [✎ Edit]  [✓ Looks good — continue]
                  Saved · click Edit to revise

CREAM PAPER CANVAS
  ┌──────────────────────────────────────────────────┐
  │ Particulars of Claim                             │
  │                                                  │
  │ 1. The plaintiff, Mr. Rahman, is a citizen of…   │
  │ 2. On 14 August 2025, while traveling…           │
  │ …                                                │
  │ Fraunces serif · 18/30 · cream-50 · hairline    │
  │ · ONE soft shadow                                │
  └──────────────────────────────────────────────────┘
```

- Edit mode swaps `MdxRenderer` → `MdxEditor` (cream-paper variant). Toolbar stays gold-on-ink. Edit becomes Save; ghost Discard appears.
- Regenerate opens `RegenerateDialog`.
- "Looks good — continue" is primary gold; advances to next step (preserves current `onNextStep`).
- Loading: cream-paper-shaped Shimmer with Fraunces "Drafting Particulars…" caption.

---

## 7 · PDF Split workshop

Replaces `PdfSplitDrawer` + `PdfSplitter` + `SplitRangeDisplay` (deleted). New route `app/case/[case_id]/split/page.tsx`.

```
┌─ Header (sticky · ink-900 · gold left rule) ──────────────────┐
│ ◂ Back   Split PDF · contract-master.pdf · 47 pages           │
│          AI · 88% confidence  ⟳ re-analyse   ✦ chip            │
├──────────────────────────────────────────┬────────────────────┤
│ PDF VIEWER (flex-1, ink-800 frame)       │ SEGMENT RAIL (360) │
│                                          │                    │
│  ┌──────────┐                            │ ✦ 5 segments       │
│  │  page 1  │                            │                    │
│  └──────────┘                            │ ┌────────────────┐ │
│  ┌──────────┐                            │ │◆ Engagement   │ │
│  │  page 2  │                            │ │  pages 1–3    │ │
│  └──────────┘                            │ │  ai 96% ✦      │ │
│  ╶╶ CUT 3│4 ╶ gold dashed rule w/ "+"   │ │  [⋯]           │ │
│             button to insert here        │ └────────────────┘ │
│  ┌──────────┐                            │                    │
│  │  page 4  │  active segment's pages   │ ┌────────────────┐ │
│  └──────────┘  get gold left edge        │ │◇ Court Order   │ │
│  …                                       │ │  pages 4–12    │ │
│                                          │ │  ai 88% ✦       │ │
│                                          │ └────────────────┘ │
│                                          │                    │
│                                          │ + Add segment      │
├──────────────────────────────────────────┴────────────────────┤
│ Footer (sticky · ink-900)                                     │
│   Cancel        Download ZIP   ·   Upload to evidence ▸        │
└────────────────────────────────────────────────────────────────┘
```

### Components (`components/pdf-split/`)

| File | Job |
|---|---|
| `Workshop.tsx` | Top-level state owner. Owns segments, pdfDocument, evidence types, action handlers. Maps 1:1 to current `PdfSplitDrawer` state. |
| `Header.tsx` | Sticky header w/ back, file name, page count, AI confidence chip, re-analyse. |
| `Viewer.tsx` | Virtualised PDF page strip via pdfjs `getPage().render()` per page. Renders cut indicators between pages from the segments array. Click `+` between pages → inserts a cut at that boundary. |
| `SegmentRail.tsx` | Vertical list of `SegmentRow`s. No drag-to-reorder. |
| `SegmentRow.tsx` | Name input, category `Select`, page-range chip (read-only — set via viewer), AI confidence pill, overflow menu (Remove, Download segment). |
| `Footer.tsx` | Cancel · Download ZIP · Upload to evidence. |
| `EmptyDropzone.tsx` | Pre-upload state — replaces "AI brain hero." Fraunces "Choose a PDF to split," ink-800 dropzone, gold dashed border, file picker. Drop pulses gold. |
| `AnalysingState.tsx` | Gold scan beam crosses viewer; Fraunces "Vakil is reading your PDF…" |

### Behavior preserved

- `performIntelligentAnalysis()`, `splitAndDownload()`, `splitAndUpload()`.
- File-size pre-checks, oversize modal (`FileSizeDialog`).
- Evidence type fetching from `/api/cases/[id]/evidence-types`.
- Custom file/Blob upload path (the `Blob as any` trick to satisfy FormData).
- `URL.revokeObjectURL` cleanup.
- Worker config from `@/lib/pdfjs-config`.
- The `onFilesUploaded` callback shape: on upload success → `router.back()` → case revalidates evidence.

### Motion

1. PDF accepted → dropzone pulses gold → viewer fades in stage-style → AI scan beam runs top→bottom of viewer while segments stream into the rail.
2. Click segment in rail → viewer scrolls to its range with a gold ribbon highlighting its pages → ribbon fades to static gold left edge.
3. Insert cut → gap between pages animates open (height spring); new segment slides into rail.
4. Remove segment → row fades + collapses; cut line in viewer disappears with gold pulse.

---

## 8 · Review (Step 5)

Top-tab pattern → DocumentRail + PaperCanvas.

```
┌─ DocumentRail (280px, ink-900) ┬─ PaperCanvas (ink-950 stage) ────┐
│                                │                                  │
│ DRAFTS                         │  PaperToolbar (sticky)           │
│ 5 of 5 ready                   │  [⟳ Regenerate] [↓ DOCX] [⧉ Copy]│
│                                │                                  │
│ ◆ Writ of Summons              │  ┌──────────────────────────────┐│
│   drafted · 2m ago             │  │                              ││
│                                │  │ BEFORE THE LEARNED DISTRICT  ││
│ ◆ Statement of Claim   ✱       │  │ JUDGE OF DHAKA               ││
│   active · 4m ago              │  │                              ││
│                                │  │ 1. The plaintiff, Mr.       ││
│ ◆ Statement of Damages         │  │    Rahman, a citizen of      ││
│   drafted · 4m ago             │  │    Bangladesh, aged 42…      ││
│                                │  │                              ││
│ ◆ Pre-Action Letter            │  │ cream-50 · Fraunces serif    ││
│   drafted · 5m ago             │  │ 18/30 · max-w 64ch · ONE     ││
│                                │  │ soft shadow                  ││
│ ◆ Witness Statement            │  │                              ││
│   [En ⌁ বাংলা] · drafted        │  │ Hoverable citations active  ││
│                                │  └──────────────────────────────┘│
│ ◇ ⟳ Regenerate all             │                                  │
└────────────────────────────────┴──────────────────────────────────┘
```

### Components (`components/review/`)

| File | Job |
|---|---|
| `ReviewLayout.tsx` | Owns active-document state. Replaces tab switching in current `Step5Review.tsx`. Keeps `agentStatuses`, `serverEvents`, `generateContent()`, SSE handling, localStorage cache, error/insufficient-balance triggers byte-for-byte. |
| `DocumentRail.tsx` | 5 `DocumentRailItem`s in fixed order from `config/tabs.json`. Bengali toggle inside Witness row. Active: gold left rule + ink-800 bg. Hover on non-active: line-gold border. |
| `DocumentRailItem.tsx` | Status icon + title + meta + optional inline action (En/বাংলা switch on Witness only). |
| `PaperToolbar.tsx` | Sticky bar on cream canvas. Per-document actions from `tabs.json` (existing `exportFunction`/`generateEndpoint`). |
| `PaperCanvas.tsx` | Wraps active document component. Cream background, soft shadow, max-w type column, cinematic scan-line on first render. |
| `tabs/*.tsx` | Existing 5 tab components kept, but **toolbars stripped** — those become `PaperToolbar`. Each tab renders `MdxRenderer` (or `MdxEditor` when editing). Witness Bengali state moves up to `ReviewLayout`. |

### Generation choreography

- Mount Step 5 → if no cached content, kick off `generateContent()` (unchanged).
- Each agent in `agentStatuses` maps to one document. On `running` → `completed`:
  1. Rail item's status dot springs amber `◐` → gold `◆`.
  2. If active, a gold scan-line travels top→bottom over the cream paper as MDX streams in.
- All 5 complete → "5 of 5 ready" header pulses gold; topmost document auto-focuses.
- Errors → `ErrorDialog`; affected rail item gets a rose dot + "Retry."

### Bengali toggle

Preserved exactly. `Switch` primitive (En ⌁ বাংলা) inside Witness rail item. State lives in `ReviewLayout`, passed down to `WitnessStatementTab` exactly as today. Cream paper shows the selected language; toggle remembered for the session.

---

## 9 · Modals

All built on `Dialog`. All open with cinematic scale-fade from Section 2's motion table. Backdrop: `bg-ink-950/72 + backdrop-blur(8px)`.

| Modal | Shape | Notes |
|---|---|---|
| `CreateCaseDialog` | `md`, **2-step internal** | Step A basics (title, type, court, case#) · Step B parties (add plaintiff/defendant, name, bengaliName, role). Footer `Back · Create case ▸`. Inline validation. |
| `EditCaseDialog` | `md`, single form | Same fields as Create, no stepping. |
| `RegenerateDialog` | `md` | Single textarea. Parameterised by `documentType: 'particulars' \| 'chronology' \| 'document'`. Replaces 3 existing modals. |
| `ConfirmDialog` | `sm` | Replaces every `window.confirm()`. Destructive primary is rose. |
| `FileSizeDialog` | `sm` | When upload > 100 MB. Lists offending files. Replaces inline modal in `Step1Evidence` + duplicate in `PdfSplitDrawer`. |
| `InsufficientBalanceDialog` | `sm` | Preserved — same text, same no-op Top-Up, restyled. |
| `PdfViewerDialog` | `full` | Wraps existing `PDFViewerModal`. Cream document viewer on dark scrim. |
| `ErrorDialog` | `sm` | Generic error surface used by Step 5 generation, etc. |

---

## 10 · Phasing

Five PRs with checkpoints. Each phase ends green: `npm test`, `npm run build`, manual smoke.

### Phase A · Foundation

- Update `app/globals.css` with new tokens.
- Add JetBrains Mono via `next/font/google`.
- Create `lib/utils/cva.ts`, `lib/motion.ts`.
- Create `components/ui/*` primitives with Vitest smoke tests.
- One demo route `app/_dev/primitives/page.tsx` (dev-only, removed in Phase E) showing every primitive.

**Checkpoint**: review primitives at `/_dev/primitives`. No production screen changes.

### Phase B · Shells & Dashboard

- `components/layout/{AppShell,AuthShell,CaseShell,Navbar,Footer}.tsx`.
- Restyle `app/layout.tsx` to use `AppShell`.
- Rewrite `app/login/page.tsx`, `app/register/page.tsx` on `AuthShell`.
- Rewrite `app/page.tsx` with `Spotlight` + `CaseTable`.
- `components/modals/{CreateCaseDialog,EditCaseDialog,ConfirmDialog}.tsx` — replace existing modals + every `window.confirm()`.

**Checkpoint**: full CRUD on new dashboard; login/register working.

### Phase C · Case wizard shell + Steps 1–4

- `components/wizard/{CaseHeader,StepRail,WizardFooter}.tsx`.
- Rewrite `app/case/[case_id]/page.tsx` shell on `CaseShell`.
- Step 1 evidence bento.
- Step 2 timeline.
- Step 3 + Step 4 paper canvas + `RegenerateDialog`.
- Wizard modals: `FileSizeDialog`, `InsufficientBalanceDialog`.

**Checkpoint**: full wizard except Review. All guard logic verified intact.

### Phase D · PDF Split workshop

- New route `app/case/[case_id]/split/page.tsx`.
- `components/pdf-split/*` complete.
- Delete `components/PdfSplitDrawer.tsx`, `components/PdfSplitter.tsx`, `components/SplitRangeDisplay.tsx`.
- Step 1's "AI Split PDF" button → links to the new route.
- Verify a real PDF round-trips: upload → analyse → split → download ZIP → upload to evidence.

**Checkpoint**: PDF round-trips through the workshop.

### Phase E · Review + polish

- `components/review/*`, `tabs/*` toolbars stripped.
- Rewrite Step 5 mount in `app/case/[case_id]/page.tsx`.
- `PdfViewerDialog`, `ErrorDialog`.
- Motion polish pass app-wide.
- `prefers-reduced-motion` audit.
- Dead-code sweep: legacy `bg-blue-*`, `bg-gray-*`, `border-gray-*`, `text-blue-*`, etc., should be zero hits at end of phase.
- Remove `/_dev/primitives` demo route.
- Update `CLAUDE.md` "Conventions" section to reflect dark theme + cream-document rule + motion tokens.

**Checkpoint**: end-to-end demo on the seeded case.

---

## 11 · Validation per phase

Every phase:

- `npm run build` clean.
- `npm test` green (existing tests must continue to pass; no test edits to make broken UI work).
- Type check clean (`tsc --noEmit` via `next build`).
- Manual smoke: dashboard load → create case → step through wizard → split PDF → review documents → export DOCX → logout/login.
- `prefers-reduced-motion` smoke at end of Phase E (DevTools toggle).

---

## 12 · Open questions / decisions deferred

- The `⌘K` global search modal: Phase B will ship a basic case-search-only version. Cross-entity search (cases + files + documents) is out of scope for this redesign.
- Drag-to-reorder PDF segments: out of scope.
- Dark/light user toggle: out of scope. App is dark; documents are cream paper.
- Storybook setup: out of scope. Phase A's `/_dev/primitives` route covers the need without the dep.
