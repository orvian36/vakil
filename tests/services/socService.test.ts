import { describe, it, expect } from "vitest";
import { testPrisma } from "../helpers/testDb";
import { SocService } from "@/services/socService";

async function makeCaseAnalysis() {
  const c = await testPrisma.case.create({
    data: { userId: "u1", title: "T", caseType: "SOC" },
  });
  return testPrisma.caseAnalysis.create({
    data: { caseId: c.id, analysisType: "soc" },
  });
}

describe("SocService", () => {
  it("creates a soc analysis row", async () => {
    const ca = await makeCaseAnalysis();
    const row = await SocService.createSocAnalysis(ca.id, { allFileOcr: "abc" });
    expect(row.caseAnalysisId).toBe(ca.id);
    expect(row.allFileOcr).toBe("abc");
  });

  it("upsert creates then updates the same row", async () => {
    const ca = await makeCaseAnalysis();
    await SocService.upsertSocAnalysis(ca.id, { particularsMarkdown: "v1" });
    await SocService.upsertSocAnalysis(ca.id, { particularsMarkdown: "v2" });
    const got = await SocService.getSocAnalysis(ca.id);
    expect(got?.particularsMarkdown).toBe("v2");
  });

  it("deletes a soc analysis row", async () => {
    const ca = await makeCaseAnalysis();
    await SocService.createSocAnalysis(ca.id, { allFileOcr: "abc" });
    await SocService.deleteSocAnalysis(ca.id);
    const got = await SocService.getSocAnalysis(ca.id);
    expect(got).toBeNull();
  });
});
