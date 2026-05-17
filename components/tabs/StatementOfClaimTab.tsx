"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Download } from "lucide-react";
import MdxRenderer from '@/components/MdxRenderer';
import { Case } from "@/types/case";
import { getTabConfig } from '@/lib/utils/tabConfig';
import { downloadStatementOfClaimAsWord } from '@/lib/utils/exportStatementOfClaimToWord';
import Hoverable from "@/components/Hoverable";

const tabConfig = getTabConfig('statement-of-claim');

interface StatementOfClaimTabProps {
  caseId: string;
  caseData: Case;
  content?: string;
  isGenerating?: boolean;
}

export default function StatementOfClaimTab({ 
  caseId, 
  caseData,
  content: propContent = '',
  isGenerating: propIsGenerating = false,
}: StatementOfClaimTabProps) {
  const [content, setContent] = useState(propContent);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);

  // Update content when prop changes
  useEffect(() => {
    if (propContent) {
      setContent(propContent);
    }
  }, [propContent]);

  const handleRegenerate = () => {
    setShowRegenerateModal(true);
  };

  const handleRegenerateConfirm = async (userComment: string) => {
    setShowRegenerateModal(false);
    alert('Regeneration is currently disabled. Please use the "Regenerate All" button in the header.');
  };

  const cleanContentForDocx = (content: string): string => {
    return content
      // Remove opening <Hoverable searchText="..."> tags
      .replace(/<Hoverable[^>]*>/gi, '')
      // Remove closing </Hoverable> tags
      .replace(/<\/Hoverable>/gi,'');
    };

  const handleDownload = async () => {
    try {
      await downloadStatementOfClaimAsWord({
        content: cleanContentForDocx(content) || getInitialContent(),
        filename: `statement-of-claim-${caseId}`,
        caseData: caseData,
        title: 'Statement of Claim',
        court: caseData.court?.toUpperCase(),
        plaintiffName: caseData.parties.filter((p) => p.role === 'plaintiff')[0].name.toUpperCase(),
      });
    } catch (error) {
      console.error('Error downloading Word document:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const getInitialContent = () => {
    return `# Failed to generate Statement of Claim`;
  };

  if (propIsGenerating) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-saffron-500)] mx-auto mb-4"></div>
          <p className="text-[var(--color-ink-500)]">Loading particulars and chronology data to generate {tabConfig.title}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--color-line)] rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-[var(--color-cream-50)] border-b border-[var(--color-line)] flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-ink-950)]">{tabConfig.title}</h3>
          <p className="text-sm text-[var(--color-ink-500)]">Edit the content below and regenerate if needed</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleDownload}
            disabled={propIsGenerating}
            className="flex items-center gap-2 px-3 py-1 bg-[var(--color-saffron-500)] text-white rounded-lg hover:bg-[var(--color-saffron-600)] disabled:bg-[var(--color-saffron-400)] disabled:cursor-not-allowed transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
      
      <div className="p-4" style={{ minHeight: '800px' }}>
        <MdxRenderer 
          source={content}
          components={{ Hoverable }}
        />
      </div>
    </div>
  );
}