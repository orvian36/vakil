import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, back: () => {} }),
}));

import Step1Evidence from "@/components/steps/Step1Evidence";

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [
        {
          id: "1",
          key: "medical",
          title: "Medical records",
          description: "Reports",
          isDefault: true,
          displayOrder: 1,
          caseId: "c1",
        },
      ],
    }),
  }) as unknown as typeof fetch;
});

const sample = {
  id: "c1",
  title: "X",
  caseType: "SOC",
  status: "draft",
  parties: [],
  court: "",
  caseNumber: "",
  files: [],
} as any;

describe("Step1Evidence", () => {
  it("renders section header and at least one type card", async () => {
    render(<Step1Evidence caseData={sample} />);
    expect(screen.getByText(/Evidence/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Medical records/)).toBeInTheDocument();
    });
  });
});
