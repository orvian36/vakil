import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export class PartyService {
  static async addParty(
    caseId: string,
    name: string,
    role: "plaintiff" | "defendant",
  ) {
    return prisma.caseParty.create({ data: { caseId, name, role } });
  }

  static async listParties(caseId: string, role?: "plaintiff" | "defendant") {
    return prisma.caseParty.findMany({
      where: role ? { caseId, role } : { caseId },
    });
  }

  static async updateParty(partyId: string, updates: Prisma.CasePartyUpdateInput) {
    return prisma.caseParty.update({ where: { id: partyId }, data: updates });
  }

  static async removeParty(partyId: string) {
    await prisma.caseParty.delete({ where: { id: partyId } });
  }
}
