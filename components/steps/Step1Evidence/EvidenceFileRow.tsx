"use client";

import { useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { ConfirmDialog, Button } from "@/components/ui";
import { CaseFile } from "@/types/case";

interface Props {
  file: CaseFile;
  onDelete: (fileId: string) => Promise<void>;
}

export function EvidenceFileRow({ file, onDelete }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-ink-800 border border-line-soft px-3 py-2 text-sm text-ink-300">
      <FileText className="h-4 w-4 text-ink-400 shrink-0" />
      <span className="flex-1 truncate" title={file.fileName}>
        {file.fileName}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setConfirmOpen(true)}
        aria-label="Delete file"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this file?"
        description="The file will be removed from this case. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => onDelete(file.id)}
      />
    </div>
  );
}
