import { db } from "@/db";
import { caseParties } from "@/db/schema";
import { eq } from "drizzle-orm";

export class PartyService {
    static async addParty(
      caseId: string,
      name: string,
      role: "plaintiff" | "defendant"
    ) {
      const [party] = await db
        .insert(caseParties)
        .values({ caseId, name, role })
        .returning();
      return party;
    }
  
    static async listParties(caseId: string, role?: "plaintiff" | "defendant") {
      return await db.query.caseParties.findMany({
        where: role
          ? (p: typeof caseParties, { and }: { and: any }) => and(eq(p.caseId, caseId), eq(p.role, role))
          : eq(caseParties.caseId, caseId),
      });
    }
  
    static async updateParty(
      partyId: string,
      updates: Partial<typeof caseParties.$inferInsert>
    ) {
      const [updated] = await db
        .update(caseParties)
        .set({ ...updates })
        .where(eq(caseParties.id, partyId))
        .returning();
      return updated;
    }
  
    static async removeParty(partyId: string) {
      await db.delete(caseParties).where(eq(caseParties.id, partyId));
    }
  }