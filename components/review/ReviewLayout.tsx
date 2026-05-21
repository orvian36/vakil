"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, XCircle } from "lucide-react";
import { Case } from "@/types/case";
import PreActionLetterTab from "@/components/tabs/PreActionLetterTab";
import StatementOfClaimTab from "@/components/tabs/StatementOfClaimTab";
import WitnessStatementTab from "@/components/tabs/WitnessStatementTab";
import StatementOfDamagesTab from "@/components/tabs/StatementOfDamagesTab";
import WritOfSummonsTab from "@/components/tabs/WritOfSummonsTab";

import { downloadWritOfSummonsAsWord } from "@/lib/utils/exportWritOfSummonsToWord";
import { downloadStatementOfClaimAsWord } from "@/lib/utils/exportStatementOfClaimToWord";
import { downloadStatementOfDamagesAsWord } from "@/lib/utils/exportStatementOfDamagesToWord";
import { downloadPreActionLetterAsWord } from "@/lib/utils/exportPreActionLetterToWord";
import { downloadWitnessAsWord } from "@/lib/utils/exportWitnessStatementToWord";

import { ErrorDialog } from "@/components/modals/ErrorDialog";
import { RegenerateDialog } from "@/components/modals/RegenerateDialog";
import { DocumentRail } from "./DocumentRail";
import { PaperToolbar } from "./PaperToolbar";
import { PaperCanvas } from "./PaperCanvas";
import {
  DOCUMENTS,
  DOCUMENT_ORDER,
  DocumentId,
  DocumentStatus,
} from "./documentTypes";

interface ReviewLayoutProps {
  caseId: string;
  caseData: Case;
}

interface GeneratedContent {
  writOfSummons?: string;
  witnessStatement?: string;
  witnessStatementBengali?: string;
  statementOfClaim?: string;
  statementOfDamages?: string;
  preActionLetter?: string;
}

interface AgentStatus {
  name: string;
  status: "pending" | "running" | "completed" | "error";
  message?: string;
}

interface ServerEvent {
  type: string;
  message: string;
  timestamp: number;
  agentName?: string;
  progress?: { current: number; total: number };
  outputVariable?: string;
}

const CONTENT_KEY_BY_DOC: Record<DocumentId, keyof GeneratedContent> = {
  "writ-of-summons": "writOfSummons",
  "witness-statement": "witnessStatement",
  "statement-of-claim": "statementOfClaim",
  "statement-of-damages": "statementOfDamages",
  "pre-action-letter": "preActionLetter",
};

function cleanContentForDocx(content: string): string {
  return content
    .replace(/<Hoverable[^>]*>/gi, "")
    .replace(/<\/Hoverable>/gi, "");
}

