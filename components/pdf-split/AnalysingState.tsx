"use client";

import { Brain } from "lucide-react";
import { ScanLine } from "@/components/ui";

export function AnalysingState() {
  return (
    <div className="relative min-h-[calc(100vh-16rem)] overflow-hidden">
      <ScanLine duration={2.2} />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/15 text-gold-500 mb-4 animate-pulse">
            <Brain className="h-7 w-7" />
          </span>
          <h2 className="text-2xl font-display text-ink-100 mb-2">Vakil is reading your PDF</h2>
          <p className="text-sm text-ink-400">
            Suggesting intelligent split points. This may take a minute or two.
          </p>
        </div>
      </div>
    </div>
  );
}
