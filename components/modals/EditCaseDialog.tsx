"use client";

import { CreateCaseDialog, type CreateCaseData } from "./CreateCaseDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCaseData) => Promise<void> | void;
  caseData: Partial<CreateCaseData> | null;
}

export function EditCaseDialog({ open, onOpenChange, onSubmit, caseData }: Props) {
  return (
    <CreateCaseDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      initialData={caseData ?? {}}
      editMode
    />
  );
}
