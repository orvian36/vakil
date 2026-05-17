"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthContextType } from "@/types/auth";
import Navbar from "@/components/Navbar";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return (
    <AuthContext.Provider value={auth}>
      <Navbar
        user={auth.user}
        isLoading={auth.isLoading}
        isAuthenticated={auth.isAuthenticated}
        onLogout={auth.logout}
      />
      {children}
    </AuthContext.Provider>
  );
}
