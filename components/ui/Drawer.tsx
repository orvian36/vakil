"use client";

import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Drawer = RadixDialog.Root;
export const DrawerTrigger = RadixDialog.Trigger;
export const DrawerClose = RadixDialog.Close;

export interface DrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof RadixDialog.Content> {
  side?: "left" | "right";
  width?: string;
}

export const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  function DrawerContent(
    { className, side = "right", width = "min(28rem,100vw)", children, ...rest },
    ref,
  ) {
    const sideClasses =
      side === "right"
        ? "right-0 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
        : "left-0 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left";
    return (
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink-950/72 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <RadixDialog.Content
          ref={ref}
          style={{ width }}
          className={cn(
            "fixed top-0 bottom-0 z-50 bg-ink-900 border-l border-line-strong p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out",
            sideClasses,
            className,
          )}
          {...rest}
        >
          {children}
          <RadixDialog.Close asChild>
            <button
              aria-label="Close"
              className="absolute right-4 top-4 rounded-md p-1 text-ink-400 hover:text-ink-100 focus-gold"
            >
              <X className="h-4 w-4" />
            </button>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    );
  },
);

export const DrawerTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(function DrawerTitle({ className, ...rest }, ref) {
  return (
    <RadixDialog.Title
      ref={ref}
      className={cn("font-display text-xl text-ink-100", className)}
      {...rest}
    />
  );
});
