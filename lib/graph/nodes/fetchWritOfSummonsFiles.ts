import { prisma } from "@/lib/db";
import { writeDebugOutput } from "../debug";
import type { DocumentsStateType, FileSummary } from "../state";

export async function fetchWritOfSummonsFiles(
  state: DocumentsStateType,
): Promise<Partial<DocumentsStateType>> {
  const files = await prisma.file.findMany({
    where: { caseId: state.caseId, type: "writ_of_summons_supporting" },
    select: { id: true, fileName: true, type: true, summary: true, ocrData: true },
  });
  const writOfSummonsFiles: FileSummary[] = files;
  await writeDebugOutput(
    "fetchWritOfSummonsFiles",
    { count: files.length },
    { caseId: state.caseId },
  );
  return { writOfSummonsFiles };
}
