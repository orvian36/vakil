"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { SegmentRow } from "./SegmentRow";
import { Segment } from "./types";
import { CaseEvidenceType } from "@/types/case";

interface Props {
  segments: Segment[];
  activeSegmentId: string | null;
  evidenceTypes: CaseEvidenceType[];
  onUpdate: (id: string, patch: Partial<Segment>) => void;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onFocus: (id: string) => void;
  onAdd: () => void;
}

export function SegmentRail({
  segments,
  activeSegmentId,
  evidenceTypes,
  onUpdate,
  onRemove,
  onDownload,
  onFocus,
  onAdd,
}: Props) {
  const duplicateNames = new Map<string, number>();
  segments.forEach((s) => {
    if (s.name.trim()) {
      duplicateNames.set(s.name.trim(), (duplicateNames.get(s.name.trim()) ?? 0) + 1);
    }
  });

  return (
    <aside className="w-[360px] shrink-0 bg-ink-900 border-l border-line-soft p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-ink-400">
          {segments.length} segment{segments.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" variant="ghost" leftIcon={<Plus className="h-4 w-4" />} onClick={onAdd}>
          Add
        </Button>
      </div>
      <div className="space-y-3">
        {segments.map((s, i) => (
          <SegmentRow
            key={s.id}
            segment={s}
            index={i}
            active={s.id === activeSegmentId}
            evidenceTypes={evidenceTypes}
            duplicateName={(duplicateNames.get(s.name.trim()) ?? 0) > 1}
            onUpdate={(patch) => onUpdate(s.id, patch)}
            onRemove={() => onRemove(s.id)}
            onDownload={() => onDownload(s.id)}
            onFocus={() => onFocus(s.id)}
          />
        ))}
      </div>
    </aside>
  );
}
