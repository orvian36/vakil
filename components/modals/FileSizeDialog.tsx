"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@/components/ui";

interface OversizedFile {
  name: string;
  size: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: OversizedFile[];
}

export function FileSizeDialog({ open, onOpenChange, files }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-rose-500/15 text-rose-500 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle>File too large</DialogTitle>
            <DialogDescription>
              The following file{files.length === 1 ? "" : "s"} exceed the 100 MB limit and cannot be uploaded:
            </DialogDescription>
          </div>
        </div>
        <ul className="mt-4 rounded-[var(--radius-md)] border border-rose-500/30 bg-rose-500/10 p-3 space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-start justify-between gap-2 text-sm text-rose-500">
              <span className="break-all flex-1">• {f.name}</span>
              <span className="text-xs text-rose-500/80">
                {(f.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-400">
          Try splitting these PDFs with the AI splitter or compressing them before re-uploading.
        </p>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
