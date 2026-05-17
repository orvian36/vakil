"use client";

import { Edit, Trash2 } from "lucide-react";
import { Case } from "@/types/case";
import { StatusPill, type Status } from "@/components/ui";

function statusFromCase(c: Case): Status {
  switch (c.status) {
    case "completed":
      return "complete";
    case "processing":
      return "processing";
    case "draft":
    default:
      return "draft";
  }
}

function typeLabel(t: string): string {
  return t === "DEFENCE" ? "Defence" : "Claim";
}

function relTime(d: any): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

interface RowProps {
  caseItem: Case;
  onOpen: (id: string) => void;
  onEdit: (c: Case) => void;
  onDelete: (id: string) => void;
}

export function CaseTableRow({ caseItem, onOpen, onEdit, onDelete }: RowProps) {
  return (
    <tr
      onClick={() => onOpen(caseItem.id)}
      className="group cursor-pointer border-b border-line-soft hover:bg-ink-800/60 transition-colors"
    >
      <td className="px-4 py-3.5 text-sm text-ink-100 group-hover:text-gold-500 transition-colors max-w-md truncate">
        {caseItem.title}
      </td>
      <td className="px-4 py-3.5 text-sm text-ink-400">{typeLabel(caseItem.caseType)}</td>
      <td className="px-4 py-3.5">
        <StatusPill status={statusFromCase(caseItem)} />
      </td>
      <td className="px-4 py-3.5 text-xs text-ink-400">
        {relTime((caseItem as any).updatedAt)}
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(caseItem);
            }}
            className="p-1.5 rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-700 focus-gold"
            title="Edit case"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(caseItem.id);
            }}
            className="p-1.5 rounded-md text-ink-400 hover:text-rose-500 hover:bg-ink-700 focus-gold"
            title="Delete case"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
