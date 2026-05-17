import { describe, it, expect } from "vitest";
import { testPrisma } from "../helpers/testDb";
import { EvidenceTypeService } from "@/services/evidenceTypeService";

async function makeCase() {
  return testPrisma.case.create({ data: { userId: "u1", title: "T", caseType: "SOC" } });
}

describe("EvidenceTypeService", () => {
  it("initializes default evidence types ordered by displayOrder", async () => {
    const c = await makeCase();
    await EvidenceTypeService.initializeEvidenceTypesForCase(c.id);
    const list = await EvidenceTypeService.getEvidenceTypesByCase(c.id);
    expect(list.length).toBe(EvidenceTypeService.getDefaultEvidenceTypes().length);
    expect(list[0].displayOrder).toBeLessThanOrEqual(list[1].displayOrder);
    expect(list.every((t) => t.isDefault)).toBe(true);
  });

  it("addCustom, update, delete a custom type", async () => {
    const c = await makeCase();
    await EvidenceTypeService.initializeEvidenceTypesForCase(c.id);

    const custom = await EvidenceTypeService.addCustomEvidenceType(c.id, "Custom A", "desc");
    expect(custom.isDefault).toBe(false);
    expect(custom.title).toBe("Custom A");

    const updated = await EvidenceTypeService.updateCustomEvidenceType(custom.id, "Custom B");
    expect(updated.title).toBe("Custom B");

    await EvidenceTypeService.deleteCustomEvidenceType(custom.id);
    const after = await EvidenceTypeService.getEvidenceTypesByCase(c.id);
    expect(after.find((t) => t.id === custom.id)).toBeUndefined();
  });

  it("refuses to delete a default type", async () => {
    const c = await makeCase();
    await EvidenceTypeService.initializeEvidenceTypesForCase(c.id);
    const list = await EvidenceTypeService.getEvidenceTypesByCase(c.id);
    await expect(EvidenceTypeService.deleteCustomEvidenceType(list[0].id)).rejects.toThrow();
  });
});
