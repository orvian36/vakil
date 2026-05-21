import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SegmentRow } from "@/components/pdf-split/SegmentRow";
import type { Segment } from "@/components/pdf-split/types";

const segment: Segment = {
  id: "s1",
  fromPage: 2,
  toPage: 5,
  name: "",
  category: "",
};

describe("SegmentRow editable page range", () => {
  it("renders from and to inputs prefilled with the page range", () => {
    render(
      <SegmentRow
        segment={segment}
        index={0}
        active={false}
        evidenceTypes={[]}
        duplicateName={false}
        onUpdate={() => {}}
        onPageRangeChange={() => {}}
        onRemove={() => {}}
        onDownload={() => {}}
        onFocus={() => {}}
      />,
    );
    const fromInput = screen.getByLabelText(/from page/i) as HTMLInputElement;
    const toInput = screen.getByLabelText(/to page/i) as HTMLInputElement;
    expect(fromInput.value).toBe("2");
    expect(toInput.value).toBe("5");
  });

  it("fires onPageRangeChange when from changes", () => {
    const onPageRangeChange = vi.fn();
    render(
      <SegmentRow
        segment={segment}
        index={0}
        active={false}
        evidenceTypes={[]}
        duplicateName={false}
        onUpdate={() => {}}
        onPageRangeChange={onPageRangeChange}
        onRemove={() => {}}
        onDownload={() => {}}
        onFocus={() => {}}
      />,
    );
    const fromInput = screen.getByLabelText(/from page/i);
    fireEvent.change(fromInput, { target: { value: "1" } });
    fireEvent.blur(fromInput);
    expect(onPageRangeChange).toHaveBeenCalledWith(1, 5);
  });

  it("displays an inline error when rangeError is set", () => {
    render(
      <SegmentRow
        segment={segment}
        index={0}
        active={false}
        evidenceTypes={[]}
        duplicateName={false}
        rangeError="From must be at least 1."
        onUpdate={() => {}}
        onPageRangeChange={() => {}}
        onRemove={() => {}}
        onDownload={() => {}}
        onFocus={() => {}}
      />,
    );
    expect(screen.getByText(/From must be at least 1/i)).toBeInTheDocument();
  });
});
