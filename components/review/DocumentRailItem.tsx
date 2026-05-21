"use client";

import { CheckCircle2, Loader2, AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DocumentStatus } from "./documentTypes";

interface Props {
  label: string;
  status: DocumentStatus;
  active: boolean;
  onSelect: () => void;
}

export function DocumentRailItem({ label, status, active, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full flex items-start gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-left transition-colors",
        active ? "bg-ink-800" : "hover:bg-ink-800/60",
      )}
    >
      {active && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gold-500" />}
      <span className="mt-0.5 text-ink-400">
        {status === "drafted" && <CheckCircle2 className="h-4 w-4 text-gold-500" />}
        {status === "generating" && <Loader2 className="h-4 w-4 animate-spin text-gold-500" />}
        {status === "failed" && <AlertCircle className="h-4 w-4 text-rose-500" />}
        {status === "pending" && <Circle className="h-4 w-4" />}
      </span>
      <span className="min-w-0">
        <span className={cn("block text-sm font-medium", active ? "text-ink-100" : "text-ink-300")}>{label}</span>
        <span className="block text-xs text-ink-400 mt-0.5">
          {status === "drafted" && "Drafted"}
          {status === "generating" && "Generating…"}
          {status === "failed" && "Retry"}
          {status === "pending" && "Queued"}
        </span>
      </span>
    </button>
  );
}
