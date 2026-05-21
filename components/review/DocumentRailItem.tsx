"use client";

import { motion } from "framer-motion";
import { Scale, User, FileText, DollarSign, Mail } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DocumentStatus, DocumentId } from "./documentTypes";

interface Props {
  id?: DocumentId | string;
  label: string;
  status: DocumentStatus;
  active: boolean;
  isOpen?: boolean;
  onSelect: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  "writ-of-summons": Scale,
  "witness-statement": User,
  "statement-of-claim": FileText,
  "statement-of-damages": DollarSign,
  "pre-action-letter": Mail,
};

export function DocumentRailItem({ id, label, status, active, isOpen = true, onSelect }: Props) {
  const Icon = id ? ICON_MAP[id as string] || FileText : FileText;

  let iconColor = "text-ink-400";
  let iconAnimation = "";
  if (status === "drafted") iconColor = "text-gold-500";
  if (status === "generating") {
    iconColor = "text-gold-500";
    iconAnimation = "animate-pulse";
  }
  if (status === "failed") iconColor = "text-rose-500";
  if (status === "pending") iconColor = "text-ink-500 opacity-50";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full flex items-start py-2.5 rounded-[var(--radius-md)] text-left transition-colors overflow-hidden",
        isOpen ? "px-3 gap-3" : "px-0 justify-center",
        active ? "bg-ink-800" : "hover:bg-ink-800/60",
      )}
    >
      {active && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gold-500" />}
      <span className={cn("shrink-0", isOpen ? "mt-0.5" : "mt-0")}>
        <Icon className={cn("h-4 w-4", iconColor, iconAnimation)} />
      </span>
      <motion.span
        initial={false}
        animate={{ width: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        className="min-w-0 flex flex-col whitespace-nowrap overflow-hidden"
      >
        <span className={cn("block text-sm font-medium", active ? "text-ink-100" : "text-ink-300")}>{label}</span>
        <span className="block text-xs text-ink-400 mt-0.5">
          {status === "drafted" && "Drafted"}
          {status === "generating" && "Generating…"}
          {status === "failed" && "Retry"}
          {status === "pending" && "Queued"}
        </span>
      </motion.span>
    </button>
  );
}
