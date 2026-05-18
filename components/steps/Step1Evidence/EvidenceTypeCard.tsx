"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { CaseFile, CaseEvidenceType } from "@/types/case";
import { cn } from "@/lib/utils/cn";
import { EvidenceDropzone } from "./EvidenceDropzone";
import { EvidenceFileRow } from "./EvidenceFileRow";

interface Props {
  type: CaseEvidenceType;
  files: CaseFile[];
  uploading: boolean;
  expanded: boolean;
  onToggle: () => void;
  onUpload: (files: File[]) => void;
  onDelete: (fileId: string) => Promise<void>;
}

export function EvidenceTypeCard({
  type,
  files,
  uploading,
  expanded,
  onToggle,
  onUpload,
  onDelete,
}: Props) {
  const count = files.length;
  return (
    <Card variant={expanded ? "chrome-raised" : "chrome"} className={cn(expanded && "md:col-span-2 lg:col-span-3")}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-ink-100">{type.title || "Untitled"}</h3>
          {type.description && (
            <p className="text-xs text-ink-400 mt-1 line-clamp-2">{type.description}</p>
          )}
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-gold-500" />
            ))}
            <span className="ml-1.5 text-xs text-ink-400">
              {count === 0 ? "no files" : `${count} file${count === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-ink-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-ink-400 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-line-soft pt-4">
          <EvidenceDropzone onFiles={onUpload} uploading={uploading} />
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f) => (
                <EvidenceFileRow key={f.id} file={f} onDelete={onDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
