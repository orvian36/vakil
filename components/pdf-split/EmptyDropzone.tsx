"use client";

import { useDropzone } from "react-dropzone";
import { FileText, Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  onFile: (file: File) => void;
  busy: boolean;
}

export function EmptyDropzone({ onFile, busy }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    onDrop: (accepted) => accepted[0] && onFile(accepted[0]),
    disabled: busy,
  });

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-6">
      <div
        {...getRootProps()}
        className={cn(
          "max-w-xl w-full rounded-[var(--radius-xl)] border-2 border-dashed bg-ink-900 px-8 py-16 text-center transition-colors cursor-pointer",
          isDragActive ? "border-gold-500 bg-gold-500/5" : "border-line-strong hover:border-gold-500/40",
          busy && "opacity-50 cursor-not-allowed",
        )}
      >
        <input {...getInputProps()} />
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/15 text-gold-500 mb-4">
          <FileText className="h-6 w-6" />
        </span>
        <h2 className="text-2xl font-display text-ink-100 mb-2">Choose a PDF to split</h2>
        <p className="text-sm text-ink-400 mb-6">
          Vakil will read the document and suggest segment boundaries automatically.
        </p>
        <div className="inline-flex items-center gap-2 text-sm text-gold-500">
          <Upload className="h-4 w-4" />
          {isDragActive ? "Drop your PDF here" : "Drop your PDF or click to browse"}
        </div>
        <p className="text-xs text-ink-500 mt-6">Maximum file size: 200 MB · PDF only</p>
      </div>
    </div>
  );
}
