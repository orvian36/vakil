import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MdxEditorComponent from "@/components/MdxEditor";

describe("MdxEditor paper variant", () => {
  it("paper variant wraps the editor in cream-paper surface", () => {
    const { container } = render(<MdxEditorComponent variant="paper" />);
    expect(container.innerHTML).toMatch(/bg-cream-50/);
    expect(container.innerHTML).toMatch(/border-line-paper/);
  });

  it("does not leak raw gray classes into the wrapper", () => {
    const { container } = render(<MdxEditorComponent />);
    expect(container.innerHTML).not.toMatch(/border-gray-300/);
    expect(container.innerHTML).not.toMatch(/bg-gray-50/);
  });
});
