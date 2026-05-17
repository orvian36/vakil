"use client";
import { useEffect, useReducer, useRef } from "react";
import { AuthState, AuthContextType, User } from "@/types/auth";

type Action =
  | { type: "init_start" }
  | { type: "init_done"; user: User | null }
  | { type: "logout_done" }
  | { type: "error"; message: string }
  | { type: "clear_error" };

const initial: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isInitialized: false,
};

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case "init_start":
      return { ...state, isLoading: true, error: null };
    case "init_done":
      return {
        ...state,
        isLoading: false,
        user: action.user,
        isAuthenticated: !!action.user,
        isInitialized: true,
      };
    case "logout_done":
      return { ...state, isLoading: false, user: null, isAuthenticated: false };
    case "error":
      return { ...state, isLoading: false, error: action.message };
    case "clear_error":
      return { ...state, error: null };
  }
}

export function useAuth(): AuthContextType {
  const [state, dispatch] = useReducer(reducer, initial);
  const initRan = useRef(false);

  async function loadUser() {
    dispatch({ type: "init_start" });
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      dispatch({ type: "init_done", user: data.user });
      return;
    }
    if (res.status === 401) {
      const ref = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      if (ref.ok) {
        const me = await fetch("/api/auth/me", { credentials: "include" });
        if (me.ok) {
          const data = await me.json();
          dispatch({ type: "init_done", user: data.user });
          return;
        }
      }
    }
    dispatch({ type: "init_done", user: null });
  }

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    void loadUser();
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    dispatch({ type: "logout_done" });
    window.location.href = "/login";
  };

  return {
    ...state,
    logout,
    refreshAuth: loadUser,
    clearError: () => dispatch({ type: "clear_error" }),
  };
}
