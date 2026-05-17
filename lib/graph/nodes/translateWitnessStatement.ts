import { SocService } from "@/services/socService";
import { makeLLM } from "../llm";
import { stripCodeFence } from "../util";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType } from "../state";

// NOTE: still uses the Chinese translation prompt. Phase 4 swaps it for the
// Bengali prompt and re-runs against the same `witnessStatementBengali` column.
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

  await SocService.upsertSocAnalysis(state.caseId, { witnessStatementBengali: content });
  await writeDebugOutput("translateWitnessStatement", { content }, { caseId: state.caseId });
  return { witnessStatementBengali: content };
}
