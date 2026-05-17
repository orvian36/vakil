"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  RadioGroup,
  RadioItem,
} from "@/components/ui";
import { CaseParty } from "@/types/case";

export interface CreateCaseData {
  title: string;
  caseType: "SOC" | "DEFENCE";
  parties: CaseParty[];
  summary: string;
  court: string;
  caseNumber: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCaseData) => Promise<void> | void;
  initialData?: Partial<CreateCaseData>;
  /** When true, title becomes "Edit case" and Next/Create become Save. */
  editMode?: boolean;
}

const COURTS = [
  "District Court",
  "High Court (Court of First Instance)",
  "Court of Appeal",
  "Court of Final Appeal",
];

function parseNameInput(input: string): { englishName: string; bengaliName: string | null } {
  const match = input.match(/(.*)\((.*)\)/);
  if (match) {
    return { englishName: match[1].trim(), bengaliName: match[2].trim() };
  }
  return { englishName: input, bengaliName: null };
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function CreateCaseDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  editMode,
}: Props) {
  const [step, setStep] = useState<"A" | "B">("A");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [data, setData] = useState<CreateCaseData>({
    title: initialData?.title ?? "",
    caseType: initialData?.caseType ?? "SOC",
    parties: initialData?.parties?.map((p) => ({ ...p, id: p.id ?? makeId() })) ?? [
      { id: makeId(), name: "", bengaliName: null, role: "plaintiff", type: "person" },
      { id: makeId(), name: "", bengaliName: null, role: "defendant", type: "person" },
    ],
    summary: initialData?.summary ?? "",
    court: initialData?.court ?? "",
    caseNumber: initialData?.caseNumber ?? "",
  });

  function update<K extends keyof CreateCaseData>(key: K, value: CreateCaseData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) setErrors((prev) => ({ ...prev, [key as string]: "" }));
  }

  function addParty(role: "plaintiff" | "defendant") {
    update("parties", [
      ...data.parties,
      { id: makeId(), name: "", bengaliName: null, role, type: "person" },
    ]);
  }

  function removeParty(id: string) {
    update("parties", data.parties.filter((p) => p.id !== id));
  }

  function updatePartyName(id: string, value: string) {
    const { englishName, bengaliName } = parseNameInput(value);
    update(
      "parties",
      data.parties.map((p) => (p.id === id ? { ...p, name: englishName, bengaliName } : p)),
    );
  }

  function updatePartyType(id: string, type: "person" | "company") {
    update("parties", data.parties.map((p) => (p.id === id ? { ...p, type } : p)));
  }

  function validateA(): boolean {
    const next: Record<string, string> = {};
    if (!data.title.trim()) next.title = "Case title is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateB(): boolean {
    const next: Record<string, string> = {};
    const plaintiffs = data.parties.filter((p) => p.role === "plaintiff" && p.name.trim());
    const defendants = data.parties.filter((p) => p.role === "defendant" && p.name.trim());
    if (plaintiffs.length === 0) next.parties = "At least one plaintiff is required";
    if (defendants.length === 0) {
      next.parties = (next.parties ? next.parties + ", " : "") + "At least one defendant";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext() {
    if (validateA()) setStep("B");
  }

  async function handleSubmit() {
    if (!validateB()) return;
    setBusy(true);
    try {
      await onSubmit({
        ...data,
        parties: data.parties.filter((p) => p.name.trim()),
      });
      onOpenChange(false);
      // reset for next open
      setStep("A");
      setData({
        title: "",
        caseType: "SOC",
        parties: [
          { id: makeId(), name: "", bengaliName: null, role: "plaintiff", type: "person" },
          { id: makeId(), name: "", bengaliName: null, role: "defendant", type: "person" },
        ],
        summary: "",
        court: "",
        caseNumber: "",
      });
      setErrors({});
    } finally {
      setBusy(false);
    }
  }

  const plaintiffs = data.parties.filter((p) => p.role === "plaintiff");
  const defendants = data.parties.filter((p) => p.role === "defendant");
  const title = editMode ? "Edit case" : "Create new case";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {step === "A" ? "Step 1 of 2 · basics" : "Step 2 of 2 · parties"}
        </DialogDescription>

        {step === "A" && (
          <div className="space-y-4 mt-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink-300">Case title *</span>
              <Input
                value={data.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Enter case title"
                error={errors.title}
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-sm font-medium text-ink-300">Role</span>
              <RadioGroup
                value={data.caseType}
                onValueChange={(v) => update("caseType", v as "SOC" | "DEFENCE")}
                className="grid grid-cols-2 gap-3"
              >
                {[
                  { value: "SOC", label: "Plaintiff", hint: "Filing a claim" },
                  { value: "DEFENCE", label: "Defendant", hint: "Responding to claim" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer ${
                      data.caseType === opt.value
                        ? "border-gold-500 bg-gold-500/10"
                        : "border-line-soft hover:border-line-strong"
                    }`}
                  >
                    <RadioItem value={opt.value} />
                    <div>
                      <div className="text-sm text-ink-100 font-medium">{opt.label}</div>
                      <div className="text-xs text-ink-400">{opt.hint}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-ink-300">Court</span>
                <Select
                  value={data.court}
                  onValueChange={(v) => update("court", v)}
                >
                  <SelectTrigger aria-label="Court">
                    <SelectValue placeholder="Select a court" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURTS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-ink-300">Case number</span>
                <Input
                  value={data.caseNumber}
                  onChange={(e) => update("caseNumber", e.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink-300">Summary (optional)</span>
              <Textarea
                value={data.summary}
                onChange={(e) => update("summary", e.target.value)}
                placeholder="Key facts, dates, damages…"
                rows={3}
              />
            </label>
          </div>
        )}

        {step === "B" && (
          <div className="space-y-6 mt-4">
            {errors.parties && (
              <p className="text-sm text-rose-500">{errors.parties}</p>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-ink-300">Plaintiffs</span>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => addParty("plaintiff")}
                  type="button"
                >
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {plaintiffs.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        value={p.name + (p.bengaliName ? ` (${p.bengaliName})` : "")}
                        onChange={(e) => updatePartyName(p.id, e.target.value)}
                        placeholder="plaintiff name (বাংলা optional)"
                      />
                    </div>
                    {plaintiffs.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => removeParty(p.id)}
                        aria-label="Remove plaintiff"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-ink-300">Defendants</span>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => addParty("defendant")}
                  type="button"
                >
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {defendants.map((d) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        value={d.name + (d.bengaliName ? ` (${d.bengaliName})` : "")}
                        onChange={(e) => updatePartyName(d.id, e.target.value)}
                        placeholder="defendant name (বাংলা optional)"
                      />
                    </div>
                    <div className="w-32">
                      <Select
                        value={d.type}
                        onValueChange={(v) => updatePartyType(d.id, v as "person" | "company")}
                      >
                        <SelectTrigger aria-label="Type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="person">Person</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {defendants.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => removeParty(d.id)}
                        aria-label="Remove defendant"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "B" && (
            <Button variant="ghost" onClick={() => setStep("A")} disabled={busy}>
              Back
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          {step === "A" ? (
            <Button onClick={handleNext}>Next ▸</Button>
          ) : (
            <Button onClick={handleSubmit} loading={busy}>
              {editMode ? "Save case" : "Create case"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
