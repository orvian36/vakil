"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import dynamic from 'next/dynamic';
import { CaseFile } from "@/types/case";

// Dynamic imports to prevent SSR issues
const Editor = dynamic(
  () => import('@toast-ui/react-editor').then((mod) => mod.Editor),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div></div>
  }
);

const Viewer = dynamic(
  () => import('@toast-ui/react-editor').then((mod) => mod.Viewer),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div></div>
  }
);


interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: CaseFile[];
  startIndex: number;
  onSave?: (fileId: string, summary: string) => Promise<void>;
}


export default function PDFViewerModal({ isOpen, onClose, files, startIndex, onSave }: PDFViewerModalProps) {
  const [index, setIndex] = useState(startIndex);
  const [currentFile, setCurrentFile] = useState<CaseFile | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableSummary, setEditableSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(true);
  const [regenerationKey, setRegenerationKey] = useState(0);
  const editorRef = useRef<any>(null);

  //console.log("PDFVIEWER MODAL", currentFile);

  // Load Toast UI Editor CSS dynamically
  useEffect(() => {
    const loadToastUICSS = () => {
      if (typeof window !== 'undefined' && !document.querySelector('link[href*="toastui-editor.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/@toast-ui/editor@3.2.2/dist/toastui-editor.min.css';
        document.head.appendChild(link);
        
        const darkThemeLink = document.createElement('link');
        darkThemeLink.rel = 'stylesheet';
        darkThemeLink.href = 'https://cdn.jsdelivr.net/npm/@toast-ui/editor@3.2.2/dist/theme/toastui-editor-dark.min.css';
        document.head.appendChild(darkThemeLink);
      }
    };
    loadToastUICSS();
  }, []);

  // Fetch file data when index changes
  useEffect(() => {
    const fetchFile = async () => {
      if (!files || index < 0 || index >= files.length) return;
      
      const file = files[index];
      setIsLoadingFile(true);
      setIsPdfLoading(true);
      setPdfError(null);
      setCurrentFile(null); // Reset current file to prevent stale data
      
      try {
        setCurrentFile(file);
      setEditableSummary(file.summary || '');
        setIsEditing(false);
        
        if (editorRef.current) {
          editorRef.current.getInstance().setMarkdown(file.summary || '');
        }
        
        // Load PDF for the current file
        await loadPDF(file);
      } catch (error) {
        console.error('Failed to load file:', error);
        setPdfError('Failed to load file data.');
      } finally {
        setIsLoadingFile(false);
      }
    };

    if (isOpen && files && files.length > 0) {
      fetchFile();
    }
  }, [index, files?.length, isOpen]);

  // Sync editableSummary when currentFile.summary changes
  useEffect(() => {
    if (currentFile?.summary !== undefined) {
      setEditableSummary(currentFile.summary);
      // Update editor content if in edit mode
      if (editorRef.current && isEditing) {
        editorRef.current.getInstance().setMarkdown(currentFile.summary);
      }
    }
  }, [currentFile?.summary, isEditing]);

  const loadPDF = async (file: CaseFile) => {
    if (!file?.id) return;
    
    setLoading(true);
    setError(null);
    setIsPdfLoading(true);
    setPdfError(null);
    
    try {
      // Get the PDF URL from the storage API
      const response = await fetch(`/api/files/download/${file.id}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('PDF URL result:', result);
        if (result.success && result.url) {
          setPdfUrl(result.url);
        } else {
          throw new Error('Failed to get PDF URL');
        }
      } else {
        throw new Error('Failed to fetch PDF URL');
      }
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setLoading(false);
    }
  };

  // Handle PDF iframe load events
  const handleIframeLoad = () => {
    console.log('PDF iframe loaded successfully');
    setIsPdfLoading(false);
    setPdfError(null);
  };

  const handleIframeError = () => {
    console.error('PDF iframe failed to load');
    setIsPdfLoading(false);
    setPdfError('Failed to load PDF. Please try refreshing the page or contact support if the issue persists.');
  };

  // Reset PDF loading state when document changes
  useEffect(() => {
    if (currentFile && pdfUrl) {
      console.log('Resetting PDF loading state for new document');
      setIsPdfLoading(true);
      setPdfError(null);
    }
  }, [currentFile?.id, pdfUrl]);

  // Check if PDF should be available
  const isPdfAvailable = !isLoadingFile && pdfUrl && currentFile?.fileKey;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          if (confirm('Discard changes?')) {
            setIsEditing(false);
            setEditableSummary(currentFile?.summary || '');
            if (editorRef.current) {
              editorRef.current.getInstance().setMarkdown(currentFile?.summary || '');
            }
          }
        } else {
          onClose();
        }
      }
      if (!isEditing) {
        if (e.key === 'ArrowLeft' && index > 0) {
          setIndex((i) => Math.max(0, i - 1));
        }
        if (e.key === 'ArrowRight' && files && index < files.length - 1) {
          setIndex((i) => Math.min(files.length - 1, i + 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, files?.length, onClose, isEditing, currentFile?.summary]);

  const handleSave = async () => {
    if (!onSave || !currentFile) return;
    
    setIsSaving(true);
    try {
      // Get markdown content from Toast UI Editor
      const markdownContent = editorRef.current?.getInstance().getMarkdown() || editableSummary;
      
      await onSave(currentFile.id, markdownContent);
        setIsEditing(false);
      setCurrentFile(prev => prev ? { ...prev, summary: markdownContent } : null);
        console.log('Summary saved successfully');
    } catch (error) {
      console.error('Error saving summary:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditableSummary(currentFile?.summary || '');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditableSummary(currentFile?.summary || '');
    // Reset editor content
    if (editorRef.current) {
      editorRef.current.getInstance().setMarkdown(currentFile?.summary || '');
    }
  };

  const handleRegenerate = () => {
    setIsRegenerateModalOpen(true);
  };

  const handleRegenerateModalClose = () => {
    setIsRegenerateModalOpen(false);
    setRegenerateInstructions('');
  };

  const handleStartRegeneration = async () => {
    if (!currentFile?.id) return;
    
    setIsRegenerating(true);
    try {
      
      const response = await fetch(`/api/files/${currentFile.id}/regenerateSummary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructions: regenerateInstructions
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Regenerate summary result:', result);
        if (result.success && result.summary) {
          setEditableSummary(result.summary);
          setCurrentFile(prev => prev ? { ...prev, summary: result.summary } : null);
          setRegenerationKey(prev => prev + 1); // Force Viewer re-render
          setIsRegenerateModalOpen(false);
          setRegenerateInstructions('');
          console.log('Document summary regenerated successfully');
        } else {
          throw new Error(result.error || 'Failed to regenerate document summary');
        }
      } else {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to regenerate document summary');
      }
    } catch (error) {
      console.error('Error regenerating document summary:', error);
      alert(`Error regenerating document summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const canNavigatePrev = index > 0;
  const canNavigateNext = files && index < files.length - 1;

  // Show loading state if no file is loaded
  if (!currentFile && !isLoadingFile) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center">
        <div className="bg-ink-800 rounded-lg p-6 max-w-md w-full mx-4 text-center">
          <div className="w-12 h-12 border-3 border-ink-700 border-t-gold-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ink-300">Loading file...</p>
        </div>
      </div>
    );
  }

  if (!isOpen || !files || files.length === 0) return null;

  return (
    <>    
      <style jsx global>{`
        .pdf-viewer-editor-wrapper .toastui-editor-contents {
          color: var(--color-ink-300) !important;
          font-family: var(--font-body) !important;
          font-size: 15px !important;
          line-height: 1.6 !important;
        }
        .pdf-viewer-editor-wrapper .toastui-editor-contents p,
        .pdf-viewer-editor-wrapper .toastui-editor-contents li {
          color: var(--color-ink-300) !important;
        }
        .pdf-viewer-editor-wrapper .toastui-editor-contents h1,
        .pdf-viewer-editor-wrapper .toastui-editor-contents h2,
        .pdf-viewer-editor-wrapper .toastui-editor-contents h3,
        .pdf-viewer-editor-wrapper .toastui-editor-contents h4,
        .pdf-viewer-editor-wrapper .toastui-editor-contents h5,
        .pdf-viewer-editor-wrapper .toastui-editor-contents h6,
        .pdf-viewer-editor-wrapper .toastui-editor-contents strong,
        .pdf-viewer-editor-wrapper .toastui-editor-contents b {
          color: var(--color-ink-100) !important;
        }
        .pdf-viewer-editor-wrapper .toastui-editor-contents a {
          color: var(--color-gold-500) !important;
        }
        
        .toast-ui-editor .toastui-editor-contents {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .toast-ui-editor .toastui-editor-contents::-webkit-scrollbar {
          display: none;
        }
        .toast-ui-editor .toastui-editor-md-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .toast-ui-editor .toastui-editor-md-container::-webkit-scrollbar {
          display: none;
        }
        .toast-ui-editor .toastui-editor-ww-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .toast-ui-editor .toastui-editor-ww-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex flex-col">
        {/* Header */}
        <div className="flex-none bg-ink-900 border-b border-line-soft shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <h2 
                  className="text-lg font-semibold text-ink-100 truncate"
                  title={currentFile?.fileName || 'Loading...'}
                >
                  {currentFile?.fileName || 'Loading...'}
                </h2>
                <p className="text-sm text-ink-400">
                  File {index + 1} of {files?.length || 0}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 flex-shrink-0">
              {/* Navigation buttons */}
              <div className="flex items-center space-x-1">
                <button
                  disabled={!canNavigatePrev || isLoadingFile}
                  onClick={() => setIndex(i => i - 1)}
                  className="p-2 rounded-lg border border-line-strong disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink-700 transition-colors text-ink-100"
                  aria-label="Previous file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  disabled={!canNavigateNext || isLoadingFile}
                  onClick={() => setIndex(i => i + 1)}
                  className="p-2 rounded-lg border border-line-strong disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink-700 transition-colors text-ink-100"
                  aria-label="Next file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm font-medium text-ink-300 bg-ink-800 border border-line-strong rounded-lg hover:bg-ink-700 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm font-medium text-white bg-gold-500 border border-transparent rounded-lg hover:bg-gold-300 disabled:opacity-50 transition-colors flex items-center space-x-2"
                    >
                      {isSaving && (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                      <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 text-sm font-medium text-ink-300 bg-ink-800 border border-line-strong rounded-lg hover:bg-ink-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit Summary</span>
                  </button>
                )}

                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="px-4 py-2 text-sm font-medium text-ink-300 bg-ink-800 border border-line-strong rounded-lg hover:bg-ink-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                  aria-label="Regenerate"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Regenerate</span>
                </button>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 text-ink-400 hover:text-ink-100 transition-colors"
                aria-label="Close viewer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex min-h-0 bg-ink-800">
          {/* PDF Panel */}
          <div className="flex-1 flex flex-col bg-ink-900 border-r border-line-soft">
            <div className="flex-none px-4 py-3 bg-ink-800 border-b border-line-soft">
              <h3 className="text-sm font-medium text-ink-300">Document Preview</h3>
            </div>
            <div className="flex-1 relative">
              {isLoadingFile ? (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-800">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-8 h-8 border-3 border-ink-700 border-t-gold-500 rounded-full animate-spin" />
                    <p className="text-sm text-ink-400">Loading file...</p>
                  </div>
                </div>
              ) : isPdfAvailable ? (
                <div className="absolute inset-0">
                  {isPdfLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink-800 z-10">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-8 h-8 border-3 border-ink-700 border-t-gold-500 rounded-full animate-spin" />
                        <p className="text-sm text-ink-400">Loading PDF...</p>
                      </div>
                    </div>
                  )}
                  <iframe 
                    src={pdfUrl}
                    className="w-full h-full border-0"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    style={{ minHeight: '100%' }}
                    title={`PDF Viewer - ${currentFile?.fileName || 'Document'}`}
                  />
                  {/* Fallback for browsers that don't support iframe PDF viewing */}
                  <div className="absolute bottom-2 right-2 bg-ink-800 bg-opacity-90 rounded-lg p-2 shadow-sm">
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gold-500 hover:text-gold-300 flex items-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>Open in new tab</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-800">
                  <div className="text-center py-8 px-6">
                    <svg className="w-16 h-16 mx-auto mb-4 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-ink-100 mb-2">PDF Not Available</h3>
                    <p className="text-sm text-ink-300 mb-4">
                      The PDF file is not available for preview at this time. The document content has been extracted and is available in the summary panel.
                    </p>
                  </div>
                </div>
              )}
              
              {pdfError && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-900">
                  <div className="text-center py-8 px-6">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-rose-500" />
                    <h3 className="text-lg font-medium text-ink-100 mb-2">PDF Loading Error</h3>
                    <p className="text-sm text-ink-300 mb-4">{pdfError}</p>
                    <div className="bg-gold-500/10 border border-line-gold rounded-lg p-3">
                      <p className="text-xs text-gold-300">
                        <strong>Note:</strong> The document summary is still available in the panel on the right.
                      </p>
                    </div>
                    <button
                      onClick={() => currentFile && loadPDF(currentFile)}
                      className="mt-4 px-4 py-2 bg-gold-500 text-white rounded-md hover:bg-gold-300 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary Panel */}
          <div className="flex-1 flex flex-col bg-ink-900">
            <div className="flex-none px-4 py-3 bg-ink-800 border-b border-line-soft">
              <h3 className="text-sm font-medium text-ink-300">File Summary</h3>
            </div>
            
            <div className="flex-1 relative">
              {isLoadingFile ? (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-900">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-8 h-8 border-3 border-ink-700 border-t-gold-500 rounded-full animate-spin" />
                    <p className="text-sm text-ink-400">Loading file data...</p>
                  </div>
                </div>
              ) : isEditing ? (
                <div className="absolute inset-0 pdf-viewer-editor-wrapper">
                    <Editor
                      ref={editorRef}
                      initialValue={editableSummary}
                      height="100%"
                      initialEditType="wysiwyg"
                      hideModeSwitch={true}
                      useCommandShortcut={true}
                      theme="dark"
                      toolbarItems={[
                        ['heading', 'bold', 'italic'],
                        ['hr', 'quote'],
                        ['ul', 'ol'],
                        ['table', 'link'],
                        ['indent', 'outdent']
                      ]}
                      onChange={() => {
                        if (editorRef.current) {
                          setEditableSummary(editorRef.current.getInstance().getMarkdown());
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 overflow-auto pdf-viewer-editor-wrapper">
                    <div className="p-6">
                      {editableSummary ? (
                        <Viewer key={`viewer-${currentFile?.id}-${regenerationKey}`} initialValue={editableSummary} theme="dark" />
                      ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-ink-400">
                        <svg className="w-12 h-12 mb-3 text-ink-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm">No summary available for this document.</p>
                      </div>
                      )}
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="flex-none px-6 py-2 bg-ink-800 border-t border-line-soft">
          <p className="text-xs text-ink-400 text-center">
            {isEditing ? (
              <>Use <kbd className="px-1 py-0.5 text-xs font-semibold text-ink-100 bg-ink-700 border border-line-soft rounded">Esc</kbd> to cancel editing</>
            ) : (
              <>Use <kbd className="px-1 py-0.5 text-xs font-semibold text-ink-100 bg-ink-700 border border-line-soft rounded">←</kbd> <kbd className="px-1 py-0.5 text-xs font-semibold text-ink-100 bg-ink-700 border border-line-soft rounded">→</kbd> to navigate • <kbd className="px-1 py-0.5 text-xs font-semibold text-ink-100 bg-ink-700 border border-line-soft rounded">Esc</kbd> to close</>
            )}
          </p>
        </div>
      </div>

      {/* Regenerate Modal */}
      {isRegenerateModalOpen && (
        <div className="fixed inset-0 bg-ink-950/72 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-ink-900 border border-line-strong rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center space-x-3 px-6 py-4 border-b border-line-soft">
              <div className="w-10 h-10 bg-gold-500/15 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-ink-100">Regenerate Summary</h3>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4">
              <p className="text-sm text-ink-300 mb-4">Provide specific instructions for reanalysis</p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-ink-300 mb-1">Document:</label>
                <p className="text-sm text-ink-100 font-medium">{currentFile?.fileName || 'Unknown Document'}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-ink-300 mb-2">Additional Instructions (Optional)</label>
                <textarea
                  value={regenerateInstructions}
                  onChange={(e) => setRegenerateInstructions(e.target.value)}
                  placeholder="e.g., 'Focus on medical injuries and treatment details', 'Look for pain and suffering evidence', 'Check for lost wages and future medical costs'"
                  className="w-full px-3 py-2 border border-line-strong rounded-md bg-ink-800 text-ink-100 placeholder:text-ink-400 focus-gold resize-none"
                  rows={4}
                />
                <p className="text-xs text-ink-400 mt-1">Your message will be used to guide the AI analysis with higher priority.</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-ink-800 border-t border-line-soft rounded-b-lg">
              <button
                onClick={handleRegenerateModalClose}
                disabled={isRegenerating}
                className="px-4 py-2 text-sm font-medium text-ink-300 bg-ink-800 border border-line-strong rounded-md hover:bg-ink-700 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartRegeneration}
                disabled={isRegenerating}
                className="px-4 py-2 text-sm font-medium text-ink-950 bg-gold-500 border border-transparent rounded-md hover:bg-gold-300 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                {isRegenerating && (
                  <div className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}