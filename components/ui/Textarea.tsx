"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  helper?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, error, helper, rows = 3, ...rest }, ref) {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          rows={rows}
          className={cn(
            "w-full rounded-[var(--radius-md)] bg-ink-800 text-ink-100 border px-3 py-2 focus-gold transition-colors placeholder:text-ink-400 resize-vertical",
            error ? "border-rose-500" : "border-line-strong",
            className,
          )}
          {...rest}
        />
        {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
        {!error && helper && <p className="mt-1.5 text-xs text-ink-400">{helper}</p>}
      </div>
    );
  },
);
