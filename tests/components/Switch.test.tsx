import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "@/components/ui/Switch";

describe("Switch", () => {
  it("toggles state on click", async () => {
    const user = userEvent.setup();
    let checked = false;
    render(
      <Switch
        checked={checked}
        onCheckedChange={(v) => (checked = v)}
        aria-label="theme"
      />,
    );
    await user.click(screen.getByRole("switch"));
    expect(checked).toBe(true);
  });
});
