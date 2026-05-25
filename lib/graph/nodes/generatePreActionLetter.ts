import { SocService } from "@/services/socService";
import { makeLLM } from "../llm";
import { loadPrompt, extractContentFromLlmResponse } from "../util";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType } from "../state";

export async function generatePreActionLetter(
  state: DocumentsStateType,
): Promise<Partial<DocumentsStateType>> {
  if (!state.particulars || !state.chronology) {
    throw new Error("generatePreActionLetter requires particulars and chronology");
  }
  const template = await loadPrompt("generate_pre-action_letter.txt");
  let prompt = `${template}\n\n## Particulars:\n${state.particulars}\n\n## Chronology:\n${state.chronology}`;
  if (state.userComment?.trim()) {
    prompt += `\n\n## User Modifications:\n${state.userComment.trim()}`;
  }
  const llm = makeLLM({ task: "generate-pre-action-letter" });
  const res = await llm.invoke(prompt);
  const content = extractContentFromLlmResponse(String(res.content));
  await SocService.upsertByCaseId(state.caseId, { preActionLetter: content });
  await writeDebugOutput("generatePreActionLetter", { content }, { caseId: state.caseId });
  return { preActionLetter: content };
}
