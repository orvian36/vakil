import { db } from "@/db";
import { socAnalyses } from "@/db/schema";
import { eq } from "drizzle-orm";

export class SocService {
    static async createSocAnalysis(
      caseAnalysisId: string,
      details: Partial<typeof socAnalyses.$inferInsert>
    ) {
      const [socAnalysis] = await db
        .insert(socAnalyses)
        .values({ caseAnalysisId, ...details })
        .returning();
      return socAnalysis;
    }
  
    static async getSocAnalysis(caseAnalysisId: string) {
      return await db.query.socAnalyses.findFirst({
        where: eq(socAnalyses.caseAnalysisId, caseAnalysisId),
      });
    }
  
    static async updateSocAnalysis(
      caseAnalysisId: string,
      updates: Partial<typeof socAnalyses.$inferInsert>
    ) {
      const [updated] = await db
        .update(socAnalyses)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(socAnalyses.caseAnalysisId, caseAnalysisId))
        .returning();
      return updated;
    }

    /**
     * Upsert SOC analysis - creates if doesn't exist, updates if exists
     * @param caseAnalysisId - The case analysis ID
     * @param details - The SOC analysis data to insert/update
     * @returns The created or updated SOC analysis record
     */
    static async upsertSocAnalysis(
      caseAnalysisId: string,
      details: Partial<typeof socAnalyses.$inferInsert>
    ) {
      const [socAnalysis] = await db
        .insert(socAnalyses)
        .values({ 
          caseAnalysisId, 
          ...details,
          updatedAt: new Date().toISOString()
        })
        .onConflictDoUpdate({
          target: socAnalyses.caseAnalysisId,
          set: {
            ...details,
            updatedAt: new Date().toISOString()
          }
        })
        .returning();
      return socAnalysis;
    }

    /**
     * Upsert SOC analysis with specific fields - more granular control
     * @param caseAnalysisId - The case analysis ID
     * @param particularsJson - Particulars JSON data
     * @param chronologyJson - Chronology JSON data
     * @param generatedContent - Object containing generated content fields
     * @returns The created or updated SOC analysis record
     */
    static async upsertSocAnalysisWithContent(
      caseAnalysisId: string,
      particularsJson?: any,
      chronologyJson?: any,
      generatedContent?: {
        summaryOfClaim?: string;
        listOfExhibits?: string;
        chronologyOfEvents?: string;
        witnessStatements?: string;
        allFileOcr?: string;
      }
    ) {
      const updateData: Partial<typeof socAnalyses.$inferInsert> = {
        updatedAt: new Date().toISOString()
      };

      if (particularsJson !== undefined) {
        updateData.particularsJson = particularsJson;
      }
      if (chronologyJson !== undefined) {
        updateData.chronologyJson = chronologyJson;
      }
      if (generatedContent) {
        if (generatedContent.summaryOfClaim !== undefined) {
          updateData.statementOfClaim = generatedContent.summaryOfClaim;
        }
        if (generatedContent.listOfExhibits !== undefined) {
          updateData.statementOfDamages = generatedContent.listOfExhibits;
        }
        if (generatedContent.chronologyOfEvents !== undefined) {
          updateData.preActionLetter = generatedContent.chronologyOfEvents;
        }
        if (generatedContent.witnessStatements !== undefined) {
          updateData.witnessStatement = generatedContent.witnessStatements;
        }
        if (generatedContent.allFileOcr !== undefined) {
          updateData.allFileOcr = generatedContent.allFileOcr;
        }
      }

      const [socAnalysis] = await db
        .insert(socAnalyses)
        .values({ 
          caseAnalysisId, 
          ...updateData
        })
        .onConflictDoUpdate({
          target: socAnalyses.caseAnalysisId,
          set: updateData
        })
        .returning();
      return socAnalysis;
    }
  
    static async deleteSocAnalysis(caseAnalysisId: string) {
      await db.delete(socAnalyses).where(eq(socAnalyses.caseAnalysisId, caseAnalysisId));
    }
  }