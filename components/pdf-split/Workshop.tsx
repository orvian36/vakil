"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Case, CaseEvidenceType } from "@/types/case";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import "@/lib/pdfjs-config";

import { FileSizeDialog } from "@/components/modals/FileSizeDialog";
import { EmptyDropzone } from "./EmptyDropzone";
import { AnalysingState } from "./AnalysingState";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Viewer } from "./Viewer";
import { SegmentRail } from "./SegmentRail";
import { Segment, AIAnalysisResult, OversizedFile } from "./types";
import { applyPageRangeEdit } from "@/lib/pdf-split/cutsFromPageRange";

type PDFDocumentProxy = {
  numPages: number;
  getPage: (n: number) => Promise<any>;
  destroy: () => void;
};

interface Props {
  caseData: Case;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
    return (crypto as any).randomUUID();
  }
  return `seg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Given a sorted list of cut boundaries (afterPage), the total page count, and
 * a list of existing segments (used for metadata carry-over), build a fresh
 * Segment[] covering 1..totalPages.
 */
function cutsToSegments(
  cuts: number[],
  totalPages: number,
  prior: Segment[],
): Segment[] {
  const sorted = [...cuts].sort((a, b) => a - b);
  const boundaries = [0, ...sorted, totalPages];
  const out: Segment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const fromPage = boundaries[i] + 1;
    const toPage = boundaries[i + 1];
    if (fromPage > toPage) continue;
    // Find a prior segment that overlaps this range; prefer one whose fromPage matches.
    const carry =
      prior.find((s) => s.fromPage === fromPage && s.toPage === toPage) ??
      prior.find((s) => s.fromPage <= fromPage && s.toPage >= toPage) ??
      null;
    out.push({
      id: carry?.id ?? makeId(),
      fromPage,
      toPage,
      name: carry?.name ?? "",
      category: carry?.category ?? "",
      aiConfidence: carry?.aiConfidence,
    });
  }
  return out;
}

export function Workshop({ caseData }: Props) {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [evidenceTypes, setEvidenceTypes] = useState<CaseEvidenceType[]>([]);

  const [cuts, setCuts] = useState<Set<number>>(new Set());
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [rangeErrors, setRangeErrors] = useState<Record<string, string>>({});

  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);

  const [isSplitting, setIsSplitting] = useState(false);
  const [splittingAction, setSplittingAction] = useState<"download" | "upload" | null>(null);

  const [showFileSizeDialog, setShowFileSizeDialog] = useState(false);
  const [oversizedFiles, setOversizedFiles] = useState<OversizedFile[]>([]);

  // Fetch evidence types on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/cases/${caseData.id}/evidence-types`);
        if (response.ok) {
          const result = await response.json();
          if (!cancelled && result.success && result.data) {
            setEvidenceTypes(result.data);
          }
        }
      } catch (error) {
        console.error("Error fetching evidence types:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseData.id]);

  // Cleanup object URL on unmount or replacement
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handlePdfFileSelect = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        alert("Please select a valid PDF file");
        return;
      }
      setSelectedFile(file);
      try {
        const fileUrl = URL.createObjectURL(file);
        setPdfUrl(fileUrl);

        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;
        }
        const pdfDoc = await pdfjsLib.getDocument({ url: fileUrl }).promise;
        setPdfDocument(pdfDoc as unknown as PDFDocumentProxy);

        // Kick off AI analysis
        await performAnalysis(file, (pdfDoc as any).numPages);
      } catch (error) {
        console.error("Error loading PDF:", error);
        alert("Error loading PDF file");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseData.id],
  );

  const performAnalysis = useCallback(
    async (file: File, totalPages: number) => {
      setIsAnalysing(true);
      setAnalysisResult(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("caseId", caseData.id);

        const response = await fetch("/api/analyze-pdf-split", {
          method: "POST",
          body: formData,
        });
        const result: AIAnalysisResult = await response.json();

        if (result.success && result.data) {
          setAnalysisResult(result);
          const aiSegments: Segment[] = result.data.suggestedSegments.map((sug) => ({
            id: sug.id,
            fromPage: sug.fromPage,
            toPage: sug.toPage,
            name: sug.suggestedName,
            category: sug.suggestedCategory,
            aiConfidence: sug.confidence,
          }));
          const inferredCuts = new Set<number>();
          for (const s of aiSegments) {
            if (s.toPage < totalPages) inferredCuts.add(s.toPage);
          }
          setSegments(aiSegments);
          setCuts(inferredCuts);
          if (aiSegments[0]) setActiveSegmentId(aiSegments[0].id);
        } else {
          // Fallback: one segment covering all pages
          const single: Segment = {
            id: makeId(),
            fromPage: 1,
            toPage: totalPages,
            name: "",
            category: "",
          };
          setSegments([single]);
          setCuts(new Set());
          setActiveSegmentId(single.id);
        }
      } catch (error) {
        console.error("AI analysis failed:", error);
        const single: Segment = {
          id: makeId(),
          fromPage: 1,
          toPage: totalPages,
          name: "",
          category: "",
        };
        setSegments([single]);
        setCuts(new Set());
        setActiveSegmentId(single.id);
      } finally {
        setIsAnalysing(false);
      }
    },
    [caseData.id],
  );

  const handleReanalyse = useCallback(async () => {
    if (selectedFile && pdfDocument) {
      await performAnalysis(selectedFile, pdfDocument.numPages);
    }
  }, [selectedFile, pdfDocument, performAnalysis]);

  // Cut/segment manipulation
  const toggleCut = useCallback(
    (afterPage: number) => {
      if (!pdfDocument) return;
      const nextCuts = new Set(cuts);
      if (nextCuts.has(afterPage)) {
        nextCuts.delete(afterPage);
      } else {
        nextCuts.add(afterPage);
      }
      const nextSegments = cutsToSegments(
        Array.from(nextCuts),
        pdfDocument.numPages,
        segments,
      );
      setCuts(nextCuts);
      setSegments(nextSegments);
    },
    [cuts, segments, pdfDocument],
  );

  const updateSegment = useCallback((id: string, patch: Partial<Segment>) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const handlePageRangeChange = useCallback(
    (segmentId: string, fromPage: number, toPage: number) => {
      if (!pdfDocument) return;
      const result = applyPageRangeEdit(
        segments,
        cuts,
        segmentId,
        fromPage,
        toPage,
        pdfDocument.numPages,
      );
      if (result.error) {
        setRangeErrors((prev) => ({ ...prev, [segmentId]: result.error! }));
        return;
      }
      setRangeErrors((prev) => {
        const next = { ...prev };
        delete next[segmentId];
        return next;
      });
      setCuts(result.cuts);
      setSegments(result.segments);
    },
    [pdfDocument, segments, cuts],
  );

  const removeSegment = useCallback(
    (id: string) => {
      if (!pdfDocument) return;
      const target = segments.find((s) => s.id === id);
      if (!target) return;
      // Removing a segment means removing the cut to its left (merging with prior).
      // If it's the very first segment, remove the cut to its right instead.
      const nextCuts = new Set(cuts);
      if (target.fromPage > 1) {
        nextCuts.delete(target.fromPage - 1);
      } else if (target.toPage < pdfDocument.numPages) {
        nextCuts.delete(target.toPage);
      }
      const nextSegments = cutsToSegments(
        Array.from(nextCuts),
        pdfDocument.numPages,
        segments,
      );
      setCuts(nextCuts);
      setSegments(nextSegments);
      if (activeSegmentId === id) {
        setActiveSegmentId(nextSegments[0]?.id ?? null);
      }
    },
    [cuts, segments, pdfDocument, activeSegmentId],
  );

  const addSegment = useCallback(() => {
    if (!pdfDocument) return;
    // Find the largest segment and split it in half
    let widest = segments[0];
    for (const s of segments) {
      if (s.toPage - s.fromPage > widest.toPage - widest.fromPage) widest = s;
    }
    if (!widest || widest.toPage === widest.fromPage) return;
    const mid = Math.floor((widest.fromPage + widest.toPage) / 2);
    const nextCuts = new Set(cuts);
    nextCuts.add(mid);
    const nextSegments = cutsToSegments(
      Array.from(nextCuts),
      pdfDocument.numPages,
      segments,
    );
    setCuts(nextCuts);
    setSegments(nextSegments);
  }, [segments, cuts, pdfDocument]);

  const downloadOneSegment = useCallback(
    async (id: string) => {
      const segment = segments.find((s) => s.id === id);
      if (!segment || !selectedFile) return;
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const originalPdf = await PDFDocument.load(arrayBuffer);
        const newPdf = await PDFDocument.create();
        const pageIndices: number[] = [];
        for (let i = segment.fromPage - 1; i < segment.toPage && i < originalPdf.getPageCount(); i++) {
          pageIndices.push(i);
        }
        const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
        copiedPages.forEach((p) => newPdf.addPage(p));
        const pdfBytes = await newPdf.save();
        const filename = `${segment.name.trim() || `segment-${segment.fromPage}-${segment.toPage}`}.pdf`;
        const url = URL.createObjectURL(new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading segment:", error);
        alert("Failed to download segment.");
      }
    },
    [segments, selectedFile],
  );

  // Validation
  const segmentsValid = useMemo(() => {
    if (segments.length === 0) return false;
    const seen = new Set<string>();
    for (const s of segments) {
      if (!s.name.trim() || !s.category.trim()) return false;
      if (seen.has(s.name.trim())) return false;
      seen.add(s.name.trim());
      if (selectedFile && s.name.trim() === selectedFile.name.replace(/\.pdf$/i, "")) return false;
    }
    return true;
  }, [segments, selectedFile]);

  // Split + download all
  const splitAndDownload = useCallback(async () => {
    if (!selectedFile || segments.length === 0) return;
    setIsSplitting(true);
    setSplittingAction("download");
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const originalPdf = await PDFDocument.load(arrayBuffer);
      const zip = new JSZip();
      let totalAdded = 0;
      for (const segment of segments) {
        if (!segment.name || !segment.category) continue;
        const fromPage = segment.fromPage;
        const toPage = segment.toPage;
        if (fromPage > toPage) continue;
        const newPdf = await PDFDocument.create();
        const pageIndices: number[] = [];
        for (let i = fromPage - 1; i < toPage && i < originalPdf.getPageCount(); i++) {
          pageIndices.push(i);
        }
        const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
        copiedPages.forEach((p) => newPdf.addPage(p));
        const pdfBytes = await newPdf.save();
        const filename = `${segment.name.trim() || `segment-${fromPage}-${toPage}`}.pdf`;
        zip.file(filename, pdfBytes);
        totalAdded++;
      }
      if (totalAdded === 0) {
        alert("No valid segments to download. Check names and categories.");
        return;
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedFile.name.replace(/\.pdf$/i, "")}-split.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      router.back();
    } catch (error) {
      console.error("Error splitting and downloading PDF:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown"}`);
    } finally {
      setIsSplitting(false);
      setSplittingAction(null);
    }
  }, [selectedFile, segments, router]);

  // Split + upload all
  const splitAndUpload = useCallback(async () => {
    if (!selectedFile || segments.length === 0) return;
    setIsSplitting(true);
    setSplittingAction("upload");
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const originalPdf = await PDFDocument.load(arrayBuffer);
      const oversized: OversizedFile[] = [];

      // First pass: size check
      const splitBlobs: { filename: string; bytes: Uint8Array; category: string }[] = [];
      for (const segment of segments) {
        if (!segment.name || !segment.category) continue;
        const newPdf = await PDFDocument.create();
        const pageIndices: number[] = [];
        for (let i = segment.fromPage - 1; i < segment.toPage && i < originalPdf.getPageCount(); i++) {
          pageIndices.push(i);
        }
        const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
        copiedPages.forEach((p) => newPdf.addPage(p));
        const pdfBytes = await newPdf.save();
        const filename = `${segment.name.trim() || `segment-${segment.fromPage}-${segment.toPage}`}.pdf`;
        if (pdfBytes.length > MAX_FILE_SIZE) {
          oversized.push({ name: filename, size: pdfBytes.length });
        } else {
          splitBlobs.push({ filename, bytes: new Uint8Array(pdfBytes), category: segment.category });
        }
      }

      if (oversized.length > 0) {
        setOversizedFiles(oversized);
        setShowFileSizeDialog(true);
        setIsSplitting(false);
        setSplittingAction(null);
        return;
      }

      // Second pass: upload each
      for (const { filename, bytes, category } of splitBlobs) {
        const blob = new Blob([bytes], { type: "application/pdf" });
        (blob as any).name = filename;
        const formData = new FormData();
        formData.append("files", blob as any, filename);
        formData.append("caseId", caseData.id);
        formData.append("evidenceType", category);
        const response = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(`Upload failed: ${err.error || response.statusText}`);
        }
      }
      router.back();
    } catch (error) {
      console.error("Error splitting and uploading PDF:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown"}`);
    } finally {
      setIsSplitting(false);
      setSplittingAction(null);
    }
  }, [selectedFile, segments, caseData.id, router]);

  const activeSegment = segments.find((s) => s.id === activeSegmentId) ?? null;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <Header
        fileName={selectedFile?.name ?? "—"}
        totalPages={pdfDocument?.numPages ?? 0}
        analysisConfidence={analysisResult?.data?.analysisConfidence}
        onBack={() => router.back()}
        onReanalyse={selectedFile && !isAnalysing ? handleReanalyse : undefined}
        isAnalysing={isAnalysing}
      />

      {!selectedFile ? (
        <EmptyDropzone onFile={handlePdfFileSelect} busy={isAnalysing} />
      ) : isAnalysing ? (
        <AnalysingState />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {pdfDocument && (
            <Viewer
              pdfDocument={pdfDocument}
              totalPages={pdfDocument.numPages}
              cuts={cuts}
              activeSegment={activeSegment}
              onToggleCut={toggleCut}
            />
          )}
          <SegmentRail
            segments={segments}
            activeSegmentId={activeSegmentId}
            evidenceTypes={evidenceTypes}
            rangeErrors={rangeErrors}
            onUpdate={updateSegment}
            onPageRangeChange={handlePageRangeChange}
            onRemove={removeSegment}
            onDownload={downloadOneSegment}
            onFocus={(id) => setActiveSegmentId(id)}
            onAdd={addSegment}
          />
        </div>
      )}

      {selectedFile && !isAnalysing && (
        <Footer
          segmentCount={segments.length}
          segmentsValid={segmentsValid}
          busy={isSplitting}
          busyAction={splittingAction}
          onCancel={() => router.back()}
          onDownload={splitAndDownload}
          onUpload={splitAndUpload}
        />
      )}

      <FileSizeDialog
        open={showFileSizeDialog}
        onOpenChange={setShowFileSizeDialog}
        files={oversizedFiles}
      />
    </div>
  );
}
