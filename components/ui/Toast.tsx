"use client";

import * as React from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { cn } from "@/lib/utils/cn";

type Variant = "info" | "success" | "warn" | "error" | "ai";

interface ToastInput {
  title: string;
  description?: string;
  variant?: Variant;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface Ctx {
  toast: (input: ToastInput) => void;
}

const ToastCtx = React.createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const variantStyles: Record<Variant, string> = {
  info: "border-line-strong",
  success: "border-emerald-500/40",
  warn: "border-amber-500/40",
  error: "border-rose-500/40",
  ai: "border-line-gold",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const toast = React.useCallback((input: ToastInput) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, ...input }]);
  }, []);

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {items.map((t) => (
          <RadixToast.Root
            key={t.id}
            duration={t.duration ?? 4000}
            onOpenChange={(open) => {
              if (!open) remove(t.id);
            }}
            className={cn(
              "bg-ink-800 border rounded-[var(--radius-md)] p-3 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right",
              variantStyles[t.variant ?? "info"],
            )}
          >
            <RadixToast.Title className="text-sm font-medium text-ink-100">
              {t.title}
            </RadixToast.Title>
            {t.description && (
              <RadixToast.Description className="text-sm text-ink-400 mt-1">
                {t.description}
              </RadixToast.Description>
            )}
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed top-4 right-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastCtx.Provider>
  );
}
