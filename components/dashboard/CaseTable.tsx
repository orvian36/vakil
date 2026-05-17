"use client";

import { Case } from "@/types/case";
import { CaseTableRow } from "./CaseTableRow";

interface CaseTableProps {
  cases: Case[];
  onOpen: (id: string) => void;
  onEdit: (c: Case) => void;
  onDelete: (id: string) => void;
}

export function CaseTable({ cases, onOpen, onEdit, onDelete }: CaseTableProps) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-ink-900 border border-line-soft overflow-hidden">
      <table className="w-full">
        <thead className="bg-ink-800/60">
          <tr className="text-left text-xs uppercase tracking-widest text-ink-400">
            <th className="px-4 py-3 font-medium">Case</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Edited</th>
            <th className="px-4 py-3 font-medium w-32" />
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <CaseTableRow
              key={c.id}
              caseItem={c}
              onOpen={onOpen}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
