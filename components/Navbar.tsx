"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".user-menu-container")) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    if (onLogout) await onLogout();
  };

  const initials = (user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase();
  const displayName = user?.name ?? user?.email ?? "User";

  return (
    <nav className="bg-white text-gray-900 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          {process.env.NEXT_PUBLIC_APP_NAME || "Vakil"}
        </Link>

        {isAuthenticated && user && (
          <div className="relative user-menu-container">
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 text-sm"
            >
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white grid place-items-center font-medium">
                {initials}
              </span>
              <span className="hidden sm:inline text-gray-700">{displayName}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white border border-gray-200 shadow-sm p-1.5">
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-200 truncate">
                  {user.email}
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2 text-left text-sm px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
