# Vakil — Rebrand & Re-architecture Design

**Date:** 2026-05-17
**Author:** Habibur Rahman (orvian36)
**Status:** Draft for review
**Repo:** https://github.com/orvian36/vakil

## 1. Goal

Take an existing Hong Kong personal-injury document generator (originally built for a Chinese-speaking client) and reshape it into a portfolio-quality **AI legal drafter** called **Vakil**. The product story is: *"An AI paralegal that drafts while you strategize."* Lawyers upload case evidence; the system OCRs it, generates particulars and a chronology, then fans out into a Writ of Summons, Statement of Claim, Statement of Damages, Pre-Action Letter, and Witness Statement (with a Bengali translation of the witness statement).

The rebrand is also a re-architecture: replace every piece of vendor-coupled infrastructure (Makebell auth, Makebell LLM proxy, Drizzle/Postgres) with self-contained alternatives that read as 2026 best-practice on a resume — Prisma + SQLite, JWT auth with refresh-token rotation, Google Gemini direct, and a LangGraph state machine in place of the current naive sequential agent loop.

## 2. Non-goals

- **No live deployment.** SQLite means the demo runs locally. We accept this in exchange for the simplicity of a single-file database.
- **No bilingual UI.** The English UI stays English. Bengali appears only as content (translated witness statement, optional party Bengali name).
- **No real Hong Kong / Bangladesh legal accuracy guarantees.** Prompts remain generic legal-drafter templates; this is a software portfolio, not a law-tech product.
- **No backwards compatibility** with the existing Drizzle schema or Makebell auth. Old code is deleted, not deprecated.
- **No SSR-side Bengali content negotiation, no i18n routing.** YAGNI.

## 3. Current state (what we are replacing)

| Area | Today | Source of truth |
|---|---|---|
| Auth | `middleware.js` redirects to `platform.makebell.com/auth/login`, verifies access tokens against `platform.makebell.com/api/auth/verify` | `middleware.js` |
| LLM client | `queryLLM()` POSTs to `platform.makebell.com/api/llm/query` with a Makebell access token | `lib/llm/index.ts` |
| Database | Postgres via `drizzle-orm/postgres-js`, schema in `db/schema.ts`, migrations under `db/migrations/` | `db/`, `drizzle.config.ts` |
| Orchestration | Hand-rolled `AgentOrchestrator` class runs a JSON-configured list of Agent classes in a `for` loop; SSE stream from `/api/orchestration` | `lib/orchestration/` |
| Translation | `TranslateWitnessStatementAgent` translates the witness statement to **Chinese**; party records carry a `chineseName` column | `lib/orchestration/agents/TranslateWitnessStatementAgent.ts`, `db/schema.ts` |
| Brand | "Personal Injury" / "Makebell" appear in `package.json`, `NEXT_PUBLIC_APP_NAME`, navbar, manifest, footer, copy | scattered |
| UI | Default Tailwind palette, `Geist Sans`/`Geist Mono`, plain table on the home page, vanilla wizard layout | `app/`, `components/` |

## 4. Target architecture

### 4.1 Auth — JWT, refresh-token rotation

**Goal:** Zero external auth dependencies. Standard JWT pattern that a senior engineer would recognise as correct.

**Tables (new):**
- `User`: `id`, `email` (unique), `passwordHash`, `name` (nullable), `createdAt`.
- `RefreshToken`: `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt` (nullable). Indexed on `tokenHash` and `userId`.

**Library (`lib/auth/`):**
- `password.ts` — `hashPassword` / `verifyPassword` via `bcryptjs` (cost factor 10).
- `tokens.ts` — `signAccessToken(userId)` returns a 15-minute JWT signed with `JWT_ACCESS_SECRET`. `mintRefreshToken(userId)` generates a 32-byte random string, stores its SHA-256 hash in `RefreshToken`, returns the raw token to set as cookie. `rotateRefreshToken(rawToken)` looks up by hash, checks `expiresAt`/`revokedAt`, marks the row revoked, mints a new one — all in a Prisma `$transaction`.
- `session.ts` — `getCurrentUser()` server helper for App Router. Reads `access_token` cookie, verifies JWT, returns the `User` (or `null`).

