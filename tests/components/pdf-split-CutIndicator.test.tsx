import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CutIndicator } from "@/components/pdf-split/CutIndicator";

describe("CutIndicator", () => {
  it("calls onToggle when clicked", async () => {
    const u = userEvent.setup();
    const onToggle = vi.fn();
    render(<CutIndicator afterPage={3} hasCut={false} onToggle={onToggle} />);
    await u.click(screen.getByRole("button", { name: /Insert cut/i }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("shows remove button when hasCut", () => {
    render(<CutIndicator afterPage={3} hasCut={true} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /Remove cut/i })).toBeInTheDocument();
  });
});
