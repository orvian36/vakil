import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export class SocService {
  static async createSocAnalysis(
    caseAnalysisId: string,
    details: Omit<Prisma.SocAnalysisUncheckedCreateInput, "caseAnalysisId">,
  ) {
    return prisma.socAnalysis.create({
      data: { ...details, caseAnalysisId },
    });
  }

  static async getSocAnalysis(caseAnalysisId: string) {
    return prisma.socAnalysis.findUnique({ where: { caseAnalysisId } });
  }

  static async updateSocAnalysis(
    caseAnalysisId: string,
    updates: Prisma.SocAnalysisUpdateInput,
  ) {
    return prisma.socAnalysis.update({
      where: { caseAnalysisId },
      data: updates,
    });
  }

  static async upsertSocAnalysis(
    caseAnalysisId: string,
    details: Omit<Prisma.SocAnalysisUncheckedCreateInput, "caseAnalysisId">,
  ) {
    return prisma.socAnalysis.upsert({
      where: { caseAnalysisId },
      create: { ...details, caseAnalysisId },
      update: details,
    });
  }

  static async deleteSocAnalysis(caseAnalysisId: string) {
    await prisma.socAnalysis.delete({ where: { caseAnalysisId } });
  }
}
