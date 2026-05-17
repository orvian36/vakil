"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, ArrowUp, ArrowDown, X, AlertTriangle } from "lucide-react";
import FileRow from "@/components/FileRow";
import PDFViewerModal from "@/components/PDFViewerModal";
import { Case, CaseFile } from "@/types/case";

interface Step2ProcessProps {
  caseId: string;
  action?: string | null;
  generatedContent?: string | null;
  onGenerateContent?: (action: string) => void;
  onGeneratingStateChange?: (isGenerating: boolean) => void;
  hasPendingUploads?: boolean;
  generatingAction?: string | null;
  onOcrStateReset?: () => void;
  onIncompleteFilesChange?: (hasIncomplete: boolean, hasProcessing: boolean, hasFailed: boolean) => void;
}

type SortField = 'fileName' | 'evidence_type' | 'documentDate' | 'upload_timestamp' | 'analysis_status';
type SortOrder = 'asc' | 'desc';

export default function Step2Process({ caseId, action, generatedContent, onGenerateContent, onGeneratingStateChange, hasPendingUploads = false, generatingAction = null, onOcrStateReset, onIncompleteFilesChange }: Step2ProcessProps) {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<CaseFile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('upload_timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedFile, setSelectedFile] = useState<CaseFile | null>(null);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [hasIncompleteFiles, setHasIncompleteFiles] = useState(false);
  const [hasProcessingFiles, setHasProcessingFiles] = useState(false);
  const [hasFailedFiles, setHasFailedFiles] = useState(false);
  const [showFailedFilesToast, setShowFailedFilesToast] = useState(false);
  const [hasShownFailedToast, setHasShownFailedToast] = useState(false);
  console.log(caseData);
 
  // Ref to hold the interval ID for polling file statuses
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check file statuses
  const checkFileStatuses = useCallback(() => {
    const hasIncomplete = files.some(file => 
      file.processing_status !== 'completed'
    );
    const hasProcessing = files.some(file => 
      file.processing_status === 'processing'
    );
    const hasFailed = files.some(file => 
      file.processing_status === 'failed'
    );
    
    setHasIncompleteFiles(hasIncomplete);
    setHasProcessingFiles(hasProcessing);
    setHasFailedFiles(hasFailed);
    
    // Show toast for failed files on first detection
    if (hasFailed && !hasShownFailedToast) {
      setShowFailedFilesToast(true);
      setHasShownFailedToast(true);
      
      // Auto-dismiss toast after 5 seconds
      setTimeout(() => {
        setShowFailedFilesToast(false);
      }, 8000);
    }
    
    // Pass all states to parent
    onIncompleteFilesChange?.(hasIncomplete, hasProcessing, hasFailed);
  }, [files, onIncompleteFilesChange, hasShownFailedToast]);

  // Update file statuses whenever files change
  useEffect(() => {
    checkFileStatuses();
  }, [checkFileStatuses]);

  const fetchFilesAndStatuses = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}`);
      if (response.ok) {
        const data = await response.json();
        // Set caseData here as well
        setCaseData(data);
        const updatedFiles = data.files.map((file: any) => ({
          id: file.id,
          type: file.type,
          fileName: file.fileName,
          status: file.processingStatus,
          entities: file.entities,
          summary: file.summary,
          documentDate: file.documentDate,
          caseId: file.caseId, // Ensure caseId is passed for FileRow
          fileKey: file.fileKey, // Ensure fileKey is passed for FileRow
          processing_status: file.processingStatus, // Consistent naming with CaseFile interface
          error_message: file.errorMessage, // Consistent naming with CaseFile interface
        }));
        setFiles(updatedFiles);

        // Check for processing or pending files to determine if polling should continue
        const hasProcessingOrPending = updatedFiles.some(
          (file: CaseFile) => file.processing_status === 'processing' || file.processing_status === 'pending'
        );

        if (!hasProcessingOrPending && pollIntervalRef.current) {
          console.log('[Step2Process] No more processing files, stopping polling');
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } else {
        console.error('Failed to fetch case and file statuses:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching case and file statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (caseId) {
      fetchFilesAndStatuses(); // Initial fetch and status check

      console.log('Starting polling');

      // Start polling only if an interval is not already active.
      // The fetchFilesAndStatuses function will manage clearing the interval
      // if no processing or pending files are found.
      if (!pollIntervalRef.current) {
        console.log('Setting polling interval');
        pollIntervalRef.current = setInterval(fetchFilesAndStatuses, 30000); // Poll every 2 seconds
      }
    }

    return () => {
      console.log('Clearing polling interval');
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [caseId, fetchFilesAndStatuses]); // Removed 'files' from dependencies

  // Files are now processed individually by each FileRow component

  const getDocumentType = (evidenceType: string) => {
    const typeMap: { [key: string]: string } = {
      'medical_reports': 'Medical Report',
      'witness_statements': 'Witness Statement',
      'police_reports': 'Police Report',
      'insurance_documents': 'Insurance Document',
      'photographs': 'Photograph Evidence',
      'correspondence': 'Correspondence',
      'financial_documents': 'Financial Document',
      'expert_reports': 'Expert Report',
      'other': 'Other Document'
    };
    return typeMap[evidenceType] || evidenceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getDocumentType(file.type).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || file.processing_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case 'fileName':
        aValue = a.fileName.toLowerCase();
        bValue = b.fileName.toLowerCase();
        break;
      case 'evidence_type':
        aValue = getDocumentType(a.type).toLowerCase();
        bValue = getDocumentType(b.type).toLowerCase();
        break;

      case 'analysis_status':
        aValue = a.processing_status;
        bValue = b.processing_status;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // OCR processing is now handled directly in FileRow component
  // Each FileRow manages its own status independently

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const handleFileClick = (file: CaseFile) => {
    setSelectedFile(file);
    setIsPDFModalOpen(true);
  };

  const handleClosePDFModal = () => {
    setIsPDFModalOpen(false);
    setSelectedFile(null);
  };

  const startPolling = () => {
    if (!pollIntervalRef.current) {
      console.log('[Step2Process] Starting polling for regeneration');
      pollIntervalRef.current = setInterval(() => {
        console.log('[Step2Process] Polling for file status updates...');
        fetchFilesAndStatuses();
      }, 30000); // Poll every 2 seconds
    }
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      console.log('[Step2Process] Stopping polling');
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handleRegenerate = (file: CaseFile) => {
    // Update the file status to 'processing' in the local state
    setFiles(prevFiles => 
      prevFiles.map(f => 
        f.id === file.id ? { ...f, processing_status: 'processing' } : f
      )
    );
    
    // Start polling when regeneration begins
    startPolling();
  };


  const statusCounts = files.reduce((acc, file) => {
    acc[file.processing_status || 'pending'] = (acc[file.processing_status || 'pending'] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const totalFiles = files.length;
  const filteredCount = filteredFiles.length;
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[var(--color-ink-500)]">Loading case details...</div>
      </div>
    );
  }

  if (totalFiles === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--color-ink-500)]">No documents uploaded yet</div>
      </div>
    );
  }
  



  return (
    <div className="space-y-6">
      {/* Failed Files Toast */}
      {showFailedFilesToast && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--color-rose-500)]/10 border border-[var(--color-rose-500)]/30 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-[var(--color-rose-500)]/80" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-[var(--color-rose-500)]">
                Some files failed to process
              </h3>
              <p className="mt-1 text-sm text-[var(--color-rose-500)]">
              You may re-process these files, or you can proceed without processing them. If you wish to remove them, please return to the previous step.
              </p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() => setShowFailedFilesToast(false)}
                className="inline-flex text-[var(--color-rose-500)]/80 hover:text-[var(--color-rose-500)] focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-ink-300)] w-4 h-4" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-black border border-[var(--color-line-strong)] rounded-lg focus:ring-2 focus:ring-[var(--color-saffron-500)] focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-[var(--color-line-strong)] rounded-lg text-black bg-white focus:ring-2 focus:ring-[var(--color-saffron-500)] focus:border-transparent"
          >
            <option value="all">All Status ({totalFiles})</option>
            <option value="completed">Completed ({statusCounts.completed || 0})</option>
            <option value="processing">Processing ({statusCounts.processing || 0})</option>
            <option value="pending">Pending ({statusCounts.pending || 0})</option>
            <option value="failed">Failed ({statusCounts.failed || 0})</option>
          </select>
        </div>
      </div>

      {/* Document Count */}
      <div className="text-sm text-[var(--color-ink-500)]">
        Showing {filteredCount} of {totalFiles} documents
          </div>
        
 
        
      <div className="bg-white border border-[var(--color-line)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-cream-50)] border-b border-[var(--color-line)]">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-[var(--color-ink-500)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-cream-100)]"
                  onClick={() => handleSort('fileName')}
                >
                  <div className="flex items-center gap-2">
                    FILE NAME
                    {getSortIcon('fileName')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-[var(--color-ink-500)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-cream-100)]"
                  onClick={() => handleSort('evidence_type')}
                >
                  <div className="flex items-center gap-2">
                    DOCUMENT TYPE
                    {getSortIcon('evidence_type')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-[var(--color-ink-500)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-cream-100)]"
                  onClick={() => handleSort('documentDate')}
                >
                  <div className="flex items-center gap-2">
                    DOCUMENT DATE
                    {getSortIcon('documentDate')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-[var(--color-ink-500)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-cream-100)]"
                  onClick={() => handleSort('analysis_status')}
                >
                  <div className="flex items-center gap-2">
                    STATUS
                    {getSortIcon('analysis_status')}
          </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-ink-500)] uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[var(--color-line)]">
              {sortedFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[var(--color-ink-500)]">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No documents match your filters' 
                      : 'No documents uploaded yet'
                    }
                  </td>
                </tr>
              ) : (
                sortedFiles.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    caseData={{
                      plaintiffs: caseData?.parties.filter(party => party.role === 'plaintiff').map(party => party.name) || [],
                      defendants: caseData?.parties.filter(party => party.role === 'defendant').map(party => party.name) || []
                    }}  
                    status={file.processing_status || 'pending'}
                    caseId={caseData?.id || ''} 
                    evidenceTypes={caseData?.evidenceTypes}
                    onRegenerate={handleRegenerate}
                    onOcrStateReset={onOcrStateReset}
                    onFileClick={handleFileClick}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* PDF Viewer Modal */}
      {selectedFile && (
        <PDFViewerModal
          isOpen={isPDFModalOpen}
          onClose={handleClosePDFModal}
          files={files}
          startIndex={files.findIndex(f => f.id === selectedFile.id)}
          onSave={async (fileId: string, summary: string) => {
            // Update the file summary in the database
            const response = await fetch(`/api/files/${fileId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ summary })
            });
            
            if (response.ok) {
              // Update local state
              setFiles(prevFiles => 
                prevFiles.map(f => 
                  f.id === fileId ? { ...f, summary } : f
                )
              );
            } else {
              throw new Error('Failed to save summary');
            }
          }}
        />
      )}
    </div>
  );
}
