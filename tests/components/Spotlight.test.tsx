import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Spotlight } from "@/components/dashboard/Spotlight";

const baseCase = {
  id: "c1",
  title: "Rahman v. State",
  caseType: "SOC",
  status: "draft",
  summary: "",
  parties: [
    { id: "p1", name: "Rahman", role: "plaintiff", type: "person", bengaliName: null },
    { id: "p2", name: "State", role: "defendant", type: "person", bengaliName: null },
  ],
  court: "Dhaka District Judge",
  caseNumber: "",
  files: [],
  updatedAt: new Date().toISOString(),
} as any;

describe("Spotlight", () => {
  it("renders active case title", () => {
    render(<Spotlight caseItem={baseCase} onResume={() => {}} />);
    expect(screen.getByText("Rahman v. State")).toBeInTheDocument();
  });

  it("renders Start a new case CTA when no active case", () => {
    render(<Spotlight caseItem={null} onResume={() => {}} onCreate={() => {}} />);
    expect(screen.getByRole("button", { name: /New case/i })).toBeInTheDocument();
  });

  it("calls onResume when Resume clicked", async () => {
    const u = userEvent.setup();
    let resumed = false;
    render(<Spotlight caseItem={baseCase} onResume={() => (resumed = true)} />);
    await u.click(screen.getByRole("button", { name: /Resume/i }));
    expect(resumed).toBe(true);
  });
});
