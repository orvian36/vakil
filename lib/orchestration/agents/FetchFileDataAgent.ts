import { Agent, AgentContext, AgentResult } from "../types";
import { prisma } from "@/lib/db";
import { writeDebugOutput } from "./debug-utils";

export class FetchFileDataAgent implements Agent {
  name = "fetch-file-data";

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const caseId = context.caseId;

      if (!caseId) {
        return { success: false, error: "Case ID is required to fetch file data" };
      }

      console.log(`[FetchFileDataAgent] Fetching file data for case: ${caseId}`);

      const caseFiles = await prisma.file.findMany({
        where: { caseId },
        select: {
          summary: true,
          fileName: true,
          processingStatus: true,
          type: true,
          id: true,
        },
      });

      const allOcrText = caseFiles
        .filter((f) => f.processingStatus === "completed" && f.summary)
        .map(
          (f) =>
            `=== File ID: ${f.id} === File Name: ${f.fileName} === File Type: ${f.type} === \n File Summary: ${f.summary}`,
        )
        .join("\n\n");

      const fileData = {
        ocrText: allOcrText,
        totalFiles: caseFiles.length,
        completedFiles: caseFiles.filter((f) => f.processingStatus === "completed").length,
        files: caseFiles,
      };

      console.log(
        `[FetchFileDataAgent] Fetched ${fileData.completedFiles}/${fileData.totalFiles} files for case: ${caseId}`,
      );

      await writeDebugOutput(this.name, fileData, { caseId });
      return { success: true, data: fileData };
    } catch (error) {
      console.error("[FetchFileDataAgent] Error:", error);
      await writeDebugOutput(
        this.name,
        { error: error instanceof Error ? error.message : "Unknown error" },
        { caseId: context.caseId },
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error fetching file data",
      };
    }
  }
}
