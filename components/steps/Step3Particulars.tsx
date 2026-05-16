"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw } from "lucide-react";
import RegenerateParticularsModal from "../modals/RegenerateParticularsModal";
import MdxRenderer from "../MdxRenderer";
import dynamic from 'next/dynamic';
import Citation from "../Citation";
import MdxEditorComponent from "../MdxEditor";




// Dynamic imports to prevent SSR issues
const Editor = dynamic(
  () => import('@toast-ui/react-editor').then((mod) => mod.Editor),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
  }
);

const Viewer = dynamic(
  () => import('@toast-ui/react-editor').then((mod) => mod.Viewer),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
  }
);

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
  action, 
  generatedContent, 
  onGenerateContent, 
  onGeneratingStateChange,
  onEditingStateChange,
  onNextStep
}: Step3ParticularsProps) {
  // State for particulars content
  const [particularsContent, setParticularsContent] = useState<string>('');
  const [originalParticularsContent, setOriginalParticularsContent] = useState<string>(''); // Store original with fullTags
  const [isGeneratingParticulars, setIsGeneratingParticulars] = useState(false);
  const [hasGeneratedParticulars, setHasGeneratedParticulars] = useState(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFromDatabase, setIsLoadingFromDatabase] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
  const editorRef = useRef<any>(null);


  // Load particulars data from database
  const loadParticularsFromDatabase = useCallback(async () => {
    if (!caseId) return false;

    setIsLoadingFromDatabase(true);
    try {
      const response = await fetch(`/api/save/particulars?caseId=${caseId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data && data.data.particularsData) {
          setParticularsContent(data.data.particularsData);
          setOriginalParticularsContent(data.data.particularsData); // Store original with fullTags
          setHasGeneratedParticulars(true);
          // Store in localStorage
          localStorage.setItem('particulars_markdown', data.data.particularsData);
          return true; // Indicates data was loaded
        }
      }
      return false; // No data was loaded
    } catch (error) {
      console.error('Error loading particulars from database:', error);
      return false;
    } finally {
      setIsLoadingFromDatabase(false);
    }
  }, [caseId]);


  // Load saved data on mount
  useEffect(() => {
    if (caseId) {
      const loadData = async () => {
        // First try to load saved data from database
        const hasSavedData = await loadParticularsFromDatabase();
        
        // If no saved data, generate particulars
        if (!hasSavedData) {
          generateParticulars();
        }
      };
      
      loadData();
    }
  }, [caseId, loadParticularsFromDatabase]);

  // Generate particulars - fetch OCR data and generate particulars
  const generateParticulars = useCallback(async (userComment?: string) => {
    setIsGeneratingParticulars(true);
    setHasGeneratedParticulars(false);
    setErrorMessage(null); // Clear any previous errors
    onGeneratingStateChange?.(true);
    
    try {

      // Verify token balance
      const verifyTokenResponse = await fetch('/api/tokens/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estimateTokens: 1 })
      });
      const result = await verifyTokenResponse.json();  
      console.log("verifyTokenResponse", result);
      if (!result.is_enough_balance) {
        setShowInsufficientBalanceModal(true);
        return;
      }

      
      // Generate particulars
      const response = await fetch('/api/generate/particular', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId,
          userComment: userComment || undefined
        })
      });

      if (response.ok) {
        let data = await response.json();
        
        console.log("Particulars generated:", data);
        // The API now returns markdown content directly
        const markdownContent = data.content || '';
        
        setParticularsContent(markdownContent);
        setOriginalParticularsContent(markdownContent);
        setHasGeneratedParticulars(true);
        // Store in localStorage
        localStorage.setItem('particulars_markdown', markdownContent);
      } else {
        console.error('Failed to generate particulars');
        setErrorMessage('Failed to generate Particulars');
      }
    } catch (error) {
      console.error('Error generating particulars:', error);
      setErrorMessage('Failed to generate Particulars');
    } finally {
      setIsGeneratingParticulars(false);
      onGeneratingStateChange?.(false);
    }
  }, [caseId, onGeneratingStateChange]);

  // Handle regenerate modal
  const handleRegenerateClick = () => {
    setIsRegenerateModalOpen(true);
  };

  const handleRegenerateConfirm = (userComment: string) => {
    setIsRegenerateModalOpen(false);
    // Regenerate with user comment
    generateParticulars(userComment);
  };

  const handleRegenerateCancel = () => {
    setIsRegenerateModalOpen(false);
  };

  const handleCloseError = () => {
    setErrorMessage(null);
  };

  // Editor functions
  const handleEdit = () => {
    setParticularsContent(particularsContent);
    setIsEditing(true);
    onEditingStateChange?.(true);
  };

  const handleCancel = () => {
    setParticularsContent(originalParticularsContent);
    setIsEditing(false);
    onEditingStateChange?.(false);
    // Reset editor content
    if (editorRef.current) {
      editorRef.current.getInstance().setMarkdown(originalParticularsContent);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get markdown content from Toast UI Editor
      const editedContent = editorRef.current?.getInstance().getMarkdown() || particularsContent;
      
      
      setParticularsContent(editedContent);
      setOriginalParticularsContent(editedContent);
      
      // Store in localStorage
      localStorage.setItem('particulars_markdown', editedContent);
      
      // Save to database
      const response = await fetch('/api/save/particulars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId,
          particularsData: editedContent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save to database');
      }

      setIsEditing(false);
      onEditingStateChange?.(false);
      console.log('Particulars saved successfully');
    } catch (error) {
      console.error('Error saving particulars:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };


  // Load Toast UI Editor CSS dynamically
  useEffect(() => {
    const loadToastUICSS = () => {
      if (typeof window !== 'undefined' && !document.querySelector('link[href*="toastui-editor.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/@toast-ui/editor@3.2.2/dist/toastui-editor.min.css';
        document.head.appendChild(link);
      }
    };
    loadToastUICSS();
  }, []);


  // Show loading spinner while generating particulars or loading from database
  if (isGeneratingParticulars || isLoadingFromDatabase) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isLoadingFromDatabase ? 'Loading Particulars' : 'Generating Particulars'}
          </h1>
          <p className="text-gray-600">
            {isLoadingFromDatabase 
              ? 'Loading saved particulars from database...' 
              : 'AI is analyzing your case and generating claim particulars...'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
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
      
    <div>
        {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Particulars of Claim Items and Amount</h2>
            <p className="text-gray-600">AI-generated particulars based on your case documents. Edit as needed.</p>
          </div>
          <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                  >
                    {isSaving && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit Particulars</span>
                  </button>
            <button
              onClick={handleRegenerateClick}
              disabled={isGeneratingParticulars}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isGeneratingParticulars ? 'animate-spin' : ''}`} />
              {isGeneratingParticulars ? 'Regenerating...' : 'Regenerate'}
            </button>
                </>
              )}
          </div>
        </div>
      </div>

        {/* Markdown Editor/Viewer */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {isEditing ? (
            <MdxEditorComponent
            initialMarkdown={particularsContent}
            onChange={setParticularsContent}
            className="mb-6"
          />
          ) : (
            <div className="p-6">
              {particularsContent ? (
                <MdxRenderer 
                  source={particularsContent} 
                  components={{ Citation }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">No particulars available. Click "Regenerate" to generate particulars from your case documents.</p>
              </div>
          )}
        </div>
          )}
      </div>

      {/* Regenerate Modal */}
      <RegenerateParticularsModal
        isOpen={isRegenerateModalOpen}
        onClose={handleRegenerateCancel}
        onConfirm={handleRegenerateConfirm}
        isGenerating={isGeneratingParticulars}
      />

      {/* Error Popup */}
      {errorMessage && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">
                  Error
                </h3>
              </div>
              <button
                onClick={handleCloseError}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">{errorMessage}</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => handleRegenerateConfirm('')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Balance Modal */}
      {showInsufficientBalanceModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">
                  Insufficient Balance
                </h3>
              </div>
              <button
                onClick={() => setShowInsufficientBalanceModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                You don't have enough tokens to generate particulars. Please top up your account to continue.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-orange-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-orange-800">
                    <strong>Need more tokens?</strong> Visit your account settings to purchase additional tokens.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowInsufficientBalanceModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowInsufficientBalanceModal(false);
                  // You can add navigation to account/top-up page here
                  window.open('https://platform.makebell.com/tokens/purchase', '_blank');
                }}
                className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                Top Up Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}