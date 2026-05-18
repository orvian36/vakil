"use client";

import { ReactNode } from "react";
import { Case } from "@/types/case";
import { CaseHeader } from "./CaseHeader";
import { StepRail } from "./StepRail";
import { WizardFooter } from "./WizardFooter";
import type { RailStep } from "./StepRailItem";

interface CaseShellProps {
  caseData: Case;
  steps: RailStep[];
  currentStep: number;
  previousDisabled: boolean;
  nextDisabled: boolean;
  nextLabel: string;
  onBack: () => void;
  onStepClick: (n: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  children: ReactNode;
}

export function CaseShell({
  caseData,
  steps,
  currentStep,
  previousDisabled,
  nextDisabled,
  nextLabel,
  onBack,
  onStepClick,
  onPrevious,
  onNext,
  children,
}: CaseShellProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <CaseHeader caseData={caseData} onBack={onBack} />
      <div className="flex-1 flex">
        <StepRail
          steps={steps}
          currentStep={currentStep}
          onStepClick={onStepClick}
          disabled={previousDisabled && nextDisabled}
        />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
      <WizardFooter
        currentStep={currentStep}
        totalSteps={steps.length}
        previousDisabled={previousDisabled}
        nextDisabled={nextDisabled}
        nextLabel={nextLabel}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </div>
  );
}
