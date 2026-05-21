import * as React from "react";
import { AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: "ink" | "paper";
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Retry",
  variant = "ink",
  className,
  ...rest
}: ErrorStateProps) {
  const headingClass =
    variant === "paper" ? "text-paper-ink" : "text-ink-100";
  const bodyClass =
    variant === "paper" ? "text-paper-ink/70" : "text-ink-400";

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center py-10",
        className,
      )}
      {...rest}
    >
      <div className="mb-4 text-rose-500" aria-hidden>
        <AlertOctagon className="h-10 w-10" />
      </div>
      <h3 className={cn("text-lg font-display mb-1", headingClass)}>{title}</h3>
      {message && (
        <p className={cn("text-sm max-w-md", bodyClass)}>{message}</p>
      )}
      {onRetry && (
        <div className="mt-5">
          <Button onClick={onRetry}>{retryLabel}</Button>
        </div>
      )}
    </div>
  );
}
