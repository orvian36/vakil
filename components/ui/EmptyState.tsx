import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-[var(--radius-lg)] bg-ink-800 border border-line-soft px-6 py-12",
        className,
      )}
      {...rest}
    >
      {icon && (
        <div className="mb-4 text-ink-400" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="text-lg font-display text-ink-100 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-ink-400 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
