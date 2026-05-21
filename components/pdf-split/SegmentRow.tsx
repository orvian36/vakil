"use client";

import { MoreHorizontal, Sparkles } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { CaseEvidenceType } from "@/types/case";
import { Segment } from "./types";

interface Props {
  segment: Segment;
  index: number;
  active: boolean;
  evidenceTypes: CaseEvidenceType[];
  duplicateName: boolean;
  onUpdate: (patch: Partial<Segment>) => void;
  onRemove: () => void;
  onDownload: () => void;
  onFocus: () => void;
}

export function SegmentRow({
  segment,
  index,
  active,
  evidenceTypes,
  duplicateName,
  onUpdate,
  onRemove,
  onDownload,
  onFocus,
}: Props) {
  return (
    <Card
      variant={active ? "gold-accent" : "chrome"}
      className="cursor-pointer space-y-3"
      onClick={onFocus}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-ink-400">Segment {index + 1}</p>
          <p className="text-xs text-ink-500 mt-0.5">
            Pages {segment.fromPage}–{segment.toPage}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {segment.aiConfidence !== undefined && (
            <span className="inline-flex items-center gap-1 text-xs text-gold-500">
              <Sparkles className="h-3 w-3" />
              {Math.round(segment.aiConfidence * 100)}%
            </span>
          )}
          <Button size="icon" variant="ghost" aria-label="Segment actions" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <Input
          value={segment.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Document name"
          error={duplicateName ? "Name must be unique" : undefined}
        />
        <Select
          value={segment.category}
          onValueChange={(v) => onUpdate({ category: v })}
        >
          <SelectTrigger aria-label="Category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {evidenceTypes.map((t) => (
              <SelectItem key={t.key} value={t.key}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDownload(); }}>
          Download
        </Button>
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          Remove
        </Button>
      </div>
    </Card>
  );
}
