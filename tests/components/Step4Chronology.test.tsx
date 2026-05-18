import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Step4Chronology from "@/components/steps/Step4Chronology";

vi.mock("@/components/MdxRenderer", () => ({
  default: ({ source }: { source: string }) => <div data-testid="mdx-render">{source}</div>,
}));
vi.mock("@/components/MdxEditor", () => ({
  default: ({ initialMarkdown }: { initialMarkdown: string }) => (
    <textarea data-testid="mdx-editor" defaultValue={initialMarkdown} />
  ),
}));
vi.mock("@/components/Citation", () => ({
  default: () => null,
}));

beforeEach(() => {
  global.fetch = vi.fn((url: any) => {
    if (typeof url === "string" && url.startsWith("/api/save/chronology")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: { chronologyData: "## Chronology\n\n14 Aug 2025 — incident" },
        }),
      } as any);
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as any);
  }) as any;
});

describe("Step4Chronology", () => {
  it("renders paper canvas with loaded content", async () => {
    render(<Step4Chronology caseId="c1" />);
    expect(screen.getAllByText(/Chronology/i).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByTestId("mdx-render")).toBeInTheDocument();
    });
  });
});
