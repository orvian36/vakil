# Phase 4 — Bengali translation + Vakil brand

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Read [`2026-05-17-vakil-rebrand-index.md`](./2026-05-17-vakil-rebrand-index.md).

**Pre-requisite:** Phase 3 PR merged. The LangGraph translate node currently writes Chinese content into the `witnessStatementBengali` column. This phase fixes that.

**Goal:** Translate the witness statement into Bangla (Bengali) instead of Chinese. Rename every user-visible reference to "Personal Injury" / "Makebell" to "Vakil". Update `CLAUDE.md` to reflect the new architecture.

**Architecture:** This phase is mostly find-and-replace plus a new prompt file. No new infrastructure.

---

## File Structure

**Created:**
- `lib/prompts/translate_to_bengali.txt` — translation prompt targeting standard Bangla

**Modified:**
- `lib/graph/nodes/translateWitnessStatement.ts` — load the new prompt, update debug message
- `app/page.tsx` — page title, copy
- `app/layout.tsx` — metadata.title, metadata.description
- `app/manifest.json` — name, short_name, description, theme_color
- `components/Navbar.tsx` — wordmark text, branding strings
- `components/Footer.tsx` — copyright + author byline
- `components/steps/Step*.tsx` — any hardcoded "Personal Injury" copy
- `components/tabs/*.tsx` — Witness Statement tab: add Bengali toggle (still wired to `witnessStatementBengali` column, which already exists)
- `components/CreateCaseModal.tsx`, `EditCaseModal.tsx` — party form: rename "Chinese Name" label to "Bengali Name (বাংলা)"
- `package.json` — `"name": "vakil"`
- `.env.example` — `NEXT_PUBLIC_APP_NAME=Vakil`
- `next.config.ts` — header values if any reference the brand
- `CLAUDE.md` — full rewrite reflecting new architecture
- `services/evidenceTypeService.ts` — keep evidence-type titles as is (they're still useful for any PI case); no change
- Any remaining "personal-injury" `task:` strings in graph nodes / regenerate route

**Deleted:**
- Any prompt file referencing Chinese (likely none — the translation prompt was inline in the old agent)

---

## Task 1: Branch

- [ ] `git checkout main && git pull origin main && git status` (clean)
- [ ] `git checkout -b feat/phase-4-bengali-brand`

---

## Task 2: New Bengali translation prompt

- [ ] **Step 1: Create `lib/prompts/translate_to_bengali.txt`**

```
You are a professional legal translator. Translate the following Witness Statement
into accurate, formal, and clear Standard Bengali (Bangla), preserving all legal
terminology, paragraph structure, numbered lists, and Markdown formatting.

Constraints:
- Do not omit, summarize, or paraphrase. Translate every sentence faithfully.
- Keep proper nouns (names of people, places, companies, court names) in their
  original English form unless a well-established Bengali rendering exists.
- Keep dates in the same format as the original.
- Output Bangla using standard Eastern Nagari script. Do not add transliteration.
- Preserve any leading Markdown heading; if no heading is present, start with
  `# সাক্ষীর বিবৃতি` exactly.
- Do not wrap the output in code fences.

Witness Statement to translate:
```

(End with a literal "Witness Statement to translate:" line — the node appends the witness statement body after it.)

- [ ] **Step 2: Commit**

```bash
git add lib/prompts/translate_to_bengali.txt
git commit -m "feat(prompts): bangla translation prompt for witness statement"
```

---

## Task 3: Rewrite `translateWitnessStatement` node

- [ ] **Step 1: Replace the file contents**

```ts
// lib/graph/nodes/translateWitnessStatement.ts
import { SocService } from "@/services/socService";
import { makeLLM } from "../llm";
import { loadPrompt, stripCodeFence } from "../util";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType } from "../state";

