"use client";

import { RefreshCw, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui";

type ToolbarStatus = "saved" | "editing" | "saving" | "generating";

interface Props {
  status: ToolbarStatus;
  onRegenerate: () => void;
  onToggleEdit: () => void;
  onCancelEdit?: () => void;
  onContinue?: () => void;
  hideContinue?: boolean;
}

export function DocumentToolbar({
  status,
  onRegenerate,
  onToggleEdit,
  onCancelEdit,
  onContinue,
  hideContinue,
}: Props) {
  const busy = status === "generating" || status === "saving";
  const editing = status === "editing" || status === "saving";

  return (
    <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-line-soft bg-ink-900/95 px-6 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={onRegenerate}
            disabled={busy}
          >
            Regenerate
          </Button>
          {editing ? (
            <>
              <Button
                size="sm"
                leftIcon={<Check className="h-4 w-4" />}
                onClick={onToggleEdit}
                loading={status === "saving"}
                disabled={status === "saving"}
              >
                Save
              </Button>
              {onCancelEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<X className="h-4 w-4" />}
                  onClick={onCancelEdit}
                  disabled={status === "saving"}
                >
                  Discard
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Edit2 className="h-4 w-4" />}
              onClick={onToggleEdit}
              disabled={busy}
            >
              Edit
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-400">
            {status === "saving" && "Saving…"}
            {status === "saved" && "Saved · click Edit to revise"}
            {status === "editing" && "Editing — click Save when done"}
            {status === "generating" && "Vakil is drafting…"}
          </span>
          {!hideContinue && onContinue && status === "saved" && (
            <Button
              size="sm"
              leftIcon={<Check className="h-4 w-4" />}
              onClick={onContinue}
            >
              Looks good — continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
