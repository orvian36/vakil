import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="Nothing here" description="add something" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("add something")).toBeInTheDocument();
  });

  it("renders action slot when given", () => {
    render(<EmptyState title="t" action={<button>Go</button>} />);
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
  });
});
