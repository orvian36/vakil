# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Vakil** — an AI paralegal that takes case evidence (PDFs) and drafts the five court-ready first drafts a small-firm or solo lawyer typically needs: Writ of Summons, Statement of Claim, Statement of Damages, Pre-Action Letter, and Witness Statement (with a Bangla translation of the witness statement).

## Commands

```bash
npm run dev                # Next dev with Turbopack
npm run build              # Production build
npm run start              # Run built app

npm run prisma:generate    # Regenerate Prisma client from schema
npm run prisma:migrate     # Apply migrations (dev: prisma migrate dev)
npm run prisma:studio      # Visual DB inspector at http://localhost:5555
npm run prisma:seed        # Seed demo user + case (see Phase 6)

npm test                   # Vitest run, all tests
npm run test:watch         # Vitest in watch mode
npm run test:cov           # Vitest with coverage
```

## Environment (see `.env.example`)

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `file:./dev.db` for local SQLite |
| `JWT_ACCESS_SECRET` | yes | 32+ random bytes; signs the 15-min access JWT |
| `GEMINI_API_KEY` | yes | Google AI Studio key |
| `LLM_MODEL` | no | Override default Gemini model |
| `MISTRAL_API_KEY` | yes for live OCR | Demo seed bypasses it |
| `DO_SPACES_*` | yes for uploads | DigitalOcean Spaces credentials |
| `LANGCHAIN_TRACING_V2` / `LANGCHAIN_API_KEY` | no | Enable LangSmith tracing for graph runs |

## Architecture

Path alias: `@/*` → repo root.

### Auth boundary — `middleware.ts` + `lib/auth/`

`middleware.ts` runs on Edge runtime and gates `/`, `/case/*`, and most `/api/*` routes. It reads the `access_token` cookie and verifies the JWT (jose). Unauthenticated requests get a 401 on API routes or a redirect to `/login?next=...` on pages.

`lib/auth/` is the JWT auth library:
- `password.ts` — bcryptjs hash/verify.
- `jwt.ts` — `signAccessToken` / `verifyAccessToken` via **jose** (Edge-compatible; jsonwebtoken is not).
- `tokens.ts` — re-exports the jwt helpers + adds Node-side refresh-token operations (`mintRefreshToken`, `rotateRefreshToken`, `revokeAllRefreshTokensForUser`).
- `cookies.ts` — cookie names + `cookieOptions(maxAge)` (httpOnly, sameSite=lax, secure in prod, 15-min/7-day TTLs).
- `session.ts` — `getCurrentUser()` and `requireCurrentUser()` helpers for App Router route handlers.

Refresh tokens are stored hashed (SHA-256) in the `RefreshToken` table. Rotation is transactional — the incoming token is marked `revokedAt` and a fresh one is inserted in the same `$transaction`. Reuse of a revoked token returns 401 (a real attack signal).

Auth endpoints: `POST /api/auth/{register,login,refresh,logout}` and `GET /api/auth/me`.

### Database — Prisma + SQLite

`prisma/schema.prisma` defines every table: `User`, `RefreshToken`, `Case`, `CaseParty`, `File`, `CaseAnalysis`, `SocAnalysis`, `CaseEvidenceType`. Two design notes:
- SQLite has no `jsonb`, so `entities`, `particularsJson`, `chronologyJson` are `String` (JSON-encoded). Callers `JSON.stringify` on the way in and `JSON.parse` on the way out — services keep the boundary explicit and do **not** parse.
- One `SocAnalysis` row per case via `CaseAnalysis.@@unique([caseId, analysisType])`. All five generated documents live as columns on that row.

`lib/db.ts` exports a cached `PrismaClient` (HMR-safe pattern). `services/*.ts` are thin Prisma wrappers, one class per table.

### LLM client — Gemini direct

`lib/llm/index.ts` — `queryLLM({ prompt, model?, maxTokens?, task? })` calls Google Gemini via `@google/genai`. No external proxy. Default model: `gemini-2.5-flash` (overridable via `LLM_MODEL`). Legacy keys (`accessToken`, `appName`, `provider`, `max_tokens`) are accepted-but-ignored for backwards compatibility with code that pre-dates the rewrite — drop them when you next touch a call site.

LangGraph nodes prefer `lib/graph/llm.ts` which returns a `ChatGoogleGenerativeAI` instance for streaming + tracing.

### Orchestration — LangGraph

`lib/graph/` replaces the old hand-rolled `AgentOrchestrator`:

