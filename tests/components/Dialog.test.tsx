import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";

describe("Dialog", () => {
  it("opens on trigger click", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>body</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("open"));
    expect(await screen.findByText("Title")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});
