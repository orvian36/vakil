"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { CaseFile, CaseEvidenceType } from "@/types/case";
import { cn } from "@/lib/utils/cn";
import { EvidenceDropzone } from "./EvidenceDropzone";
import { EvidenceFileRow } from "./EvidenceFileRow";

interface Props {
  type: CaseEvidenceType;
  files: CaseFile[];
  uploading: boolean;
  expanded: boolean;
  showSuccess?: boolean;
  onToggle: () => void;
  onUpload: (files: File[]) => void;
  onDelete: (fileId: string) => Promise<void>;
  onRename?: (typeId: string, title: string, description: string) => Promise<void>;
}

export function EvidenceTypeCard({
  type,
  files,
  uploading,
  expanded,
  showSuccess,
  onToggle,
  onUpload,
  onDelete,
  onRename,
}: Props) {
  const count = files.length;
  const canEdit = !type.isDefault && Boolean(onRename);

  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(type.title ?? "");
  const [descDraft, setDescDraft] = useState(type.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTitleDraft(type.title ?? "");
    setDescDraft(type.description ?? "");
    setSaveError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setSaveError(null);
  };

  const save = async () => {
    if (!onRename) return;
    if (!titleDraft.trim()) {
      setSaveError("Title is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onRename(type.id, titleDraft.trim(), descDraft.trim());
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      variant={expanded ? "chrome-raised" : "chrome"}
      className={cn(expanded && "md:col-span-2 lg:col-span-3")}
    >
      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-start justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            {editing ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <div>
                  <label htmlFor={`et-title-${type.id}`} className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">
                    Title
                  </label>
                  <Input
                    id={`et-title-${type.id}`}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        save();
                      } else if (e.key === "Escape") {
                        cancel();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor={`et-desc-${type.id}`} className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">
                    Description
                  </label>
                  <Textarea
                    id={`et-desc-${type.id}`}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancel();
                    }}
                    rows={2}
                  />
                </div>
                {saveError && (
                  <p className="text-xs text-rose-500">{saveError}</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={save} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-medium text-ink-100">
                  {type.title || "Untitled"}
                </h3>
                {type.description && (
                  <p className="text-xs text-ink-400 mt-1 line-clamp-2">
                    {type.description}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-1">
                  {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                  ))}
                  <span className="ml-1.5 text-xs text-ink-400">
                    {count === 0 ? "no files" : `${count} file${count === 1 ? "" : "s"}`}
                  </span>
                  {showSuccess && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-gold-500 font-medium">
                      ✓ Uploaded
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          {!editing &&
            (expanded ? (
              <ChevronUp className="h-4 w-4 text-ink-400 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-ink-400 shrink-0" />
            ))}
        </button>

        {canEdit && !editing && (
          <Button
            size="icon"
            variant="ghost"
            aria-label="Edit type"
            onClick={startEdit}
            className="absolute right-7 top-0"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {expanded && !editing && (
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
