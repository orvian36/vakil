# Vakil Rebrand — Implementation Plan Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement these plans phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing Hong Kong personal-injury document generator into **Vakil** — a self-contained AI legal drafter with JWT auth, Prisma + SQLite, LangGraph orchestration, Bengali translation, and a new visual identity. Suitable for a public portfolio repo.

**Spec:** [`../specs/2026-05-17-vakil-rebrand-design.md`](../specs/2026-05-17-vakil-rebrand-design.md) — read this first.

**Tech stack (target state):** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma + SQLite · `jsonwebtoken` + `bcryptjs` · `@google/genai` + `@langchain/langgraph` + `@langchain/google-genai` · Vitest.

---

## 1. Phase map

Each phase is implemented on its own feature branch, opened as a PR, merged into `main`, then the next phase begins from the updated `main`. The order matters — later phases depend on earlier infrastructure.

| # | Phase | Branch | Plan | Output |
|---|---|---|---|---|
| 1 | Prisma + SQLite migration | `feat/phase-1-prisma` | [phase-1-prisma.md](./2026-05-17-vakil-rebrand-phase-1-prisma.md) | DB layer on Prisma; Vitest installed; services tested |
| 2 | JWT auth + Gemini LLM (rip out Makebell) | `feat/phase-2-auth-llm` | [phase-2-auth-llm.md](./2026-05-17-vakil-rebrand-phase-2-auth-llm.md) | Login/register flow; new middleware; LLM client is Gemini-direct |
| 3 | LangGraph orchestration | `feat/phase-3-langgraph` | [phase-3-langgraph.md](./2026-05-17-vakil-rebrand-phase-3-langgraph.md) | `lib/graph/` replaces `lib/orchestration/`; parallel fan-out |
| 4 | Bengali swap + Vakil brand | `feat/phase-4-bengali-brand` | [phase-4-bengali-brand.md](./2026-05-17-vakil-rebrand-phase-4-bengali-brand.md) | Bengali translation; "Vakil" name everywhere; updated CLAUDE.md |
| 5 | UI redesign (serif + warm palette) | `feat/phase-5-ui` | [phase-5-ui.md](./2026-05-17-vakil-rebrand-phase-5-ui.md) | Design tokens; redesigned dashboard, wizard, tabs, auth pages |
| 6 | Demo seed + portfolio README | `feat/phase-6-demo-readme` | [phase-6-demo-readme.md](./2026-05-17-vakil-rebrand-phase-6-demo-readme.md) | One-click demo via seeded user/case; screenshots; README |

**Dependencies:**
- Phase 2 depends on Phase 1 (auth tables need Prisma).
- Phase 3 depends on Phase 2 (graph reads `userId` from JWT, calls Gemini direct).
- Phase 4 depends on Phase 3 (translation prompt lives in a graph node).
- Phase 5 depends on Phase 4 (UI references "Vakil" branding).
- Phase 6 depends on Phase 5 (screenshots show the final design).

---

## 2. Per-phase workflow

**Every phase follows this exact loop. Do not skip steps.**

```
1. Verify you are on main, up to date:
     git checkout main
     git pull origin main
     git status   # must show clean working tree

2. Create the phase branch:
     git checkout -b feat/phase-<N>-<slug>

3. Work through the phase plan task-by-task. Commit frequently.
   Commit messages follow the format in the plan (Conventional Commits).

4. When all tasks in the phase plan are checked off and the app
   still runs (`npm run dev` boots cleanly), push:
     git push -u origin feat/phase-<N>-<slug>

5. Open the PR (gh):
     gh pr create --base main --head feat/phase-<N>-<slug> \
       --title "<phase title>" \
       --body-file docs/superpowers/plans/.pr-body.md

   (Each phase plan supplies the PR body — copy it into
   docs/superpowers/plans/.pr-body.md first, then run the command.)

6. Merge the PR (preserves the per-commit history for portfolio value):
     gh pr merge --merge --delete-branch

7. Sync local main:
     git checkout main
     git pull origin main

8. Only then begin the next phase.
```

**Why per-phase PRs (not one big PR):** Each merged PR is a discrete repo-history event a reviewer can browse. Portfolio readers see six self-contained shipments rather than one wall-of-changes. Each phase produces a working app, so even partial completion would still leave `main` deployable.

**Why merge-commit (not squash):** the per-phase plans break each commit into a meaningful sub-story (e.g. "add Prisma schema" then "port socService" then "delete Drizzle"). A merge commit keeps that visible in the log.

---

## 3. Cross-cutting conventions

These apply across every phase. Each plan re-states the relevant ones, but they all live here.

### Commit messages

Conventional Commits — `<type>(<scope>): <subject>`. Allowed types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`. Subject is imperative, lowercase, no trailing period. Wrap body at 72 cols. No "Co-Authored-By" attribution lines (this is a portfolio repo authored by `orvian36`).

### Branch hygiene

Never push to `main` directly. Never force-push to any branch. If a PR needs amending after review, push new commits — don't rebase published history.

### File layout

Follow the structure proposed in the spec (§4). Where the spec doesn't dictate a path, mirror existing patterns: `services/<thing>Service.ts`, `lib/<area>/<file>.ts`, `app/api/<route>/route.ts`. New top-level dirs only when the spec explicitly creates them (`prisma/`, `lib/auth/`, `lib/graph/`).

### Testing posture

Test infrastructure (Vitest) is installed in Phase 1. Coverage policy:

- **Required tests:** auth library functions (`lib/auth/*`), Prisma service methods, LangGraph node functions, refresh-token rotation behaviour.
- **No tests required:** UI components, brand-string replacements, copy edits, README, seed scripts (smoke-run instead), Tailwind token changes.
- **Smoke tests where unit tests don't fit:** for the full orchestration graph, write an integration test that runs the graph against a mocked LLM and asserts the SSE event sequence.

When TDD applies, use the strict red-green-commit loop: write failing test → run, confirm red → implement minimal → run, confirm green → commit. When it doesn't, use implement → verify-by-running → commit.

### Working-state invariant

After **every** commit on a phase branch, `npm run dev` must boot without throwing. Type errors are tolerated only if the affected route is also stubbed; runtime crashes on first request are not. If a commit would break boot, split it.

### Never delete the spec

The spec at `docs/superpowers/specs/2026-05-17-vakil-rebrand-design.md` is the source of truth. If implementation reveals a spec error, update the spec in the same commit that fixes the code — never silently diverge.

---

## 4. After all six phases merge

Once Phase 6's PR is merged, the rebrand is complete. Recommended follow-ups (not part of this plan):

- Update repo description and topics via `gh repo edit orvian36/vakil --description "..." --add-topic ai --add-topic nextjs --add-topic langgraph --add-topic prisma`.
- Pin the repo on the GitHub profile.
- Capture a Loom-style screen recording for the README (optional).

These are explicitly out of scope for this implementation plan.
