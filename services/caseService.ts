import { db } from "@/db";
import { cases, caseParties } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { CaseParty } from "@/types/case";
import { EvidenceTypeService } from "./evidenceTypeService";

export class CaseService {
    static async createCase(userId: string, title: string, caseType: "SOC" | "DEFENCE", summary?: string, parties?: CaseParty[], court?: string, caseNumber?: string) {
      const [newCase] = await db.insert(cases)
        .values({ userId, title, caseType, summary, court, caseNumber })
        .returning();

      if (parties && parties.length > 0) {
        await db.insert(caseParties).values(
          parties.map(p => ({
            caseId: newCase.id,
            name: p.name,
            chineseName: p.chineseName || null,
            role: p.role,
            type: p.type,
            id: p.id || crypto.randomUUID(),
          }))
        );
      }

      // Initialize evidence types for the new case
      try {
        await EvidenceTypeService.initializeEvidenceTypesForCase(newCase.id);
      } catch (error) {
        console.error('Failed to initialize evidence types for case:', error);
        // Don't fail the case creation if evidence types fail
        // They can be added later if needed
      }

      return newCase;
    }
  
    static async getCaseById(caseId: string) {
      return await db.query.cases.findFirst({
        where: eq(cases.id, caseId),
        with: {
          parties: true,
          files: true,
          analyses: true,
          evidenceTypes: true,
        },
      });
    }
    static async listCasesByUser(userId: string) {
      const casesWithParties = await db.query.cases.findMany({
        where: eq(cases.userId, userId),
        orderBy: (caseTable: typeof cases, { desc }: { desc: any }) => [desc(caseTable.createdAt)],
        with: {
          parties: true,
        },
      });
  
      // Map to UI-friendly structure
      return casesWithParties.map((c: typeof casesWithParties[0]) => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        caseType: c.caseType,
        court: c.court,
        caseNumber: c.caseNumber,
        createdAt: c.createdAt,
        parties: c.parties.map((p: typeof c.parties[0]) => ({
          id: p.id,
          name: p.name,
          chineseName: p.chineseName,
          role: p.role,
          type: p.type,
        })),
      }));
    }
  
    static async updateCase(caseId: string, updates: Partial<typeof cases.$inferInsert> & { parties?: CaseParty[] }) {
      const { parties, ...caseUpdates } = updates;

      //console.log("[CaseService] parties:", parties);

      console.log('Updating case with ID:', caseId, 'and updates:', updates);

      // 1. Update top-level case fields
      if (Object.keys(caseUpdates).length > 0) {
        await db.update(cases)
          .set({ ...caseUpdates, updatedAt: new Date().toISOString() })
          .where(eq(cases.id, caseId));
      }

      // 2. Handle parties (plaintiffs and defendants)
      if (parties !== undefined) {
        // Delete all existing parties for this case
        await db.delete(caseParties).where(eq(caseParties.caseId, caseId));

        // Insert all incoming parties
        if (parties.length > 0) {
          await db.insert(caseParties).values(
            parties.map(p => ({
              caseId: caseId,
              name: p.name,
              chineseName: p.chineseName || null,
              role: p.role,
              type: p.type,
              id: p.id || crypto.randomUUID(),
            }))
          );
        }
      }
      
      // Return the updated case (re-fetch to get all relations)
      return await CaseService.getCaseById(caseId);
    }
  
    static async deleteCase(caseId: string) {
      await db.delete(cases).where(eq(cases.id, caseId));
    }
  }