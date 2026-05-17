import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";

describe("Select", () => {
  it("renders trigger and opens content on click", async () => {
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label="fruit">
          <SelectValue placeholder="pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="pear">Pear</SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox", { name: "fruit" }));
    expect(await screen.findByText("Apple")).toBeInTheDocument();
  });
});
