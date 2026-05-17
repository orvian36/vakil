"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./Dialog";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = React.useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            onClick={handleConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
