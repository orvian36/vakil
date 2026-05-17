"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helper?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { className, error, helper, leadingIcon, trailingIcon, ...rest },
    ref,
  ) {
    return (
      <div className="w-full">
        <div className="relative">
          {leadingIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full h-10 rounded-[var(--radius-md)] bg-ink-800 text-ink-100 border focus-gold transition-colors placeholder:text-ink-400",
              leadingIcon ? "pl-9" : "pl-3",
              trailingIcon ? "pr-9" : "pr-3",
              error ? "border-rose-500" : "border-line-strong",
              className,
            )}
            {...rest}
          />
          {trailingIcon && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
              {trailingIcon}
            </span>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
        {!error && helper && <p className="mt-1.5 text-xs text-ink-400">{helper}</p>}
      </div>
    );
  },
);
