"use client";

import { useDropzone } from "react-dropzone";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  onFiles: (files: File[]) => void;
  uploading: boolean;
  disabled?: boolean;
}

export function EvidenceDropzone({ onFiles, uploading, disabled }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"], "image/*": [".jpg", ".jpeg", ".png", ".gif"] },
    onDrop: onFiles,
    disabled: disabled || uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-[var(--radius-md)] px-4 py-6 text-center transition-colors cursor-pointer",
        isDragActive
          ? "border-gold-500 bg-gold-500/10"
          : "border-line-strong bg-ink-800 hover:border-gold-500/40 hover:bg-ink-700",
        (disabled || uploading) && "opacity-50 cursor-not-allowed",
      )}
    >
      <input {...getInputProps()} />
      <div className="flex items-center justify-center gap-2 text-sm text-ink-300">
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-gold-500" />
            <span>Uploading…</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 text-ink-400" />
            <span>{isDragActive ? "Drop files here" : "Drop files or click to upload"}</span>
          </>
        )}
      </div>
    </div>
  );
}
