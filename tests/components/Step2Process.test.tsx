import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Step2Process from "@/components/steps/Step2Process";

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      id: "c1",
      parties: [],
      evidenceTypes: [],
      files: [
        {
          id: "f1",
          fileName: "medical-report.pdf",
          type: "medical_reports",
          processingStatus: "completed",
          fileKey: "k1",
          caseId: "c1",
          entities: null,
          summary: null,
          documentDate: null,
          errorMessage: null,
        },
        {
          id: "f2",
          fileName: "fir-1042.pdf",
          type: "police_reports",
          processingStatus: "processing",
          fileKey: "k2",
          caseId: "c1",
          entities: null,
          summary: null,
          documentDate: null,
          errorMessage: null,
        },
      ],
    }),
  }) as any;
});

describe("Step2Process", () => {
  it("renders section header and timeline rows after loading", async () => {
    render(<Step2Process caseId="c1" />);
    expect(screen.getByText(/Process evidence/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/medical-report.pdf/)).toBeInTheDocument();
      expect(screen.getByText(/fir-1042.pdf/)).toBeInTheDocument();
    });
  });
});
