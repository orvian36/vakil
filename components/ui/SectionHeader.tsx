import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SectionHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export function SectionHeader({
  title,
  meta,
  actions,
  className,
  ...rest
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 mb-6",
        className,
      )}
      {...rest}
    >
      <div className="min-w-0">
        <h2 className="text-2xl md:text-3xl font-display text-ink-100 leading-tight">
          {title}
        </h2>
        {meta && (
          <p className="text-sm text-ink-400 mt-1.5">{meta}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
