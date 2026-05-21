import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "@/components/ui/ErrorState";

describe("ErrorState", () => {
  it("renders title and message", () => {
    render(<ErrorState title="Boom" message="It went wrong." />);
    expect(screen.getByText("Boom")).toBeInTheDocument();
    expect(screen.getByText("It went wrong.")).toBeInTheDocument();
  });

  it("renders default title when not provided", () => {
    render(<ErrorState message="x" />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("fires onRetry when the Retry button is clicked", async () => {
    const u = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState message="x" onRetry={onRetry} />);
    await u.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("paper variant uses paper-aware text classes", () => {
    const { container } = render(
      <ErrorState message="x" variant="paper" />,
    );
    expect(container.innerHTML).toMatch(/text-paper-ink/);
  });
});
