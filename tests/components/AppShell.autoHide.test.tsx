import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/login" }));

import { render } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";

describe("AppShell auto-hide", () => {
  it("hides chrome on /login automatically", () => {
    const { container } = render(<AppShell><div /></AppShell>);
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("footer")).toBeNull();
  });
});
