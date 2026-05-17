import { prisma } from "@/lib/db";

type Status = "pending" | "processing" | "completed" | "failed";

export class AnalysisService {
  static async createAnalysis(caseId: string, analysisType: "soc" | "defence") {
    return prisma.caseAnalysis.create({ data: { caseId, analysisType } });
  }

  static async getAnalysis(caseId: string, analysisType: "soc" | "defence") {
    return prisma.caseAnalysis.findUnique({
      where: { caseId_analysisType: { caseId, analysisType } },
    });
  }

  static async updateAnalysisStatus(
    analysisId: string,
    status: Status,
    errorMessage?: string,
  ) {
    return prisma.caseAnalysis.update({
      where: { id: analysisId },
      data: { analysisStatus: status, errorMessage },
    });
  }

  static async deleteAnalysis(analysisId: string) {
    await prisma.caseAnalysis.delete({ where: { id: analysisId } });
  }
}
