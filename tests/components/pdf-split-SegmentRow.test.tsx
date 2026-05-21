import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SegmentRow } from "@/components/pdf-split/SegmentRow";

const seg = {
  id: "s1",
  fromPage: 1,
  toPage: 3,
  name: "Engagement",
  category: "medical",
  aiConfidence: 0.96,
};

describe("SegmentRow", () => {
  it("renders segment range and AI confidence", () => {
    render(
      <SegmentRow
        segment={seg as any}
        index={0}
        active
        evidenceTypes={[{ id: "1", key: "medical", title: "Medical", description: "", isDefault: true, displayOrder: 1, caseId: "c1" } as any]}
        duplicateName={false}
        onUpdate={() => {}}
        onRemove={() => {}}
        onDownload={() => {}}
        onFocus={() => {}}
      />,
    );
    expect(screen.getByText(/Pages 1–3/)).toBeInTheDocument();
    expect(screen.getByText(/96%/)).toBeInTheDocument();
  });
});
