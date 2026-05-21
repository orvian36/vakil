import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Workshop } from "@/components/pdf-split/Workshop";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: () => {}, push: () => {} }),
}));

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: [] }),
  }) as any;
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

describe("Workshop", () => {
  it("renders the empty dropzone when no file is selected", () => {
    render(<Workshop caseData={sample} />);
    expect(screen.getByText(/Choose a PDF to split/i)).toBeInTheDocument();
  });
});
