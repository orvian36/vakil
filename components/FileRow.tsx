"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RotateCcw, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { CaseFile, CaseEvidenceType } from "@/types/case";

interface FileRowProps {
  file: CaseFile;
  caseData: {
    plaintiffs: string[];
    defendants: string[];
  };
  status: 'pending' | 'processing' | 'completed' | 'failed'; // Make status prop explicit
  caseId: string; // Add caseId prop
  evidenceTypes?: CaseEvidenceType[]; // Add evidence types prop
  onRegenerate?: (file: CaseFile) => void;
  onOcrStateReset?: () => void;
  onFileClick?: (file: CaseFile) => void;
}

export default function FileRow({ file, caseData, onRegenerate, onOcrStateReset, onFileClick, caseId, status, evidenceTypes }: FileRowProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  // These states will now be controlled by the 'file' prop from Step2Process
  const analysisStatus = status || 'pending'; 
  const errorMessage = file.error_message || undefined;
  const extractedEntities = file.entities || [];
  const documentDate = file.documentDate || null;

  // Remove pollIntervalRef as polling is now handled by Step2Process

  console.log(file);

  // Remove fetchFileStatus and its associated useEffect

  const getDocumentType = (evidenceType: string) => {
    // Look up the title from evidence types
    const matchedType = evidenceTypes?.find(et => et.key === evidenceType);
    return matchedType?.title || evidenceType;
  };

  const getStatusInfo = (status: string): {
    text: string;
    color: string;
    bgColor: string;
    icon: any;
    spinning?: boolean;
  } => {

    switch (status) {
      case 'completed':
        return { 
          text: 'Completed', 
          color: 'text-[var(--color-emerald-500)]', 
          bgColor: 'bg-[var(--color-emerald-500)]/10', 
          icon: CheckCircle 
        };
      case 'processing':
        return { 
          text: 'Processing', 
          color: 'text-[var(--color-saffron-600)]', 
          bgColor: 'bg-[var(--color-saffron-500)]/10', 
          icon: Loader2,
          spinning: true
        };
      case 'failed':
        return { 
          text: 'Failed', 
          color: 'text-[var(--color-rose-500)]', 
          bgColor: 'bg-[var(--color-rose-500)]/10', 
          icon: AlertCircle 
        };
      default:
        return { 
          text: 'Pending', 
          color: 'text-[var(--color-saffron-600)]', 
          bgColor: 'bg-[var(--color-saffron-500)]/10', 
          icon: Clock 
        };
    }
  };

  const getEntities = () => {
    // Use extracted entities if available
    if (extractedEntities.length > 0) {
      return extractedEntities.join(', ');
    }
    
    // If we have tried to extract but got no results, show "Not found"
    if (extractedEntities.length === 0 && (file.entities !== undefined)) {
      return 'Not found';
    }
    
    // If no extraction has been attempted yet, show loading or empty state
    return 'Not found';
  };


  const regenerateFile = async (fileId: string) => {
    const response = await fetch(`/api/files/${fileId}/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(data);
  };


  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const getDisplayDate = () => {
    // Use extracted document date if available
    console.log(documentDate);
    if (documentDate) {
      // Ensure the date is in YYYY-MM-DD format
      try {
        const date = new Date(documentDate);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (error) {
        console.error('Error formatting document date:', error);
      }
      return documentDate; // Return as-is if parsing fails
    }
    
    // If we have tried to extract but got no results, show "Not found"
    if (documentDate === null) {
      return 'Not found';
    }
    
    // If no extraction has been attempted yet, show upload timestamp
    return 'Not found'; // Provide a default Date if undefined
  };

  const handleRegenerate = async () => {
    if (isRegenerating) return;
    
    setIsRegenerating(true);
    
    try {
      regenerateFile(file.id);
      // Blocking 5-second delay before setting status to processing
      await new Promise(resolve => setTimeout(resolve, 5000));
      // Notify parent component that regeneration has started
      onRegenerate?.(file);
    } finally {
      setIsRegenerating(false);
    }
  };


  // // Load existing entities and document date from database on mount
  // useEffect(() => {
  //   // These states are now controlled by the 'file' prop
  //   // if (file.entities && file.entities.length > 0) {
  //   //   setExtractedEntities(file.entities);
  //   // }
  //   // if (file.documentDate) {
  //   //   setDocumentDate(file.documentDate);
  //   // }
  //   // setAnalysisStatus(file.status || 'completed'); // This state is now controlled by the prop
  // }, [file.status]);



  const statusInfo = getStatusInfo(analysisStatus);
  //console.log(statusInfo);
  const StatusIcon = statusInfo.icon;

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row click if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onFileClick?.(file);
  };

  return (
    <tr 
      className="hover:bg-[var(--color-cream-50)] cursor-pointer"
      onClick={handleRowClick}
    >
      <td className="px-6 py-4 text-sm font-medium text-[var(--color-ink-950)] max-w-xs">
        <div className="break-words" title={file.fileName}>
          {file.fileName}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-ink-500)]">
        {getDocumentType(file.type)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-ink-500)]">
        <div>
          {getDisplayDate()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bgColor}`}>
          <StatusIcon className={`w-3 h-3 ${statusInfo.spinning ? 'animate-spin' : ''}`} />
          {statusInfo.text}
        </div>
        {analysisStatus === 'failed' && errorMessage && (
          <div className="mt-1 text-xs text-[var(--color-rose-500)] max-w-xs truncate" title={errorMessage}>
            Try again
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating || analysisStatus === 'processing'}
          className={`p-1 rounded-full transition-colors ${
            isRegenerating || analysisStatus === 'processing'
              ? 'text-[var(--color-ink-300)] cursor-not-allowed' 
              : 'text-[var(--color-saffron-600)] hover:text-[var(--color-ink-800)] hover:bg-[var(--color-saffron-500)]/10'
          }`}
          title={analysisStatus === 'processing' ? 'File is currently being processed' : 'Process with OCR'}
        >
          <RotateCcw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
        </button>
      </td>
    </tr>
  );
}
