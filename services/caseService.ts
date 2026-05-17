import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { CaseParty } from "@/types/case";
import { EvidenceTypeService } from "./evidenceTypeService";

export class CaseService {
  static async createCase(
    userId: string,
    title: string,
    caseType: "SOC" | "DEFENCE",
    summary?: string,
    parties?: CaseParty[],
    court?: string,
    caseNumber?: string,
  ) {
    const newCase = await prisma.case.create({
      data: {
        userId,
        title,
        caseType,
        summary,
        court,
        caseNumber,
        parties:
          parties && parties.length > 0
            ? {
                create: parties.map((p) => ({
                  name: p.name,
                  bengaliName: p.bengaliName ?? null,
                  role: p.role,
                  type: p.type ?? "person",
                })),
              }
            : undefined,
      },
    });

    try {
      await EvidenceTypeService.initializeEvidenceTypesForCase(newCase.id);
    } catch (err) {
      console.error("Failed to initialize evidence types for case:", err);
    }

    return newCase;
  }

  static async getCaseById(caseId: string) {
    return prisma.case.findUnique({
      where: { id: caseId },
      include: { parties: true, files: true, analyses: true, evidenceTypes: true },
    });
  }

  static async listCasesByUser(userId: string) {
    const rows = await prisma.case.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { parties: true },
    });

    return rows.map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      caseType: c.caseType,
      court: c.court,
      caseNumber: c.caseNumber,
      createdAt: c.createdAt,
      parties: c.parties.map((p) => ({
        id: p.id,
        name: p.name,
        bengaliName: p.bengaliName,
        role: p.role,
        type: p.type,
      })),
    }));
  }

  static async updateCase(
    caseId: string,
    updates: Prisma.CaseUpdateInput & { parties?: CaseParty[] },
  ) {
    const { parties, ...caseUpdates } = updates;

    if (Object.keys(caseUpdates).length > 0) {
      await prisma.case.update({ where: { id: caseId }, data: caseUpdates });
    }

    if (parties !== undefined) {
      await prisma.caseParty.deleteMany({ where: { caseId } });
      if (parties.length > 0) {
        await prisma.caseParty.createMany({
          data: parties.map((p) => ({
            caseId,
            name: p.name,
            bengaliName: p.bengaliName ?? null,
            role: p.role,
            type: p.type ?? "person",
          })),
        });
      }
    }

    return this.getCaseById(caseId);
  }

  static async deleteCase(caseId: string) {
    await prisma.case.delete({ where: { id: caseId } });
  }
}
