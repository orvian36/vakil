import { SocService } from "@/services/socService";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType } from "../state";

export async function fetchChronology(
  state: DocumentsStateType,
): Promise<Partial<DocumentsStateType>> {
  const soc = await SocService.getSocAnalysis(state.caseId);
  const chronology = soc?.chronologyMarkdown ?? null;
  await writeDebugOutput("fetchChronology", { chronology }, { caseId: state.caseId });
  return { chronology };
}
