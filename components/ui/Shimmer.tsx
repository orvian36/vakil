import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Shimmer({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-md)] bg-ink-700/60",
        className,
      )}
      {...rest}
    />
  );
}
