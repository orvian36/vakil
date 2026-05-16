# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                # Next dev with Turbopack
npm run build              # Production build
npm run start              # Run built app

npm run db:generate        # drizzle-kit: emit SQL from db/schema.ts -> db/migrations
npm run db:migrate         # Apply all migrations via tsx db/migrate.ts
npm run db:migrate:0004    # One-off runner for migration 0004 (add Writ of Summons evidence type)
npm run db:migrate:0005    # One-off runner for migration 0005 (add Writ of Summons column)
npm run db:studio          # Drizzle Studio
npm run db:seed            # tsx db/seed.ts (uses hard-coded USER_ID — edit before running)
```

There is no test runner, linter, or formatter wired into `package.json`. Don't claim a test/lint suite was run.

## Environment

`envexample` lists the required env vars. Critical:
- `DATABASE_URL` — Postgres (Drizzle uses `postgres-js`; `db/index.ts` toggles SSL based on `NODE_ENV` / `DATABASE_SSL`).
- `NEXT_PUBLIC_BASE_URL` — used by `middleware.js` for auth redirects.
- `NEXT_PUBLIC_APP_NAME` — sent to the external auth service as `app_name`.
- `MISTRAL_API_KEY` — Mistral OCR.
- `DO_SPACES_*` — DigitalOcean Spaces (S3-compatible) used as object store; files are uploaded with `ACL: public-read`.

Auth tokens, the LLM endpoint, and OCR all depend on external services owned by `platform.makebell.com` — local dev still requires those credentials to be valid.

## Architecture

This is a Next.js 15 App Router app (React 19, TypeScript strict, Tailwind v4) that drafts Hong Kong personal-injury litigation documents (Writ of Summons, Statement of Claim, Statement of Damages, Pre-Action Letter, Witness Statement) from uploaded evidence.

Path alias: `@/*` → repo root.

### Auth boundary — `middleware.js`

`middleware.js` runs on `/`, `/test`, `/wizard/*`, `/api/*`, and everything except Next static assets. On every request it:
1. If `access_token`/`refresh_token` arrive as query params (from the platform auth redirect), it sets them as httpOnly cookies and redirects to a clean URL.
2. Reads `access_token` from cookies (or `Authorization: Bearer …`); verifies it via `POST https://platform.makebell.com/api/auth/verify`.
3. On invalid token, attempts refresh via `POST .../api/auth/refresh` and rewrites cookies.
4. On failure, redirects to `https://platform.makebell.com/auth/login?redirect_url=…&app_name=…`.
5. Valid users get `x-user-context: <JSON>` injected onto the request headers.

The exported helpers `verifyAccessToken` / `refreshTokens` are also imported directly by orchestration agents to refresh in-flight tokens (see `lib/orchestration/agents/GenerateChronologyAgent.ts`). API routes typically `await cookies()` to grab `access_token`/`refresh_token` and pass them downstream to the LLM client.

### Database — Drizzle + Postgres

- Schema: `db/schema.ts` (all tables in one file).
  - `cases` (`caseType` is `'SOC' | 'DEFENCE'`) → `case_parties` (role `plaintiff|defendant`), `files`, `case_analyses`, `case_evidence_types`.
  - `case_analyses` has a unique `(case_id, analysis_type)` constraint — one analysis per case per type.
  - `soc_analyses` is one-to-one with a `case_analyses` row of type `soc`, and holds all generated document text (`particularsMarkdown`, `chronologyMarkdown`, `writOfSummons`, `statementOfClaim`, `statementOfDamages`, `preActionLetter`, `witnessStatement`, `witnessStatementChinese`, plus the raw `allFileOcr`). When adding a new generated document, extend this table — the rest of the pipeline expects a single row per case.
- Connection: `db/index.ts` caches the `postgres` client and Drizzle instance on `globalThis` to survive Next dev HMR. Pool defaults to `max: 20`, prepared statements **on** (session pooler) — flip `usingTransactionPooler` if migrating to a 6543-port pooler.
- Migrations: numbered SQL files in `db/migrations/`. Two of them (`0004`, `0005`) have dedicated `tsx` runner scripts referenced in `package.json`; the standard `db:migrate` applies the whole folder via drizzle-kit's migrator.

### The case wizard — `app/case/[case_id]/page.tsx`

Five sequential steps in `components/steps/`:
1. **Evidence** — upload files (DigitalOcean Spaces via `lib/storage/`).
2. **Process** — OCR each file with Mistral (`lib/ocr/`), then enrich with entity/date/summary extraction from `lib/prompts/entityAndDate*.txt` + `lib/prompts/generate_summary.txt`. Status lives in `files.processing_status`.
3. **Particulars** — LLM-generated, stored as `soc_analyses.particularsMarkdown`.
4. **Chronology** — LLM-generated, stored as `soc_analyses.chronologyMarkdown`.
5. **Review** — opens the tabbed document generator.

Step-to-step navigation is gated by `hasPendingUploads`, `hasProcessingFiles`, `isEditingParticulars`, `isEditingChronology`, `isGenerating`, and `isStepLoading` — preserve those guards when adding new steps or async work.

### The document generator — config-driven tabs

`config/tabs.json` defines each generated document as `{ id, label, icon, apiEndpoint, generateEndpoint, exportFunction, promptFile }`. Components in `components/tabs/` read this config to know which API to call to fetch saved content (`apiEndpoint`), which to call to regenerate it (`generateEndpoint`, or the shared `/api/generate/regenerate`), which prompt file backs it, and which Word exporter in `lib/utils/` to use. **Adding a new document type means:** add a row to `config/tabs.json`, add the prompt text under `lib/prompts/`, add the SQL column on `soc_analyses` + migration, add the `app/api/generate/<name>` and `app/api/soc_analysis/<name>` routes, add the `exportXxxToWord` util, add a tab component, and register a generation agent (see next section).

### Agent orchestration — `lib/orchestration/`

The end-to-end document generation flow is driven by `AgentOrchestrator` (`agent-orchestrator.ts`), which:
- Loads an ordered list of agent configs from `lib/orchestration/agent-config.json` (each config: `agent-name`, `msg`, `input variable`, `output variable`).
- Runs each registered `Agent` sequentially, passing a mutable `AgentContext` (a plain key-value bag — `caseId`, `accessToken`, `refreshToken`, plus whatever previous agents wrote).
- Validates that each agent's declared `input variable`s are present in the context before running, and stores `result.data` under the declared `output variable`.

Agents live in `lib/orchestration/agents/` (one class per file) and are re-exported from `agents/index.ts`. There are two shapes:
- **Fetch* agents** load existing rows (chronology, particulars, supporting files) into context.
- **Generate* / Translate* agents** read a prompt template from `lib/prompts/`, append context data, call `queryLLM`, run markdown verification (`utils/verify_markdown.ts` + `utils/remarkFixVoidTags.ts`), refresh the access token in-place if invalid, retry up to 3 times, then persist via `SocService.upsertSocAnalysis`.

The HTTP entry point is `POST /api/orchestration` (`app/api/orchestration/route.ts`) — it returns a Server-Sent Events stream and emits `workflow_start`, `agent_started`, `agent_complete`, `agent_error`, `workflow_complete` events. **The list of agent instances registered in this route is hand-maintained** — when adding an agent class, register it here in addition to `agent-config.json`.

Every generation agent calls `writeDebugOutput` (`agents/debug-utils.ts`), which writes timestamped JSON dumps to `lib/orchestration/agents/debug/`. That directory is for inspection only — safe to delete.

### LLM and OCR clients

- `lib/llm/index.ts` — single `queryLLM({ prompt, accessToken, … })` that POSTs to `https://platform.makebell.com/api/llm/query`. Defaults: `provider: "qwen"`, `model: "google/gemini-3-flash-preview"`, `max_tokens: 59000`, `app_name: "personal-injury"`. Most call sites override provider to `"deepinfra"` and set a task-specific `task` string for tracking.
- `lib/ocr/index.ts` — Mistral OCR. Pages are joined with `==== PAGE N ====` delimiters; downstream prompts depend on that format, so don't change the delimiter casually.

### Service layer — `services/`

Static-method classes (`SocService`, `CaseService`, `FileService`, etc.) wrap Drizzle queries. API routes and orchestration agents both call these services rather than touching `db` directly — keep that pattern when adding endpoints.

### Frontend auth wiring

`contexts/AuthProvider.tsx` wraps the tree, renders the `Navbar`, and exposes `useAuthContext()` (which is `useAuth` from `hooks/useAuth.ts` plus a logout wrapper). The hook uses `useReducer` over a discriminated `AuthAction` union — extend the union when adding new auth states rather than adding ad-hoc booleans.

## Conventions worth knowing

- Markdown coming back from the LLM is post-processed by `utils/remarkFixVoidTags.ts` and validated by `utils/verify_markdown.ts`; bypassing these can let malformed MDX reach the editor (`MdxEditor.tsx`).
- Prompt files are plain `.txt` loaded with `fs.readFileSync(join(process.cwd(), 'lib/prompts', …))` at request time — they ship as part of the Next build but aren't bundled, so paths must stay relative to `process.cwd()`.
- `next.config.ts` sets `reactStrictMode: false` and enables `.md`/`.mdx`/`.mjs` as page extensions. Webpack `extensionAlias` lets `.js` imports resolve to `.ts` — useful when copying snippets.
- Tailwind v4 via `@tailwindcss/postcss`; styles live in `app/globals.css`. There is no `tailwind.config` content array in the v3 sense — class detection is handled by v4.
