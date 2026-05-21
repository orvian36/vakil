"use client";

import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { DocumentRailItem } from "./DocumentRailItem";
import { DOCUMENTS, DocumentId, DocumentStatus } from "./documentTypes";

interface Props {
  isOpen?: boolean;
  statuses: Record<DocumentId, DocumentStatus>;
  activeId: DocumentId;
  onSelect: (id: DocumentId) => void;
  onRegenerateAll: () => void;
}

export function DocumentRail({ isOpen = true, statuses, activeId, onSelect, onRegenerateAll }: Props) {
  const draftedCount = Object.values(statuses).filter((s) => s === "drafted").length;
  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 288 : 64, borderLeftWidth: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="shrink-0 bg-ink-900 border-line-soft overflow-hidden flex flex-col h-full"
    >
      <div className="w-full p-3 flex flex-col h-full">
        <motion.div animate={{ opacity: isOpen ? 1 : 0, height: isOpen ? "auto" : 0 }} className="overflow-hidden">
          <p className="px-3 text-xs uppercase tracking-widest text-ink-400 mb-1 whitespace-nowrap">Drafts</p>
          <p className="px-3 text-xs text-ink-500 mb-3 whitespace-nowrap">
            {draftedCount} of {DOCUMENTS.length} ready
          </p>
        </motion.div>
        
        <div className="space-y-1">
          {DOCUMENTS.map((d) => (
            <DocumentRailItem
              key={d.id}
              id={d.id}
              label={d.label}
              status={statuses[d.id as DocumentId] ?? "pending"}
              active={d.id === activeId}
              isOpen={isOpen}
              onSelect={() => onSelect(d.id as DocumentId)}
            />
          ))}
        </div>
        <div className="border-t border-line-soft mt-3 pt-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full transition-all overflow-hidden", isOpen ? "justify-start" : "justify-center px-0")}
            leftIcon={<RefreshCw className="h-4 w-4 shrink-0" />}
            onClick={onRegenerateAll}
            title="Regenerate all"
          >
            <motion.span animate={{ width: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }} className="whitespace-nowrap overflow-hidden">
              Regenerate all
            </motion.span>
          </Button>
        </div>
      </div>
    </motion.aside>
  );
}
