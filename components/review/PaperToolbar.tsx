"use client";

import { RefreshCw, Download, Copy, PanelRight } from "lucide-react";
import { Button, Switch } from "@/components/ui";

interface Props {
  documentLabel: string;
  status: "pending" | "generating" | "drafted" | "failed";
  onRegenerate: () => void;
  onDownload: () => void;
  onCopy: () => void;
  /** Witness only: render En ⌁ বাংলা toggle. */
  bengaliMode?: boolean;
  onBengaliToggle?: (next: boolean) => void;
  isRailOpen?: boolean;
  onToggleRail?: () => void;
}

export function PaperToolbar({
  documentLabel,
  status,
  onRegenerate,
  onDownload,
  onCopy,
  bengaliMode,
  onBengaliToggle,
  isRailOpen,
  onToggleRail,
}: Props) {
  const busy = status === "generating";
  return (
    <div className="sticky top-0 z-20 px-6 py-4 bg-ink-900/95 backdrop-blur border-b border-line-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-sm font-medium text-ink-100 truncate">{documentLabel}</h3>
          <span className="text-xs text-ink-400 shrink-0">
            {status === "drafted" && "Drafted"}
            {status === "generating" && "Generating…"}
            {status === "failed" && "Failed"}
            {status === "pending" && "Queued"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onBengaliToggle && (
            <label className="flex items-center gap-2 text-xs text-ink-300">
              <span>En</span>
              <Switch checked={!!bengaliMode} onCheckedChange={onBengaliToggle} aria-label="English to Bengali" />
              <span>বাংলা</span>
            </label>
          )}
          <Button size="sm" variant="ghost" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={onRegenerate} disabled={busy}>
            Regenerate
          </Button>
          <Button size="sm" variant="ghost" leftIcon={<Copy className="h-4 w-4" />} onClick={onCopy} disabled={busy}>
            Copy
          </Button>
          <Button size="sm" variant="ghost" leftIcon={<Download className="h-4 w-4" />} onClick={onDownload} disabled={busy}>
            DOCX
          </Button>
          {onToggleRail && (
            <div className="pl-2 ml-2 border-l border-line-soft flex items-center">
              <Button
                size="sm"
                variant="ghost"
                className={`p-2 transition-colors ${!isRailOpen ? 'text-gold-500 bg-gold-500/10' : 'text-ink-400 hover:text-ink-100'}`}
                onClick={onToggleRail}
                aria-label="Toggle sidebar"
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
