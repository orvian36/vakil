"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Download, Languages } from "lucide-react";
import MdxRenderer from '@/components/MdxRenderer';
import { downloadWitnessAsWord } from '@/lib/utils/exportWitnessStatementToWord';
import RegenerateModal from '@/components/modals/RegenerateModal';
import { Case } from "@/types/case";
import { getTabConfig, getGlobalConfig } from '@/lib/utils/tabConfig';
import Hoverable from "@/components/Hoverable";

const tabConfig = getTabConfig('witness-statement');
const config = getGlobalConfig();
interface WitnessStatementTabProps {
  caseId: string;
  caseData: Case;
  content?: string;
  chineseContent?: string;
  isGenerating?: boolean;
}

export default function WitnessStatementTab({ 
  caseId, 
  caseData,
  content: propContent = '',
  chineseContent: propChineseContent = '',
  isGenerating: propIsGenerating = false,
}: WitnessStatementTabProps) {
  // Local state management - consistent with other tabs
  const [content, setContent] = useState(propContent);
  const [chineseContent, setChineseContent] = useState(propChineseContent);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isChineseMode, setIsChineseMode] = useState(false);

  // Update content when prop changes
  useEffect(() => {
    if (propContent) {
      setContent(propContent);
    }
  }, [propContent]);

  useEffect(() => {
    if (propChineseContent) {
      setChineseContent(propChineseContent);
    }
  }, [propChineseContent]);

  const handleRegenerate = () => {
    setShowRegenerateModal(true);
  };

  const handleLanguageToggle = () => {
    setIsChineseMode(!isChineseMode);
  };

  const handleRegenerateConfirm = async (userComment: string) => {
    setShowRegenerateModal(false);
    // Regeneration is disabled for now
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
      const currentContent = isChineseMode ? chineseContent : content;
      const languageSuffix = isChineseMode ? '-chinese' : '';

      const plaintiffName = caseData.parties.filter((p) => p.role === 'plaintiff')[0].name;
      
      await downloadWitnessAsWord({
        content: cleanContentForDocx(currentContent) || getInitialContent(),
        filename: `witness-statement${languageSuffix}-${caseId}`,
        caseData: caseData,
        plaintiffName: plaintiffName.toUpperCase(),
        caseCode: "",
        includeFormattingExamples: false,
        title: isChineseMode ? 'Witness Statement (Chinese)' : 'Witness Statement',
        court: caseData.court?.toUpperCase()
      });
    } catch (error) {
      console.error('Error downloading Word document:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const getInitialContent = () => {
    return `# Failed to generate Witness Statement`;
  };

  if (propIsGenerating) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading particulars and chronology data to generate {tabConfig.title}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{tabConfig.title}</h3>
          <p className="text-sm text-gray-600">Edit the content below and regenerate if needed</p>
        </div>
        <div className="flex gap-2">
          {chineseContent && (
            <button 
              onClick={handleLanguageToggle}
              disabled={propIsGenerating}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors text-sm ${
                isChineseMode 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              } disabled:bg-gray-400 disabled:cursor-not-allowed`}
            >
              <Languages className="w-4 h-4" />
              {isChineseMode ? '中文' : 'English'}
            </button>
          )}
          <button 
            onClick={handleDownload}
            disabled={propIsGenerating}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
      
      <div className="p-4" style={{ minHeight: '800px' }}>
        <MdxRenderer 
          source={isChineseMode ? chineseContent : content}
          components={{ Hoverable }}
        />
      </div>
      
      {/* Regenerate Modal */}
      <RegenerateModal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        onConfirm={handleRegenerateConfirm}
        documentType={tabConfig.id}
        isGenerating={propIsGenerating}
      />
    </div>
  );
}
