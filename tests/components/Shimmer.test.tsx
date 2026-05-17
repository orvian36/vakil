import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Shimmer } from "@/components/ui/Shimmer";

describe("Shimmer", () => {
  it("renders with default class", () => {
    render(<Shimmer data-testid="s" />);
    expect(screen.getByTestId("s").className).toMatch(/animate-pulse/);
  });

  it("forwards className", () => {
    render(<Shimmer className="h-4 w-12" data-testid="s" />);
    expect(screen.getByTestId("s").className).toMatch(/h-4/);
    expect(screen.getByTestId("s").className).toMatch(/w-12/);
  });
});
