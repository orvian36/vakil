"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Input, Textarea } from "@/components/ui";

interface Props {
  onCreate: (title: string, description: string) => Promise<void>;
}

export function AddCustomTypeRow({ onCreate }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onCreate(title.trim(), description.trim());
      setTitle("");
      setDescription("");
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <Button variant="ghost" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing(true)}>
        Add custom evidence type
      </Button>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-line-gold bg-ink-800 p-3 space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Type title" />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={save} loading={busy} disabled={!title.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}
