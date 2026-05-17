import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/components/ui/Toast";

function Probe() {
  const { toast } = useToast();
  return (
    <button onClick={() => toast({ title: "hi", description: "world" })}>
      go
    </button>
  );
}

describe("Toast", () => {
  it("renders a toast when triggered", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    );
    await user.click(screen.getByText("go"));
    expect(await screen.findByText("hi")).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
  });
});
