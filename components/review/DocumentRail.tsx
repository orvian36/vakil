"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { DocumentRailItem } from "./DocumentRailItem";
import { DOCUMENTS, DocumentId, DocumentStatus } from "./documentTypes";

interface Props {
  statuses: Record<DocumentId, DocumentStatus>;
  activeId: DocumentId;
  onSelect: (id: DocumentId) => void;
  onRegenerateAll: () => void;
}

export function DocumentRail({ statuses, activeId, onSelect, onRegenerateAll }: Props) {
  const draftedCount = Object.values(statuses).filter((s) => s === "drafted").length;
  return (
    <aside className="w-72 shrink-0 bg-ink-900 border-r border-line-soft p-3">
      <p className="px-3 text-xs uppercase tracking-widest text-ink-400 mb-1">Drafts</p>
      <p className="px-3 text-xs text-ink-500 mb-3">
        {draftedCount} of {DOCUMENTS.length} ready
      </p>
      <div className="space-y-1">
        {DOCUMENTS.map((d) => (
          <DocumentRailItem
            key={d.id}
            label={d.label}
            status={statuses[d.id as DocumentId] ?? "pending"}
            active={d.id === activeId}
            onSelect={() => onSelect(d.id as DocumentId)}
          />
        ))}
      </div>
      <div className="border-t border-line-soft mt-3 pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={onRegenerateAll}
        >
          Regenerate all
        </Button>
      </div>
    </aside>
  );
}
