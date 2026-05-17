import { makeLLM } from "../llm";
import { loadPrompt, stripCodeFence } from "../util";
import { writeDebugOutput } from "../debug";
import type { SingleDocStateType } from "../state";

export async function generateChronology(
  state: SingleDocStateType,
): Promise<Partial<SingleDocStateType>> {
  const template = await loadPrompt("generate_chronology.txt");
  let prompt = `${template}\n\n## Case Documents Information\n${state.ocrText}`;
  if (state.userComment?.trim()) {
    prompt += `\n\n## User Modifications:\n${state.userComment.trim()}`;
  }

  const llm = makeLLM({ task: "generate-chronology" });
  const res = await llm.invoke(prompt);
  const content = stripCodeFence(String(res.content));
  await writeDebugOutput("generateChronology", { content }, { caseId: state.caseId });
  return { content, attempts: state.attempts + 1 };
}
