"use client";
import { useAuth } from "@/hooks/useAuth";
import { Case } from "@/types/case";
import { useEffect, useState } from "react";
import { Search, Plus, Trash2, FileText, Edit, Loader2 } from "lucide-react";
import CreateCaseModal from "@/components/CreateCaseModal";
import EditCaseModal from "@/components/EditCaseModal";
import { useRouter } from "next/navigation";

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-[var(--color-ink-950)]/10 text-[var(--color-ink-800)]",
    processing: "bg-[var(--color-saffron-500)]/15 text-[var(--color-saffron-600)]",
    completed: "bg-[var(--color-emerald-500)]/15 text-[var(--color-emerald-500)]",
    failed: "bg-[var(--color-rose-500)]/15 text-[var(--color-rose-500)]",
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`text-xs px-2 py-1 rounded-[var(--radius-chip)] ${map[status] ?? map.draft}`}>
      {label}
    </span>
  );
}

function CaseCard({
  caseItem,
  onOpen,
  onEdit,
  onDelete,
}: {
  caseItem: Case;
  onOpen: (id: string) => void;
  onEdit: (c: Case) => void;
  onDelete: (id: string) => void;
}) {
  const plaintiffs = caseItem.parties
    .filter((p) => p.role === "plaintiff")
    .map((p) => p.name)
    .join(", ");
  const defendants = caseItem.parties
    .filter((p) => p.role === "defendant")
    .map((p) => p.name)
    .join(", ");
  return (
    <article
      onClick={() => onOpen(caseItem.id)}
      className="cursor-pointer group rounded-[var(--radius-card)] bg-[var(--color-cream-100)] border border-[var(--color-line)] p-5 hover:border-[var(--color-line-strong)] transition"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-lg font-medium leading-snug">{caseItem.title}</h3>
        <StatusChip status={caseItem.status ?? "draft"} />
      </div>
      <p className="text-sm text-[var(--color-ink-500)] mb-4 line-clamp-2">
        {caseItem.summary || "No summary."}
      </p>
      <dl className="text-sm space-y-1 text-[var(--color-ink-700)] mb-4">
        <div>
          <dt className="inline text-[var(--color-ink-500)]">Plaintiffs:</dt>{" "}
          <dd className="inline">{plaintiffs || "—"}</dd>
        </div>
        <div>
          <dt className="inline text-[var(--color-ink-500)]">Defendants:</dt>{" "}
          <dd className="inline">{defendants || "—"}</dd>
        </div>
      </dl>
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-line)]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(caseItem);
          }}
          className="p-1.5 rounded-md hover:bg-[var(--color-cream-200)] text-[var(--color-ink-500)] hover:text-[var(--color-ink-950)]"
          title="Edit case"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(caseItem.id);
          }}
          className="p-1.5 rounded-md hover:bg-[var(--color-rose-500)]/10 text-[var(--color-ink-500)] hover:text-[var(--color-rose-500)]"
          title="Delete case"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
}

function EmptyState({ onCreate, hasSearch }: { onCreate: () => void; hasSearch: boolean }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--color-cream-100)] border border-[var(--color-line)] p-12 text-center">
      <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--color-ink-300)]" />
      <h3 className="text-lg font-medium mb-1">
        {hasSearch ? "No matching cases" : "No cases yet"}
      </h3>
      <p className="text-sm text-[var(--color-ink-500)] mb-6">
        {hasSearch
          ? "Try a different search term."
          : "Create your first case to start drafting."}
      </p>
      {!hasSearch && (
        <button
          onClick={onCreate}
          className="bg-[var(--color-saffron-500)] hover:bg-[var(--color-saffron-600)] text-[var(--color-ink-950)] font-medium px-4 py-2 rounded-[var(--radius-button)]"
        >
          + New case
        </button>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-[var(--radius-card)] bg-[var(--color-cream-100)] border border-[var(--color-line)] p-5 animate-pulse"
        >
          <div className="h-5 bg-[var(--color-cream-200)] rounded w-3/4 mb-3" />
          <div className="h-4 bg-[var(--color-cream-200)] rounded w-full mb-2" />
          <div className="h-4 bg-[var(--color-cream-200)] rounded w-5/6" />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const userId = user?.id;

  const fetchCases = async (userId: string, search?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        sort_by: "created_at",
        sort_order: "desc",
      });
      if (search) params.append("search", search);

      const response = await fetch(`/api/cases/user/${userId}?${params}`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: Case[] = await response.json();
      setCases(data);
    } catch (err) {
      console.error("Error fetching cases:", err);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchCases(userId);
  }, [userId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userId) fetchCases(userId, searchTerm);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, userId]);

  const handleCreateCase = async (caseData: any) => {
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: caseData.title,
          caseType: caseData.caseType,
          summary: caseData.summary || "",
          parties: caseData.parties,
          court: caseData.court || "",
          caseNumber: caseData.caseNumber || "",
          userId,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (userId) await fetchCases(userId, searchTerm);
    } catch (err) {
      console.error("Error creating case:", err);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!window.confirm("Delete this case? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (userId) await fetchCases(userId, searchTerm);
    } catch (err) {
      console.error("Error deleting case:", err);
    }
  };

  const handleViewCase = (caseId: string) => router.push(`/case/${caseId}`);

  const handleEditCase = (caseItem: Case) => {
    setEditingCase(caseItem);
    setIsEditModalOpen(true);
  };

  const handleUpdateCase = async (caseData: any) => {
    if (!editingCase) return;
    try {
      const response = await fetch(`/api/cases/${editingCase.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: caseData.title,
          caseType: caseData.caseType,
          summary: caseData.summary || "",
          parties: caseData.parties,
          court: caseData.court || "",
          caseNumber: caseData.caseNumber || "",
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (userId) await fetchCases(userId, searchTerm);
    } catch (err) {
      console.error("Error updating case:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-ink-500)]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <section className="rounded-[var(--radius-card)] bg-[var(--color-cream-100)] border border-[var(--color-line)] p-8 mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl mb-1">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
          </h1>
          <p className="text-[var(--color-ink-500)]">
            Your AI paralegal is ready. Open a case or start a new one.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="self-start bg-[var(--color-saffron-500)] hover:bg-[var(--color-saffron-600)] text-[var(--color-ink-950)] font-medium px-4 py-2.5 rounded-[var(--radius-button)] focus-saffron whitespace-nowrap"
        >
          + New case
        </button>
      </section>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-300)] pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search cases…"
            className="focus-saffron w-full bg-white border border-[var(--color-line)] rounded-[var(--radius-button)] pl-9 pr-3 py-2 text-[var(--color-ink-950)]"
          />
        </div>
        <span className="text-sm text-[var(--color-ink-500)]">
          {loading ? "Loading…" : `${cases.length} cases`}
        </span>
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : cases.length === 0 ? (
        <EmptyState
          onCreate={() => setIsCreateModalOpen(true)}
          hasSearch={Boolean(searchTerm)}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <CaseCard
              key={c.id}
              caseItem={c}
              onOpen={handleViewCase}
              onEdit={handleEditCase}
              onDelete={handleDeleteCase}
            />
          ))}
        </div>
      )}

      <CreateCaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCase}
      />
      <EditCaseModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCase(null);
        }}
        onSubmit={handleUpdateCase}
        caseData={editingCase}
      />
    </div>
  );
}
