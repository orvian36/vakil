import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "@/components/dashboard/CommandPalette";

beforeEach(() => {
  vi.restoreAllMocks();
  // @ts-ignore
  global.fetch = vi.fn().mockImplementation(async (url: string) => {
    if (String(url).includes("/api/cases/user/")) {
      return {
        ok: true,
        json: async () => [
          { id: "c1", title: "Smith v Jones", court: "District" },
          { id: "c2", title: "Park v Lee",    court: "Magistrates" },
        ],
      } as any;
    }
    return { ok: true, json: async () => ({}) } as any;
  });
});

describe("CommandPalette", () => {
  it("renders the search input when open", () => {
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        userId="u1"
        onSelectCase={() => {}}
        onAction={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText(/search cases/i)).toBeInTheDocument();
  });

  it("fetches and lists matching cases", async () => {
    const onSelectCase = vi.fn();
    const u = userEvent.setup();
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        userId="u1"
        onSelectCase={onSelectCase}
        onAction={() => {}}
      />,
    );
    await u.type(screen.getByPlaceholderText(/search cases/i), "Smith");
    await waitFor(() =>
      expect(screen.getByText("Smith v Jones")).toBeInTheDocument(),
    );
    await u.click(screen.getByText("Smith v Jones"));
    expect(onSelectCase).toHaveBeenCalledWith("c1");
  });

  it("renders quick actions", () => {
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        userId="u1"
        onSelectCase={() => {}}
        onAction={() => {}}
      />,
    );
    expect(screen.getByText(/new case/i)).toBeInTheDocument();
    expect(screen.getByText(/logout/i)).toBeInTheDocument();
  });

  it("calls onAction when an action is clicked", async () => {
    const onAction = vi.fn();
    const u = userEvent.setup();
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        userId="u1"
        onSelectCase={() => {}}
        onAction={onAction}
      />,
    );
    await u.click(screen.getByText(/new case/i));
    expect(onAction).toHaveBeenCalledWith("new-case");
  });
});
