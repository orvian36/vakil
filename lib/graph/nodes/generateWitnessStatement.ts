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
