import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepRail } from "@/components/wizard/StepRail";

const steps = [
  { number: 1, title: "Evidence" },
  { number: 2, title: "Process" },
  { number: 3, title: "Particulars" },
];

describe("StepRail collapse", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the collapse toggle button", () => {
    render(<StepRail steps={steps} currentStep={1} onStepClick={() => {}} />);
    expect(
      screen.getByRole("button", { name: /collapse steps/i }),
    ).toBeInTheDocument();
  });

  it("clicking the toggle hides step titles", () => {
    render(<StepRail steps={steps} currentStep={1} onStepClick={() => {}} />);
    expect(screen.getByText("Evidence")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /collapse steps/i }));
    expect(screen.queryByText("Evidence")).not.toBeInTheDocument();
    // Reverse label now shown
    expect(
      screen.getByRole("button", { name: /expand steps/i }),
    ).toBeInTheDocument();
  });

  it("persists collapsed state to localStorage", () => {
    const { unmount } = render(
      <StepRail steps={steps} currentStep={1} onStepClick={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /collapse steps/i }));
    expect(localStorage.getItem("vakil_step_rail_collapsed")).toBe("true");
    unmount();

    render(<StepRail steps={steps} currentStep={1} onStepClick={() => {}} />);
    // Restored collapsed: titles hidden
    expect(screen.queryByText("Evidence")).not.toBeInTheDocument();
  });
});
