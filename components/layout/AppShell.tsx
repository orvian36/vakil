"use client";

import { ReactNode, useEffect, useState, useCallback } from "react";
import { MotionConfig } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useOptionalAuthContext } from "@/contexts/AuthProvider";
import { CommandPalette, type PaletteAction } from "@/components/dashboard/CommandPalette";

const AUTH_ROUTES = ["/login", "/register"];

interface AppShellProps {
  children: ReactNode;
  hideChrome?: boolean;
}

export function AppShell({ children, hideChrome }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const autoHide = AUTH_ROUTES.some((r) => pathname?.startsWith(r));
  const effectiveHide = hideChrome ?? autoHide;
  const auth = useOptionalAuthContext();

  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (effectiveHide || !auth?.user?.id) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [effectiveHide, auth?.user?.id]);

  const handleSelectCase = useCallback(
    (caseId: string) => {
      setPaletteOpen(false);
      router.push(`/case/${caseId}`);
    },
    [router],
  );

  const handleAction = useCallback(
    async (action: PaletteAction) => {
      setPaletteOpen(false);
      if (action === "new-case") {
        // Bring the user to the dashboard with a flag; the dashboard opens its create dialog.
        router.push("/?create=1");
      } else if (action === "logout") {
        if (auth?.logout) {
          await auth.logout();
        } else {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
        }
      }
    },
    [auth, router],
  );

  return (
    <MotionConfig reducedMotion="user">
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
        {!effectiveHide && auth?.user?.id && (
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            userId={auth.user.id}
            onSelectCase={handleSelectCase}
            onAction={handleAction}
          />
        )}
      </div>
    </MotionConfig>
  );
}
