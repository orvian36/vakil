"use client";

import { ArrowLeft } from "lucide-react";
import { Case } from "@/types/case";
import { StatusPill, type Status } from "@/components/ui";

interface CaseHeaderProps {
  caseData: Case;
  onBack: () => void;
}

function statusFromCase(c: Case): Status {
  switch (c.status) {
    case "completed":
      return "complete";
    case "processing":
      return "processing";
    case "draft":
    default:
      return "draft";
  }
}

function typeLabel(t: string): string {
  return t === "DEFENCE" ? "Defence" : "Statement of Claim";
}

export function CaseHeader({ caseData, onBack }: CaseHeaderProps) {
  const plaintiffs = caseData.parties
    .filter((p) => p.role === "plaintiff")
    .map((p) => p.name)
    .filter(Boolean);
  const defendants = caseData.parties
    .filter((p) => p.role === "defendant")
    .map((p) => p.name)
    .filter(Boolean);

  return (
    <header className="border-b border-line-soft bg-ink-900 px-6 py-5 relative">
      <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-gold-500" aria-hidden />
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to dashboard"
            className="mt-1 p-1.5 rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-800 focus-gold"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-2xl text-ink-100 truncate">
              {caseData.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
              <span>{typeLabel(caseData.caseType)}</span>
              {caseData.court && (
                <>
                  <span aria-hidden>·</span>
                  <span>{caseData.court}</span>
                </>
              )}
              {plaintiffs.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>plaintiffs: {plaintiffs.join(", ")}</span>
                </>
              )}
              {defendants.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>defendants: {defendants.join(", ")}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {caseData.status && <StatusPill status={statusFromCase(caseData)} />}
      </div>
    </header>
  );
}
