"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileText } from "lucide-react";
import MdxRenderer from "@/components/MdxRenderer";
import Citation from "@/components/Citation";
import MdxEditorComponent from "@/components/MdxEditor";
import { SectionHeader, Card, Shimmer, Button } from "@/components/ui";
import { RegenerateDialog } from "@/components/modals/RegenerateDialog";
import { InsufficientBalanceDialog } from "@/components/modals/InsufficientBalanceDialog";
import { DocumentToolbar } from "../Step3Particulars/DocumentToolbar";

interface Step4ChronologyProps {
  caseId: string;
  action?: string | null;
  generatedContent?: string | null;
  onGenerateContent?: (action: string) => void;
  onGeneratingStateChange?: (isGenerating: boolean) => void;
  onEditingStateChange?: (isEditing: boolean) => void;
  onNextStep?: () => void;
}

export default function Step4Chronology({
  caseId,
  onGeneratingStateChange,
  onEditingStateChange,
  onNextStep,
}: Step4ChronologyProps) {
  const [chronologyContent, setChronologyContent] = useState<string>("");
  const [originalChronologyContent, setOriginalChronologyContent] = useState<string>("");
  const [isGeneratingChronology, setIsGeneratingChronology] = useState(false);
  const [hasGeneratedChronology, setHasGeneratedChronology] = useState(false);
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFromDatabase, setIsLoadingFromDatabase] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showInsufficientBalanceDialog, setShowInsufficientBalanceDialog] = useState(false);
  const editorRef = useRef<any>(null);

  const loadChronologyFromDatabase = useCallback(async () => {
    if (!caseId) return false;
    setIsLoadingFromDatabase(true);
    try {
      const response = await fetch(`/api/save/chronology?caseId=${caseId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.chronologyData) {
          setChronologyContent(data.data.chronologyData);
          setOriginalChronologyContent(data.data.chronologyData);
          setHasGeneratedChronology(true);
          localStorage.setItem("chronology_markdown", data.data.chronologyData);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error loading chronology from database:", error);
      return false;
    } finally {
      setIsLoadingFromDatabase(false);
    }
  }, [caseId]);

  const generateChronology = useCallback(
    async (userComment?: string) => {
      setIsGeneratingChronology(true);
      setHasGeneratedChronology(false);
      setErrorMessage(null);
      onGeneratingStateChange?.(true);

      try {
        const verifyTokenResponse = await fetch("/api/tokens/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estimateTokens: 1 }),
        });
        const result = await verifyTokenResponse.json();
        if (!result.is_enough_balance) {
          setShowInsufficientBalanceDialog(true);
          return;
        }

        const response = await fetch("/api/generate/chronology", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId, userComment: userComment || undefined }),
        });

        if (response.ok) {
          const data = await response.json();
          const markdownContent = data.content || "";
          setChronologyContent(markdownContent);
          setOriginalChronologyContent(markdownContent);
          setHasGeneratedChronology(true);
          localStorage.setItem("chronology_markdown", markdownContent);
        } else {
          console.error("Failed to generate chronology");
          setErrorMessage("Failed to generate Chronology");
        }
      } catch (error) {
        console.error("Error generating chronology:", error);
        setErrorMessage("Failed to generate Chronology");
      } finally {
        setIsGeneratingChronology(false);
        onGeneratingStateChange?.(false);
      }
    },
    [caseId, onGeneratingStateChange],
  );

  useEffect(() => {
    if (caseId) {
      (async () => {
        const hasSavedData = await loadChronologyFromDatabase();
        if (!hasSavedData) {
          generateChronology();
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

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
    await generateChronology(userComment);
  };

  const handleEdit = () => {
    setIsEditing(true);
    onEditingStateChange?.(true);
  };

  const handleCancel = () => {
    setChronologyContent(originalChronologyContent);
    setIsEditing(false);
    onEditingStateChange?.(false);
    if (editorRef.current) {
      editorRef.current.getInstance().setMarkdown(originalChronologyContent);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const editedContent =
        editorRef.current?.getInstance().getMarkdown() || chronologyContent;

      setChronologyContent(editedContent);
      setOriginalChronologyContent(editedContent);
      localStorage.setItem("chronology_markdown", editedContent);

      const response = await fetch("/api/save/chronology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, chronologyData: editedContent }),
      });

      if (!response.ok) throw new Error("Failed to save to database");

      setIsEditing(false);
      onEditingStateChange?.(false);
    } catch (error) {
      console.error("Error saving chronology:", error);
      alert("Error saving changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const toolbarStatus = isSaving
    ? "saving"
    : isGeneratingChronology
      ? "generating"
      : isEditing
        ? "editing"
        : "saved";

  if (isGeneratingChronology || isLoadingFromDatabase) {
    return (
      <div>
        <SectionHeader
          title="Chronology"
          meta="AI extracted timeline of events · review before drafting"
        />
        <Card variant="cream-paper" className="px-10 py-12 max-w-3xl mx-auto">
          <h1 className="font-display text-3xl text-paper-ink mb-6">
            {isLoadingFromDatabase ? "Loading Chronology" : "Drafting Chronology…"}
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
        title="Chronology"
        meta="AI extracted timeline of events · review before drafting"
      />

      <DocumentToolbar
        status={toolbarStatus}
        onRegenerate={() => setIsRegenerateDialogOpen(true)}
        onToggleEdit={isEditing ? handleSave : handleEdit}
        onCancelEdit={isEditing ? handleCancel : undefined}
        onContinue={hasGeneratedChronology ? onNextStep : undefined}
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
              generateChronology();
            }}
          >
            Retry
          </Button>
        </div>
      )}

      <Card variant="cream-paper" className="px-10 py-12 max-w-3xl mx-auto">
        {isEditing ? (
          <MdxEditorComponent
            initialMarkdown={chronologyContent}
            onChange={setChronologyContent}
            className="mb-2"
          />
        ) : chronologyContent ? (
          <MdxRenderer source={chronologyContent} components={{ Citation }} />
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-paper-ink/60">
            <FileText className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">
              No chronology available yet. Click <strong>Regenerate</strong> to draft from your evidence.
            </p>
          </div>
        )}
      </Card>

      <RegenerateDialog
        open={isRegenerateDialogOpen}
        onOpenChange={setIsRegenerateDialogOpen}
        documentType="chronology"
        onConfirm={handleRegenerateConfirm}
      />

      <InsufficientBalanceDialog
        open={showInsufficientBalanceDialog}
        onOpenChange={setShowInsufficientBalanceDialog}
        onTopUp={() => setShowInsufficientBalanceDialog(false)}
      />
    </div>
  );
}
