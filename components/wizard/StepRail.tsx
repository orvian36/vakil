"use client";

import { StepRailItem, type RailStep } from "./StepRailItem";

interface StepRailProps {
  steps: RailStep[];
  currentStep: number;
  onStepClick: (n: number) => void;
  disabled?: boolean;
}

export function StepRail({ steps, currentStep, onStepClick, disabled }: StepRailProps) {
  return (
    <nav aria-label="Wizard steps" className="w-60 shrink-0 bg-ink-900 border-r border-line-soft p-3 self-stretch">
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
                onClick={() => onStepClick(s.number)}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
