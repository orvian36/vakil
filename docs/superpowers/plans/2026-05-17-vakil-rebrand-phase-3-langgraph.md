# Phase 3 — LangGraph orchestration

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Read [`2026-05-17-vakil-rebrand-index.md`](./2026-05-17-vakil-rebrand-index.md) for the per-phase workflow.

**Pre-requisite:** Phase 2 PR merged. `lib/llm/index.ts` returns text from Gemini, `getCurrentUser()` works, agents no longer reference Makebell tokens.

**Goal:** Replace the hand-rolled `lib/orchestration/AgentOrchestrator` with LangGraph. The current sequential `for` loop becomes a typed `StateGraph` whose topology mirrors the actual data dependencies — three fetches in parallel, five generators in parallel, one terminal translation. Particulars and Chronology generation also become single-document graphs.

**Architecture:** `@langchain/langgraph` + `@langchain/google-genai`. State is a typed `Annotation.Root`. Each node is a plain async function `(state) => Partial<state>`. Streaming events from `graph.streamEvents()` are mapped to the SSE shape the existing frontend already understands, so client code doesn't change.

**Tech stack additions:** `@langchain/core`, `@langchain/langgraph`, `@langchain/google-genai`.

---

## File Structure

**Created:**
- `lib/graph/llm.ts` — `ChatGoogleGenerativeAI` factory
- `lib/graph/state.ts` — `DocumentsState`, `SingleDocumentState` annotations
- `lib/graph/debug.ts` — `writeDebugOutput`, ported from `agents/debug-utils.ts`
- `lib/graph/sse.ts` — maps LangGraph events to the existing SSE shape
- `lib/graph/util.ts` — shared helpers (prompt-file loader, markdown cleanup wrapper)
- `lib/graph/nodes/fetchChronology.ts`
- `lib/graph/nodes/fetchParticulars.ts`
- `lib/graph/nodes/fetchWritOfSummonsFiles.ts`
- `lib/graph/nodes/generateWritOfSummons.ts`
- `lib/graph/nodes/generateWitnessStatement.ts`
- `lib/graph/nodes/generateStatementOfClaim.ts`
- `lib/graph/nodes/generateStatementOfDamages.ts`
- `lib/graph/nodes/generatePreActionLetter.ts`
- `lib/graph/nodes/translateWitnessStatement.ts`
- `lib/graph/nodes/generateParticulars.ts`
- `lib/graph/nodes/generateChronology.ts`
- `lib/graph/nodes/verifyMarkdown.ts`
- `lib/graph/nodes/saveSocField.ts` — generic "save this field on SocAnalysis" node
- `lib/graph/graphs/documents.ts` — the multi-doc DAG
- `lib/graph/graphs/particulars.ts` — single-doc graph
- `lib/graph/graphs/chronology.ts` — single-doc graph
- `tests/graph/state.test.ts`
- `tests/graph/nodes.test.ts`
- `tests/graph/documents.integration.test.ts`

**Modified:**
- `app/api/orchestration/route.ts` — invokes `documentsGraph`, streams via `lib/graph/sse.ts`
- `app/api/generate/particular/route.ts` — invokes `particularsGraph`
- `app/api/generate/chronology/route.ts` — invokes `chronologyGraph`
- `app/api/generate/regenerate/route.ts` — leave as direct `queryLLM` call (no graph value)
- `package.json` — new deps
- `.env.example` — add `LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY` (both optional)
- `.gitignore` — add `lib/graph/debug/`

**Deleted (after the route handlers swap):**
- `lib/orchestration/` (entire directory: orchestrator, types, agents, debug-utils, agent-config.json, the two .js config files)

---

## Task 1: Create phase branch

- [ ] `git checkout main && git pull origin main && git status` (clean)
- [ ] `git checkout -b feat/phase-3-langgraph`

---

## Task 2: Install LangGraph and Gemini-via-LangChain

- [ ] **Step 1: Install**

```bash
npm install @langchain/core @langchain/langgraph @langchain/google-genai
```

- [ ] **Step 2: Verify versions via Context7** (recommended)

LangGraph TS API has shifted. Before writing graph code, query Context7:

```
mcp__plugin_context7_context7__resolve-library-id  "langchain langgraph"
mcp__plugin_context7_context7__query-docs  <id>  "StateGraph Annotation.Root parallel fan-out typescript"
```

Note any API divergence from what's written below and adjust as you go. The patterns shown in this plan are valid as of `@langchain/langgraph@0.2.x`.

- [ ] **Step 3: Add `.env.example` entries**

```
# Optional: LangSmith tracing for the LangGraph runs
LANGCHAIN_TRACING_V2=
LANGCHAIN_API_KEY=
LANGCHAIN_PROJECT=vakil
```

- [ ] **Step 4: gitignore the per-node debug dump dir**

Add to `.gitignore`:

```
lib/graph/debug/
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore
git commit -m "chore(graph): install langgraph + @langchain/google-genai"
```

