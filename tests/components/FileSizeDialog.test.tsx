import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileSizeDialog } from "@/components/modals/FileSizeDialog";

describe("FileSizeDialog", () => {
  it("renders the list of oversized files", () => {
    render(
      <FileSizeDialog
        open
        onOpenChange={() => {}}
        files={[
          { name: "big.pdf", size: 150 * 1024 * 1024 },
          { name: "huge.pdf", size: 250 * 1024 * 1024 },
        ]}
      />,
    );
    expect(screen.getByText(/big.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/huge.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/150.0 MB/i)).toBeInTheDocument();
  });
});
