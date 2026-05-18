import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InsufficientBalanceDialog } from "@/components/modals/InsufficientBalanceDialog";

describe("InsufficientBalanceDialog", () => {
  it("renders the insufficient balance message", () => {
    render(
      <InsufficientBalanceDialog open onOpenChange={() => {}} onTopUp={() => {}} />,
    );
    expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
  });

  it("calls onTopUp when Top up clicked", async () => {
    const u = userEvent.setup();
    const onTopUp = vi.fn();
    render(
      <InsufficientBalanceDialog open onOpenChange={() => {}} onTopUp={onTopUp} />,
    );
    await u.click(screen.getByRole("button", { name: /Top up/i }));
    expect(onTopUp).toHaveBeenCalled();
  });
});
