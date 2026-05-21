import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaperCanvas } from "@/components/review/PaperCanvas";

describe("PaperCanvas", () => {
  it("renders children", () => {
    render(
      <PaperCanvas>
        <p>hello</p>
      </PaperCanvas>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("applies the cream-paper utility class", () => {
    const { container } = render(
      <PaperCanvas>
        <p>x</p>
      </PaperCanvas>,
    );
    expect(container.firstElementChild?.className).toMatch(/cream-paper/);
  });
});
