import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepRail } from "@/components/wizard/StepRail";

const steps = [
  { number: 1, title: "Evidence", meta: "9 files" },
  { number: 2, title: "Process", meta: "OCR ✓✓✓" },
  { number: 3, title: "Particulars" },
  { number: 4, title: "Chronology" },
  { number: 5, title: "Review" },
];

describe("StepRail", () => {
  it("renders all 5 steps with titles", () => {
    render(<StepRail steps={steps} currentStep={2} onStepClick={() => {}} />);
    expect(screen.getByText("Evidence")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("renders meta sub-line on steps that have it", () => {
    render(<StepRail steps={steps} currentStep={2} onStepClick={() => {}} />);
    expect(screen.getByText("9 files")).toBeInTheDocument();
    expect(screen.getByText("OCR ✓✓✓")).toBeInTheDocument();
  });

  it("calls onStepClick when clicking a completed step", async () => {
    const u = userEvent.setup();
    const onStepClick = vi.fn();
    render(<StepRail steps={steps} currentStep={3} onStepClick={onStepClick} />);
    await u.click(screen.getByRole("button", { name: /Evidence/i }));
    expect(onStepClick).toHaveBeenCalledWith(1);
  });

  it("does not call onStepClick when clicking upcoming step", async () => {
    const u = userEvent.setup();
    const onStepClick = vi.fn();
    render(<StepRail steps={steps} currentStep={2} onStepClick={onStepClick} />);
    const review = screen.getByText("Review").closest("button, div")!;
    await u.click(review);
    expect(onStepClick).not.toHaveBeenCalled();
  });
});
