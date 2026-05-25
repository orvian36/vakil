# Recruiter-facing repo polish

**Date:** 2026-05-22
**Owner:** Habibur Rahman (@orvian36)
**Repo:** https://github.com/orvian36/vakil
**Audience:** Engineering hiring managers and senior engineers skimming a portfolio link.

## Goal

Restructure `README.md` and add the missing repo-hygiene files so a senior engineer who clicks the GitHub link from a CV can, within ~30 seconds:

1. See concrete engineering decisions in the first screenful.
2. Verify the project is real (badges, LICENSE, demo creds, project tour).
3. Decide whether to click around or read further.

Out of scope: writing live tests, refactoring app code, deploying to Vercel/Turso, capturing visual assets (deferred).

## Non-goals

- Adding CI workflows or a real build/test badge.
- Recording screenshots, GIFs, or demo video (user will do this separately later).
- Adding `CONTRIBUTING.md`, `SECURITY.md`, or `.github/FUNDING.yml` — this is a portfolio piece, not an OSS project soliciting PRs.
- Editing anything under `app/`, `lib/`, `components/`, `prisma/`, `services/`, `tests/`, or `config/`.

## Deliverables

### 1. Rewritten `README.md`

New top-to-bottom outline:

```
# Vakil                                        H1
> One-liner tagline (unchanged)
[ badges row ]                                 NEW
<!-- HERO: drop docs/screenshots/hero.png -->  NEW (placeholder for later)

## At a glance                                 NEW (3 lines: what · who · why interesting)

## Engineering highlights                      NEW (6 bullets — see §1.2 below)

## Architecture                                Existing Mermaid + 2-3 sentences on per-doc retry graph

## Run locally                                 Existing; drop the second-person prose around the demo creds, keep the table + the "no MISTRAL/DO_SPACES needed for the seed" callout

## Stack                                       Existing pill-line, unchanged

## Tests                                       Existing, lead with the count

## Project tour                                Existing table, unchanged

## What I'd build next                         Existing roadmap, plus one new bullet: "GitHub Actions CI running `npm test` + `npm run build` on every push, with a real status badge"

## Repo history                                Existing PR-trail paragraph, unchanged

## License                                     MIT + author credit
```

Key structural moves vs current README:

- **Delete** the "What this demonstrates" section. Its content is promoted into "Engineering highlights" with tighter framing.
- **Promote** Engineering highlights *above* Architecture so the first screenful is decisions + diagram, not setup.
- **Add** badges + at-a-glance summary for a 5-second scan.
- **Leave** an HTML-comment hero-visual slot under the badges so the screenshot drop-in later is one line.

#### 1.1 Badges

Four shields.io badges (no GitHub Actions required):

- `![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)`
- `![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)`
- `![Tests](https://img.shields.io/badge/tests-32%20passing-brightgreen?logo=vitest)`
- `![License](https://img.shields.io/badge/license-MIT-blue)`

No CI/build badge. A fake "passing" pill that links nowhere is worse than no badge. CI setup is logged in "What I'd build next."

The test-count badge will become stale if the test suite grows. Acceptable: it's easy to bump and the number is verifiable by running `npm test`. **Implementation must run `npm test` before writing the badge, and use the actual count** — the "32" in the current README may be stale.

#### 1.2 Engineering highlights — exact bullets

Each bullet leads with the **decision** in bold, then one sentence of *why it matters*, then a file pointer.

1. **Parallel LangGraph DAG for document generation.** Three DB-fetch nodes fan out from `START`; five generators fan out once their inputs land. Replaces a sequential `for`-loop orchestrator — wall-time scales with the slowest branch, not the sum. → `lib/graph/graphs/documents.ts`

2. **Declarative retry on invalid LLM output.** Per-document graphs (`particularsGraph`, `chronologyGraph`) wrap each generation in `generate → verify-markdown → save` with `addConditionalEdges` retrying up to 3× on invalid Markdown. No imperative retry loops in node code. → `lib/graph/graphs/particulars.ts`

