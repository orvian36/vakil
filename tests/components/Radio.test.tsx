import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioGroup, RadioItem } from "@/components/ui/Radio";

describe("Radio", () => {
  it("selects a value", async () => {
    const user = userEvent.setup();
    let value = "";
    render(
      <RadioGroup value={value} onValueChange={(v) => (value = v)}>
        <RadioItem value="a" aria-label="a" />
        <RadioItem value="b" aria-label="b" />
      </RadioGroup>,
    );
    await user.click(screen.getByRole("radio", { name: "b" }));
    expect(value).toBe("b");
  });
});
