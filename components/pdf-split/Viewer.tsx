"use client";

import { useEffect, useRef } from "react";
import { ViewerPage } from "./ViewerPage";
import { CutIndicator } from "./CutIndicator";
import { Segment } from "./types";

type PDFDocumentProxy = {
  numPages: number;
  getPage: (n: number) => Promise<any>;
};

interface Props {
  pdfDocument: PDFDocumentProxy;
  totalPages: number;
  cuts: Set<number>;
  activeSegment: Segment | null;
  onToggleCut: (afterPage: number) => void;
}

export function Viewer({ pdfDocument, totalPages, cuts, activeSegment, onToggleCut }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeSegment || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-page="${activeSegment.fromPage}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeSegment]);

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-ink-950 px-6 py-6"
    >
      <div className="max-w-md mx-auto">
        {pages.map((p) => {
          const isActive =
            activeSegment !== null &&
            p >= activeSegment.fromPage &&
            p <= activeSegment.toPage;
          return (
            <div key={p}>
              <div data-page={p}>
                <ViewerPage pdfDocument={pdfDocument} pageNumber={p} active={isActive} />
              </div>
              {p < totalPages && (
                <CutIndicator
                  afterPage={p}
                  hasCut={cuts.has(p)}
                  onToggle={() => onToggleCut(p)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
