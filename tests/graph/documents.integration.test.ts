import { describe, it, expect, vi } from "vitest";
import { testPrisma } from "../helpers/testDb";

// Mock the LLM factory before importing the graph (so all nodes use the mock).
vi.mock("@/lib/graph/llm", () => ({
  makeLLM: ({ task }: { task: string }) => ({
    invoke: vi.fn().mockResolvedValue({ content: `mock output for ${task}` }),
  }),
}));

const { documentsGraph } = await import("@/lib/graph/graphs/documents");

describe("documents graph end-to-end", () => {
  it("runs every generate node and writes every field on SocAnalysis", async () => {
    const c = await testPrisma.case.create({
      data: { userId: "u1", title: "T", caseType: "SOC" },
    });
    const ca = await testPrisma.caseAnalysis.create({
      data: { caseId: c.id, analysisType: "soc" },
    });
    await testPrisma.socAnalysis.create({
      data: {
        caseAnalysisId: ca.id,
        particularsMarkdown: "Particulars **here**",
        chronologyMarkdown: "Chronology **here**",
      },
    });

    // The graph's fetchChronology/fetchParticulars look up by caseAnalysisId via SocService.
    // Pass ca.id (which is the caseAnalysisId for SocService).
    const result = await documentsGraph.invoke({ caseId: ca.id, userId: "u1" });

    expect(result.writOfSummons).toContain("writ-of-summons");
    expect(result.witnessStatement).toContain("witness-statement");
    expect(result.statementOfClaim).toContain("statement-of-claim");
    expect(result.statementOfDamages).toContain("statement-of-damages");
    expect(result.preActionLetter).toContain("pre-action-letter");
    expect(result.witnessStatementBengali).toContain("translate-witness-statement");

    const saved = await testPrisma.socAnalysis.findUnique({
      where: { caseAnalysisId: ca.id },
    });
    expect(saved?.witnessStatement).toContain("witness-statement");
    expect(saved?.statementOfClaim).toContain("statement-of-claim");
  });
});
