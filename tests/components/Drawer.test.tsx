import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/Drawer";

describe("Drawer", () => {
  it("opens on trigger click", async () => {
    const user = userEvent.setup();
    render(
      <Drawer>
        <DrawerTrigger>open</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>side</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    await user.click(screen.getByText("open"));
    expect(await screen.findByText("side")).toBeInTheDocument();
  });
});
