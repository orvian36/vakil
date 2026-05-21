"use client";

import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  hasCut: boolean;
  onToggle: () => void;
  /** Render between pages `afterPage` and `afterPage+1` (1-indexed). */
  afterPage: number;
}

export function CutIndicator({ hasCut, onToggle, afterPage }: Props) {
  return (
    <div className="relative h-6 my-1 flex items-center group" aria-label={`Boundary between page ${afterPage} and ${afterPage + 1}`}>
      <div
        aria-hidden
        className={cn(
          "absolute left-0 right-0 h-px",
          hasCut
            ? "bg-gold-500"
            : "border-t border-dashed border-line-soft group-hover:border-gold-500/60",
        )}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={hasCut ? "Remove cut" : "Insert cut"}
        className={cn(
          "relative mx-auto grid place-items-center h-6 w-6 rounded-full text-xs transition-colors focus-gold",
          hasCut
            ? "bg-gold-500 text-ink-950"
            : "bg-ink-700 text-ink-400 opacity-0 group-hover:opacity-100",
        )}
      >
        {hasCut ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      </button>
    </div>
  );
}
