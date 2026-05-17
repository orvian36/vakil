"use client";

import * as React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils/cn";

export const TooltipProvider = RadixTooltip.Provider;
export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixTooltip.Content>
>(function TooltipContent({ className, sideOffset = 6, ...rest }, ref) {
  return (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-[var(--radius-md)] border border-line-strong bg-ink-800 px-2.5 py-1.5 text-xs text-ink-100 shadow-lg",
          className,
        )}
        {...rest}
      />
    </RadixTooltip.Portal>
  );
});
