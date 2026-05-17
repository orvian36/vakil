import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseTable } from "@/components/dashboard/CaseTable";

const cases = [
  {
    id: "c1",
    title: "Rahman v. State",
    caseType: "SOC",
    status: "draft",
    parties: [
      { id: "p1", name: "Rahman", role: "plaintiff", type: "person", bengaliName: null },
      { id: "p2", name: "State", role: "defendant", type: "person", bengaliName: null },
    ],
    files: [],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c2",
    title: "Choudhury v. ABS",
    caseType: "DEFENCE",
    status: "completed",
    parties: [],
    files: [],
    updatedAt: new Date().toISOString(),
  },
] as any;

describe("CaseTable", () => {
  it("renders each case as a row with title", () => {
    render(
      <CaseTable
        cases={cases}
        onOpen={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Rahman v. State")).toBeInTheDocument();
    expect(screen.getByText("Choudhury v. ABS")).toBeInTheDocument();
  });

  it("opens a case when row clicked", async () => {
    const u = userEvent.setup();
    let openedId = "";
    render(
      <CaseTable
        cases={cases}
        onOpen={(id) => (openedId = id)}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    await u.click(screen.getByText("Rahman v. State"));
    expect(openedId).toBe("c1");
  });
});
