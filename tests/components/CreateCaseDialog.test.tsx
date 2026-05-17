import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateCaseDialog } from "@/components/modals/CreateCaseDialog";

describe("CreateCaseDialog", () => {
  it("renders step A title and case-type radios when open", () => {
    render(
      <CreateCaseDialog open onOpenChange={() => {}} onSubmit={async () => {}} />,
    );
    expect(screen.getByLabelText(/Case title/i)).toBeInTheDocument();
    expect(screen.getByText(/Plaintiff/i)).toBeInTheDocument();
    expect(screen.getByText(/Defendant/i)).toBeInTheDocument();
  });

  it("advances to step B when Next clicked with valid title", async () => {
    const u = userEvent.setup();
    render(
      <CreateCaseDialog open onOpenChange={() => {}} onSubmit={async () => {}} />,
    );
    await u.type(screen.getByLabelText(/Case title/i), "Test Case");
    await u.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByText(/Plaintiffs/)).toBeInTheDocument();
    expect(screen.getByText(/Defendants/)).toBeInTheDocument();
  });

  it("blocks Next when title is blank", async () => {
    const u = userEvent.setup();
    render(
      <CreateCaseDialog open onOpenChange={() => {}} onSubmit={async () => {}} />,
    );
    await u.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it("submits via onSubmit on final step", async () => {
    const u = userEvent.setup();
    let submitted: any = null;
    render(
      <CreateCaseDialog
        open
        onOpenChange={() => {}}
        onSubmit={async (data) => {
          submitted = data;
        }}
      />,
    );
    await u.type(screen.getByLabelText(/Case title/i), "C1");
    await u.click(screen.getByRole("button", { name: /Next/i }));
    // Step B: at least one plaintiff and one defendant
    await u.type(screen.getAllByPlaceholderText(/plaintiff name/i)[0], "P1");
    await u.type(screen.getAllByPlaceholderText(/defendant name/i)[0], "D1");
    await u.click(screen.getByRole("button", { name: /Create case/i }));
    expect(submitted).not.toBeNull();
    expect(submitted.title).toBe("C1");
  });
});