export function ReviewLayout({ caseId, caseData }: ReviewLayoutProps) {
  const [activeId, setActiveId] = useState<DocumentId>(DOCUMENT_ORDER[0]);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({});
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [serverEvents, setServerEvents] = useState<ServerEvent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [bengaliMode, setBengaliMode] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const hasInitiatedGeneration = useRef(false);

  // Per-document status derived from generated content + agent statuses.
  const statuses: Record<DocumentId, DocumentStatus> = DOCUMENTS.reduce((acc, d) => {
    const key = CONTENT_KEY_BY_DOC[d.id as DocumentId];
    const hasContent = Boolean(generatedContent[key]);
    if (hasContent) {
      acc[d.id as DocumentId] = "drafted";
    } else if (isGenerating) {
      acc[d.id as DocumentId] = "generating";
    } else if (agentStatuses.some((a) => a.name === d.id && a.status === "error")) {
      acc[d.id as DocumentId] = "failed";
    } else {
      acc[d.id as DocumentId] = "pending";
    }
    return acc;
  }, {} as Record<DocumentId, DocumentStatus>);

  const handleStreamData = useCallback(
    (data: any) => {
      const event: ServerEvent = {
        type: data.type,
        message: data.message || "",
        timestamp: Date.now(),
        agentName: data.agentName,
        progress: data.progress,
        outputVariable: data.outputVariable,
      };
      setServerEvents((prev) => [...prev, event]);

      switch (data.type) {
        case "agent_registered":
          setAgentStatuses((prev) => [
            ...prev,
            { name: data.agentName, status: "pending", message: data.message },
          ]);
          break;
        case "agent_started":
          setAgentStatuses((prev) =>
            prev.map((a) =>
              a.name === data.agentName ? { ...a, status: "running", message: data.message } : a,
            ),
          );
          break;
        case "agent_completed":
          setAgentStatuses((prev) =>
            prev.map((a) =>
              a.name === data.agentName ? { ...a, status: "completed", message: data.message } : a,
            ),
          );
          break;
        case "agent_error":
          setAgentStatuses((prev) =>
            prev.map((a) =>
              a.name === data.agentName ? { ...a, status: "error", message: data.message } : a,
            ),
          );
          break;
        case "complete":
          if (data.result) {
            const newContent: GeneratedContent = {
              writOfSummons: data.result.writ_of_summons || "",
              witnessStatement: data.result.witness_statement || "",
              witnessStatementBengali:
                data.result.witness_statement_bengali || data.result.witnessStatementBengali || "",
              statementOfClaim: data.result.statement_of_claim || "",
              statementOfDamages: data.result.statement_of_damages || "",
              preActionLetter: data.result.pre_action_letter || "",
            };
            setGeneratedContent(newContent);
            localStorage.setItem(
              `orchestration_content_${caseId}`,
              JSON.stringify(newContent),
            );
          }
          break;
        case "error":
          const errorMessage = data.message || "Unknown error occurred";
          setError(errorMessage);
          setShowErrorDialog(true);
          break;
      }
    },
    [caseId],
  );

  const generateContent = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setAgentStatuses([]);
    setServerEvents([]);

    try {

      const response = await fetch("/api/orchestration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              handleStreamData(data);
            } catch (err) {
              console.error("Error parsing stream data:", err);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error generating content:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setShowErrorDialog(true);
    } finally {
      setIsGenerating(false);
    }
  }, [caseId, handleStreamData]);

  // Load cached content on mount; only generate if no cache.
  useEffect(() => {
    hasInitiatedGeneration.current = false;
    const cached = localStorage.getItem(`orchestration_content_${caseId}`);
    if (cached) {
      try {
        setGeneratedContent(JSON.parse(cached));
        return;
      } catch (err) {
        console.error("Error parsing cached content:", err);
      }
    }
    if (!hasInitiatedGeneration.current && !isGenerating) {
      hasInitiatedGeneration.current = true;
      generateContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const handleRetryGeneration = () => {
    setShowErrorDialog(false);
    setError(null);
    hasInitiatedGeneration.current = false;
    generateContent();
  };

  const handleRegenerate = () => {
    setRegenerateOpen(true);
  };

  const handleRegenerateConfirm = async (_userComment: string) => {
    setRegenerateOpen(false);
    hasInitiatedGeneration.current = false;
    await generateContent();
  };

  const handleCopy = async () => {
    const key = CONTENT_KEY_BY_DOC[activeId];
    const content =
      activeId === "witness-statement" && bengaliMode
        ? generatedContent.witnessStatementBengali ?? ""
        : generatedContent[key] ?? "";
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleDownload = async () => {
    try {
      const key = CONTENT_KEY_BY_DOC[activeId];
      const plaintiffName = caseData.parties
        .filter((p) => p.role === "plaintiff")[0]
        ?.name.toUpperCase();
      const court = caseData.court?.toUpperCase();

      if (activeId === "writ-of-summons") {
        await downloadWritOfSummonsAsWord({
          content: cleanContentForDocx(generatedContent.writOfSummons ?? ""),
          filename: `writ-of-summons-${caseId}`,
          caseData,
          title: "Writ of Summons",
          court,
          plaintiffName,
        });
      } else if (activeId === "statement-of-claim") {
        await downloadStatementOfClaimAsWord({
          content: cleanContentForDocx(generatedContent.statementOfClaim ?? ""),
          filename: `statement-of-claim-${caseId}`,
          caseData,
          title: "Statement of Claim",
          court,
          plaintiffName,
        });
      } else if (activeId === "statement-of-damages") {
        await downloadStatementOfDamagesAsWord({
          content: cleanContentForDocx(generatedContent.statementOfDamages ?? ""),
          filename: `statement-of-damages-${caseId}`,
          caseData,
          title: "Statement of Damages",
          court,
          plaintiffName,
        });
      } else if (activeId === "pre-action-letter") {
        await downloadPreActionLetterAsWord({
          content: cleanContentForDocx(generatedContent.preActionLetter ?? ""),
          filename: `pre-action-letter-${caseId}`,
          title: "Pre-Action Letter",
        });
      } else if (activeId === "witness-statement") {
        const currentContent = bengaliMode
          ? generatedContent.witnessStatementBengali ?? ""
          : generatedContent.witnessStatement ?? "";
        const languageSuffix = bengaliMode ? "-bengali" : "";
        await downloadWitnessAsWord({
          content: cleanContentForDocx(currentContent),
          filename: `witness-statement${languageSuffix}-${caseId}`,
          caseData,
          plaintiffName: plaintiffName ?? "",
          caseCode: "",
          includeFormattingExamples: false,
          title: bengaliMode ? "Witness Statement (Bengali)" : "Witness Statement",
          court,
        });
      }
    } catch (err) {
      console.error("Error downloading Word document:", err);
      alert("Failed to download document. Please try again.");
    }
  };

  // Generation in progress: render the dedicated loading shell (lifted from
  // legacy Step5Review almost verbatim, restyled for ink chrome).
  if (isGenerating) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-ink-900 border border-line-soft rounded-[var(--radius-lg)] p-6">
          <div className="text-center mb-6">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gold-500" />
            <h2 className="text-2xl font-display text-ink-100 mb-2">Generating Documents</h2>
            <p className="text-ink-400">AI agents are processing your case data…</p>
          </div>

          {serverEvents.length > 0 && (
            <div className="mt-6">
              <div className="bg-ink-800 border border-line-soft rounded-[var(--radius-md)] p-4">
                {(() => {
                  const latestEvent = serverEvents[serverEvents.length - 1];
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-pulse" />
                          <span className="text-sm text-ink-300 capitalize">
                            {latestEvent.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="text-xs text-ink-400">
                          {new Date(latestEvent.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-ink-100 text-sm">{latestEvent.message}</span>
                          <Loader2 className="w-4 h-4 text-gold-500 animate-spin flex-shrink-0" />
                        </div>
                        {latestEvent.progress && (
                          <div className="space-y-1 mt-2">
                            <div className="flex justify-between text-xs text-ink-400">
                              <span>Progress</span>
                            </div>
                            <div className="w-full bg-ink-700 rounded-full h-1 overflow-hidden">
                              <div
                                className="bg-gold-500 h-1 rounded-full transition-all duration-500 ease-out"
                                style={{
                                  width: `${(latestEvent.progress.current / latestEvent.progress.total) * 100}%`,
                                  animation: "pulse 2s ease-in-out infinite",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-[var(--radius-md)]">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-rose-500 mr-2" />
                <span className="text-rose-500">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render the active tab as a pure renderer
  const renderActiveTab = () => {
    const props = {
      caseId,
      caseData,
      isGenerating: false,
    };
    switch (activeId) {
      case "writ-of-summons":
        return <WritOfSummonsTab {...props} content={generatedContent.writOfSummons || ""} />;
      case "statement-of-claim":
        return <StatementOfClaimTab {...props} content={generatedContent.statementOfClaim || ""} />;
      case "statement-of-damages":
        return (
          <StatementOfDamagesTab {...props} content={generatedContent.statementOfDamages || ""} />
        );
      case "pre-action-letter":
        return <PreActionLetterTab {...props} content={generatedContent.preActionLetter || ""} />;
      case "witness-statement":
        return (
          <WitnessStatementTab
            {...props}
            content={generatedContent.witnessStatement || ""}
            bengaliContent={generatedContent.witnessStatementBengali || ""}
            bengaliMode={bengaliMode}
          />
        );
    }
  };

  const activeDoc = DOCUMENTS.find((d) => d.id === activeId) ?? DOCUMENTS[0];
  const showBengaliToggle =
    activeId === "witness-statement" &&
    Boolean(generatedContent.witnessStatementBengali);

  return (
    <>
      <div className="flex min-h-[calc(100vh-12rem)]">
        <DocumentRail
          statuses={statuses}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id);
            if (id !== "witness-statement") setBengaliMode(false);
          }}
          onRegenerateAll={handleRegenerate}
        />
        <main className="flex-1 px-6 py-6 min-w-0">
          <div className="max-w-3xl mx-auto">
            <PaperToolbar
              documentLabel={activeDoc.label}
              status={statuses[activeId]}
              onRegenerate={handleRegenerate}
              onDownload={handleDownload}
              onCopy={handleCopy}
              bengaliMode={showBengaliToggle ? bengaliMode : undefined}
              onBengaliToggle={showBengaliToggle ? setBengaliMode : undefined}
            />
            <PaperCanvas generating={statuses[activeId] === "generating"}>
              {renderActiveTab()}
            </PaperCanvas>
          </div>
        </main>
      </div>

      <ErrorDialog
        open={showErrorDialog}
        onOpenChange={(open) => {
          setShowErrorDialog(open);
          if (!open) setError(null);
        }}
        title="Generation Failed"
        message={error ?? "An unknown error occurred."}
        onRetry={handleRetryGeneration}
      />


      <RegenerateDialog
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
        documentType="document"
        onConfirm={handleRegenerateConfirm}
      />
    </>
  );
}
