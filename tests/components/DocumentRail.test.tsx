import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentRail } from "@/components/review/DocumentRail";

const statuses = {
  "writ-of-summons": "drafted" as const,
  "witness-statement": "generating" as const,
  "statement-of-claim": "drafted" as const,
  "statement-of-damages": "pending" as const,
  "pre-action-letter": "failed" as const,
};

describe("DocumentRail", () => {
  it("renders all 5 documents with status counts", () => {
    render(
      <DocumentRail
        statuses={statuses}
        activeId="writ-of-summons"
        onSelect={() => {}}
        onRegenerateAll={() => {}}
      />,
    );
    expect(screen.getByText(/2 of 5 ready/i)).toBeInTheDocument();
    expect(screen.getByText("Writ of Summons")).toBeInTheDocument();
    expect(screen.getByText("Witness Statements")).toBeInTheDocument();
  });

  it("calls onSelect when an item is clicked", async () => {
    const u = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DocumentRail
        statuses={statuses}
        activeId="writ-of-summons"
        onSelect={onSelect}
        onRegenerateAll={() => {}}
      />,
    );
    await u.click(screen.getByText("Statement of Claim"));
    expect(onSelect).toHaveBeenCalledWith("statement-of-claim");
  });
});
