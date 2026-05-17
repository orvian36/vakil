import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditCaseDialog } from "@/components/modals/EditCaseDialog";

const seedCase = {
  title: "Existing",
  caseType: "SOC" as const,
  parties: [],
  summary: "",
  court: "",
  caseNumber: "",
};

describe("EditCaseDialog", () => {
  it("renders edit title and pre-fills data", () => {
    render(
      <EditCaseDialog
        open
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        caseData={seedCase}
      />,
    );
    expect(screen.getByText(/Edit case/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing")).toBeInTheDocument();
  });
});
