import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders with default primary variant", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: "Click me" });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toMatch(/bg-gold-500/);
  });

  it("applies destructive variant class", () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toMatch(/bg-rose-500/);
  });

  it("fires onClick", async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(<Button onClick={() => clicks++}>Go</Button>);
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(clicks).toBe(1);
  });

  it("disables click when loading", async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(
      <Button loading onClick={() => clicks++}>
        Go
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(clicks).toBe(0);
  });
});
