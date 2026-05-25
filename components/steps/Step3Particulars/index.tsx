"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileText } from "lucide-react";
import MdxRenderer from "@/components/MdxRenderer";
import Citation from "@/components/Citation";
import MdxEditorComponent from "@/components/MdxEditor";
import { SectionHeader, Card, Shimmer, Button } from "@/components/ui";
import { RegenerateDialog } from "@/components/modals/RegenerateDialog";
import { DocumentToolbar } from "./DocumentToolbar";

interface Step3ParticularsProps {
  caseId: string;
  action?: string | null;
  generatedContent?: string | null;
  onGenerateContent?: (action: string) => void;
  onGeneratingStateChange?: (isGenerating: boolean) => void;
  onEditingStateChange?: (isEditing: boolean) => void;
  onNextStep?: () => void;
}

export default function Step3Particulars({
  caseId,
  onGeneratingStateChange,
  onEditingStateChange,
  onNextStep,
}: Step3ParticularsProps) {
  const [particularsContent, setParticularsContent] = useState<string>("");
  const [originalParticularsContent, setOriginalParticularsContent] = useState<string>("");
  const [isGeneratingParticulars, setIsGeneratingParticulars] = useState(false);
  const [hasGeneratedParticulars, setHasGeneratedParticulars] = useState(false);
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFromDatabase, setIsLoadingFromDatabase] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

  const loadParticularsFromDatabase = useCallback(async () => {
    if (!caseId) return false;
    setIsLoadingFromDatabase(true);
    try {
      const response = await fetch(`/api/save/particulars?caseId=${caseId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.particularsData) {
          setParticularsContent(data.data.particularsData);
          setOriginalParticularsContent(data.data.particularsData);
          setHasGeneratedParticulars(true);
          localStorage.setItem("particulars_markdown", data.data.particularsData);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error loading particulars from database:", error);
      return false;
    } finally {
      setIsLoadingFromDatabase(false);
    }
  }, [caseId]);

  const generateParticulars = useCallback(
    async (userComment?: string) => {
      setIsGeneratingParticulars(true);
      setHasGeneratedParticulars(false);
      setErrorMessage(null);
      onGeneratingStateChange?.(true);

      try {

        const response = await fetch("/api/generate/particular", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId, userComment: userComment || undefined }),
        });

        if (response.ok) {
          const data = await response.json();
          const markdownContent = data.content || "";
          setParticularsContent(markdownContent);
          setOriginalParticularsContent(markdownContent);
          setHasGeneratedParticulars(true);
          localStorage.setItem("particulars_markdown", markdownContent);
        } else {
          console.error("Failed to generate particulars");
          setErrorMessage("Failed to generate Particulars");
        }
      } catch (error) {
        console.error("Error generating particulars:", error);
        setErrorMessage("Failed to generate Particulars");
      } finally {
        setIsGeneratingParticulars(false);
        onGeneratingStateChange?.(false);
      }
    },
    [caseId, onGeneratingStateChange],
  );

  useEffect(() => {
    if (caseId) {
      (async () => {
        const hasSavedData = await loadParticularsFromDatabase();
        if (!hasSavedData) {
          generateParticulars();
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // Load Toast UI Editor CSS dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !document.querySelector('link[href*="toastui-editor.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/@toast-ui/editor@3.2.2/dist/toastui-editor.min.css";
      document.head.appendChild(link);
    }
  }, []);

  const handleRegenerateConfirm = async (userComment: string) => {
    setIsRegenerateDialogOpen(false);
    await generateParticulars(userComment);
  };

  const handleEdit = () => {
    setIsEditing(true);
    onEditingStateChange?.(true);
  };

  const handleCancel = () => {
    setParticularsContent(originalParticularsContent);
    setIsEditing(false);
    onEditingStateChange?.(false);
    if (editorRef.current) {
      editorRef.current.getInstance().setMarkdown(originalParticularsContent);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const editedContent =
        editorRef.current?.getInstance().getMarkdown() || particularsContent;

      setParticularsContent(editedContent);
      setOriginalParticularsContent(editedContent);
      localStorage.setItem("particulars_markdown", editedContent);

      const response = await fetch("/api/save/particulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, particularsData: editedContent }),
      });

      if (!response.ok) throw new Error("Failed to save to database");

      setIsEditing(false);
      onEditingStateChange?.(false);
    } catch (error) {
      console.error("Error saving particulars:", error);
      alert("Error saving changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const toolbarStatus = isSaving
    ? "saving"
    : isGeneratingParticulars
      ? "generating"
      : isEditing
        ? "editing"
        : "saved";

  if (isGeneratingParticulars || isLoadingFromDatabase) {
    return (
      <div>
        <SectionHeader
          title="Particulars"
          meta="AI extracted from your evidence · review before drafting"
        />
        <Card variant="cream-paper" className="px-10 py-12 w-full">
          <h1 className="font-display text-3xl text-paper-ink mb-6">
            {isLoadingFromDatabase ? "Loading Particulars" : "Drafting Particulars…"}
          </h1>
          <Shimmer className="h-4 w-5/6 mb-3" />
          <Shimmer className="h-4 w-full mb-3" />
          <Shimmer className="h-4 w-3/4 mb-3" />
          <Shimmer className="h-4 w-2/3" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Particulars"
        meta="AI extracted from your evidence · review before drafting"
      />

      <DocumentToolbar
        status={toolbarStatus}
        onRegenerate={() => setIsRegenerateDialogOpen(true)}
        onToggleEdit={isEditing ? handleSave : handleEdit}
        onCancelEdit={isEditing ? handleCancel : undefined}
        onContinue={hasGeneratedParticulars ? onNextStep : undefined}
      />

      {errorMessage && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          {errorMessage}
          <Button
            variant="ghost"
            size="sm"
            className="ml-3"
            onClick={() => {
              setErrorMessage(null);
              generateParticulars();
            }}
          >
            Retry
          </Button>
        </div>
      )}

      <Card variant="cream-paper" className="px-10 py-12 w-full">
        {isEditing ? (
          <MdxEditorComponent
            initialMarkdown={particularsContent}
            onChange={setParticularsContent}
            className="mb-2"
          />
        ) : particularsContent ? (
          <MdxRenderer source={particularsContent} components={{ Citation }} />
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-paper-ink/60">
            <FileText className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">
              No particulars available yet. Click <strong>Regenerate</strong> to draft from your evidence.
            </p>
          </div>
        )}
      </Card>

      <RegenerateDialog
        open={isRegenerateDialogOpen}
        onOpenChange={setIsRegenerateDialogOpen}
        documentType="particulars"
        onConfirm={handleRegenerateConfirm}
      />

    </div>
  );
}
