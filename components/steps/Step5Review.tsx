"use client";

import { Case } from "@/types/case";
import { ReviewLayout } from "@/components/review/ReviewLayout";

interface Step5ReviewProps {
  caseId: string;
  caseData: Case;
}

export default function Step5Review({ caseId, caseData }: Step5ReviewProps) {
  return <ReviewLayout caseId={caseId} caseData={caseData} />;
}
