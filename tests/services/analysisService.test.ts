import { describe, it, expect } from "vitest";
import { testPrisma } from "../helpers/testDb";
import { AnalysisService } from "@/services/analysisService";

async function makeCase() {
  return testPrisma.case.create({ data: { userId: "u1", title: "T", caseType: "SOC" } });
}

describe("AnalysisService", () => {
  it("creates, gets, updates status, deletes", async () => {
    const c = await makeCase();
    const a = await AnalysisService.createAnalysis(c.id, "soc");
    expect(a.analysisStatus).toBe("pending");

    const got = await AnalysisService.getAnalysis(c.id, "soc");
    expect(got?.id).toBe(a.id);

    const upd = await AnalysisService.updateAnalysisStatus(a.id, "completed");
    expect(upd.analysisStatus).toBe("completed");

    await AnalysisService.deleteAnalysis(a.id);
    expect(await AnalysisService.getAnalysis(c.id, "soc")).toBeNull();
  });

  it("enforces unique (caseId, analysisType)", async () => {
    const c = await makeCase();
    await AnalysisService.createAnalysis(c.id, "soc");
    await expect(AnalysisService.createAnalysis(c.id, "soc")).rejects.toThrow();
  });
});