export async function translateWitnessStatement(
  state: DocumentsStateType,
): Promise<Partial<DocumentsStateType>> {
  if (!state.witnessStatement) {
    throw new Error("translateWitnessStatement requires witnessStatement");
  }
  const template = await loadPrompt("translate_to_bengali.txt");
  const prompt = `${template}\n\n${state.witnessStatement}`;

  const llm = makeLLM({ task: "translate-witness-statement-bengali" });
  const res = await llm.invoke(prompt);
  const content = stripCodeFence(String(res.content));

  await SocService.upsertSocAnalysis(state.caseId, { witnessStatementBengali: content });
  await writeDebugOutput("translateWitnessStatement", { content }, { caseId: state.caseId });
  return { witnessStatementBengali: content };
}
```

- [ ] **Step 2: Update the existing graph test if it asserts on a Chinese marker**

If `tests/graph/documents.integration.test.ts` (Phase 3) asserts text contents that imply Chinese, leave the test alone — it mocks the LLM and just checks "the translate node ran". The assertion is on the mock return value, not real translation. Re-run tests to confirm.

```bash
npx vitest run
```

- [ ] **Step 3: Commit**

```bash
git add lib/graph/nodes/translateWitnessStatement.ts
git commit -m "feat(graph): translate witness statement to bengali instead of chinese"
```

---

## Task 4: UI — rename "Chinese Name" → "Bengali Name (বাংলা)"

Two modals (`CreateCaseModal.tsx`, `EditCaseModal.tsx`) plus any wizard step that surfaces party names.

- [ ] **Step 1: Find every reference**

```bash
grep -rln "chineseName\|Chinese Name\|Chinese name\|chinese_name" --include="*.ts" --include="*.tsx" .
```

- [ ] **Step 2: For each file, rename**

- Field key in form state: `chineseName` → `bengaliName` (the DB column was renamed back in Phase 1, so the form data shape needs to match).
- Visible label: `Chinese Name` → `Bengali Name (বাংলা)`.
- Placeholder text: `e.g. 王小明` → `e.g. আরভ খান`.
- Any TS type narrowing on `party.chineseName` → `party.bengaliName`.

- [ ] **Step 3: Type-check, test, dev-boot**

```bash
npx tsc --noEmit
npx vitest run
npm run dev   # confirm modals open without console errors
```

- [ ] **Step 4: Commit**

```bash
git add components/ app/
git commit -m "feat(ui): replace chinese-name fields with bengali-name across party forms"
```

---

## Task 5: Witness Statement tab — Bengali toggle

The Witness Statement tab in `components/tabs/WitnessStatementTab.tsx` currently shows the English text and (probably) has a hidden Chinese view. Change it to a toggle: "English ↔ Bengali (বাংলা)".

- [ ] **Step 1: Open the file, locate the content render**

The content comes from `soc_analyses.witnessStatement` (English) and `soc_analyses.witnessStatementBengali` (Bangla). The tab likely fetches the row through whatever API endpoint feeds it (`apiEndpoint` in `config/tabs.json`).

- [ ] **Step 2: Add toggle state and render**

Insert into the tab component:

```tsx
const [lang, setLang] = useState<"en" | "bn">("en");

const body = lang === "en" ? data.witnessStatement : data.witnessStatementBengali;

<header className="flex items-center justify-between mb-4">
  <h2 className="text-xl font-semibold">Witness Statement</h2>
  <div className="inline-flex border rounded-md">
    <button
      onClick={() => setLang("en")}
      className={`px-3 py-1 text-sm ${lang === "en" ? "bg-gray-900 text-white" : ""}`}
    >English</button>
    <button
      onClick={() => setLang("bn")}
      disabled={!data.witnessStatementBengali}
      className={`px-3 py-1 text-sm ${lang === "bn" ? "bg-gray-900 text-white" : ""} disabled:opacity-40`}
    >বাংলা</button>
  </div>