```
lib/graph/
  state.ts          DocumentsState + SingleDocState (typed Annotation roots)
  llm.ts            makeLLM({ task }) → ChatGoogleGenerativeAI
  util.ts           loadPrompt(filename), stripCodeFence(text)
  debug.ts          writeDebugOutput(nodeName, payload) → lib/graph/debug/*.json
  sse.ts            Maps streamEvents → existing SSE shape (no client changes)
  nodes/            One file per node (plain async function)
  graphs/
    documents.ts    Multi-doc DAG (parallel fan-out)
    particulars.ts  Single-doc graph with retry-on-invalid-markdown
    chronology.ts   Single-doc graph with retry-on-invalid-markdown
```

Documents DAG topology: 3 fetch nodes fan out from `START`, all run in parallel. Then 5 generators fan out in parallel once their inputs are ready (Writ depends on the fetched files; Witness/SoC/SoD/Pre-Action depend on chronology+particulars). Translation runs after Witness. All 6 outputs land on `SocAnalysis` and the graph reaches `END`.

Particulars and Chronology graphs use `addConditionalEdges` for declarative retry: `generate → verify → (save | retry up to 3x | end)`.

Streaming: `documentsGraph.streamEvents(state, { version: "v2" })` yields per-node events. `lib/graph/sse.ts` maps them to the legacy SSE shape (`workflow_start`, `agent_started`, `agent_complete`, `agent_error`, `workflow_complete`) so the frontend's event handler didn't need changes during the migration.

### Document tabs — config-driven

`config/tabs.json` lists each generated document with `id`, `label`, `apiEndpoint` (fetch saved content), `generateEndpoint`, `exportFunction`, `promptFile`. `components/tabs/<Name>Tab.tsx` reads this config. The Witness Statement tab has an English ⇄ বাংলা toggle, swapping between `witnessStatement` and `witnessStatementBengali`.

### Wizard — `app/case/[case_id]/page.tsx`

Five steps in `components/steps/`: Evidence → Process → Particulars → Chronology → Review. State gates between steps via `hasPendingUploads`, `hasProcessingFiles`, `isEditingParticulars`, `isEditingChronology`, `isGenerating`, `isStepLoading`. Don't remove these guards without replacement.

### Bengali translation

`lib/prompts/translate_to_bengali.txt` is the translation prompt. `lib/graph/nodes/translateWitnessStatement.ts` loads it and writes Bangla into `socAnalyses.witnessStatementBengali`. Party records carry a `bengaliName` field (was `chineseName` pre-rebrand). Output starts with `# সাক্ষীর বিবৃতি` if no English heading is present — `lib/utils/exportWitnessStatementToWord.ts` uses that marker to extract the body when exporting to DOCX.

## Conventions

- **Tests:** Vitest runs file-by-file sequentially (`fileParallelism: false` in `vitest.config.ts`) because SQLite + concurrent test files race the `beforeEach` truncate. Each test file's `beforeEach` empties every table.
- **Prompt files** in `lib/prompts/*.txt` are loaded via `fs.readFile(path.join(process.cwd(), 'lib/prompts', name))` at request time. They ship with the Next build but aren't bundled — paths must stay relative to `process.cwd()`.
- **No shadows on cards** (visual rule from Phase 5). 1px hairline borders on cream surfaces instead.
- **Markdown post-processing:** LLM output goes through `utils/remarkFixVoidTags.ts` (`preProcessMD`) and `utils/verify_markdown.ts` before saving. Bypassing these lets malformed MDX reach the editor.
- **Conventional Commits.** Branch per phase / per feature; no force-pushes to `main`.

## Where to add things

- **A new generated document type:** add a column on `SocAnalysis` in `prisma/schema.prisma` + a migration; add a prompt file to `lib/prompts/`; add a node in `lib/graph/nodes/`; wire edges in `lib/graph/graphs/documents.ts`; add an entry to `config/tabs.json`; add `components/tabs/<Name>Tab.tsx`; add an exporter under `lib/utils/`; add the GET route under `app/api/soc_analysis/` to fetch saved content.
- **A new auth-protected API route:** add its path prefix to the `matcher` in `middleware.ts`; call `await getCurrentUser()` at the top of the handler.
- **A new LangGraph node:** plain async function `(state) => Partial<state>` in `lib/graph/nodes/`; import + `.addNode(...).addEdge(...)` in the relevant `lib/graph/graphs/*.ts`.
- **A new service method:** thin Prisma wrapper in `services/<X>Service.ts`; unit test in `tests/services/<x>Service.test.ts`.

## Out-of-scope (deferred)

- Live Vercel deployment (SQLite + Vercel serverless aren't compatible; would need libSQL/Turso).
- Email verification, password reset, OAuth — single-user demo posture.
- Bilingual UI (English-only chrome; Bengali appears only as translated content).
