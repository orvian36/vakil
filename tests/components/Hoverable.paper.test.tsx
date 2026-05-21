import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Hoverable from "@/components/Hoverable";

describe("Hoverable paper variant", () => {
  it("renders trigger without raw blue or yellow classes", () => {
    const { container } = render(
      <Hoverable searchText="test">hover me</Hoverable>,
    );
    expect(container.innerHTML).not.toMatch(/bg-yellow-50/);
    expect(container.innerHTML).not.toMatch(/text-blue-700/);
    expect(container.innerHTML).toMatch(/text-gold/);
  });
});
