"use client";

import * as React from "react";
import * as RadixRadio from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils/cn";

export const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixRadio.Root>
>(function RadioGroup({ className, ...rest }, ref) {
  return (
    <RadixRadio.Root
      ref={ref}
      className={cn("grid gap-2", className)}
      {...rest}
    />
  );
});

export const RadioItem = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof RadixRadio.Item>
>(function RadioItem({ className, ...rest }, ref) {
  return (
    <RadixRadio.Item
      ref={ref}
      className={cn(
        "h-4 w-4 rounded-full border border-line-strong bg-ink-800 transition-colors data-[state=checked]:border-gold-500 focus-gold disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      <RadixRadio.Indicator className="flex h-full w-full items-center justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
      </RadixRadio.Indicator>
    </RadixRadio.Item>
  );
});