</header>
```

(Polish moves to Phase 5 — for now just make it work.)

- [ ] **Step 3: Confirm in dev**

```bash
npm run dev
```
Open a case with a translated witness statement (or seed one manually via Prisma Studio) and toggle.

- [ ] **Step 4: Commit**

```bash
git add components/tabs/WitnessStatementTab.tsx
git commit -m "feat(ui): english <-> bengali toggle on witness statement tab"
```

---

## Task 6: Update the regenerate route's prompt map

`app/api/generate/regenerate/route.ts` has a `promptFileMap` (see Phase 0 spec inventory). It currently lists English documents. Add the witness-statement Bengali path if the UI exposes a "regenerate translation" button (most likely it doesn't — leave the map as-is otherwise).

- [ ] **Step 1: Check whether regenerate ever targets `witnessStatementBengali`**

```bash
grep -rln "regenerate\|witnessStatementBengali" --include="*.tsx" components/ app/
```

If no UI calls regenerate with `documentType: "translation"`, skip this task entirely.

- [ ] **Step 2: (Conditional) extend the map**

If needed, add `'witness-statement-bengali': 'translate_to_bengali.txt'` and the corresponding `fieldMap` entry `'witness-statement-bengali': 'witnessStatementBengali'`.

- [ ] **Step 3: Commit (only if changes made)**

```bash
git add app/api/generate/regenerate/route.ts
git commit -m "feat(api): allow regenerate of bengali witness statement"
```

---

## Task 7: Brand — `package.json`, `.env.example`, manifest

- [ ] **Step 1: `package.json`**

Change the `name` field:

```json
"name": "vakil",
```

- [ ] **Step 2: `.env.example`**

Set `NEXT_PUBLIC_APP_NAME=Vakil`.

- [ ] **Step 3: `app/manifest.json`**

Replace with:

```json
{
  "name": "Vakil",
  "short_name": "Vakil",
  "description": "An AI paralegal that drafts while you strategize.",
  "icons": [
    { "src": "/icon0.svg", "sizes": "any", "type": "image/svg+xml" },
    { "src": "/icon1.png", "sizes": "192x192", "type": "image/png" }
  ],
  "theme_color": "#0F1B2D",
  "background_color": "#FAF7F2",
  "display": "standalone",
  "start_url": "/"
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json .env.example app/manifest.json
git commit -m "feat(brand): package.json, env, and PWA manifest"
```

---

## Task 8: Brand — `app/layout.tsx` metadata

- [ ] **Step 1: Update metadata block**

```ts
export const metadata: Metadata = {
  title: "Vakil — AI legal drafter",
  description: "An AI paralegal that drafts while you strategize. Turn case evidence into court-ready first drafts.",
};
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(brand): page metadata title and description"
```

---

## Task 9: Brand — Navbar and Footer

- [ ] **Step 1: `components/Navbar.tsx`**

Replace the wordmark / brand element with the string `Vakil`. Remove any logo asset reference to "Personal Injury" or "Makebell". Keep the Fraunces font directive (added in Phase 5) — for now just the text.

- [ ] **Step 2: `components/Footer.tsx`**

Replace contents:

```tsx
export default function Footer() {
  return (
    <footer className="border-t mt-12 py-4 text-sm text-center text-gray-600">
      © 2026 Vakil · Built by{" "}
      <a href="https://github.com/orvian36" className="underline hover:text-gray-900">Habibur Rahman</a>
    </footer>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Navbar.tsx components/Footer.tsx
git commit -m "feat(brand): vakil wordmark in navbar, byline in footer"
```

---

## Task 10: Strip residual "Personal Injury" / "personal-injury" / "Makebell" strings

- [ ] **Step 1: Find them**

```bash
grep -rln --include="*.ts" --include="*.tsx" --include="*.json" --include="*.css" --include="*.md" -E "Personal Injury|personal-injury|Makebell|makebell" .
```

- [ ] **Step 2: For each match, decide**

- **User-facing copy** (page titles, headings, button labels): replace with "Vakil" or generic legal-drafter wording.
- **Code identifiers** that happen to contain the string (e.g. file paths, function names): leave them only if invisible to users; otherwise rename.
- **`task:` arguments to `queryLLM` / `makeLLM`**: rename `"personal-injury"` → `"vakil"` and update task-specific values (e.g. `"generate-particulars"` is fine to keep — those are descriptive, not branded).
- **Docs/specs/plans under `docs/superpowers/`**: leave them — they're historical records of the rebrand.

- [ ] **Step 3: Type-check & dev-boot**

```bash
npx tsc --noEmit
npm run dev   # eyeball home page, dashboard, wizard
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(brand): remove residual personal-injury/makebell strings"
```

---

## Task 11: Rewrite `CLAUDE.md`

The existing `CLAUDE.md` (created at session start) describes the pre-rebrand architecture. Rewrite it to reflect: Vakil identity, Prisma + SQLite, JWT auth, LangGraph orchestration, Gemini direct, Bengali translation.

- [ ] **Step 1: Replace the file with the new content**

Keep the required header. Trim sections that no longer apply (Drizzle, Makebell, AgentOrchestrator) and add sections for the new pieces (`lib/auth/`, `lib/graph/`, Prisma).

The new `CLAUDE.md` should answer: "where do I add a new generated document type" and "where do I add a new auth-protected route" and "how does the LangGraph DAG flow" — those are the three questions a future Claude instance will most often ask.

Suggested top-level structure:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
(npm scripts: dev, build, test, prisma:migrate, prisma:seed, prisma:studio)

## Environment
(JWT_ACCESS_SECRET, GEMINI_API_KEY, DO_SPACES_*, MISTRAL_API_KEY, optional LangSmith)

## Architecture
- Auth boundary: middleware.ts + lib/auth/
- Database: Prisma + SQLite
- LLM client: Gemini direct (lib/llm/index.ts)
- Orchestration: LangGraph (lib/graph/)
- Documents tabs: config/tabs.json drives Writ/Witness/SoC/SoD/Pre-Action
- Wizard: app/case/[id]/page.tsx (5 steps)
- Bengali translation: lib/graph/nodes/translateWitnessStatement.ts + lib/prompts/translate_to_bengali.txt

## Conventions
(no shadow-lg, cream + saffron palette, Fraunces + Inter, prompt files in lib/prompts/, services are thin wrappers around prisma)

## Where to add things
- A new generated document type: schema column on SocAnalysis, prompt file, graph node, graph edge in documents.ts, tabs.json entry, components/tabs/<Name>.tsx, export util in lib/utils/, API route under app/api/generate/ and app/api/soc_analysis/
- A new auth-protected API route: add to matcher in middleware.ts, call getCurrentUser() at top of handler
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md for the new vakil architecture"
```

---

## Task 12: Verify, push, PR, merge

- [ ] **Step 1: All checks**

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

- [ ] **Step 2: Final residual-string check**

```bash
grep -rln --include="*.ts" --include="*.tsx" -E "Personal Injury|Makebell|chinese\b" .
```
Only acceptable matches: spec/plan docs under `docs/`, and possibly `services/evidenceTypeService.ts` if you kept the HK-flavoured evidence type titles (acceptable — they're useful examples).

- [ ] **Step 3: Push, PR, merge**

```bash
git push -u origin feat/phase-4-bengali-brand

# Write docs/superpowers/plans/.pr-body.md
cat > docs/superpowers/plans/.pr-body.md <<'PR'
## Summary

Replace the Chinese witness-statement translation with Bangla (Bengali) and rebrand the entire app to **Vakil**.

## Highlights
- New `lib/prompts/translate_to_bengali.txt`. The LangGraph translate node loads it and writes Bangla into `witnessStatementBengali`.
- Witness Statement tab gets an English/বাংলা toggle.
- Every party form replaces "Chinese Name" with "Bengali Name (বাংলা)".
- Brand strings updated: `package.json` name, `NEXT_PUBLIC_APP_NAME`, manifest, navbar wordmark, footer byline, page metadata.
- `CLAUDE.md` rewritten to describe the post-rebrand architecture (Prisma + SQLite, JWT auth, LangGraph, Gemini direct, Bengali).
- Residual "Personal Injury" / "Makebell" strings removed from user-facing code.

## Test plan
- [x] `npx vitest run` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean
- [x] Dev boot — home, login, register all render Vakil branding; witness tab toggle switches languages
- [x] `grep -rln` confirms no residual brand strings outside docs/

## Out of scope
Visual redesign (Phase 5) — colours, typography, layout still use the default Tailwind palette.
PR

gh pr create --base main --head feat/phase-4-bengali-brand \
  --title "feat: phase 4 — bengali translation + vakil rebrand" \
  --body-file docs/superpowers/plans/.pr-body.md
gh pr merge --merge --delete-branch
git checkout main && git pull origin main
```

---

**Phase 4 complete.** Proceed to [Phase 5 — UI redesign](./2026-05-17-vakil-rebrand-phase-5-ui.md).