**HTTP surface (new under `app/api/auth/`):**
| Route | Body | Sets cookies | Returns |
|---|---|---|---|
| `POST /api/auth/register` | `{ email, password, name? }` | `access_token`, `refresh_token` | `{ user }` |
| `POST /api/auth/login` | `{ email, password }` | `access_token`, `refresh_token` | `{ user }` |
| `POST /api/auth/refresh` | – (reads cookie) | rotated `access_token`, `refresh_token` | `{ ok: true }` |
| `POST /api/auth/logout` | – | clears both cookies | `{ ok: true }` |
| `GET /api/auth/me` | – | – | `{ user }` or 401 |

Cookies: `httpOnly`, `sameSite: lax`, `secure` in production, `Path=/`. Access token cookie name `access_token`, refresh `refresh_token`.

**Pages (new):** `/login`, `/register` — centred card, serif headline, saffron CTA, link to the other.

**Middleware (replacement):** a slim `middleware.ts` (TypeScript, replacing the deleted `middleware.js`) verifies the access token JWT and gates `/`, `/case/:path*`, `/api/cases/:path*`, `/api/files/:path*`, `/api/orchestration/:path*`, `/api/generate/:path*`, `/api/soc_analysis/:path*`, `/api/storage/:path*`. On invalid/expired access, it does NOT auto-refresh server-side; it returns 401 from API routes and redirects to `/login` from pages. Refresh is initiated client-side via `/api/auth/refresh` from the `useAuth` hook on 401 responses (or proactively on a timer).

**Client changes:** `hooks/useAuth.ts` and `contexts/AuthProvider.tsx` rewritten against the new endpoints. The current Makebell token-in-query-param flow disappears entirely.

### 4.2 LLM client — Google Gemini direct

`lib/llm/index.ts` rewritten to use `@google/genai` (already a project dependency). Interface stays compatible:

```ts
export async function queryLLM(opts: {
  prompt: string;
  model?: string;       // default: 'gemini-2.5-pro' (verify via context7 at impl time)
  maxTokens?: number;   // default: 60000
  task?: string;        // pass-through for logging
}): Promise<{ success: true; content: string; thinking?: string } | { success: false; error: string }>
```

The `accessToken` parameter is removed from the public signature. The `provider`, `appName`, and Makebell-specific tracking parameters are removed.

Env: `GEMINI_API_KEY` (already in `.env.example`).

LangChain's `@langchain/google-genai` is also added (used by graph nodes — see 4.4). The plain `queryLLM` stays for any direct ad-hoc call sites; the graph uses `ChatGoogleGenerativeAI` from LangChain.

### 4.3 Database — Prisma + SQLite

**`prisma/schema.prisma`** ports every table from `db/schema.ts`. Notable changes:

| Drizzle (Postgres) | Prisma (SQLite) | Why |
|---|---|---|
| `pgTable("cases", { caseType: varchar(20) /* check SOC|DEFENCE */ })` | `model Case { caseType String  /* "SOC" | "DEFENCE" */ }` plus `enum`-like constants in TS | SQLite has no native enum; we enforce in TS at the service layer. |
| `jsonb("entities")` | `String` (JSON-encoded) with `JSON.parse` at boundary | SQLite has no jsonb; explicit parsing keeps the surface honest. |
| `caseParties.chineseName` | `caseParties.bengaliName` | Bengali swap. |
| `socAnalyses.witnessStatementChinese` | `socAnalyses.witnessStatementBengali` | Bengali swap. |
| `default(sql\`uuid_generate_v4()\`)` | `@default(cuid())` | SQLite has no UUID. CUIDs work the same in the app. |
| `timestamp with time zone` | `DateTime` (Prisma's default) | Prisma handles serialization. |

**`db/index.ts`** becomes a thin `lib/db.ts` exporting a `PrismaClient` cached on `globalThis` (same Next-HMR pattern as today). Old `db/migrate.ts`, `db/run-migration-*.ts`, `db/migrations/*.sql` are all deleted. New scripts in `package.json`:

```json
"prisma:generate": "prisma generate",
"prisma:migrate": "prisma migrate dev",
"prisma:studio": "prisma studio",
"prisma:seed": "tsx prisma/seed.ts"
```

`prisma/seed.ts` creates the demo user (`demo@vakil.app` / `demo1234`) and one fully-populated case (see 4.7).

**Services (`services/*.ts`)** are rewritten one for one in Prisma syntax. Method names and shapes stay the same so callers (API routes, graph nodes) don't change beyond the import. Removed: anything Drizzle-specific (`db.query.X.findFirst({ where: eq(...) })` → `prisma.x.findFirst({ where: { ... } })`).

### 4.4 Orchestration — LangGraph

**Library replacement.** `lib/orchestration/` is deleted entirely. New `lib/graph/`:

```
lib/graph/
  state.ts              -- StateAnnotation: the shared graph state
  nodes/                -- one file per node, plain async functions
    fetchChronology.ts
    fetchParticulars.ts
    fetchWritOfSummonsFiles.ts
    generateWritOfSummons.ts
    generateWitnessStatement.ts
    generateStatementOfClaim.ts
    generateStatementOfDamages.ts
    generatePreActionLetter.ts
    translateWitnessStatement.ts
    -- and for the per-document graphs:
    generateParticulars.ts
    generateChronology.ts
    verifyMarkdown.ts
    saveToSoc.ts
  graphs/
    documents.ts        -- the full multi-doc DAG
    particulars.ts      -- single-doc graph
    chronology.ts       -- single-doc graph
  llm.ts                -- ChatGoogleGenerativeAI factory, env-gated tracing
  sse.ts                -- map streamEvents -> existing SSE event shape
  debug.ts              -- writeDebugOutput, ported from agents/debug-utils.ts
```

**State shape (`state.ts`):**

```ts
import { Annotation } from "@langchain/langgraph";

export const DocumentsState = Annotation.Root({
  caseId: Annotation<string>(),
  userId: Annotation<string>(),
  userComment: Annotation<string | undefined>(),

  // fetched
  chronology: Annotation<string | undefined>(),
  particulars: Annotation<string | undefined>(),
  writOfSummonsFiles: Annotation<FileSummary[] | undefined>(),

  // generated
  writOfSummons: Annotation<string | undefined>(),
  witnessStatement: Annotation<string | undefined>(),
  statementOfClaim: Annotation<string | undefined>(),
  statementOfDamages: Annotation<string | undefined>(),
  preActionLetter: Annotation<string | undefined>(),
  witnessStatementBengali: Annotation<string | undefined>(),
});
```

**Documents graph topology (`graphs/documents.ts`):**

```
START
  ├─► fetchChronology ─────────────────┐
  ├─► fetchParticulars ────────────────┤
  └─► fetchWritOfSummonsFiles ──► generateWritOfSummons ──┐
                                                          │
  (chronology + particulars ready) ──► generateWitnessStatement ──► translateWitnessStatement ──┐
                                  ├──► generateStatementOfClaim ────────────────────────────────┤
                                  ├──► generateStatementOfDamages ──────────────────────────────┤
                                  └──► generatePreActionLetter ─────────────────────────────────┤
                                                                                                ▼
                                                                                              END
```

The 3 fetches run in parallel. Once chronology + particulars are both ready, the 4 dependent generators fan out in parallel. `generateWritOfSummons` runs in parallel with those (only depends on the writ files). `translateWitnessStatement` runs after `generateWitnessStatement`.

**Per-document graphs (`graphs/particulars.ts`, `graphs/chronology.ts`):** each is `generate → verifyMarkdown → saveToSoc` with built-in retry config (`{ maxAttempts: 3 }`) on the generate node. Replaces the manual retry loop currently in `GenerateChronologyAgent`.

**HTTP surface:**
- `POST /api/orchestration` — body `{ caseId, userComment? }`. Server reads `userId` from JWT, builds `DocumentsState`, calls `graph.streamEvents(state, { version: "v2" })`, maps each event into the existing SSE shape (`agent_started`, `agent_complete`, `agent_error`, `workflow_complete`) so the frontend stays untouched.
- `POST /api/generate/particular` — same pattern, runs `particularsGraph`.
- `POST /api/generate/chronology` — runs `chronologyGraph`.
- `POST /api/generate/regenerate` stays as a direct LLM call (it's a single-shot, no graph value).

**LLM construction (`graph/llm.ts`):**

```ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export function makeLLM(opts: { task: string }) {
  return new ChatGoogleGenerativeAI({
    model: process.env.LLM_MODEL ?? "gemini-2.5-pro",
    apiKey: process.env.GEMINI_API_KEY,
    maxOutputTokens: 60000,
    metadata: { task: opts.task },
  });
}
```

**LangSmith tracing:** env-gated. When `LANGCHAIN_TRACING_V2=true` and `LANGCHAIN_API_KEY` are set, LangChain SDKs auto-trace. Documented in `.env.example` and README. Default off; zero cost when unset.

**Debug output:** `graph/debug.ts` writes per-node JSON to `lib/graph/debug/` (gitignored), same idea as the current `lib/orchestration/agents/debug/`.

### 4.5 Bengali integration

- `caseParties.bengaliName` (was `chineseName`).
- `socAnalyses.witnessStatementBengali` (was `witnessStatementChinese`).
- `lib/prompts/translate_to_bengali.txt` (new) — translation prompt targeting standard Bangla (Bengali). The current Chinese translation prompt is deleted.
- `translateWitnessStatement` node uses the new prompt.
- UI labels: "Bengali Name (বাংলা)" on the party form. Witness Statement tab gets a "Show Bengali translation" toggle.
- Seed data (`prisma/seed.ts`) includes a sample party with a Bengali name and a sample translated witness statement.

### 4.6 Brand & content

| Surface | Change |
|---|---|
| `package.json` `name` | `vakil` |
| `.env.example` `NEXT_PUBLIC_APP_NAME` | `Vakil` |
| `app/layout.tsx` metadata | `title: "Vakil"`, description updated |
| `app/manifest.json` | name, short_name, theme_color, icons updated |
| `components/Navbar.tsx` | Fraunces wordmark "Vakil" + user dropdown |
| `components/Footer.tsx` | `© 2026 Vakil · Built by Habibur Rahman` (link to GitHub) |
| All "Personal Injury" / "Makebell" strings | Removed or replaced |
| `CLAUDE.md` | Rewritten to reflect new architecture |
| `README.md` | New — portfolio README (see 4.7) |

### 4.7 Environment variables (consolidated)

`.env.example` will end up with this surface. Anything not listed below is removed.

| Var | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | yes | `Vakil` |
| `NEXT_PUBLIC_BASE_URL` | yes | `http://localhost:3000` in dev |
| `DATABASE_URL` | yes | `file:./prisma/dev.db` for SQLite |
| `JWT_ACCESS_SECRET` | yes | 32+ random bytes; signs the 15-min access JWT |
| `GEMINI_API_KEY` | yes | Google AI Studio key |
| `LLM_MODEL` | no | Override default Gemini model name |
| `MISTRAL_API_KEY` | yes for OCR | Live OCR only; demo seed bypasses it |
| `DO_SPACES_KEY` / `_SECRET` / `_ENDPOINT` / `_REGION` / `_BUCKET` | yes for uploads | DigitalOcean Spaces; same as today |
| `LANGCHAIN_TRACING_V2` | no | `true` to enable LangSmith tracing |
| `LANGCHAIN_API_KEY` | no | Required only if tracing is on |

Notably removed: anything Makebell-related (no more `platform.makebell.com` callout in env or in code). `NEXT_PUBLIC_SUPABASE_URL` is also gone — it was a misnomer pointing at the Makebell platform.

### 4.8 Demo & README

**Seed (`prisma/seed.ts`):**

- User: `demo@vakil.app` / password `demo1234` (hashed). Name "Demo Lawyer".
- One case: "Khan v. Pacific Logistics Ltd.", caseType `SOC`.
- Plaintiff "Aarav Khan" (Bengali name "আরভ খান"). Defendant "Pacific Logistics Ltd." (type `company`).
- 3 evidence files pre-populated with realistic OCR text (no real OCR call needed). Processing status `completed`.
- `soc_analyses` row with realistic Markdown for `particularsMarkdown`, `chronologyMarkdown`, all 5 generated documents, and a Bengali translation of the witness statement.
- README documents these credentials clearly.

**README.md (new):**
- Hero: "Vakil — AI paralegal that drafts while you strategize." + tagline screenshot.
- 1-min Loom-style GIF or static screenshot strip of the wizard.
- "What's in the box": Next.js 15, JWT auth, Prisma + SQLite, LangGraph multi-agent orchestration, Mistral OCR, Google Gemini.
- Architecture diagram (Mermaid) of the documents graph.
- Run-locally instructions: install, copy `.env.example`, `npm run prisma:migrate && npm run prisma:seed && npm run dev`, log in with demo credentials.
- "What I'd build next" section (honest scope limits — Vercel deploy, real email verification, etc.).

## 5. Visual design system

CSS variables in `app/globals.css`, exposed to Tailwind v4 via `@theme`:

```css
@theme {
  --color-ink-950: #0F1B2D;
  --color-ink-700: #2A3F5F;
  --color-ink-500: #4F627E;
  --color-cream-50: #FAF7F2;
  --color-cream-100: #F3EDE2;
  --color-cream-200: #E8DEC9;
  --color-saffron-500: #E08E2B;
  --color-saffron-600: #B8731F;
  --color-emerald-500: #2F8F6F;
  --color-rose-500: #C44A4A;
  --color-line: rgba(15, 27, 45, 0.08);
  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-body: "Inter", ui-sans-serif, system-ui, sans-serif;
  --radius-card: 12px;
  --radius-button: 8px;
}
```

**Typography:** Fraunces (weights 400, 500, 600) for all headings and any quoted document titles. Inter (weights 400, 500, 600) for body, buttons, form fields. Geist deleted from `app/layout.tsx`.

**Component principles:**
- Surfaces: cream-50 page, cream-100 cards with 1px `--color-line` borders. Never `shadow-lg`.
- Buttons: filled saffron with ink text on primary, outline (1px line) on secondary, ghost (no border) for tertiary. Always `--radius-button`.
- Status chips: `bg-ink-950/10 text-ink-950` (pending), `bg-saffron-500/15 text-saffron-600` (processing), `bg-emerald-500/15 text-emerald-500` (completed), `bg-rose-500/15 text-rose-500` (failed).
- Inputs: 1px line border, no shadow, focus ring is 2px saffron at 30% opacity.
- Cards have generous padding (`p-6` minimum) and rely on whitespace rather than separators.

## 6. UI surfaces redesigned

| Surface | Today | After |
|---|---|---|
| `/login` | does not exist | Centred card on cream, Fraunces "Welcome back" headline, email/password, saffron CTA, "New here? Create an account" link |
| `/register` | does not exist | Same shell, name/email/password, password strength hint |
| `/` (cases) | plain table with search | Top hero strip: "Welcome back, {firstName}" + "New case" saffron CTA. Below: search + filter pill row, then a responsive grid of case cards (title, parties as small avatars, status chip, last-updated). Empty state with friendly illustration spot. |
| `/case/[id]` wizard | linear, plain | Top: serif numbered stepper (1 Evidence · 2 Process · 3 Particulars · 4 Chronology · 5 Review) with completed/current/pending states. Body: cream card per step. Sticky footer with Prev/Next saffron buttons. |
| Document tabs | top tab strip | Left-side tab rail (Writ · Witness · SoC · SoD · Pre-Action) + wide reading column on the right. Top-right of the column: Regenerate · Export · Bengali toggle (only on Witness). |
| `Navbar` | basic | Fraunces wordmark "Vakil" + breadcrumb on case pages + user avatar dropdown (Account · Sign out) |
| `Footer` | wordy | Single line: `© 2026 Vakil · Built by Habibur Rahman ↗` |

The 5-step wizard logic and components in `components/steps/` keep their internal behaviour (state, gating booleans) — only the visual shell changes.

## 7. Commit sequence (the story the git log tells)

1. `feat(db): add Prisma + SQLite schema alongside Drizzle` — both coexist; nothing else changes.
2. `refactor(db): port services to Prisma, remove Drizzle` — services swap one for one.
3. `chore(db): delete drizzle config and old migrations` — cleanup pass.
4. `feat(auth): JWT auth with refresh-token rotation, login/register pages`.
5. `refactor: remove Makebell middleware and LLM proxy` — replaces `middleware.js`, rewrites `lib/llm/index.ts` to Gemini direct.
6. `feat(graph): introduce LangGraph; port orchestration to a DAG with parallel fan-out`.
7. `feat(graph): port particulars and chronology generation to single-node graphs`.
8. `refactor: delete lib/orchestration; orchestration route now uses the graph`.
9. `feat: replace Chinese translation with Bengali across schema, agents, prompts, UI`.
10. `feat: rebrand to Vakil — package, copy, manifest, CLAUDE.md`.
11. `feat(ui): design system tokens, Fraunces + Inter, warm palette`.
12. `feat(ui): redesign cases dashboard, wizard stepper, document tabs, auth pages`.
13. `chore: seed demo user + case; write portfolio README`.

Each commit should leave the app in a working state (`npm run dev` boots, primary flow exercisable).

## 8. Out of scope (explicitly deferred)

- Bilingual UI (English/Bengali toggle on the chrome itself).
- Email verification and password reset (would require a transactional email provider).
- Production deployment to Vercel/Render/Fly (the SQLite choice rules out serverless; deferred to a future "v2: switch to Turso" issue).
- OAuth (Google sign-in).
- File-level access control beyond ownership (no sharing model).
- Real legal-template accuracy for any specific jurisdiction.
- Renaming `services/socService.ts` / `case_analyses.analysisType === 'soc'` — the abbreviation is internal and survives the rebrand intact.

## 9. Open risks & mitigations

| Risk | Mitigation |
|---|---|
| Gemini's model name `gemini-3-flash-preview` currently in code may not exist or may have changed | Use Context7 at implementation time to verify the current Gemini model lineup before settling defaults. |
| LangGraph TS API churn | Pin `@langchain/langgraph` to the latest stable at implementation time; verify via Context7. |
| SQLite + Prisma migration losing existing dev data | Acceptable — the existing data is the original client's; we're starting fresh. The demo seed gives reviewers a populated database. |
| Bcryptjs slow on Node serverless | Not relevant (no serverless deployment). Cost factor 10 stays. |
| User uploads PDFs that the demo OCR pipeline can't process during evaluation | Seed includes pre-OCR'd files so the wizard works end-to-end without a Mistral key. Live OCR still requires `MISTRAL_API_KEY`. |