3. **Edge-runtime JWT auth, hand-written.** 15-min access JWT signed via `jose` (Edge-compatible — `jsonwebtoken` isn't), 7-day refresh tokens stored hashed (SHA-256), rotation is transactional, reuse of a revoked token returns 401 as a real attack signal. No NextAuth, no third-party provider. → `lib/auth/`, `middleware.ts`

4. **Streaming server events from the graph to the UI.** `documentsGraph.streamEvents(v2)` is mapped to a stable legacy SSE shape so the frontend kept working through the orchestrator rewrite. → `lib/graph/sse.ts`, `app/api/orchestration/route.ts`

5. **Real-DB Vitest, not mocks.** Service-layer + auth-flow tests hit a real SQLite DB; the DAG test runs end-to-end with a mocked LLM and asserts every output column lands on `SocAnalysis`. 32 tests, `fileParallelism: false` because SQLite races the truncate. → `tests/`, `vitest.config.ts`

6. **Config-driven document tabs.** Adding a new generated document = one column on `SocAnalysis`, one prompt file, one graph node, one entry in `config/tabs.json`. The UI doesn't change. → `config/tabs.json`, `components/tabs/`

Latency claim is intentionally qualitative ("scales with the slowest branch, not the sum"). No measured number, because none has been benchmarked. Stays honest under interview scrutiny.

#### 1.3 "At a glance" — exact text

```
**What:** AI paralegal that turns case PDFs into five court-ready first drafts (Writ of Summons, Statement of Claim, Statement of Damages, Pre-Action Letter, Witness Statement — with a Bangla translation of the witness statement).
**Who for:** Solo and small-firm lawyers in Bangladesh who spend hours producing the same template documents.
**Why it's interesting:** Real multi-agent orchestration (LangGraph DAG, not a chain), hand-written Edge-runtime JWT auth, and a test suite that hits a real database.
```

### 2. `LICENSE`

MIT license, copyright `2026 Habibur Rahman`. Standard SPDX text — no custom clauses. Removes a hygiene gap recruiters notice (the existing README already claims MIT but no LICENSE file exists at the repo root).

### 3. `docs/screenshots/.gitkeep`

Empty placeholder file so the directory exists in git. README's `<!-- HERO: drop docs/screenshots/hero.png -->` comment points here. When the user captures screenshots later, dropping them in this folder + uncommenting one line in the README is the entire integration.

### 4. GitHub repo About sidebar — paste-ready text

This isn't a file change; it's instructions for the user to paste into the GitHub repo settings:

- **Description:** `AI paralegal that drafts court-ready first drafts from case PDFs. Next.js 15 + LangGraph + Gemini + hand-rolled JWT auth.`
- **Topics:** `nextjs`, `typescript`, `langgraph`, `langchain`, `gemini`, `prisma`, `jwt`, `multi-agent`, `legal-tech`, `rag`
- **Website:** leave blank until there's a live demo

Will live in the implementation plan as a manual-step checklist.

## Asset capture list (for the user, later)

To fill the hero visual slot when ready, capture:

1. **Hero (highest priority):** Dashboard with the seeded "Khan v. Pacific Logistics Ltd." case visible.
2. Wizard Step 5 (Review) showing all five generated documents tabbed.
3. Witness Statement tab with the English ⇄ বাংলা toggle visible (ideally show the Bangla side — visually distinctive).

PNG, 1600px wide, save to `docs/screenshots/`. Update the README hero comment to an actual `![](...)` line.

## Files touched

| Path | Action |
|---|---|
| `README.md` | Rewrite (preserves architecture diagram, project tour table, run-locally steps, stack, repo history, license paragraph) |
| `LICENSE` | Create (MIT, 2026 Habibur Rahman) |
| `docs/screenshots/.gitkeep` | Create (empty) |

Three files total. No code touched.

## Validation

- `npm test` was run during implementation (to get the real test count for the badge), and all tests passed.
- `npm run build` still passes (it should — no code changes).
- README renders correctly on GitHub (Mermaid diagram, badge images, tables). User to spot-check by viewing the file on github.com after push.
- LICENSE shows up in GitHub's "About" sidebar as `MIT License` auto-detected.
