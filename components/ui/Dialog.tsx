"use client";

import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

type Size = "sm" | "md" | "lg" | "full";

const sizeMap: Record<Size, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  full: "max-w-[calc(100vw-2rem)] h-[calc(100vh-2rem)]",
};

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof RadixDialog.Content> {
  size?: Size;
  hideClose?: boolean;
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(
    { className, size = "md", hideClose, children, ...rest },
    ref,
  ) {
    return (
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className="fixed inset-0 z-50 bg-ink-950/72 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
        />
        <RadixDialog.Content
          ref={ref}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full rounded-[var(--radius-lg)] border border-line-strong bg-ink-900 p-6 shadow-2xl outline-none",
            sizeMap[size],
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            className,
          )}
          {...rest}
        >
          {children}
          {!hideClose && (
            <RadixDialog.Close asChild>
              <button
                aria-label="Close"
                className="absolute right-4 top-4 rounded-md p-1 text-ink-400 hover:text-ink-100 focus-gold"
              >
                <X className="h-4 w-4" />
              </button>
            </RadixDialog.Close>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    );
  },
);

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(function DialogTitle({ className, ...rest }, ref) {
  return (
    <RadixDialog.Title
      ref={ref}
      className={cn("font-display text-xl text-ink-100", className)}
      {...rest}
    />
  );
});

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(function DialogDescription({ className, ...rest }, ref) {
  return (
    <RadixDialog.Description
      ref={ref}
      className={cn("text-sm text-ink-400 mt-1.5", className)}
      {...rest}
    />
  );
});

export const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function DialogFooter({ className, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={cn("mt-6 flex items-center justify-end gap-2", className)}
      {...rest}
    />
  );
});
