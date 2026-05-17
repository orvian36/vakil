"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useOptionalAuthContext } from "@/contexts/AuthProvider";

const AUTH_ROUTES = ["/login", "/register"];

interface AppShellProps {
  children: ReactNode;
  hideChrome?: boolean;
}

export function AppShell({ children, hideChrome }: AppShellProps) {
  const pathname = usePathname();
  const autoHide = AUTH_ROUTES.some((r) => pathname?.startsWith(r));
  const effectiveHide = hideChrome ?? autoHide;

  // Tolerate missing AuthProvider (e.g., during tests) — render unauthenticated chrome
  const auth = useOptionalAuthContext();

  return (
    <div className="min-h-screen flex flex-col">
      {!effectiveHide && (
        <Navbar
          user={auth?.user}
          isLoading={auth?.isLoading ?? false}
          isAuthenticated={auth?.isAuthenticated ?? false}
          onLogout={auth?.logout}
        />
      )}
      <main className="flex-1">{children}</main>
      {!effectiveHide && <Footer />}
    </div>
  );
}
