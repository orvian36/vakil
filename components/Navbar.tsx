"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { User } from "@/types/auth";
import { KeyboardHint } from "@/components/ui";

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
    <header className="border-b border-line-soft bg-ink-900/85 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-2xl tracking-tight text-ink-100 font-display"
        >
          Vakil
        </Link>

        {isAuthenticated && user && (
          <>
            <button
              type="button"
              className="hidden md:flex items-center gap-2 rounded-[var(--radius-md)] border border-line-soft bg-ink-800 px-3 h-9 text-sm text-ink-400 hover:text-ink-100 hover:border-line-strong transition-colors focus-gold"
              aria-label="Search cases"
              onClick={() => {
                /* ⌘K modal opens here in a future phase; no-op for now */
              }}
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search cases</span>
              <KeyboardHint keys={["⌘", "K"]} />
            </button>

            <div className="relative user-menu-container">
              <button
                onClick={() => setOpen((v) => !v)}
                disabled={isLoading}
                className="focus-gold flex items-center gap-2 rounded-[var(--radius-md)] border border-line-strong bg-ink-800 px-3 py-1.5 text-sm text-ink-300 hover:text-ink-100"
              >
                <span className="w-7 h-7 rounded-full bg-gold-500 text-ink-950 grid place-items-center font-medium">
                  {initials}
                </span>
                <span className="hidden sm:inline">{displayName}</span>
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-56 rounded-[var(--radius-lg)] bg-ink-800 border border-line-strong shadow-xl p-1.5">
                  <div className="px-3 py-2 text-xs text-ink-400 border-b border-line-soft truncate">
                    {user.email}
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="w-full text-left text-sm px-3 py-2 rounded-[var(--radius-md)] hover:bg-ink-700 text-ink-300 hover:text-ink-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
