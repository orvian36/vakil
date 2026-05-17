import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "@/components/ui/Checkbox";

describe("Checkbox", () => {
  it("toggles on click", async () => {
    const user = userEvent.setup();
    let checked: boolean | "indeterminate" = false;
    render(
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => (checked = v)}
        aria-label="ok"
      />,
    );
    await user.click(screen.getByRole("checkbox"));
    expect(checked).toBe(true);
  });
});
