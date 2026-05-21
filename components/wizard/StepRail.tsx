"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { StepRailItem, type RailStep } from "./StepRailItem";

const STORAGE_KEY = "vakil_step_rail_collapsed";

interface StepRailProps {
  steps: RailStep[];
  currentStep: number;
  onStepClick: (n: number) => void;
  disabled?: boolean;
}

export function StepRail({ steps, currentStep, onStepClick, disabled }: StepRailProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  };

  return (
    <nav
      aria-label="Wizard steps"
      className={cn(
        "shrink-0 bg-ink-900 border-r border-line-soft p-3 self-stretch transition-[width] duration-200",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand steps" : "Collapse steps"}
          className="grid place-items-center h-7 w-7 rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-800 focus-gold"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
      <ul className="space-y-1">
        {steps.map((s) => {
          const state: "upcoming" | "current" | "complete" =
            s.number < currentStep ? "complete" : s.number === currentStep ? "current" : "upcoming";
          return (
            <li key={s.number}>
              <StepRailItem
                step={s}
                state={state}
                disabled={Boolean(disabled)}
                collapsed={collapsed}
                onClick={() => onStepClick(s.number)}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
