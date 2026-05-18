import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseHeader } from "@/components/wizard/CaseHeader";

const sample = {
  id: "c1",
  title: "Rahman v. State",
  caseType: "SOC",
  status: "draft",
  parties: [
    { id: "p1", name: "Rahman", role: "plaintiff", type: "person", bengaliName: null },
    { id: "p2", name: "State", role: "defendant", type: "person", bengaliName: null },
  ],
  court: "District Court",
  caseNumber: "",
  files: [],
} as any;

describe("CaseHeader", () => {
  it("renders the case title", () => {
    render(<CaseHeader caseData={sample} onBack={() => {}} />);
    expect(screen.getByText("Rahman v. State")).toBeInTheDocument();
  });

  it("renders type label and court", () => {
    render(<CaseHeader caseData={sample} onBack={() => {}} />);
    expect(screen.getByText(/Statement of Claim/i)).toBeInTheDocument();
    expect(screen.getByText(/District Court/)).toBeInTheDocument();
  });

  it("calls onBack when back button clicked", async () => {
    const u = userEvent.setup();
    const onBack = vi.fn();
    render(<CaseHeader caseData={sample} onBack={onBack} />);
    await u.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
