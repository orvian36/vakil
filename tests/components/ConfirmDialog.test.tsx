import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("calls onConfirm when primary button clicked", async () => {
    const user = userEvent.setup();
    let confirmed = false;
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Delete case?"
        confirmLabel="Delete"
        onConfirm={() => { confirmed = true; }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(confirmed).toBe(true);
  });

  it("renders description", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Are you sure?"
        description="This cannot be undone."
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });
});
