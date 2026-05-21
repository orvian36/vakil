import { SocService } from "@/services/socService";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType } from "../state";

export async function fetchContext(
  state: DocumentsStateType,
): Promise<Partial<DocumentsStateType>> {
  const soc = await SocService.getByCaseId(state.caseId);
  const chronology = soc?.chronologyMarkdown ?? null;
  const particulars = soc?.particularsMarkdown ?? null;
  
  await writeDebugOutput("fetchContext", { chronology, particulars }, { caseId: state.caseId });
  return { chronology, particulars };
}
