import { SocService } from "@/services/socService";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType } from "../state";

export async function fetchParticulars(
  state: DocumentsStateType,
): Promise<Partial<DocumentsStateType>> {
  const soc = await SocService.getSocAnalysis(state.caseId);
  const particulars = soc?.particularsMarkdown ?? null;
  await writeDebugOutput("fetchParticulars", { particulars }, { caseId: state.caseId });
  return { particulars };
}
