"use client";

import { Download, Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

interface Props {
  segmentCount: number;
  segmentsValid: boolean;
  busy: boolean;
  busyAction: "download" | "upload" | null;
  onCancel: () => void;
  onDownload: () => void;
  onUpload: () => void;
}

export function Footer({ segmentCount, segmentsValid, busy, busyAction, onCancel, onDownload, onUpload }: Props) {
  return (
    <div className="sticky bottom-0 border-t border-line-soft bg-ink-900 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-400">
            {segmentCount} segment{segmentCount === 1 ? "" : "s"}
            {!segmentsValid && " · fix issues before splitting"}
          </span>
          <Button
            variant="secondary"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={onDownload}
            loading={busy && busyAction === "download"}
            disabled={!segmentsValid || (busy && busyAction !== "download")}
          >
            Download ZIP
          </Button>
          <Button
            leftIcon={<Upload className="h-4 w-4" />}
            rightIcon={<ArrowRight className="h-4 w-4" />}
            onClick={onUpload}
            loading={busy && busyAction === "upload"}
            disabled={!segmentsValid || (busy && busyAction !== "upload")}
          >
            Upload to evidence
          </Button>
        </div>
      </div>
    </div>
  );
}
