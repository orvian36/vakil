import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorDialog } from "@/components/modals/ErrorDialog";

describe("ErrorDialog", () => {
  it("renders the message and default title", () => {
    render(
      <ErrorDialog
        open
        onOpenChange={() => {}}
        message="something broke"
      />,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("something broke")).toBeInTheDocument();
  });

  it("calls onRetry when Retry clicked", async () => {
    const u = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ErrorDialog
        open
        onOpenChange={() => {}}
        message="x"
        onRetry={onRetry}
      />,
    );
    await u.click(screen.getByRole("button", { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
