"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@/components/ui";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorDialog({
  open,
  onOpenChange,
  title = "Something went wrong",
  message,
  onRetry,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-rose-500/15 text-rose-500 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onRetry && <Button onClick={onRetry}>Retry</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
