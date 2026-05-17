import { prisma } from "@/lib/db";
import { CaseEvidenceType } from "@/types/case";

export class EvidenceTypeService {
  static getDefaultEvidenceTypes() {
    return [
      { key: "writ_of_summons_supporting", title: "Writ of Summons Supporting documents", description: "Supporting documents for the writ of summons", displayOrder: 1 },
      { key: "medical_records",            title: "Medical Records & Reports",            description: "Hospital/clinic records, doctor's certificates, discharge summaries, physiotherapy reports", displayOrder: 2 },
      { key: "medical_bills",              title: "Medical Bills & Receipts/Invoices",    description: "For consultations, medication, rehabilitation, surgery, hospital stays", displayOrder: 3 },
      { key: "police_reports",             title: "Police / Incident Reports",            description: "Management office report, accident log book entry", displayOrder: 4 },
      { key: "witness_statements",         title: "Witness Statements",                   description: "Written accounts from people who saw the incident", displayOrder: 5 },
      { key: "employment_income",          title: "Employment & Income Proof",            description: "Payslips, employer's letter confirming absence and loss of income", displayOrder: 6 },
      { key: "transportation_receipts",    title: "Transportation Receipts",              description: "Taxi, bus, MTR receipts to/from medical appointments", displayOrder: 7 },
      { key: "damaged_property",           title: "Damaged Property Evidence",            description: "Photos and repair/replacement receipts for damaged personal items", displayOrder: 8 },
      { key: "future_treatment",           title: "Future Treatment Estimates",           description: "Medical quotes for future surgery, rehabilitation, or care", displayOrder: 9 },
      { key: "correspondence",             title: "Correspondence",                       description: "Letters, emails, WhatsApp messages with the other party or insurer", displayOrder: 10 },
    ];
  }

  static async initializeEvidenceTypesForCase(caseId: string) {
    const defaults = this.getDefaultEvidenceTypes();
    await prisma.caseEvidenceType.createMany({
      data: defaults.map((d) => ({ ...d, caseId, isDefault: true })),
    });
    return defaults;
  }

  static async getEvidenceTypesByCase(caseId: string): Promise<CaseEvidenceType[]> {
    const rows = await prisma.caseEvidenceType.findMany({
      where: { caseId },
      orderBy: { displayOrder: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      caseId: r.caseId,
      key: r.key,
      title: r.title,
      description: r.description,
      isDefault: r.isDefault,
      displayOrder: r.displayOrder,
      createdAt: r.createdAt ?? undefined,
    }));
  }

  static async addCustomEvidenceType(
    caseId: string,
    title: string,
    description?: string,
  ): Promise<CaseEvidenceType> {
    const existing = await this.getEvidenceTypesByCase(caseId);
    const maxOrder = existing.length ? Math.max(...existing.map((t) => t.displayOrder)) : 0;
    const row = await prisma.caseEvidenceType.create({
      data: {
        caseId,
        key: `custom-${Date.now()}`,
        title,
        description: description ?? null,
        isDefault: false,
        displayOrder: maxOrder + 1,
      },
    });
    return {
      id: row.id,
      caseId: row.caseId,
      key: row.key,
      title: row.title,
      description: row.description,
      isDefault: row.isDefault,
      displayOrder: row.displayOrder,
      createdAt: row.createdAt ?? undefined,
    };
  }

  static async deleteCustomEvidenceType(id: string): Promise<boolean> {
    const row = await prisma.caseEvidenceType.findUnique({ where: { id } });
    if (!row) throw new Error("Evidence type not found");
    if (row.isDefault) throw new Error("Cannot delete default evidence types");
    await prisma.caseEvidenceType.delete({ where: { id } });
    return true;
  }

  static async updateCustomEvidenceType(
    id: string,
    title: string,
    description?: string,
  ): Promise<CaseEvidenceType> {
    const row = await prisma.caseEvidenceType.findUnique({ where: { id } });
    if (!row) throw new Error("Evidence type not found");
    if (row.isDefault) throw new Error("Cannot update default evidence types");
    const updated = await prisma.caseEvidenceType.update({
      where: { id },
      data: { title, description: description ?? null },
    });
    return {
      id: updated.id,
      caseId: updated.caseId,
      key: updated.key,
      title: updated.title,
      description: updated.description,
      isDefault: updated.isDefault,
      displayOrder: updated.displayOrder,
      createdAt: updated.createdAt ?? undefined,
    };
  }
}
