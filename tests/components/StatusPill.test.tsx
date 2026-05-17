import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "@/components/ui/StatusPill";

describe("StatusPill", () => {
  it("renders status text", () => {
    render(<StatusPill status="drafted" />);
    expect(screen.getByText("Drafted")).toBeInTheDocument();
  });

  it("applies emerald color for drafted", () => {
    render(<StatusPill status="drafted" data-testid="pill" />);
    expect(screen.getByTestId("pill").className).toMatch(/emerald-500/);
  });

  it("applies rose for failed", () => {
    render(<StatusPill status="failed" data-testid="pill" />);
    expect(screen.getByTestId("pill").className).toMatch(/rose-500/);
  });
});
