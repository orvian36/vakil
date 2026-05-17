import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KeyboardHint } from "@/components/ui/KeyboardHint";

describe("KeyboardHint", () => {
  it("renders provided keys", () => {
    render(<KeyboardHint keys={["⌘", "K"]} />);
    expect(screen.getByText("⌘")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
  });
});
