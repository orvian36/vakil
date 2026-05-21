"use client";

import { CheckCircle2, Loader2, AlertCircle, Circle, RefreshCw, Eye, Trash2 } from "lucide-react";
import { CaseFile } from "@/types/case";
import { Button, ScanLine } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

type Status = "pending" | "processing" | "completed" | "failed";

interface Props {
  file: CaseFile;
  documentTypeLabel: string;
  onRegenerate: (file: CaseFile) => void;
  onView: (file: CaseFile) => void;
  onDelete: (file: CaseFile) => void;
}

function statusOf(file: CaseFile): Status {
  const s = (file.processing_status ?? "pending") as Status;
  return s;
}

function StatusIcon({ status }: { status: Status }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case "processing":
      return <Loader2 className="h-5 w-5 text-gold-500 animate-spin" />;
    case "failed":
      return <AlertCircle className="h-5 w-5 text-rose-500" />;
    case "pending":
    default:
      return <Circle className="h-5 w-5 text-ink-400" />;
  }
}

function statusLabel(status: Status): string {
  switch (status) {
    case "completed":
      return "Ready";
    case "processing":
      return "Processing…";
    case "failed":
      return "Failed";
    case "pending":
    default:
      return "Queued";
  }
}

export function FileTimelineRow({ file, documentTypeLabel, onRegenerate, onView, onDelete }: Props) {
  const status = statusOf(file);
  const isProcessing = status === "processing";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-md)] border bg-ink-800 px-4 py-3 transition-colors",
        status === "failed" ? "border-rose-500/30" : "border-line-soft",
      )}
    >
      {isProcessing && <ScanLine duration={1.6} />}
      <div className="relative flex items-center gap-3">
        <StatusIcon status={status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-ink-100 truncate">{file.fileName}</p>
            <span className="text-xs text-ink-500 shrink-0">· {documentTypeLabel}</span>
          </div>
          <p
            className={cn(
              "text-xs mt-0.5",
              status === "completed" && "text-emerald-500",
              status === "processing" && "text-gold-500",
              status === "failed" && "text-rose-500",
              status === "pending" && "text-ink-400",
            )}
          >
            {statusLabel(status)}
            {status === "failed" && file.error_message && (
              <span className="text-ink-400"> · {file.error_message}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Retry processing"
            title="Retry processing"
            disabled={status === "processing" || status === "pending"}
            onClick={() => onRegenerate(file)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="View file"
            title="View file"
            onClick={() => onView(file)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete file"
            title="Delete file"
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            onClick={() => onDelete(file)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
