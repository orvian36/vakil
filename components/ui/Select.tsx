"use client";

import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Select = RadixSelect.Root;
export const SelectValue = RadixSelect.Value;

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger>
>(function SelectTrigger({ className, children, ...rest }, ref) {
  return (
    <RadixSelect.Trigger
      ref={ref}
      className={cn(
        "flex h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-line-strong bg-ink-800 px-3 text-sm text-ink-100 focus-gold disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      {children}
      <RadixSelect.Icon asChild>
        <ChevronDown className="h-4 w-4 text-ink-400" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
});

export const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Content>
>(function SelectContent({ className, children, ...rest }, ref) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        ref={ref}
        position="popper"
        sideOffset={4}
        className={cn(
          "z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius-md)] border border-line-strong bg-ink-800 shadow-xl",
          className,
        )}
        {...rest}
      >
        <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
});

export const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Item>
>(function SelectItem({ className, children, ...rest }, ref) {
  return (
    <RadixSelect.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-sm text-ink-300 outline-none data-[highlighted]:bg-ink-700 data-[highlighted]:text-ink-100 data-[state=checked]:text-gold-500",
        className,
      )}
      {...rest}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="ml-auto">
        <Check className="h-4 w-4" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
});
