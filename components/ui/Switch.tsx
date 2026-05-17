"use client";

import * as React from "react";
import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils/cn";

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof RadixSwitch.Root> {}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch({ className, ...rest }, ref) {
    return (
      <RadixSwitch.Root
        ref={ref}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-[var(--radius-pill)] border border-line-strong bg-ink-700 transition-colors data-[state=checked]:bg-gold-500 focus-gold",
          className,
        )}
        {...rest}
      >
        <RadixSwitch.Thumb className="block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-ink-100 transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-ink-950" />
      </RadixSwitch.Root>
    );
  },
);