---

## Task 3: Write `lib/graph/llm.ts` and `lib/graph/debug.ts`

- [ ] **Step 1: `lib/graph/llm.ts`**

```ts
// lib/graph/llm.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export function makeLLM(opts: { task: string; model?: string; maxTokens?: number }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: opts.model ?? process.env.LLM_MODEL ?? "gemini-2.5-pro",
    maxOutputTokens: opts.maxTokens ?? 60000,
    metadata: { task: opts.task },
  });
}
```

- [ ] **Step 2: `lib/graph/debug.ts`**

```ts
// lib/graph/debug.ts
import { promises as fs } from "node:fs";
import path from "node:path";

const DEBUG_DIR = path.join(process.cwd(), "lib", "graph", "debug");

export async function writeDebugOutput(
  nodeName: string,
  output: unknown,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await fs.mkdir(DEBUG_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = path.join(DEBUG_DIR, `${nodeName}_${stamp}.json`);
    const body = JSON.stringify(
      { nodeName, timestamp: new Date().toISOString(), metadata, output },
      null,
      2,
    );
    await fs.writeFile(file, body, "utf-8");
  } catch (err) {
    console.error(`[graph:debug] failed to write ${nodeName}:`, err);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/graph/llm.ts lib/graph/debug.ts
git commit -m "feat(graph): llm factory and per-node debug dump"
```

---

## Task 4: Write `lib/graph/util.ts`

- [ ] **Step 1: Implement**

