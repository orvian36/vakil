import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface KeyboardHintProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  keys: string[];
}

export function KeyboardHint({ keys, className, ...rest }: KeyboardHintProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-[11px] text-ink-400",
        className,
      )}
      {...rest}
    >
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="mx-0.5 text-ink-500">+</span>}
          <span className="px-1.5 py-0.5 rounded bg-ink-700 border border-line-soft text-ink-300">
            {k}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}
