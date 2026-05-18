import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CaseShell } from "@/components/wizard/CaseShell";

const sample = {
  id: "c1",
  title: "Rahman v. State",
  caseType: "SOC",
  status: "draft",
  parties: [],
  files: [],
  court: "",
  caseNumber: "",
} as any;

const steps = [
  { number: 1, title: "Evidence" },
  { number: 2, title: "Process" },
  { number: 3, title: "Particulars" },
  { number: 4, title: "Chronology" },
  { number: 5, title: "Review" },
];

describe("CaseShell", () => {
  it("renders header, rail, content area and footer", () => {
    render(
      <CaseShell
        caseData={sample}
        steps={steps}
        currentStep={2}
        previousDisabled={false}
        nextDisabled={false}
        nextLabel="Next"
        onBack={() => {}}
        onStepClick={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
      >
        <div data-testid="content">Step content</div>
      </CaseShell>,
    );
    expect(screen.getByText("Rahman v. State")).toBeInTheDocument();
    expect(screen.getByText("Evidence")).toBeInTheDocument();
    expect(screen.getByText("Step content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Previous/i })).toBeInTheDocument();
  });
});
