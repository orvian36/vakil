"use client";

import { useEffect, useState } from "react";
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
  rangeError?: string;
  onUpdate: (patch: Partial<Segment>) => void;
  onPageRangeChange: (fromPage: number, toPage: number) => void;
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
  rangeError,
  onUpdate,
  onPageRangeChange,
  onRemove,
  onDownload,
  onFocus,
}: Props) {
  // Local draft state for the page inputs so users can type freely without
  // every keystroke firing a recompute. Commit on blur or Enter.
  const [fromDraft, setFromDraft] = useState(String(segment.fromPage));
  const [toDraft, setToDraft] = useState(String(segment.toPage));

  useEffect(() => {
    setFromDraft(String(segment.fromPage));
    setToDraft(String(segment.toPage));
  }, [segment.fromPage, segment.toPage]);

  const commitRange = (from: string, to: string) => {
    const f = Number.parseInt(from, 10);
    const t = Number.parseInt(to, 10);
    if (!Number.isFinite(f) || !Number.isFinite(t)) return;
    if (f === segment.fromPage && t === segment.toPage) return;
    onPageRangeChange(f, t);
  };

  return (
    <Card
      variant={active ? "gold-accent" : "chrome"}
      className="cursor-pointer space-y-3"
      onClick={onFocus}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-ink-400">
            Segment {index + 1}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {segment.aiConfidence !== undefined && (
            <span className="inline-flex items-center gap-1 text-xs text-gold-500">
              <Sparkles className="h-3 w-3" />
              {Math.round(segment.aiConfidence * 100)}%
            </span>
          )}
          <Button
            size="icon"
            variant="ghost"
            aria-label="Segment actions"
            onClick={(e) => e.stopPropagation()}
          >
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

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">
              From page
            </label>
            <Input
              type="number"
              min={1}
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              onBlur={() => commitRange(fromDraft, toDraft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              aria-label="From page"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">
              To page
            </label>
            <Input
              type="number"
              min={1}
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              onBlur={() => commitRange(fromDraft, toDraft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              aria-label="To page"
            />
          </div>
        </div>
        {rangeError && (
          <p className="text-xs text-rose-500">{rangeError}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
        >
          Download
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          Remove
        </Button>
      </div>
    </Card>
  );
}
