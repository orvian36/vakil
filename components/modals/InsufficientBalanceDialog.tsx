"use client";

import { CircleDollarSign } from "lucide-react";
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
  onTopUp: () => void;
}

export function InsufficientBalanceDialog({ open, onOpenChange, onTopUp }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-gold-500/15 text-gold-500 shrink-0">
            <CircleDollarSign className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle>Insufficient balance</DialogTitle>
            <DialogDescription>
              You do not have enough tokens to upload more files. Top up your account to continue.
            </DialogDescription>
          </div>
        </div>
        <div className="mt-4 rounded-[var(--radius-md)] border border-gold-500/30 bg-gold-500/10 p-3 text-xs text-gold-500">
          Need more tokens? Visit your account settings to purchase additional tokens.
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onTopUp}>Top up account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
