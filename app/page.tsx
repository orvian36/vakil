"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Case } from "@/types/case";
import { useRouter } from "next/navigation";
import { Search, Plus, Loader2 } from "lucide-react";
import { fadeUp } from "@/lib/motion";
import {
  Button,
  Input,
  ConfirmDialog,
  EmptyState,
  Shimmer,
} from "@/components/ui";
import { Spotlight } from "@/components/dashboard/Spotlight";
import { CaseTable } from "@/components/dashboard/CaseTable";
import { CreateCaseDialog } from "@/components/modals/CreateCaseDialog";
import { EditCaseDialog } from "@/components/modals/EditCaseDialog";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const userId = user?.id;

  async function fetchCases(uid: string, search?: string) {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        sort_by: "created_at",
        sort_order: "desc",
      });
      if (search) params.append("search", search);
      const response = await fetch(`/api/cases/user/${uid}?${params}`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setCases(await response.json());
    } catch (err) {
      console.error("Error fetching cases:", err);
      setCases([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId) fetchCases(userId);
  }, [userId]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (userId) fetchCases(userId, searchTerm);
    }, 500);
    return () => clearTimeout(t);
  }, [searchTerm, userId]);

  async function handleCreate(data: any) {
    const response = await fetch("/api/cases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, userId }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (userId) await fetchCases(userId, searchTerm);
  }

  async function handleUpdate(data: any) {
    if (!editingCase) return;
    const response = await fetch(`/api/cases/${editingCase.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (userId) await fetchCases(userId, searchTerm);
  }

  function requestDelete(id: string) {
    setDeletingId(id);
    setDeleteOpen(true);
  }

  async function handleDeleteConfirmed() {
    if (!deletingId) return;
    const response = await fetch(`/api/cases/${deletingId}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (userId) await fetchCases(userId, searchTerm);
    setDeletingId(null);
  }

  const spotlightCase = cases.find((c) => c.status !== "completed") ?? null;

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-400" />
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="max-w-7xl mx-auto px-6 py-10"
    >
      <div className="mb-8">
        <h1 className="text-4xl font-display text-ink-100 mb-1">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-sm text-ink-400">
          Your AI paralegal is ready. Open a case or start a new one.
        </p>
      </div>

      <div className="mb-8">
        {loading ? (
          <Shimmer className="h-32 w-full" />
        ) : (
          <Spotlight
            caseItem={spotlightCase}
            onResume={(id) => router.push(`/case/${id}`)}
            onCreate={() => setCreateOpen(true)}
          />
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search cases…"
            leadingIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <span className="text-sm text-ink-400">
          {loading ? "Loading…" : `${cases.length} cases`}
        </span>
        <div className="flex-1" />
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
          New case
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Shimmer className="h-12 w-full" />
          <Shimmer className="h-12 w-full" />
          <Shimmer className="h-12 w-full" />
        </div>
      ) : cases.length === 0 ? (
        <EmptyState
          title={searchTerm ? "No matching cases" : "No cases yet"}
          description={
            searchTerm
              ? "Try a different search term."
              : "Create your first case to start drafting."
          }
          action={
            !searchTerm && (
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                New case
              </Button>
            )
          }
        />
      ) : (
        <CaseTable
          cases={cases}
          onOpen={(id) => router.push(`/case/${id}`)}
          onEdit={(c) => {
            setEditingCase(c);
            setEditOpen(true);
          }}
          onDelete={requestDelete}
        />
      )}

      <CreateCaseDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreate} />
      <EditCaseDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditingCase(null);
        }}
        onSubmit={handleUpdate}
        caseData={editingCase as any}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setDeletingId(null);
        }}
        title="Delete this case?"
        description="This cannot be undone. All evidence, drafts, and analysis for this case will be removed."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
      />
    </motion.div>
  );
}
