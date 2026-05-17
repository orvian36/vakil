import { describe, it, expect } from "vitest";
import { testPrisma } from "../helpers/testDb";
import { CaseService } from "@/services/caseService";

describe("CaseService", () => {
  it("creates a case with parties and initializes evidence types", async () => {
    const c = await CaseService.createCase(
      "u1",
      "Smith v Jones",
      "SOC",
      "Summary",
      [{ id: "x", name: "Alice", role: "plaintiff", type: "person", bengaliName: null }],
      "High Court",
      "HC-1",
    );
    expect(c.title).toBe("Smith v Jones");

    const got = await CaseService.getCaseById(c.id);
    expect(got?.parties).toHaveLength(1);
    expect(got?.parties[0].name).toBe("Alice");
    expect(got?.evidenceTypes.length).toBeGreaterThan(0);
  });

  it("lists cases by user with parties", async () => {
    await CaseService.createCase("u1", "A", "SOC");
    await CaseService.createCase("u1", "B", "DEFENCE");
    await CaseService.createCase("u2", "C", "SOC");
    const list = await CaseService.listCasesByUser("u1");
    expect(list).toHaveLength(2);
    expect(list.map((c) => c.title).sort()).toEqual(["A", "B"]);
  });

  it("update replaces parties wholesale", async () => {
    const c = await CaseService.createCase("u1", "T", "SOC", undefined, [
      { id: "p1", name: "P1", role: "plaintiff", type: "person", bengaliName: null },
    ]);
    await CaseService.updateCase(c.id, {
      parties: [{ id: "p2", name: "P2", role: "plaintiff", type: "person", bengaliName: null }],
    });
    const got = await CaseService.getCaseById(c.id);
    expect(got?.parties).toHaveLength(1);
    expect(got?.parties[0].name).toBe("P2");
  });

  it("delete cascades to parties and analyses", async () => {
    const c = await CaseService.createCase("u1", "T", "SOC", undefined, [
      { id: "p1", name: "P", role: "plaintiff", type: "person", bengaliName: null },
    ]);
    await testPrisma.caseAnalysis.create({ data: { caseId: c.id, analysisType: "soc" } });
    await CaseService.deleteCase(c.id);
    expect(await testPrisma.case.findUnique({ where: { id: c.id } })).toBeNull();
    expect(await testPrisma.caseParty.count()).toBe(0);
    expect(await testPrisma.caseAnalysis.count()).toBe(0);
  });
});
