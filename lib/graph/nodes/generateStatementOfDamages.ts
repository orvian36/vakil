import { SocService } from "@/services/socService";
import { makeLLM } from "../llm";
import { loadPrompt, stripCodeFence } from "../util";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType } from "../state";

export async function generateStatementOfDamages(
  state: DocumentsStateType,
): Promise<Partial<DocumentsStateType>> {
  if (!state.particulars || !state.chronology) {
    throw new Error("generateStatementOfDamages requires particulars and chronology");
  }
  const template = await loadPrompt("generate_statement_of_damages.txt");
  let prompt = `${template}\n\n## Particulars:\n${state.particulars}\n\n## Chronology:\n${state.chronology}`;
  if (state.userComment?.trim()) {
    prompt += `\n\n## User Modifications:\n${state.userComment.trim()}`;
  }
  const llm = makeLLM({ task: "generate-statement-of-damages" });
  const res = await llm.invoke(prompt);
  const content = stripCodeFence(String(res.content));
  await SocService.upsertSocAnalysis(state.caseId, { statementOfDamages: content });
  await writeDebugOutput("generateStatementOfDamages", { content }, { caseId: state.caseId });
  return { statementOfDamages: content };
}
