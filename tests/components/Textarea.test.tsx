import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Textarea } from "@/components/ui/Textarea";

describe("Textarea", () => {
  it("renders with placeholder", () => {
    render(<Textarea placeholder="Notes" />);
    expect(screen.getByPlaceholderText("Notes")).toBeInTheDocument();
  });

  it("shows error message when error prop set", () => {
    render(<Textarea error="too short" />);
    expect(screen.getByText("too short")).toBeInTheDocument();
  });
});
