import { SocService } from "@/services/socService";
import type { SingleDocStateType } from "../state";

export function saveSocFieldFactory(
  field: "particularsMarkdown" | "chronologyMarkdown",
) {
  return async (state: SingleDocStateType): Promise<Partial<SingleDocStateType>> => {
    if (!state.content || !state.valid) return {};
    await SocService.upsertSocAnalysis(state.caseId, {
      [field]: state.content,
    } as any);
    return {};
  };
}
