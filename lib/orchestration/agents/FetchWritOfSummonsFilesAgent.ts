import { Agent, AgentContext, AgentResult } from "../types";
import { prisma } from "@/lib/db";
import { writeDebugOutput } from "./debug-utils";

export class FetchWritOfSummonsFilesAgent implements Agent {
  name = "fetch-writ-of-summons-files";

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const caseId = context.caseId;

      if (!caseId) {
        return { success: false, error: "Case ID is required to fetch writ of summons files" };
      }

      console.log(`[FetchWritOfSummonsFilesAgent] Fetching for case: ${caseId}`);

      const writOfSummonsFiles = await prisma.file.findMany({
        where: { caseId, type: "writ_of_summons_supporting" },
        select: {
          summary: true,
          fileName: true,
          processingStatus: true,
          type: true,
          id: true,
        },
      });

      const combinedText = writOfSummonsFiles
        .filter((f) => f.processingStatus === "completed" && f.summary)
        .map(
          (f) =>
            `=== File ID: ${f.id} === File Name: ${f.fileName} === File Type: ${f.type} === \n File Summary: ${f.summary}`,
        )
        .join("\n\n");

      const fileData = {
        combinedText,
        totalFiles: writOfSummonsFiles.length,
        completedFiles: writOfSummonsFiles.filter((f) => f.processingStatus === "completed").length,
        files: writOfSummonsFiles,
      };

      console.log(
        `[FetchWritOfSummonsFilesAgent] Fetched ${fileData.completedFiles}/${fileData.totalFiles} files for case: ${caseId}`,
      );

      await writeDebugOutput(this.name, fileData, { caseId });
      return { success: true, data: fileData };
    } catch (error) {
      console.error("[FetchWritOfSummonsFilesAgent] Error:", error);
      await writeDebugOutput(
        this.name,
        { error: error instanceof Error ? error.message : "Unknown error" },
        { caseId: context.caseId },
      );
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error fetching writ of summons files",
      };
    }
  }
}
