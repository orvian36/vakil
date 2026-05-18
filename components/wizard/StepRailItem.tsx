"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface RailStep {
  number: number;
  title: string;
  meta?: string;
}

interface ItemProps {
  step: RailStep;
  state: "upcoming" | "current" | "complete";
  disabled: boolean;
  onClick: () => void;
}

export function StepRailItem({ step, state, disabled, onClick }: ItemProps) {
  const clickable = state === "complete" && !disabled;
  const Wrapper = clickable ? "button" : "div";

  return (
    <Wrapper
      type={clickable ? "button" : undefined}
      onClick={clickable ? onClick : undefined}
      aria-current={state === "current" ? "step" : undefined}
      disabled={!clickable}
      className={cn(
        "relative w-full text-left flex items-start gap-3 py-3 px-4 rounded-[var(--radius-md)] transition-colors",
        state === "current" && "bg-ink-800",
        clickable && "hover:bg-ink-800/60 cursor-pointer",
      )}
    >
      {state === "current" && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gold-500"
        />
      )}
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-medium",
          state === "complete" && "bg-gold-500 text-ink-950",
          state === "current" && "bg-ink-700 border border-gold-500 text-ink-100",
          state === "upcoming" && "bg-ink-700 border border-line-soft text-ink-400",
        )}
      >
        {state === "complete" ? <Check className="h-3 w-3" /> : step.number}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-sm font-medium",
            state === "current" ? "text-ink-100" : "text-ink-300",
          )}
        >
          {step.title}
        </span>
        {step.meta && (
          <span className="block text-xs text-ink-400 mt-0.5">{step.meta}</span>
        )}
      </span>
    </Wrapper>
  );
}
