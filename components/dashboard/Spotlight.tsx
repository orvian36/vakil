"use client";

import { ArrowRight } from "lucide-react";
import { Case } from "@/types/case";
import { Card, Button } from "@/components/ui";

interface SpotlightProps {
  caseItem: Case | null;
  onResume: (id: string) => void;
  onCreate?: () => void;
}

function formatRelative(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function Spotlight({ caseItem, onResume, onCreate }: SpotlightProps) {
  if (!caseItem) {
    return (
      <Card
        variant="gold-accent"
        className="relative px-8 py-10 border-l-2 border-l-gold-500"
      >
        <div className="flex items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-display text-ink-100 mb-2">
              Start a new case
            </h2>
            <p className="text-sm text-ink-400">
              Your AI paralegal is ready. Open a case or start a new one.
            </p>
          </div>
          {onCreate && (
            <Button onClick={onCreate} rightIcon={<ArrowRight className="h-4 w-4" />}>
              + New case
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const court = caseItem.court || "Court not specified";
  const typeLabel = caseItem.caseType === "DEFENCE" ? "Defence" : "Statement of Claim";
  const fileCount = caseItem.files?.length ?? 0;
  const updatedRel = (caseItem as any).updatedAt
    ? formatRelative((caseItem as any).updatedAt)
    : "recently";

  return (
    <Card
      variant="gold-accent"
      className="relative px-8 py-10 border-l-2 border-l-gold-500"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-gold-500 mb-2">
            Most recent
          </p>
          <h2 className="text-2xl md:text-3xl font-display text-ink-100 mb-2 truncate">
            {caseItem.title}
          </h2>
          <p className="text-sm text-ink-400 mb-4">
            {typeLabel} · before {court}
          </p>
          <p className="text-xs text-ink-500">
            Last edited {updatedRel} · {fileCount} evidence file{fileCount === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          onClick={() => onResume(caseItem.id)}
          rightIcon={<ArrowRight className="h-4 w-4" />}
          className="shrink-0"
        >
          Resume
        </Button>
      </div>
    </Card>
  );
}
