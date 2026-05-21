"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, AlertTriangle, X, Sparkles } from "lucide-react";
import PDFViewerModal from "@/components/PDFViewerModal";
import { Case, CaseFile } from "@/types/case";
import {
  SectionHeader,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Shimmer,
  EmptyState,
} from "@/components/ui";
import { FileTimelineRow } from "./FileTimelineRow";

interface Step2ProcessProps {
  caseId: string;
  action?: string | null;
  generatedContent?: string | null;
  onGenerateContent?: (action: string) => void;
  onGeneratingStateChange?: (isGenerating: boolean) => void;
  hasPendingUploads?: boolean;
  generatingAction?: string | null;
  onOcrStateReset?: () => void;
  onIncompleteFilesChange?: (
    hasIncomplete: boolean,
    hasProcessing: boolean,
    hasFailed: boolean,
  ) => void;
}

function getDocumentType(evidenceType: string): string {
  const typeMap: Record<string, string> = {
    medical_reports: "Medical Report",
    witness_statements: "Witness Statement",
    police_reports: "Police Report",
    insurance_documents: "Insurance Document",
    photographs: "Photograph Evidence",
    correspondence: "Correspondence",
    financial_documents: "Financial Document",
    expert_reports: "Expert Report",
    other: "Other Document",
  };
  return (
    typeMap[evidenceType] ||
    evidenceType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

export default function Step2Process({
  caseId,
  onOcrStateReset,
  onIncompleteFilesChange,
}: Step2ProcessProps) {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<CaseFile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<CaseFile | null>(null);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [showFailedFilesToast, setShowFailedFilesToast] = useState(false);
  const [hasShownFailedToast, setHasShownFailedToast] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkFileStatuses = useCallback(() => {
    const hasIncomplete = files.some((f) => f.processing_status !== "completed");
    const hasProcessing = files.some((f) => f.processing_status === "processing");
    const hasFailed = files.some((f) => f.processing_status === "failed");

    if (hasFailed && !hasShownFailedToast) {
      setShowFailedFilesToast(true);
      setHasShownFailedToast(true);
      setTimeout(() => setShowFailedFilesToast(false), 8000);
    }

    onIncompleteFilesChange?.(hasIncomplete, hasProcessing, hasFailed);
  }, [files, onIncompleteFilesChange, hasShownFailedToast]);

  useEffect(() => {
    checkFileStatuses();
  }, [checkFileStatuses]);

  const fetchFilesAndStatuses = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}`);
      if (response.ok) {
        const data = await response.json();
        setCaseData(data);
        const updatedFiles = data.files.map((file: any) => ({
          id: file.id,
          type: file.type,
          fileName: file.fileName,
          status: file.processingStatus,
          entities: file.entities,
          summary: file.summary,
          documentDate: file.documentDate,
          caseId: file.caseId,
          fileKey: file.fileKey,
          processing_status: file.processingStatus,
          error_message: file.errorMessage,
        }));
        setFiles(updatedFiles);

        const hasProcessingOrPending = updatedFiles.some(
          (f: CaseFile) =>
            f.processing_status === "processing" || f.processing_status === "pending",
        );

        if (!hasProcessingOrPending && pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } else {
        console.error("Failed to fetch case and file statuses:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching case and file statuses:", error);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (caseId) {
      fetchFilesAndStatuses();
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(fetchFilesAndStatuses, 30000);
      }
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [caseId, fetchFilesAndStatuses]);

  const startPolling = () => {
    if (!pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(fetchFilesAndStatuses, 30000);
    }
  };

  const handleRegenerate = async (file: CaseFile) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, processing_status: "processing" } : f)),
    );
    try {
      await fetch(`/api/files/${file.id}/regenerate`, { method: "POST" });
      onOcrStateReset?.();
    } catch (err) {
      console.error("Failed to trigger regenerate:", err);
    }
    startPolling();
  };

  const handleDelete = async (file: CaseFile) => {
    if (!confirm(`Are you sure you want to delete "${file.fileName}"?`)) return;
    try {
      const response = await fetch(`/api/files/${file.id}`, { method: "DELETE" });
      if (response.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete file");
      }
    } catch (err) {
      console.error("Failed to delete file:", err);
      alert("Failed to delete file");
    }
  };

  const handleFileClick = (file: CaseFile) => {
    setSelectedFile(file);
    setIsPDFModalOpen(true);
  };

  const handleClosePDFModal = () => {
    setIsPDFModalOpen(false);
    setSelectedFile(null);
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getDocumentType(file.type).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || file.processing_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = files.reduce(
    (acc, file) => {
      const key = file.processing_status ?? "pending";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalFiles = files.length;
  const filteredCount = filteredFiles.length;
  const allReady = totalFiles > 0 && statusCounts.completed === totalFiles;

  return (
    <div>
      {showFailedFilesToast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm rounded-[var(--radius-md)] border border-rose-500/30 bg-ink-800 p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-100">Some files failed to process</p>
              <p className="mt-1 text-xs text-ink-400">
                You can re-process these files or proceed without them. To remove them, return to
                the previous step.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFailedFilesToast(false)}
              aria-label="Dismiss"
              className="shrink-0 text-ink-400 hover:text-ink-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <SectionHeader
        title="Process evidence"
        meta={
          allReady
            ? "All files ready · review timeline below"
            : "Vakil is reading every page. This takes a minute or two."
        }
        actions={
          allReady && (
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-500">
              <Sparkles className="h-3.5 w-3.5" />
              All ready
            </span>
          )
        }
      />

      {loading ? (
        <div className="space-y-2">
          <Shimmer className="h-16 w-full" />
          <Shimmer className="h-16 w-full" />
          <Shimmer className="h-16 w-full" />
        </div>
      ) : totalFiles === 0 ? (
        <EmptyState
          title="No documents uploaded yet"
          description="Return to the previous step to add evidence."
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search documents…"
                leadingIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status ({totalFiles})</SelectItem>
                  <SelectItem value="completed">Completed ({statusCounts.completed ?? 0})</SelectItem>
                  <SelectItem value="processing">Processing ({statusCounts.processing ?? 0})</SelectItem>
                  <SelectItem value="pending">Pending ({statusCounts.pending ?? 0})</SelectItem>
                  <SelectItem value="failed">Failed ({statusCounts.failed ?? 0})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-ink-400 sm:ml-auto">
              Showing {filteredCount} of {totalFiles}
            </span>
          </div>

          <div className="space-y-2">
            {filteredFiles.length === 0 ? (
              <div className="rounded-[var(--radius-md)] border border-line-soft bg-ink-900 px-4 py-8 text-center text-sm text-ink-400">
                No documents match your filters
              </div>
            ) : (
              filteredFiles.map((file) => (
                <FileTimelineRow
                  key={file.id}
                  file={file}
                  documentTypeLabel={getDocumentType(file.type)}
                  onRegenerate={handleRegenerate}
                  onView={handleFileClick}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </>
      )}

      {selectedFile && (
        <PDFViewerModal
          isOpen={isPDFModalOpen}
          onClose={handleClosePDFModal}
          files={files}
          startIndex={files.findIndex((f) => f.id === selectedFile.id)}
          onSave={async (fileId: string, summary: string) => {
            const response = await fetch(`/api/files/${fileId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ summary }),
            });
            if (response.ok) {
              setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, summary } : f)));
            } else {
              throw new Error("Failed to save summary");
            }
          }}
        />
      )}
    </div>
  );
}
