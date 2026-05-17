import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScanLine } from "@/components/ui/ScanLine";

describe("ScanLine", () => {
  it("renders a container with role presentation", () => {
    render(<ScanLine data-testid="scan" />);
    expect(screen.getByTestId("scan")).toBeInTheDocument();
  });
});
