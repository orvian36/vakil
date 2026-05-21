import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";

import MdxRenderer from "@/components/MdxRenderer";

describe("MdxRenderer paper variant", () => {
  it("eventually renders an article and uses paper-aware link tokens", async () => {
    const { container } = render(<MdxRenderer source="# Hello" variant="paper" />);
    // Component is loaded via next/dynamic — wait for it to resolve.
    await waitFor(() => {
      expect(container.querySelector("article")).not.toBeNull();
    });
    const html = container.innerHTML;
    expect(html).toContain("var(--color-gold-700)");
    expect(html).not.toContain("#4b96e6");
  });

  it("loading spinner uses gold accent (no raw blue)", () => {
    const { container } = render(<MdxRenderer source="# Hi" />);
    // Whether loading or loaded, the rendered HTML must not contain the legacy
    // blue spinner class.
    expect(container.innerHTML).not.toContain("border-blue-600");
  });
});
