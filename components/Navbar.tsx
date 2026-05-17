"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User } from "@/types/auth";

interface NavbarProps {
  user?: User | null;
  isLoading?: boolean;
  isAuthenticated?: boolean;
  onLogout?: () => Promise<void>;
}

export default function Navbar({
  user,
  isLoading = false,
  isAuthenticated = false,
  onLogout,
}: NavbarProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".user-menu-container")) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    if (onLogout) await onLogout();
  };

  const initials = (user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase();
  const displayName = user?.name ?? user?.email ?? "User";

  return (
    <header className="border-b border-[var(--color-line)] bg-[var(--color-cream-50)]/85 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl tracking-tight text-[var(--color-ink-950)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Vakil
        </Link>

        {isAuthenticated && user && (
          <div className="relative user-menu-container">
            <button
              onClick={() => setOpen((v) => !v)}
              disabled={isLoading}
              className="focus-saffron flex items-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-line)] bg-white px-3 py-1.5 text-sm"
            >
              <span className="w-7 h-7 rounded-full bg-[var(--color-saffron-500)] text-[var(--color-ink-950)] grid place-items-center font-medium">
                {initials}
              </span>
              <span className="hidden sm:inline text-[var(--color-ink-700)]">{displayName}</span>
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-56 rounded-[var(--radius-card)] bg-white border border-[var(--color-line)] shadow-sm p-1.5">
                <div className="px-3 py-2 text-xs text-[var(--color-ink-500)] border-b border-[var(--color-line)] truncate">
                  {user.email}
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="w-full text-left text-sm px-3 py-2 rounded-[var(--radius-button)] hover:bg-[var(--color-cream-100)] text-[var(--color-ink-800)]"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
