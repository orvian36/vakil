import { db } from "@/db";
import { caseAnalyses } from "@/db/schema";
import { eq } from "drizzle-orm";

export class AnalysisService {
    static async createAnalysis(caseId: string, analysisType: "soc" | "defence") {
      const [analysis] = await db
        .insert(caseAnalyses)
        .values({ caseId, analysisType })
        .returning();
      return analysis;
    }
  
    static async getAnalysis(caseId: string, analysisType: "soc" | "defence") {
      return await db.query.caseAnalyses.findFirst({
        where: (a: typeof caseAnalyses, { and }: { and: any }) =>
          and(eq(a.caseId, caseId), eq(a.analysisType, analysisType)),
      });
    }
  
    static async updateAnalysisStatus(
      analysisId: string,
      status: "pending" | "processing" | "completed" | "failed",
      errorMessage?: string
    ) {
      const [updated] = await db
        .update(caseAnalyses)
        .set({
          analysisStatus: status,
          errorMessage,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(caseAnalyses.id, analysisId))
        .returning();
      return updated;
    }
  
    static async deleteAnalysis(analysisId: string) {
      await db.delete(caseAnalyses).where(eq(caseAnalyses.id, analysisId));
    }
  }