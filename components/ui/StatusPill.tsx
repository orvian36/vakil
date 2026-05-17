import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type Status =
  | "draft"
  | "drafting"
  | "drafted"
  | "processing"
  | "complete"
  | "failed"
  | "ai-suggested";

const styles: Record<Status, { bg: string; text: string; label: string }> = {
  draft:        { bg: "bg-ink-700",          text: "text-ink-300",      label: "Draft" },
  drafting:     { bg: "bg-amber-500/15",     text: "text-amber-500",    label: "Drafting" },
  drafted:      { bg: "bg-emerald-500/15",   text: "text-emerald-500",  label: "Drafted" },
  processing:   { bg: "bg-amber-500/15",     text: "text-amber-500",    label: "Processing" },
  complete:     { bg: "bg-emerald-500/15",   text: "text-emerald-500",  label: "Complete" },
  failed:       { bg: "bg-rose-500/15",      text: "text-rose-500",     label: "Failed" },
  "ai-suggested": { bg: "bg-gold-500/15",    text: "text-gold-500",     label: "AI" },
};

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  status: Status;
  children?: React.ReactNode;
}

export function StatusPill({
  status,
  className,
  children,
  ...rest
}: StatusPillProps) {
  const s = styles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-pill)] text-xs font-medium",
        s.bg,
        s.text,
        className,
      )}
      {...rest}
    >
      {children ?? s.label}
    </span>
  );
}
