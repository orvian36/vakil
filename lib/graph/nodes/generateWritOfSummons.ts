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
    .map(
      (f) =>
        `### ${f.fileName} (${f.type})\nSummary: ${f.summary ?? "—"}\nOCR:\n${f.ocrData ?? "—"}`,
    )
    .join("\n\n");
  let prompt = `${template}\n\n## Supporting documents\n${fileBlock}`;
  if (state.userComment?.trim()) {
    prompt += `\n\n## User Modifications:\n${state.userComment.trim()}`;
  }
  const llm = makeLLM({ task: "generate-writ-of-summons" });
  const res = await llm.invoke(prompt);
  const content = stripCodeFence(String(res.content));
  await SocService.upsertSocAnalysis(state.caseId, { writOfSummons: content });
  await writeDebugOutput("generateWritOfSummons", { content }, { caseId: state.caseId });
  return { writOfSummons: content };
}
