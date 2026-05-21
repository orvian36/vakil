import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaperToolbar } from "@/components/review/PaperToolbar";

describe("PaperToolbar", () => {
  it("renders document label and action buttons", () => {
    render(
      <PaperToolbar
        documentLabel="Statement of Claim"
        status="drafted"
        onRegenerate={() => {}}
        onDownload={() => {}}
        onCopy={() => {}}
      />,
    );
    expect(screen.getByText("Statement of Claim")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Regenerate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /DOCX/i })).toBeInTheDocument();
  });

  it("renders Bengali toggle when callback provided", async () => {
    const u = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <PaperToolbar
        documentLabel="Witness Statement"
        status="drafted"
        onRegenerate={() => {}}
        onDownload={() => {}}
        onCopy={() => {}}
        bengaliMode={false}
        onBengaliToggle={onToggle}
      />,
    );
    await u.click(screen.getByRole("switch", { name: /English to Bengali/i }));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
