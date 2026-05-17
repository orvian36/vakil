import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "@/components/Footer";

describe("Footer", () => {
  it("renders copyright with author link", () => {
    render(<Footer />);
    expect(screen.getByText(/Vakil/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Habibur Rahman/i });
    expect(link).toHaveAttribute("href", "https://github.com/orvian36");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("uses dark editorial chrome tokens (no raw gray)", () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector("footer")!;
    expect(footer.className).not.toMatch(/border-gray-/);
    expect(footer.className).not.toMatch(/text-gray-/);
  });
});
