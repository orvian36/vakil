import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/ui/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>hello</Card>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("applies gold-accent variant", () => {
    render(<Card variant="gold-accent" data-testid="card">x</Card>);
    expect(screen.getByTestId("card").className).toMatch(/border-line-gold/);
  });

  it("applies cream-paper variant", () => {
    render(<Card variant="cream-paper" data-testid="card">x</Card>);
    expect(screen.getByTestId("card").className).toMatch(/cream-paper/);
  });
});