```ts
// lib/graph/util.ts
import { promises as fs } from "node:fs";
import path from "node:path";

export async function loadPrompt(filename: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), "lib", "prompts", filename), "utf-8");
}

export function stripCodeFence(s: string): string {
  return s
    .trim()
    .replace(/^```(?:markdown|json|md)?\n?/, "")
    .replace(/\n```$/, "");
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/graph/util.ts
git commit -m "feat(graph): prompt loader and code-fence stripper"
```

---

## Task 5: Write `lib/graph/state.ts`

- [ ] **Step 1: Implement**

```ts
// lib/graph/state.ts
import { Annotation } from "@langchain/langgraph";

export interface FileSummary {
  id: string;
  fileName: string;
  type: string;
  summary?: string | null;
  ocrData?: string | null;
}

// Used by the multi-document orchestration graph
export const DocumentsState = Annotation.Root({
  caseId:                 Annotation<string>(),
  userId:                 Annotation<string>(),
  userComment:            Annotation<string | undefined>({ default: () => undefined, reducer: (_, n) => n }),

  // fetched
  chronology:             Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  particulars:            Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  writOfSummonsFiles:     Annotation<FileSummary[]>({ default: () => [], reducer: (_, n) => n }),

  // generated
  writOfSummons:          Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  witnessStatement:       Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  statementOfClaim:       Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  statementOfDamages:     Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  preActionLetter:        Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  witnessStatementBengali:Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
});

export type DocumentsStateType = typeof DocumentsState.State;

// Used by single-document graphs (particulars, chronology)
export const SingleDocState = Annotation.Root({
  caseId:      Annotation<string>(),
  userId:      Annotation<string>(),
  userComment: Annotation<string | undefined>({ default: () => undefined, reducer: (_, n) => n }),
  ocrText:     Annotation<string>(),
  content:     Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  attempts:    Annotation<number>({ default: () => 0, reducer: (a, n) => (n ?? a) }),
  valid:       Annotation<boolean>({ default: () => false, reducer: (_, n) => n }),
});

export type SingleDocStateType = typeof SingleDocState.State;
```

- [ ] **Step 2: Trivial smoke test**

```ts
// tests/graph/state.test.ts
import { describe, it, expect } from "vitest";
import { DocumentsState, SingleDocState } from "@/lib/graph/state";

describe("state annotations", () => {
  it("DocumentsState is defined with channels", () => {
    expect(DocumentsState.spec).toBeDefined();
  });
  it("SingleDocState is defined with channels", () => {
    expect(SingleDocState.spec).toBeDefined();
  });
});
```

Run: `npx vitest run tests/graph/state.test.ts` — both pass.

- [ ] **Step 3: Commit**

```bash
git add lib/graph/state.ts tests/graph/state.test.ts
git commit -m "feat(graph): DocumentsState and SingleDocState annotations"
```

---

## Task 6: Port the Fetch nodes (mechanical)

Three nodes, all DB-only, all trivial.

- [ ] **Step 1: `lib/graph/nodes/fetchChronology.ts`**

```ts
// lib/graph/nodes/fetchChronology.ts
import { SocService } from "@/services/socService";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType } from "../state";

export async function fetchChronology(state: DocumentsStateType): Promise<Partial<DocumentsStateType>> {
  const soc = await SocService.getSocAnalysis(state.caseId);
  const chronology = soc?.chronologyMarkdown ?? null;
  await writeDebugOutput("fetchChronology", { chronology }, { caseId: state.caseId });
  return { chronology };
}
```

- [ ] **Step 2: `lib/graph/nodes/fetchParticulars.ts`**

```ts
// lib/graph/nodes/fetchParticulars.ts
import { SocService } from "@/services/socService";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType } from "../state";

export async function fetchParticulars(state: DocumentsStateType): Promise<Partial<DocumentsStateType>> {
  const soc = await SocService.getSocAnalysis(state.caseId);
  const particulars = soc?.particularsMarkdown ?? null;
  await writeDebugOutput("fetchParticulars", { particulars }, { caseId: state.caseId });
  return { particulars };
}
```

- [ ] **Step 3: `lib/graph/nodes/fetchWritOfSummonsFiles.ts`**

Read the existing `FetchWritOfSummonsFilesAgent.ts` to mirror its DB logic exactly — it fetches files of evidence type `writ_of_summons_supporting` plus their OCR summaries.

```ts
// lib/graph/nodes/fetchWritOfSummonsFiles.ts
import { prisma } from "@/lib/db";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType, FileSummary } from "../state";

export async function fetchWritOfSummonsFiles(
  state: DocumentsStateType,
): Promise<Partial<DocumentsStateType>> {
  const files = await prisma.file.findMany({
    where: { caseId: state.caseId, type: "writ_of_summons_supporting" },
    select: { id: true, fileName: true, type: true, summary: true, ocrData: true },
  });
  const writOfSummonsFiles: FileSummary[] = files;
  await writeDebugOutput("fetchWritOfSummonsFiles", { count: files.length }, { caseId: state.caseId });
  return { writOfSummonsFiles };
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/graph/nodes/fetchChronology.ts lib/graph/nodes/fetchParticulars.ts lib/graph/nodes/fetchWritOfSummonsFiles.ts
git commit -m "feat(graph): fetch nodes (chronology, particulars, writ-of-summons files)"
```

---

## Task 7: Port the Generate nodes

For each Generate* agent, the LangGraph node:
1. Loads its prompt file via `loadPrompt`.
2. Appends the relevant context (particulars + chronology, or file summaries).
3. Optionally adds `userComment` block.
4. Calls `makeLLM({ task }).invoke(prompt)` → `response.content` string.
5. Strips code fences via `stripCodeFence`.
6. Saves via `SocService.upsertSocAnalysis(state.caseId, { <field>: cleaned })`.
7. Writes debug output.
8. Returns `{ <field>: cleaned }`.

- [ ] **Step 1: `lib/graph/nodes/generateWitnessStatement.ts`**

```ts
// lib/graph/nodes/generateWitnessStatement.ts
import { SocService } from "@/services/socService";
import { makeLLM } from "../llm";
import { loadPrompt, stripCodeFence } from "../util";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType } from "../state";

export async function generateWitnessStatement(
  state: DocumentsStateType,
): Promise<Partial<DocumentsStateType>> {
  if (!state.particulars || !state.chronology) {
    throw new Error("generateWitnessStatement requires particulars and chronology");
  }
  const template = await loadPrompt("generate_witness_statement.txt");
  let prompt = `${template}\n\n## Particulars:\n${state.particulars}\n\n## Chronology:\n${state.chronology}`;
  if (state.userComment?.trim()) {
    prompt += `\n\n## User Modifications:\n${state.userComment.trim()}`;
  }
  const llm = makeLLM({ task: "generate-witness-statement" });
  const res = await llm.invoke(prompt);
  const content = stripCodeFence(String(res.content));
  await SocService.upsertSocAnalysis(state.caseId, { witnessStatement: content });
  await writeDebugOutput("generateWitnessStatement", { content }, { caseId: state.caseId });
  return { witnessStatement: content };
}
```

- [ ] **Step 2: Apply the same template to**

For each of these nodes, create the file by copying Step 1 and changing:
- function name
- prompt filename (see `lib/prompts/*.txt`)
- SocService field name
- state return key

| File | Function | Prompt | SocAnalysis field |
|---|---|---|---|
| `generateStatementOfClaim.ts` | `generateStatementOfClaim` | `generate_statement_of_claim.txt` | `statementOfClaim` |
| `generateStatementOfDamages.ts` | `generateStatementOfDamages` | `generate_statement_of_damages.txt` | `statementOfDamages` |
| `generatePreActionLetter.ts` | `generatePreActionLetter` | `generate_pre-action_letter.txt` | `preActionLetter` |

All four read from `state.particulars` + `state.chronology` and write a single field.

- [ ] **Step 3: `lib/graph/nodes/generateWritOfSummons.ts`**

Different input shape — reads `state.writOfSummonsFiles`. Look at `lib/orchestration/agents/GenerateWritOfSummonsAgent.ts` to see exactly how it composes the prompt (typically: prompt template + per-file summary block).

```ts
// lib/graph/nodes/generateWritOfSummons.ts
import { SocService } from "@/services/socService";
import { makeLLM } from "../llm";
import { loadPrompt, stripCodeFence } from "../util";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType } from "../state";

export async function generateWritOfSummons(
  state: DocumentsStateType,
): Promise<Partial<DocumentsStateType>> {
  const template = await loadPrompt("generate_writ_of_summons.txt");
  const files = state.writOfSummonsFiles ?? [];
  const fileBlock = files
    .map((f) => `### ${f.fileName} (${f.type})\nSummary: ${f.summary ?? "—"}\nOCR:\n${f.ocrData ?? "—"}`)
    .join("\n\n");
  let prompt = `${template}\n\n## Supporting documents\n${fileBlock}`;
  if (state.userComment?.trim()) prompt += `\n\n## User Modifications:\n${state.userComment.trim()}`;

  const llm = makeLLM({ task: "generate-writ-of-summons" });
  const res = await llm.invoke(prompt);
  const content = stripCodeFence(String(res.content));
  await SocService.upsertSocAnalysis(state.caseId, { writOfSummons: content });
  await writeDebugOutput("generateWritOfSummons", { content }, { caseId: state.caseId });
  return { writOfSummons: content };
}
```

- [ ] **Step 4: `lib/graph/nodes/translateWitnessStatement.ts`**

Currently targets Chinese. Phase 4 rewrites the prompt + field name to Bengali. **For this phase, keep it as Chinese to keep diffs surgical** — the LangGraph swap should be its own commit. Phase 4's job is the Bengali swap.

```ts
// lib/graph/nodes/translateWitnessStatement.ts
import { SocService } from "@/services/socService";
import { makeLLM } from "../llm";
import { stripCodeFence } from "../util";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType } from "../state";

export async function translateWitnessStatement(
  state: DocumentsStateType,
): Promise<Partial<DocumentsStateType>> {
  if (!state.witnessStatement) {
    throw new Error("translateWitnessStatement requires witnessStatement");
  }
  const prompt = `You are a professional legal translator. Translate the following Witness Statement into accurate, formal, and clear Chinese, preserving all legal terminology and formatting. Do not omit or summarize.\n\n${state.witnessStatement}\n\n**Critical: the chinese translation markdown must start with '# 證人陳述書\\n' exactly**`;

  const llm = makeLLM({ task: "translate-witness-statement" });
  const res = await llm.invoke(prompt);
  const content = stripCodeFence(String(res.content));

  // NOTE: writing to `witnessStatementBengali` because the Prisma schema (Phase 1)
  // already renamed the column. The Chinese-to-Bengali prompt swap happens in Phase 4.
  // Temporarily we write a Chinese-language string into the "Bengali" column —
  // Phase 4 corrects the prompt and re-runs.
  await SocService.upsertSocAnalysis(state.caseId, { witnessStatementBengali: content });
  await writeDebugOutput("translateWitnessStatement", { content }, { caseId: state.caseId });
  return { witnessStatementBengali: content };
}
```

- [ ] **Step 5: Commit (one commit per file for clean history)**

```bash
git add lib/graph/nodes/generateWitnessStatement.ts; git commit -m "feat(graph): generateWitnessStatement node"
git add lib/graph/nodes/generateStatementOfClaim.ts; git commit -m "feat(graph): generateStatementOfClaim node"
git add lib/graph/nodes/generateStatementOfDamages.ts; git commit -m "feat(graph): generateStatementOfDamages node"
git add lib/graph/nodes/generatePreActionLetter.ts; git commit -m "feat(graph): generatePreActionLetter node"
git add lib/graph/nodes/generateWritOfSummons.ts; git commit -m "feat(graph): generateWritOfSummons node"
git add lib/graph/nodes/translateWitnessStatement.ts; git commit -m "feat(graph): translateWitnessStatement node"
```

---

## Task 8: Per-node unit tests

A representative test for `fetchChronology` and one Generate node, with the LLM mocked. Other Generate nodes follow the same pattern — implementer adds them as time allows; the integration test in Task 11 covers their wiring.

- [ ] **Step 1: `tests/graph/nodes.test.ts`**

```ts
// tests/graph/nodes.test.ts
import { describe, it, expect, vi } from "vitest";
import { testPrisma } from "../helpers/testDb";
import { fetchChronology } from "@/lib/graph/nodes/fetchChronology";
import { generateWitnessStatement } from "@/lib/graph/nodes/generateWitnessStatement";

vi.mock("@/lib/graph/llm", () => ({
  makeLLM: () => ({
    invoke: vi.fn().mockResolvedValue({ content: "## Witness Statement\n\nI saw it." }),
  }),
}));

async function withCaseAndAnalysis(prefill: { particularsMarkdown?: string; chronologyMarkdown?: string } = {}) {
  const c = await testPrisma.case.create({ data: { userId: "u1", title: "T", caseType: "SOC" } });
  const ca = await testPrisma.caseAnalysis.create({ data: { caseId: c.id, analysisType: "soc" } });
  if (Object.keys(prefill).length) {
    await testPrisma.socAnalysis.create({ data: { caseAnalysisId: ca.id, ...prefill } });
  }
  // The services use caseId as the analysis lookup key in upsertSocAnalysis(caseId, ...) — verify
  // your SocService matches; if it expects caseAnalysisId, adapt this helper.
  return { caseId: ca.id };
}

describe("fetchChronology node", () => {
  it("returns null when no analysis row exists", async () => {
    const { caseId } = await withCaseAndAnalysis();
    const out = await fetchChronology({ caseId, userId: "u1" } as any);
    expect(out.chronology).toBeNull();
  });

  it("returns the chronologyMarkdown from the soc analysis", async () => {
    const { caseId } = await withCaseAndAnalysis({ chronologyMarkdown: "**Chrono**" });
    const out = await fetchChronology({ caseId, userId: "u1" } as any);
    expect(out.chronology).toBe("**Chrono**");
  });
});

describe("generateWitnessStatement node", () => {
  it("composes prompt, writes to db, returns content", async () => {
    const { caseId } = await withCaseAndAnalysis({
      particularsMarkdown: "Particulars text",
      chronologyMarkdown: "Chronology text",
    });
    const out = await generateWitnessStatement({
      caseId, userId: "u1",
      particulars: "Particulars text", chronology: "Chronology text",
    } as any);
    expect(out.witnessStatement).toContain("Witness Statement");
    const saved = await testPrisma.socAnalysis.findFirst({ where: { caseAnalysisId: caseId } });
    expect(saved?.witnessStatement).toContain("Witness Statement");
  });

  it("throws when chronology missing", async () => {
    await expect(
      generateWitnessStatement({ caseId: "x", userId: "u1", particulars: "p" } as any),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run, fix any service-shape mismatch.**

```bash
npx vitest run tests/graph/nodes.test.ts
```
If `upsertSocAnalysis(caseId, ...)` actually expects `caseAnalysisId`, adjust either the node (look up the `caseAnalysisId` for the given `caseId` first) or the service. Stay consistent with whatever the original codebase did before this rebrand — the goal is behaviour-preserving.

- [ ] **Step 3: Commit**

```bash
git add tests/graph/nodes.test.ts
git commit -m "test(graph): unit tests for fetch and generate nodes"
```

---

## Task 9: Write the verify/save helper nodes for single-doc graphs

- [ ] **Step 1: `lib/graph/nodes/verifyMarkdown.ts`**

```ts
// lib/graph/nodes/verifyMarkdown.ts
import { verifyMarkdown } from "@/utils/verify_markdown";
import { preProcessMD } from "@/utils/remarkFixVoidTags";
import type { SingleDocStateType } from "../state";

export async function verifyMarkdownNode(state: SingleDocStateType): Promise<Partial<SingleDocStateType>> {
  if (!state.content) return { valid: false };
  const cleaned = await preProcessMD(state.content);
  const ok = verifyMarkdown(cleaned);
  return { content: cleaned, valid: ok };
}
```

- [ ] **Step 2: `lib/graph/nodes/saveSocField.ts`**

This one is a *factory* — it returns a node bound to a specific field name.

```ts
// lib/graph/nodes/saveSocField.ts
import { SocService } from "@/services/socService";
import type { SingleDocStateType } from "../state";

export function saveSocFieldFactory(field: "particularsMarkdown" | "chronologyMarkdown") {
  return async (state: SingleDocStateType): Promise<Partial<SingleDocStateType>> => {
    if (!state.content || !state.valid) return {};
    await SocService.upsertSocAnalysis(state.caseId, { [field]: state.content } as any);
    return {};
  };
}
```

- [ ] **Step 3: `lib/graph/nodes/generateParticulars.ts`**

```ts
// lib/graph/nodes/generateParticulars.ts
import { makeLLM } from "../llm";
import { loadPrompt, stripCodeFence } from "../util";
import { writeDebugOutput } from "../debug";
import type { SingleDocStateType } from "../state";

export async function generateParticulars(state: SingleDocStateType): Promise<Partial<SingleDocStateType>> {
  const template = await loadPrompt("generate_particulars.txt");
  let prompt = `${template}\n\n## Case Documents Information\n${state.ocrText}`;
  if (state.userComment?.trim()) prompt += `\n\n## User Modifications:\n${state.userComment.trim()}`;

  const llm = makeLLM({ task: "generate-particulars" });
  const res = await llm.invoke(prompt);
  const content = stripCodeFence(String(res.content));
  await writeDebugOutput("generateParticulars", { content }, { caseId: state.caseId });
  return { content, attempts: state.attempts + 1 };
}
```

- [ ] **Step 4: `lib/graph/nodes/generateChronology.ts`**

Same shape, prompt file `generate_chronology.txt`, debug name `generateChronology`.

- [ ] **Step 5: Commit**

```bash
git add lib/graph/nodes/verifyMarkdown.ts lib/graph/nodes/saveSocField.ts lib/graph/nodes/generateParticulars.ts lib/graph/nodes/generateChronology.ts
git commit -m "feat(graph): single-doc helper nodes (verify, save factory, generate*)"
```

---

## Task 10: Build the three graphs

- [ ] **Step 1: `lib/graph/graphs/documents.ts`**

```ts
// lib/graph/graphs/documents.ts
import { StateGraph, END, START } from "@langchain/langgraph";
import { DocumentsState } from "../state";
import { fetchChronology }           from "../nodes/fetchChronology";
import { fetchParticulars }          from "../nodes/fetchParticulars";
import { fetchWritOfSummonsFiles }   from "../nodes/fetchWritOfSummonsFiles";
import { generateWritOfSummons }     from "../nodes/generateWritOfSummons";
import { generateWitnessStatement }  from "../nodes/generateWitnessStatement";
import { generateStatementOfClaim }  from "../nodes/generateStatementOfClaim";
import { generateStatementOfDamages }from "../nodes/generateStatementOfDamages";
import { generatePreActionLetter }   from "../nodes/generatePreActionLetter";
import { translateWitnessStatement } from "../nodes/translateWitnessStatement";

export const documentsGraph = new StateGraph(DocumentsState)
  .addNode("fetchChronology",          fetchChronology)
  .addNode("fetchParticulars",         fetchParticulars)
  .addNode("fetchWritOfSummonsFiles",  fetchWritOfSummonsFiles)
  .addNode("generateWritOfSummons",    generateWritOfSummons)
  .addNode("generateWitnessStatement", generateWitnessStatement)
  .addNode("generateStatementOfClaim", generateStatementOfClaim)
  .addNode("generateStatementOfDamages",generateStatementOfDamages)
  .addNode("generatePreActionLetter",  generatePreActionLetter)
  .addNode("translateWitnessStatement",translateWitnessStatement)
  // Fan-out from START
  .addEdge(START, "fetchChronology")
  .addEdge(START, "fetchParticulars")
  .addEdge(START, "fetchWritOfSummonsFiles")
  // Writ branch
  .addEdge("fetchWritOfSummonsFiles", "generateWritOfSummons")
  .addEdge("generateWritOfSummons", END)
  // Witness branch
  .addEdge("fetchChronology", "generateWitnessStatement")
  .addEdge("fetchParticulars", "generateWitnessStatement")
  .addEdge("generateWitnessStatement", "translateWitnessStatement")
  .addEdge("translateWitnessStatement", END)
  // SoC, SoD, Pre-Action — fan out from the same two fetches
  .addEdge("fetchChronology", "generateStatementOfClaim")
  .addEdge("fetchParticulars", "generateStatementOfClaim")
  .addEdge("generateStatementOfClaim", END)
  .addEdge("fetchChronology", "generateStatementOfDamages")
  .addEdge("fetchParticulars", "generateStatementOfDamages")
  .addEdge("generateStatementOfDamages", END)
  .addEdge("fetchChronology", "generatePreActionLetter")
  .addEdge("fetchParticulars", "generatePreActionLetter")
  .addEdge("generatePreActionLetter", END)
  .compile();
```

**Verify against current `@langchain/langgraph` docs:** LangGraph requires a node with multiple inbound edges to wait for *all* upstream nodes by default — confirm this is still the case. If it isn't, switch to the `addConditionalEdges` API or use a `joinNode` pattern as documented.

- [ ] **Step 2: `lib/graph/graphs/particulars.ts`**

```ts
// lib/graph/graphs/particulars.ts
import { StateGraph, END, START } from "@langchain/langgraph";
import { SingleDocState } from "../state";
import { generateParticulars }    from "../nodes/generateParticulars";
import { verifyMarkdownNode }     from "../nodes/verifyMarkdown";
import { saveSocFieldFactory }    from "../nodes/saveSocField";

const MAX_ATTEMPTS = 3;

export const particularsGraph = new StateGraph(SingleDocState)
  .addNode("generate", generateParticulars)
  .addNode("verify",   verifyMarkdownNode)
  .addNode("save",     saveSocFieldFactory("particularsMarkdown"))
  .addEdge(START, "generate")
  .addEdge("generate", "verify")
  .addConditionalEdges("verify", (s) => {
    if (s.valid) return "save";
    if (s.attempts >= MAX_ATTEMPTS) return END;
    return "generate";
  }, { save: "save", generate: "generate", [END]: END })
  .addEdge("save", END)
  .compile();
```

- [ ] **Step 3: `lib/graph/graphs/chronology.ts`**

Same shape with `generateChronology` and `saveSocFieldFactory("chronologyMarkdown")`.

- [ ] **Step 4: Commit**

```bash
git add lib/graph/graphs/
git commit -m "feat(graph): documents DAG and per-document graphs (particulars, chronology)"
```

---

## Task 11: Integration test — full documents graph end-to-end

- [ ] **Step 1: `tests/graph/documents.integration.test.ts`**

```ts
// tests/graph/documents.integration.test.ts
import { describe, it, expect, vi } from "vitest";
import { testPrisma } from "../helpers/testDb";
import { documentsGraph } from "@/lib/graph/graphs/documents";

vi.mock("@/lib/graph/llm", () => ({
  // Each invoke returns a deterministic string keyed off the prompt — lets us see which node ran.
  makeLLM: ({ task }: { task: string }) => ({
    invoke: vi.fn().mockResolvedValue({ content: `mock output for ${task}` }),
  }),
}));

describe("documents graph end-to-end", () => {
  it("runs all generate nodes and writes every field on SocAnalysis", async () => {
    const c = await testPrisma.case.create({ data: { userId: "u1", title: "T", caseType: "SOC" } });
    const ca = await testPrisma.caseAnalysis.create({ data: { caseId: c.id, analysisType: "soc" } });
    await testPrisma.socAnalysis.create({
      data: {
        caseAnalysisId: ca.id,
        particularsMarkdown: "Particulars **here**",
        chronologyMarkdown: "Chronology **here**",
      },
    });

    const result = await documentsGraph.invoke({ caseId: ca.id, userId: "u1" });

    expect(result.writOfSummons).toContain("writ-of-summons");
    expect(result.witnessStatement).toContain("witness-statement");
    expect(result.statementOfClaim).toContain("statement-of-claim");
    expect(result.statementOfDamages).toContain("statement-of-damages");
    expect(result.preActionLetter).toContain("pre-action-letter");
    expect(result.witnessStatementBengali).toContain("translate-witness-statement");

    const saved = await testPrisma.socAnalysis.findFirst({ where: { caseAnalysisId: ca.id } });
    expect(saved?.witnessStatement).toContain("witness-statement");
  });
});
```

- [ ] **Step 2: Run, confirm green.**

```bash
npx vitest run tests/graph/documents.integration.test.ts
```

If a node throws because `state.particulars` is null even though we created the soc row above, the issue is that `fetchParticulars` reads from the *case* (`SocService.getSocAnalysis(caseId)`) while the row was created with `caseAnalysisId`. Resolve by making sure `SocService.getSocAnalysis()` accepts whatever ID the rest of the app passes (consistency from Phase 1).

- [ ] **Step 3: Commit**

```bash
git add tests/graph/documents.integration.test.ts
git commit -m "test(graph): integration test for the full documents DAG"
```

---

## Task 12: SSE mapper

- [ ] **Step 1: `lib/graph/sse.ts`**

```ts
// lib/graph/sse.ts
// Maps LangGraph streamEvents to the SSE schema the existing frontend understands:
//   { type: 'workflow_start' | 'agent_started' | 'agent_complete' | 'agent_error' | 'workflow_complete', ... }

type Send = (data: unknown) => void;

const FRIENDLY: Record<string, string> = {
  fetchChronology:           "Loading chronology",
  fetchParticulars:          "Loading particulars",
  fetchWritOfSummonsFiles:   "Loading Writ of Summons supporting documents",
  generateWritOfSummons:     "Generating Writ of Summons",
  generateWitnessStatement:  "Generating Witness Statement",
  generateStatementOfClaim:  "Generating Statement of Claim",
  generateStatementOfDamages:"Generating Statement of Damages",
  generatePreActionLetter:   "Generating Pre-Action Letter",
  translateWitnessStatement: "Translating Witness Statement",
};

export function makeSseAdapter(send: Send) {
  send({ type: "workflow_start", message: "Workflow started" });

  return async function handle(event: any) {
    const nodeName: string | undefined = event.metadata?.langgraph_node ?? event.name;
    if (!nodeName || !FRIENDLY[nodeName]) return;

    if (event.event === "on_chain_start") {
      send({ type: "agent_started", agentName: nodeName, agentMessage: FRIENDLY[nodeName] });
    } else if (event.event === "on_chain_end") {
      send({ type: "agent_complete", agentName: nodeName });
    } else if (event.event === "on_chain_error") {
      send({ type: "agent_error", agentName: nodeName, error: String(event.data?.error ?? "unknown") });
    }
  };
}

export function emitWorkflowComplete(send: Send) {
  send({ type: "workflow_complete", message: "Workflow complete" });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/graph/sse.ts
git commit -m "feat(graph): SSE event adapter preserving the existing client schema"
```

---

## Task 13: Rewrite `app/api/orchestration/route.ts`

- [ ] **Step 1: Replace the file**

```ts
// app/api/orchestration/route.ts
import { NextRequest } from "next/server";
import { documentsGraph } from "@/lib/graph/graphs/documents";
import { emitWorkflowComplete, makeSseAdapter } from "@/lib/graph/sse";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { caseId, userComment } = await req.json();
  if (!caseId) return new Response("caseId required", { status: 400 });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      const handle = makeSseAdapter(send);
      try {
        for await (const ev of documentsGraph.streamEvents(
          { caseId, userId: user.id, userComment },
          { version: "v2" },
        )) {
          await handle(ev);
        }
        emitWorkflowComplete(send);
      } catch (err) {
        send({ type: "agent_error", message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" },
  });
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/orchestration/route.ts
git commit -m "refactor(api): orchestration route runs documentsGraph via langgraph"
```

---

## Task 14: Rewrite particular & chronology routes

- [ ] **Step 1: `app/api/generate/particular/route.ts`**

```ts
// app/api/generate/particular/route.ts
import { NextRequest, NextResponse } from "next/server";
import { particularsGraph } from "@/lib/graph/graphs/particulars";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { caseId, ocrText, userComment } = await req.json();
  if (!caseId || !ocrText) return NextResponse.json({ error: "caseId and ocrText required" }, { status: 400 });

  const final = await particularsGraph.invoke({
    caseId, userId: user.id, ocrText, userComment, attempts: 0, valid: false, content: null,
  });

  if (!final.valid || !final.content) {
    return NextResponse.json({ error: "failed to generate valid particulars" }, { status: 500 });
  }
  return NextResponse.json({ content: final.content });
}
```

- [ ] **Step 2: `app/api/generate/chronology/route.ts`** — same shape, `chronologyGraph`.

- [ ] **Step 3: Type-check & dev-boot**

```bash
npx tsc --noEmit
npm run dev   # ctrl-c after compile completes cleanly
```

- [ ] **Step 4: Commit**

```bash
git add app/api/generate/particular/route.ts app/api/generate/chronology/route.ts
git commit -m "refactor(api): particular and chronology routes run their single-doc graphs"
```

---

## Task 15: Delete `lib/orchestration/`

- [ ] **Step 1: Confirm nothing still imports it**

```bash
grep -rln "lib/orchestration\|@/lib/orchestration" --include="*.ts" --include="*.tsx" .
```
Expected: zero results.

- [ ] **Step 2: Delete**

```bash
git rm -r lib/orchestration/
```

- [ ] **Step 3: Type-check, test, build**

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(graph): delete legacy lib/orchestration"
```

---

## Task 16: Smoke test the new orchestration end-to-end

- [ ] **Step 1: Boot the app**

```bash
npm run dev
```

- [ ] **Step 2: Manual flow** — sign in (use the user you created in Phase 2). Navigate through the wizard to a case with particulars + chronology populated. Trigger the document generation step. Watch the network panel for the `/api/orchestration` SSE stream. Confirm:

- Events arrive in the same shape (`type: "agent_started"`, etc).
- The frontend's per-step UI still updates correctly.
- All 5 documents appear in their tabs after the workflow completes.
- (If you have no case in the right state, build one in `Prisma Studio` or step through the wizard from a fresh upload.)

- [ ] **Step 3: Check the LangSmith trace (optional)**

If you set `LANGCHAIN_TRACING_V2=true` and `LANGCHAIN_API_KEY`, the trace shows up under the `vakil` project at smith.langchain.com.

---

## Task 17: PR + merge

- [ ] **Step 1: Push**

```bash
git push -u origin feat/phase-3-langgraph
```

- [ ] **Step 2: PR body** (`docs/superpowers/plans/.pr-body.md`):

```markdown
## Summary

Replace the hand-rolled `AgentOrchestrator` with a typed LangGraph `StateGraph`. Particulars and Chronology generation also run through single-document graphs. Frontend SSE schema is preserved via `lib/graph/sse.ts` — no client changes.

## Highlights
- Three fetches run in parallel from START; five document generators fan out in parallel once particulars + chronology arrive; translation depends on witness statement. End-to-end wall time drops substantially on the generation pass.
- Each LangGraph node is a plain async function in `lib/graph/nodes/` — easy to unit-test.
- `particularsGraph` and `chronologyGraph` encode retry-on-invalid-markdown declaratively via `addConditionalEdges`, replacing the imperative retry loops in the old agents.
- Integration test exercises the full DAG with a mocked LLM.
- LangSmith tracing wired via env vars (off by default).
- `lib/orchestration/` is gone.

## Test plan
- [x] `npx vitest run` — service + auth + graph tests all green
- [x] `npx tsc --noEmit` — clean
- [x] `npm run build` — clean
- [x] Manual: run document generation through the UI; SSE events fire in the right order; all 5 documents land in DB

## Out of scope
Bengali swap (Phase 4) — the translate node still produces Chinese and writes it into the `witnessStatementBengali` column. Phase 4 fixes the prompt and re-runs.
```

- [ ] **Step 3: Open, merge, sync**

```bash
gh pr create --base main --head feat/phase-3-langgraph \
  --title "feat: phase 3 — langgraph orchestration with parallel fan-out" \
  --body-file docs/superpowers/plans/.pr-body.md
gh pr merge --merge --delete-branch
git checkout main && git pull origin main
```

---

**Phase 3 complete.** Proceed to [Phase 4 — Bengali + Vakil brand](./2026-05-17-vakil-rebrand-phase-4-bengali-brand.md).
