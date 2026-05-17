import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/Input";

describe("Input", () => {
  it("renders with placeholder", () => {
    render(<Input placeholder="Search…" />);
    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
  });

  it("shows error helper text and rose border when error provided", () => {
    render(<Input error="Required field" />);
    expect(screen.getByText("Required field")).toBeInTheDocument();
    const input = screen.getByRole("textbox");
    expect(input.className).toMatch(/border-rose-500/);
  });

  it("captures typing", async () => {
    const user = userEvent.setup();
    let value = "";
    render(<Input onChange={(e) => (value = e.target.value)} />);
    await user.type(screen.getByRole("textbox"), "hi");
    expect(value).toBe("hi");
  });
});
