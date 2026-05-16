import { db } from "@/db";
import { caseEvidenceTypes } from "@/db/schema";
import { eq, and, InferSelectModel } from "drizzle-orm";
import { CaseEvidenceType } from "@/types/case";

type EvidenceTypeRow = InferSelectModel<typeof caseEvidenceTypes>;

export class EvidenceTypeService {
  // Define the default evidence types
  static getDefaultEvidenceTypes() {
    return [
      {
        key: "writ_of_summons_supporting",
        title: "Writ of Summons Supporting documents",
        description: "Supporting documents for the writ of summons",
        displayOrder: 1,
      },
      {
        key: "medical_records",
        title: "Medical Records & Reports",
        description: "Hospital/clinic records, doctor's certificates, discharge summaries, physiotherapy reports",
        displayOrder: 2,
      },
      {
        key: "medical_bills",
        title: "Medical Bills & Receipts/Invoices",
        description: "For consultations, medication, rehabilitation, surgery, hospital stays",
        displayOrder: 3,
      },
      {
        key: "police_reports",
        title: "Police / Incident Reports",
        description: "Management office report, accident log book entry",
        displayOrder: 4,
      },
      {
        key: "witness_statements",
        title: "Witness Statements",
        description: "Written accounts from people who saw the incident",
        displayOrder: 5,
      },
      {
        key: "employment_income",
        title: "Employment & Income Proof",
        description: "Payslips, employer's letter confirming absence and loss of income",
        displayOrder: 6,
      },
      {
        key: "transportation_receipts",
        title: "Transportation Receipts",
        description: "Taxi, bus, MTR receipts to/from medical appointments",
        displayOrder: 7,
      },
      {
        key: "damaged_property",
        title: "Damaged Property Evidence",
        description: "Photos and repair/replacement receipts for damaged personal items",
        displayOrder: 8,
      },
      {
        key: "future_treatment",
        title: "Future Treatment Estimates",
        description: "Medical quotes for future surgery, rehabilitation, or care",
        displayOrder: 9,
      },
      {
        key: "correspondence",
        title: "Correspondence",
        description: "Letters, emails, WhatsApp messages with the other party or insurer",
        displayOrder: 10,
      },
    ];
  }

  // Initialize evidence types for a new case
  static async initializeEvidenceTypesForCase(caseId: string) {
    const defaults = this.getDefaultEvidenceTypes();
    
    const evidenceTypesToInsert = defaults.map(item => ({
      caseId,
      key: item.key,
      title: item.title,
      description: item.description,
      isDefault: true,
      displayOrder: item.displayOrder,
    }));

    await db.insert(caseEvidenceTypes).values(evidenceTypesToInsert);
    
    return evidenceTypesToInsert;
  }

  // Get all evidence types for a case (ordered by displayOrder)
  static async getEvidenceTypesByCase(caseId: string): Promise<CaseEvidenceType[]> {
    const results = await db
      .select()
      .from(caseEvidenceTypes)
      .where(eq(caseEvidenceTypes.caseId, caseId))
      .orderBy(caseEvidenceTypes.displayOrder);

    return results.map((item: EvidenceTypeRow): CaseEvidenceType => ({
      id: item.id,
      caseId: item.caseId,
      key: item.key,
      title: item.title,
      description: item.description,
      isDefault: item.isDefault,
      displayOrder: item.displayOrder,
      createdAt: item.createdAt || undefined,
    }));
  }

  // Add a custom evidence type
  static async addCustomEvidenceType(
    caseId: string,
    title: string,
    description?: string
  ): Promise<CaseEvidenceType> {
    // Get the maximum display order for this case
    const existingTypes = await this.getEvidenceTypesByCase(caseId);
    const maxOrder = existingTypes.length > 0 
      ? Math.max(...existingTypes.map(t => t.displayOrder))
      : 0;

    // Generate a unique key for custom types
    const key = `custom-${Date.now()}`;

    const [newType] = await db
      .insert(caseEvidenceTypes)
      .values({
        caseId,
        key,
        title,
        description: description || null,
        isDefault: false,
        displayOrder: maxOrder + 1,
      })
      .returning();

    return {
      id: newType.id,
      caseId: newType.caseId,
      key: newType.key,
      title: newType.title,
      description: newType.description,
      isDefault: newType.isDefault,
      displayOrder: newType.displayOrder,
      createdAt: newType.createdAt || undefined,
    };
  }

  // Delete a custom evidence type (only non-default types can be deleted)
  static async deleteCustomEvidenceType(id: string): Promise<boolean> {
    // First, verify it's not a default type
    const [evidenceType] = await db
      .select()
      .from(caseEvidenceTypes)
      .where(eq(caseEvidenceTypes.id, id))
      .limit(1);

    if (!evidenceType) {
      throw new Error('Evidence type not found');
    }

    if (evidenceType.isDefault) {
      throw new Error('Cannot delete default evidence types');
    }

    // Delete the custom evidence type
    await db
      .delete(caseEvidenceTypes)
      .where(eq(caseEvidenceTypes.id, id));

    return true;
  }

  // Update a custom evidence type (only non-default types can be updated)
  static async updateCustomEvidenceType(
    id: string,
    title: string,
    description?: string
  ): Promise<CaseEvidenceType> {
    // First, verify it's not a default type
    const [evidenceType] = await db
      .select()
      .from(caseEvidenceTypes)
      .where(eq(caseEvidenceTypes.id, id))
      .limit(1);

    if (!evidenceType) {
      throw new Error('Evidence type not found');
    }

    if (evidenceType.isDefault) {
      throw new Error('Cannot update default evidence types');
    }

    // Update the custom evidence type
    const [updated] = await db
      .update(caseEvidenceTypes)
      .set({
        title,
        description: description || null,
      })
      .where(eq(caseEvidenceTypes.id, id))
      .returning();

    return {
      id: updated.id,
      caseId: updated.caseId,
      key: updated.key,
      title: updated.title,
      description: updated.description,
      isDefault: updated.isDefault,
      displayOrder: updated.displayOrder,
      createdAt: updated.createdAt || undefined,
    };
  }
}

