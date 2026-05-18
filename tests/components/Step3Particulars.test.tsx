import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Step3Particulars from "@/components/steps/Step3Particulars";

// Mock the dynamic MDX modules to avoid SSR/dynamic-import noise in tests
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
    if (typeof url === "string" && url.startsWith("/api/save/particulars")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: { particularsData: "## Particulars\n\n1. The plaintiff…" },
        }),
      } as any);
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as any);
  }) as any;
});

describe("Step3Particulars", () => {
  it("renders paper canvas with loaded content", async () => {
    render(<Step3Particulars caseId="c1" />);
    expect(screen.getAllByText(/Particulars/i).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByTestId("mdx-render")).toBeInTheDocument();
    });
  });
});
