# Vakil

> **An AI paralegal that drafts while you strategize.**

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tests](https://img.shields.io/badge/tests-153%20passing-brightgreen?logo=vitest)
![License](https://img.shields.io/badge/license-MIT-blue)

<!-- HERO: drop docs/screenshots/hero.png here when captured -->

Vakil turns case evidence into court-ready first drafts. Upload PDFs, the app OCRs them, generates particulars and a chronology, then fans out into a Writ of Summons, Statement of Claim, Statement of Damages, Pre-Action Letter, and Witness Statement — with a Bangla (বাংলা) translation of the witness statement.

## At a glance

**What:** AI paralegal that turns case PDFs into five court-ready first drafts (Writ of Summons, Statement of Claim, Statement of Damages, Pre-Action Letter, Witness Statement — with a Bangla translation of the witness statement).

**Who for:** Solo and small-firm lawyers in Bangladesh who spend hours producing the same template documents.

**Why it's interesting:** Real multi-agent orchestration (LangGraph DAG, not a chain), hand-written Edge-runtime JWT auth, and a test suite that hits a real database.

## Engineering highlights

1. **Parallel LangGraph DAG for document generation.** Three DB-fetch nodes fan out from `START`; five generators fan out once their inputs land. Replaces a sequential `for`-loop orchestrator — wall-time scales with the slowest branch, not the sum. → `lib/graph/graphs/documents.ts`

2. **Declarative retry on invalid LLM output.** Per-document graphs (`particularsGraph`, `chronologyGraph`) wrap each generation in `generate → verify-markdown → save` with `addConditionalEdges` retrying up to 3× on invalid Markdown. No imperative retry loops in node code. → `lib/graph/graphs/particulars.ts`

3. **Edge-runtime JWT auth, hand-written.** 15-min access JWT signed via `jose` (Edge-compatible — `jsonwebtoken` isn't), 7-day refresh tokens stored hashed (SHA-256), rotation is transactional, reuse of a revoked token returns 401 as a real attack signal. No NextAuth, no third-party provider. → `lib/auth/`, `middleware.ts`

4. **Streaming server events from the graph to the UI.** `documentsGraph.streamEvents(v2)` is mapped to a stable legacy SSE shape so the frontend kept working through the orchestrator rewrite. → `lib/graph/sse.ts`, `app/api/orchestration/route.ts`

5. **Real-DB Vitest, not mocks.** Service-layer + auth-flow tests hit a real SQLite DB; the DAG test runs end-to-end with a mocked LLM and asserts every output column lands on `SocAnalysis`. `fileParallelism: false` because SQLite races the truncate. → `tests/`, `vitest.config.ts`

6. **Config-driven document tabs.** Adding a new generated document = one column on `SocAnalysis`, one prompt file, one graph node, one entry in `config/tabs.json`. The UI doesn't change. → `config/tabs.json`, `components/tabs/`

## Architecture

```mermaid
flowchart LR
  S([START]) --> FC[fetchChronology]
  S --> FP[fetchParticulars]
  S --> FW[fetchWritOfSummonsFiles]

  FW --> GW[generateWritOfSummons] --> E([END])

  FC --> GWS[generateWitnessStatement]
  FP --> GWS
  GWS --> TWS[translateWitnessStatement] --> E

  FC --> GSC[generateStatementOfClaim] --> E
  FP --> GSC

  FC --> GSD[generateStatementOfDamages] --> E
  FP --> GSD

  FC --> GPA[generatePreActionLetter] --> E
  FP --> GPA
```

Per-document graphs (`particularsGraph`, `chronologyGraph`) wrap each generation in a `generate → verify-markdown → save` loop with declarative retry on invalid output (max 3 attempts) via `addConditionalEdges`.

## Run locally

```bash
git clone https://github.com/orvian36/vakil.git
cd vakil

cp .env.example .env
# Fill at minimum:
#   JWT_ACCESS_SECRET  — any 32+ char random string
#   GEMINI_API_KEY     — from https://aistudio.google.com/

npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Sign in at <http://localhost:3000>:

| Email | Password |
|---|---|
| `demo@vakil.app` | `demo1234` |

The seeded "Khan v. Pacific Logistics Ltd." case is pre-populated with OCR text, so the live OCR credentials (`MISTRAL_API_KEY`, `DO_SPACES_*`) are **not** required to experience the full flow.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma · SQLite · LangGraph · `@google/genai` · `jose` · `bcryptjs` · Vitest · Mistral OCR · DigitalOcean Spaces

## Tests

`npm test` runs 153 Vitest tests covering the security-critical and integration-heavy paths:

- `lib/auth/password` — bcrypt round-trip
- `lib/auth/tokens` — JWT sign/verify, refresh-token mint, rotation, reuse detection, expiry, mass revoke
- `app/api/auth/*` — register → login → refresh → logout integration
- `services/*` — every Prisma service method against a real SQLite test DB
- `lib/graph/graphs/documents` — full LangGraph DAG end-to-end with a mocked LLM, asserts every field lands on `SocAnalysis`

UI components and seed scripts have no unit tests — verified by `npm run build`, `npm run dev`, and the demo seed.

## Project tour

| Where | What |
|---|---|
| `prisma/schema.prisma` | All tables — `User`, `RefreshToken`, `Case`, `CaseParty`, `File`, `CaseAnalysis`, `SocAnalysis`, `CaseEvidenceType` |
| `lib/auth/` | JWT (jose), refresh-token rotation, password hashing, server session helper |
| `lib/db.ts` | Cached `PrismaClient` (HMR-safe) |
| `lib/llm/index.ts` | Direct Google Gemini client |
| `lib/graph/` | LangGraph nodes, graphs, SSE adapter, debug dumper |
| `lib/prompts/*.txt` | Per-document generation prompts (loaded at request time) |
| `services/*.ts` | Thin Prisma wrappers, one class per table |
| `app/api/auth/*` | `register`, `login`, `refresh`, `logout`, `me` |
| `app/api/orchestration/route.ts` | SSE-streamed orchestration trigger that runs `documentsGraph` |
| `app/case/[case_id]/page.tsx` | 5-step drafting wizard |
| `components/tabs/*.tsx` | Document tabs (Writ · Witness · SoC · SoD · Pre-Action), Witness has an English / বাংলা toggle |
| `middleware.ts` | JWT-gated route middleware (Edge-safe via jose) |
| `config/tabs.json` | Drives the document-tab generator |

## What I'd build next

- **GitHub Actions CI** running `npm test` + `npm run build` on every push, with a real status badge replacing the static one above.
- **Vercel deployment** with Turso (libSQL) replacing local SQLite — `libsql` speaks the same query syntax, so the Prisma swap is a driver adapter change.
- **Email verification + password reset** via Resend.
- **OAuth (Google)** via Auth.js, sharing the existing `User`/`RefreshToken` tables.
- **Per-case sharing** so multiple paralegals on the same matter can collaborate.
- **OCR queue worker** so wizard step 2 doesn't block the UI on large PDFs.
- **Polish the remaining wizard step internals + modals** — Phase 5 of the rebrand stopped at the dashboard/auth/wizard-shell because the step internals are deep components; their interior color palette still uses the pre-rebrand blue/gray.

## Repo history

This repo was built across six PRs ([#1](https://github.com/orvian36/vakil/pull/1)–[#6](https://github.com/orvian36/vakil/pull/6)), each one a discrete phase: Prisma migration → JWT auth + Gemini → LangGraph orchestration → Bengali + brand → UI design system → demo seed + this README. The planning docs that drove the work live under `docs/superpowers/`.

## License

MIT — see [`LICENSE`](./LICENSE). Built by [Habibur Rahman](https://github.com/orvian36).
