import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegenerateDialog } from "@/components/modals/RegenerateDialog";

describe("RegenerateDialog", () => {
  it("renders title for particulars by default", () => {
    render(
      <RegenerateDialog open onOpenChange={() => {}} documentType="particulars" onConfirm={async () => {}} />,
    );
    expect(screen.getByText(/Regenerate Particulars/i)).toBeInTheDocument();
  });

  it("passes the comment to onConfirm", async () => {
    const u = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <RegenerateDialog
        open
        onOpenChange={() => {}}
        documentType="chronology"
        onConfirm={onConfirm}
      />,
    );
    await u.type(screen.getByRole("textbox"), "make it sharper");
    await u.click(screen.getByRole("button", { name: /Regenerate/i }));
    expect(onConfirm).toHaveBeenCalledWith("make it sharper");
  });
});
