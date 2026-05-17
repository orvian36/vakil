import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";

describe("AppShell (on a regular route)", () => {
  it("renders children inside main", () => {
    render(
      <AppShell>
        <div data-testid="content">hello</div>
      </AppShell>,
    );
    expect(screen.getByTestId("content")).toBeInTheDocument();
    expect(screen.getByText("hello").closest("main")).not.toBeNull();
  });

  it("renders navbar + footer chrome by default", () => {
    const { container } = render(
      <AppShell>
        <div>x</div>
      </AppShell>,
    );
    expect(container.querySelector("header")).not.toBeNull();
    expect(container.querySelector("footer")).not.toBeNull();
  });

  it("omits chrome when hideChrome is true", () => {
    const { container } = render(
      <AppShell hideChrome>
        <div>x</div>
      </AppShell>,
    );
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("footer")).toBeNull();
  });
});
