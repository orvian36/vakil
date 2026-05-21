"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type PDFDocumentProxy = {
  numPages: number;
  getPage: (n: number) => Promise<any>;
};

interface Props {
  pdfDocument: PDFDocumentProxy;
  pageNumber: number;
  active?: boolean;
}

export function ViewerPage({ pdfDocument, pageNumber, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!canvasRef.current) return;
      setLoading(true);
      try {
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.7 });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        if (renderTaskRef.current) renderTaskRef.current.cancel();
        const task = page.render({ canvasContext: ctx, viewport, canvas });
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) setLoading(false);
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") return;
        console.error("ViewerPage render failed", err);
        setLoading(false);
      }
    }
    render();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfDocument, pageNumber]);

  return (
    <div
      className={cn(
        "relative rounded-[var(--radius-md)] border bg-ink-800 p-2 transition-colors",
        active ? "border-gold-500" : "border-line-soft",
      )}
    >
      <div className="text-[10px] uppercase tracking-widest text-ink-500 mb-1.5">Page {pageNumber}</div>
      <canvas
        ref={canvasRef}
        className={cn(
          "block mx-auto rounded-sm shadow-lg",
          loading && "opacity-30",
        )}
      />
    </div>
  );
}
