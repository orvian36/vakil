import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EvidenceTypeCard } from "@/components/steps/Step1Evidence/EvidenceTypeCard";
import type { CaseEvidenceType } from "@/types/case";

const customType: CaseEvidenceType = {
  id: "et-1",
  caseId: "c-1",
  key: "custom-1",
  title: "Witness audio",
  description: "Audio recordings",
  isDefault: false,
  displayOrder: 11,
};

const defaultType: CaseEvidenceType = {
  ...customType,
  id: "et-d",
  isDefault: true,
  key: "medical_records",
  title: "Medical Records",
};

const baseProps = {
  files: [],
  uploading: false,
  expanded: true,
  onToggle: () => {},
  onUpload: () => {},
  onDelete: async () => {},
};

describe("EvidenceTypeCard inline edit", () => {
  it("does not render the pencil button for default types", () => {
    render(
      <EvidenceTypeCard {...baseProps} type={defaultType} onRename={() => Promise.resolve()} />,
    );
    expect(screen.queryByRole("button", { name: /edit type/i })).not.toBeInTheDocument();
  });

  it("renders the pencil button for custom types", () => {
    render(
      <EvidenceTypeCard {...baseProps} type={customType} onRename={() => Promise.resolve()} />,
    );
    expect(screen.getByRole("button", { name: /edit type/i })).toBeInTheDocument();
  });

  it("swaps title to an input when pencil is clicked", async () => {
    const u = userEvent.setup();
    render(
      <EvidenceTypeCard {...baseProps} type={customType} onRename={() => Promise.resolve()} />,
    );
    await u.click(screen.getByRole("button", { name: /edit type/i }));
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it("calls onRename on Save", async () => {
    const u = userEvent.setup();
    const onRename = vi.fn().mockResolvedValue(undefined);
    render(
      <EvidenceTypeCard {...baseProps} type={customType} onRename={onRename} />,
    );
    await u.click(screen.getByRole("button", { name: /edit type/i }));
    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "New title" } });
    await u.click(screen.getByRole("button", { name: /^save$/i }));
    expect(onRename).toHaveBeenCalledWith("et-1", "New title", "Audio recordings");
  });

  it("reverts on Cancel", async () => {
    const u = userEvent.setup();
    render(
      <EvidenceTypeCard {...baseProps} type={customType} onRename={() => Promise.resolve()} />,
    );
    await u.click(screen.getByRole("button", { name: /edit type/i }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "DRAFT" } });
    await u.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
    expect(screen.getByText("Witness audio")).toBeInTheDocument();
  });
});
