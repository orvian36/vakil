"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

interface WizardFooterProps {
  currentStep: number;
  totalSteps: number;
  previousDisabled: boolean;
  nextDisabled: boolean;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
}

export function WizardFooter({
  currentStep,
  totalSteps,
  previousDisabled,
  nextDisabled,
  nextLabel,
  onPrevious,
  onNext,
}: WizardFooterProps) {
  const showPrev = currentStep > 1;
  const showNext = currentStep < totalSteps;
  return (
    <div className="sticky bottom-0 border-t border-line-soft bg-ink-900 px-6 py-3 z-20">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          {showPrev && (
            <Button
              variant="ghost"
              onClick={onPrevious}
              disabled={previousDisabled}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Previous
            </Button>
          )}
        </div>
        <div>
          {showNext && (
            <Button
              onClick={onNext}
              disabled={nextDisabled}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {nextLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
