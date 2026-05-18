import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardFooter } from "@/components/wizard/WizardFooter";

describe("WizardFooter", () => {
  it("renders Previous and Next buttons", () => {
    render(
      <WizardFooter
        currentStep={2}
        totalSteps={5}
        previousDisabled={false}
        nextDisabled={false}
        nextLabel="Next"
        onPrevious={() => {}}
        onNext={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next/i })).toBeInTheDocument();
  });

  it("hides Previous on step 1", () => {
    render(
      <WizardFooter
        currentStep={1}
        totalSteps={5}
        previousDisabled
        nextDisabled={false}
        nextLabel="Next"
        onPrevious={() => {}}
        onNext={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /Previous/i })).not.toBeInTheDocument();
  });

  it("hides Next when on the last step", () => {
    render(
      <WizardFooter
        currentStep={5}
        totalSteps={5}
        previousDisabled={false}
        nextDisabled={false}
        nextLabel="Complete"
        onPrevious={() => {}}
        onNext={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /Next|Complete/i })).not.toBeInTheDocument();
  });

  it("calls onPrevious / onNext", async () => {
    const u = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <WizardFooter
        currentStep={3}
        totalSteps={5}
        previousDisabled={false}
        nextDisabled={false}
        nextLabel="Next"
        onPrevious={onPrev}
        onNext={onNext}
      />,
    );
    await u.click(screen.getByRole("button", { name: /Previous/i }));
    await u.click(screen.getByRole("button", { name: /Next/i }));
    expect(onPrev).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
  });
});
