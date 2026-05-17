import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthShell } from "@/components/layout/AuthShell";

describe("AuthShell", () => {
  it("renders children as the form panel", () => {
    render(
      <AuthShell>
        <div data-testid="form">form content</div>
      </AuthShell>,
    );
    expect(screen.getByTestId("form")).toBeInTheDocument();
  });

  it("renders the editorial tagline on the side panel", () => {
    render(
      <AuthShell tagline="Drafts while you strategise.">
        <div>x</div>
      </AuthShell>,
    );
    expect(
      screen.getByText("Drafts while you strategise."),
    ).toBeInTheDocument();
  });
});
