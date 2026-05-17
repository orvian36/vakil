import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionHeader } from "@/components/ui/SectionHeader";

describe("SectionHeader", () => {
  it("renders title and meta", () => {
    render(<SectionHeader title="Evidence" meta="Step 1 of 5" />);
    expect(screen.getByText("Evidence")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });

  it("renders actions slot", () => {
    render(<SectionHeader title="t" actions={<button>Go</button>} />);
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
  });
});
