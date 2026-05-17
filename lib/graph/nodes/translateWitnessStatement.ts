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
