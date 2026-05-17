"use client";

import * as React from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof RadixCheckbox.Root> {}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  function Checkbox({ className, ...rest }, ref) {
    return (
      <RadixCheckbox.Root
        ref={ref}
        className={cn(
          "h-4 w-4 shrink-0 rounded border border-line-strong bg-ink-800 transition-colors data-[state=checked]:bg-gold-500 data-[state=checked]:border-gold-500 focus-gold disabled:opacity-50",
          className,
        )}
        {...rest}
      >
        <RadixCheckbox.Indicator className="flex items-center justify-center text-ink-950">
          <Check className="h-3 w-3" strokeWidth={3} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
    );
  },
);
