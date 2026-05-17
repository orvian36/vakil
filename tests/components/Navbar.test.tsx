import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "@/components/Navbar";

describe("Navbar", () => {
  it("renders the Vakil wordmark linking home", () => {
    render(<Navbar />);
    const wordmark = screen.getByRole("link", { name: /Vakil/i });
    expect(wordmark).toHaveAttribute("href", "/");
  });

  it("shows user menu trigger when authenticated", () => {
    const user = { id: "u1", email: "a@b.c", name: "Test User" } as any;
    render(<Navbar user={user} isAuthenticated isLoading={false} />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("hides user menu when not authenticated", () => {
    render(<Navbar isAuthenticated={false} isLoading={false} />);
    expect(screen.queryByText("Test User")).not.toBeInTheDocument();
  });

  it("calls onLogout when Sign out is clicked", async () => {
    const u = userEvent.setup();
    let loggedOut = false;
    const user = { id: "u1", email: "a@b.c", name: "Test" } as any;
    render(
      <Navbar
        user={user}
        isAuthenticated
        isLoading={false}
        onLogout={async () => {
          loggedOut = true;
        }}
      />,
    );
    await u.click(screen.getByRole("button", { name: /Test/ }));
    await u.click(screen.getByRole("button", { name: /Sign out/i }));
    expect(loggedOut).toBe(true);
  });
});
