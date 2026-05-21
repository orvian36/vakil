"use client";

import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";

interface Props {
  fileName: string;
  totalPages: number;
  analysisConfidence?: number;
  onBack: () => void;
  onReanalyse?: () => void;
  isAnalysing?: boolean;
}

export function Header({
  fileName,
  totalPages,
  analysisConfidence,
  onBack,
  onReanalyse,
  isAnalysing,
}: Props) {
  return (
    <header className="border-b border-line-soft bg-ink-900 px-6 py-3 relative">
      <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-gold-500" aria-hidden />
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to case"
            className="p-1.5 rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-800 focus-gold"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-ink-400">Split PDF</p>
            <p className="text-sm text-ink-100 truncate">
              {fileName} · {totalPages} pages
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {analysisConfidence !== undefined && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gold-500">
              <Sparkles className="h-3.5 w-3.5" />
              AI · {Math.round(analysisConfidence * 100)}% confidence
            </span>
          )}
          {onReanalyse && (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={onReanalyse}
              loading={isAnalysing}
            >
              Re-analyse
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
