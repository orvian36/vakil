"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Textarea,
} from "@/components/ui";

type DocumentType = "particulars" | "chronology" | "document";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType;
  onConfirm: (comment: string) => Promise<void> | void;
}

const TITLES: Record<DocumentType, string> = {
  particulars: "Regenerate Particulars",
  chronology: "Regenerate Chronology",
  document: "Regenerate document",
};

const PLACEHOLDERS: Record<DocumentType, string> = {
  particulars: "Anything Vakil should keep in mind this time? (e.g., emphasise the timeline of injuries)",
  chronology: "Anything Vakil should keep in mind this time? (e.g., merge the duplicate August events)",
  document: "Anything Vakil should keep in mind this time?",
};

export function RegenerateDialog({ open, onOpenChange, documentType, onConfirm }: Props) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm(comment);
      onOpenChange(false);
      setComment("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setComment("");
      }}
    >
      <DialogContent size="md">
        <DialogTitle>{TITLES[documentType]}</DialogTitle>
        <DialogDescription>
          Vakil will redraft based on the same evidence and any extra guidance you provide.
        </DialogDescription>
        <div className="mt-4">
          <Textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={PLACEHOLDERS[documentType]}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={busy}>
            Regenerate ▸
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
