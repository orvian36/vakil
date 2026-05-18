"use client";

import { useState, useEffect, useRef } from "react";
import { Scissors } from "lucide-react";
import { Case, CaseFile, CaseEvidenceType } from "@/types/case";
import PdfSplitDrawer from "@/components/PdfSplitDrawer";
import { FileSizeDialog } from "@/components/modals/FileSizeDialog";
import { InsufficientBalanceDialog } from "@/components/modals/InsufficientBalanceDialog";
import { SectionHeader, Button, Shimmer, EmptyState } from "@/components/ui";
import { EvidenceTypeCard } from "./EvidenceTypeCard";
import { AddCustomTypeRow } from "./AddCustomTypeRow";

interface OversizedFile {
  name: string;
  size: number;
}

export default function Step1Evidence({
  caseData,
  onPendingUploadsChange,
}: {
  caseData: Case;
  onPendingUploadsChange?: (hasPending: boolean) => void;
}) {
  const [editableItems, setEditableItems] = useState<CaseEvidenceType[]>([]);
  const [evidenceData, setEvidenceData] = useState<
    Record<
      string,
      { files: File[]; uploading: boolean; uploadedFiles: CaseFile[]; showSuccess: boolean }
    >
  >({});
  const [isLoadingEvidenceTypes, setIsLoadingEvidenceTypes] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showFileSizeDialog, setShowFileSizeDialog] = useState(false);
  const [oversizedFiles, setOversizedFiles] = useState<OversizedFile[]>([]);
  const [showInsufficientBalanceDialog, setShowInsufficientBalanceDialog] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Keep hasPendingUploads as ref so effect below can fire without stale closures
  const [hasPendingUploads, setHasPendingUploads] = useState(false);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ── Fetch evidence types ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchEvidenceTypes = async () => {
      try {
        setIsLoadingEvidenceTypes(true);
        const response = await fetch(`/api/cases/${caseData.id}/evidence-types`);

        if (!response.ok) {
          throw new Error("Failed to fetch evidence types");
        }

        const result = await response.json();

        if (result.success && result.data) {
          setEditableItems(result.data);

          // Initialize evidenceData for each evidence type
          const initialEvidenceData: Record<
            string,
            { files: File[]; uploading: boolean; uploadedFiles: CaseFile[]; showSuccess: boolean }
          > = result.data.reduce(
            (acc: Record<string, unknown>, item: CaseEvidenceType) => ({
              ...acc,
              [item.key]: {
                files: [],
                uploading: false,
                uploadedFiles: [],
                showSuccess: false,
              },
            }),
            {},
          );

          // Populate uploadedFiles from caseData.files
          caseData.files?.forEach((file) => {
            if (initialEvidenceData[file.type]) {
              (
                initialEvidenceData[file.type] as {
                  uploadedFiles: CaseFile[];
                }
              ).uploadedFiles.push(file);
            }
          });

          setEvidenceData(
            initialEvidenceData as Record<
              string,
              { files: File[]; uploading: boolean; uploadedFiles: CaseFile[]; showSuccess: boolean }
            >,
          );
        }
      } catch (error) {
        console.error("Error fetching evidence types:", error);
        setEditableItems([]);
      } finally {
        setIsLoadingEvidenceTypes(false);
      }
    };

    if (caseData.id) {
      fetchEvidenceTypes();
    }
  }, [caseData.id]);

  // ── Pending-uploads side-effect ───────────────────────────────────────────
  useEffect(() => {
    const hasPending = Object.values(evidenceData).some((item) => item.uploading);
    setHasPendingUploads(hasPending);
    onPendingUploadsChange?.(hasPending);
  }, [evidenceData]);

  // ── updateEvidenceItem ────────────────────────────────────────────────────
  const updateEvidenceItem = (
    key: string,
    field: "files" | "uploading" | "uploadedFiles" | "showSuccess",
    value: File[] | CaseFile[] | boolean,
  ) => {
    setEvidenceData((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {
          files: [],
          uploading: false,
          uploadedFiles: [],
          showSuccess: false,
        }),
        [field]: value,
      },
    }));
  };

  // ── uploadFile (single file) ──────────────────────────────────────────────
  const uploadFile = async (evidenceType: string, file: File) => {
    const formData = new FormData();
    formData.append("files", file);
    formData.append("caseId", caseData.id);
    formData.append("evidenceType", evidenceType);

    const response = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Upload failed: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      return {
        data: {
          id: result.data.fileId,
          type: evidenceType,
          fileName: result.data.fileName,
          fileKey: result.data.fileKey,
        },
      };
    }

    throw new Error("No files were uploaded");
  };

  // ── Core upload flow (shared by drop and file-input paths) ────────────────
  const runUploadFlow = async (key: string, fileArray: File[]) => {
    // Pre-check: file sizes
    const maxFileSize = 100 * 1024 * 1024; // 100 MB
    const tooLarge = fileArray.filter((f) => f.size > maxFileSize);
    if (tooLarge.length > 0) {
      setOversizedFiles(tooLarge.map((f) => ({ name: f.name, size: f.size })));
      setShowFileSizeDialog(true);
      return;
    }

    // Pre-check: token balance
    try {
      const verifyTokenResponse = await fetch("/api/tokens/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateTokens: 1 }),
      });
      const result = await verifyTokenResponse.json();
      console.log("verifyTokenResponse", result);
      if (!result.is_enough_balance) {
        setShowInsufficientBalanceDialog(true);
        return;
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      alert("Failed to verify token balance. Please try again.");
      return;
    }

    // Update UI immediately
    updateEvidenceItem(key, "files", fileArray);
    updateEvidenceItem(key, "uploading", true);

    try {
      const uploadedFiles = [];
      for (const file of fileArray) {
        const result = await uploadFile(key, file);
        uploadedFiles.push(result.data);
      }

      // Append to existing uploaded files
      const currentUploadedFiles = evidenceData[key]?.uploadedFiles || [];
      const newCaseFiles: CaseFile[] = uploadedFiles.map((file) => ({
        id: String(file.id),
        type: file.type,
        fileName: file.fileName,
        fileKey: file.fileKey,
        caseId: caseData.id,
      }));
      updateEvidenceItem(key, "uploadedFiles", [...currentUploadedFiles, ...newCaseFiles]);
      updateEvidenceItem(key, "uploading", false);
      updateEvidenceItem(key, "files", []);
      updateEvidenceItem(key, "showSuccess", true);

      // Clear success after 3 seconds
      const timeoutId = setTimeout(() => {
        updateEvidenceItem(key, "showSuccess", false);
        timeoutRefs.current.delete(key);
      }, 3000);
      timeoutRefs.current.set(key, timeoutId);

      console.log(`Successfully uploaded ${fileArray.length} file(s) for ${key}`);
    } catch (error) {
      console.error("Upload failed:", error);
      updateEvidenceItem(key, "uploading", false);
      updateEvidenceItem(key, "files", []);
      alert("Upload failed. Please try again.");
    }
  };

  // ── handleFileUpload (legacy input-change path, kept for any callers) ─────
  const handleFileUpload = async (key: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      event.target.value = "";
      await runUploadFlow(key, fileArray);
    }
  };

  // ── handleFileUploadFromDrop (dropzone path) ──────────────────────────────
  const handleFileUploadFromDrop = async (key: string, files: File[]) => {
    await runUploadFlow(key, files);
  };

  // ── handleDeleteFile (no window.confirm — ConfirmDialog in EvidenceFileRow) ─
  const handleDeleteFile = async (fileId: string, evidenceType: string) => {
    console.log("Attempting to delete file:", { fileId, evidenceType });

    if (!fileId) {
      console.error("File ID is undefined!");
      alert("Error: File ID is missing. Cannot delete file.");
      return;
    }

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Delete failed");
      }

      setEvidenceData((prev) => ({
        ...prev,
        [evidenceType]: {
          ...prev[evidenceType],
          uploadedFiles:
            prev[evidenceType]?.uploadedFiles.filter((file) => file.id !== fileId) || [],
        },
      }));

      console.log("File deleted successfully");
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete file. Please try again.");
    }
  };

  // ── handleAddCustomType (AddCustomTypeRow onCreate callback) ──────────────
  const handleAddCustomType = async (title: string, description: string) => {
    try {
      const response = await fetch(`/api/cases/${caseData.id}/evidence-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      if (!response.ok) {
        throw new Error("Failed to create custom evidence type");
      }

      const result = await response.json();

      if (result.success && result.data) {
        setEditableItems((prev) => [...prev, result.data]);
        setEvidenceData((prev) => ({
          ...prev,
          [result.data.key]: {
            files: [],
            uploading: false,
            uploadedFiles: [],
            showSuccess: false,
          },
        }));
      }
    } catch (error) {
      console.error("Error creating custom evidence type:", error);
      alert("Failed to create custom evidence type. Please try again.");
      throw error; // Re-throw so AddCustomTypeRow keeps busy state correctly
    }
  };

  // ── handleFilesUploaded (PdfSplitDrawer callback) ─────────────────────────
  const handleFilesUploaded = (evidenceType: string, files: { id: string; type: string; fileName: string; fileKey: string }[]) => {
    const currentUploadedFiles = evidenceData[evidenceType]?.uploadedFiles || [];
    const newCaseFiles = files.map((file) => ({
      id: file.id,
      type: file.type,
      fileName: file.fileName,
      fileKey: file.fileKey,
      caseId: caseData.id,
    }));

    updateEvidenceItem(evidenceType, "uploadedFiles", [...currentUploadedFiles, ...newCaseFiles]);
    updateEvidenceItem(evidenceType, "showSuccess", true);

    const timeoutId = setTimeout(() => {
      updateEvidenceItem(evidenceType, "showSuccess", false);
    }, 3000);
    timeoutRefs.current.set(evidenceType, timeoutId);

    console.log(`Successfully added ${files.length} split file(s) to ${evidenceType}`);
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div>
      <SectionHeader
        title="Evidence"
        meta="Upload supporting documents · max 100 MB per file"
        actions={
          <Button
            variant="ghost"
            className="border border-line-gold text-gold-500 hover:bg-gold-500/10"
            leftIcon={<Scissors className="h-4 w-4" />}
            onClick={() => setIsDrawerOpen(true)}
          >
            AI Split PDF
          </Button>
        }
      />

      {isLoadingEvidenceTypes ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Shimmer key={i} className="h-32" />
          ))}
        </div>
      ) : editableItems.length === 0 ? (
        <EmptyState
          title="No evidence types yet"
          description="Add a custom evidence type to start uploading documents."
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {editableItems.map((t) => {
              const state = evidenceData[t.key] ?? {
                files: [],
                uploading: false,
                uploadedFiles: [],
                showSuccess: false,
              };
              return (
                <EvidenceTypeCard
                  key={t.key}
                  type={t}
                  files={state.uploadedFiles}
                  uploading={state.uploading}
                  expanded={expandedKey === t.key}
                  onToggle={() => setExpandedKey(expandedKey === t.key ? null : t.key)}
                  onUpload={(files) => handleFileUploadFromDrop(t.key, files)}
                  onDelete={(fid) => handleDeleteFile(fid, t.key)}
                />
              );
            })}
          </div>
          <div className="mt-4">
            <AddCustomTypeRow onCreate={handleAddCustomType} />
          </div>
        </>
      )}

      <PdfSplitDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        caseData={caseData}
        onFilesUploaded={handleFilesUploaded}
      />
      <FileSizeDialog
        open={showFileSizeDialog}
        onOpenChange={setShowFileSizeDialog}
        files={oversizedFiles}
      />
      <InsufficientBalanceDialog
        open={showInsufficientBalanceDialog}
        onOpenChange={setShowInsufficientBalanceDialog}
        onTopUp={() => setShowInsufficientBalanceDialog(false)}
      />
    </div>
  );
}
