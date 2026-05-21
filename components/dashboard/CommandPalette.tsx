"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, LogOut, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  Input,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";

export type PaletteAction = "new-case" | "logout";

interface CaseHit {
  id: string;
  title: string;
  court?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  onSelectCase: (caseId: string) => void;
  onAction: (action: PaletteAction) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  userId,
  onSelectCase,
  onAction,
}: Props) {
  const [query, setQuery] = useState("");
  const [cases, setCases] = useState<CaseHit[]>([]);
  const [loading, setLoading] = useState(false);

  const actions = useMemo(
    () =>
      [
        { id: "new-case" as PaletteAction, label: "New case", icon: Plus },
        { id: "logout"  as PaletteAction, label: "Logout",    icon: LogOut },
      ],
    [],
  );

  useEffect(() => {
    if (!open || !userId) return;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "20",
          sort_by: "created_at",
          sort_order: "desc",
        });
        if (query) params.append("search", query);
        const r = await fetch(`/api/cases/user/${userId}?${params}`, {
          credentials: "include",
        });
        if (r.ok) {
          const data = (await r.json()) as CaseHit[];
          setCases(data);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [open, userId, query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="p-0 overflow-hidden">
        <div className="p-3 border-b border-line-soft">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases or run an action…"
            leadingIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="max-h-96 overflow-y-auto">
          <section>
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-ink-400">
              Cases {loading && "· loading…"}
            </div>
            {cases.length === 0 && !loading ? (
              <div className="px-3 py-4 text-sm text-ink-400">
                {query ? "No matching cases." : "Type to search."}
              </div>
            ) : (
              <ul>
                {cases.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelectCase(c.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left text-sm",
                        "hover:bg-ink-800 focus-gold",
                      )}
                    >
                      <FileText className="h-4 w-4 text-ink-400 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-ink-100">
                        {c.title}
                      </span>
                      {c.court && (
                        <span className="text-xs text-ink-400">{c.court}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="border-t border-line-soft">
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-ink-400">
              Actions
            </div>
            <ul>
              {actions.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onAction(a.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left text-sm",
                        "hover:bg-ink-800 focus-gold",
                      )}
                    >
                      <Icon className="h-4 w-4 text-ink-400" />
                      <span className="text-ink-100">{a.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
