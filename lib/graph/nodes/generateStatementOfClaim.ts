import { SocService } from "@/services/socService";
import { makeLLM } from "../llm";
import { loadPrompt, stripCodeFence } from "../util";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType } from "../state";

export async function generateStatementOfClaim(
  state: DocumentsStateType,
): Promise<Partial<DocumentsStateType>> {
  if (!state.particulars || !state.chronology) {
    throw new Error("generateStatementOfClaim requires particulars and chronology");
  }
  const template = await loadPrompt("generate_statement_of_claim.txt");
  let prompt = `${template}\n\n## Particulars:\n${state.particulars}\n\n## Chronology:\n${state.chronology}`;
  if (state.userComment?.trim()) {
    prompt += `\n\n## User Modifications:\n${state.userComment.trim()}`;
  }
  const llm = makeLLM({ task: "generate-statement-of-claim" });
  const res = await llm.invoke(prompt);
  const content = stripCodeFence(String(res.content));
  await SocService.upsertByCaseId(state.caseId, { statementOfClaim: content });
  await writeDebugOutput("generateStatementOfClaim", { content }, { caseId: state.caseId });
  return { statementOfClaim: content };
}
