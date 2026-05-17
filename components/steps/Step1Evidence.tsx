"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, File, Image, Video, Trash2, Eye, Plus, Download, Scissors, X, AlertTriangle } from "lucide-react";
import { Case, CaseParty, CaseFile, CaseEvidenceType } from "@/types/case";
import PdfSplitDrawer from "../PdfSplitDrawer";


export default function Step1Evidence({ caseData, onPendingUploadsChange }: { caseData: Case; onPendingUploadsChange?: (hasPending: boolean) => void }) {
  const [editableItems, setEditableItems] = useState<CaseEvidenceType[]>([]);
  const [evidenceData, setEvidenceData] = useState<Record<string, { files: File[]; uploading: boolean; uploadedFiles: CaseFile[]; showSuccess: boolean }>>({});
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hasPendingUploads, setHasPendingUploads] = useState(false);
  const [isLoadingEvidenceTypes, setIsLoadingEvidenceTypes] = useState(true);
  const [showFileSizeModal, setShowFileSizeModal] = useState(false);
  const [oversizedFiles, setOversizedFiles] = useState<string[]>([]);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);

  // Fetch evidence types from database
  useEffect(() => {
    const fetchEvidenceTypes = async () => {
      try {
        setIsLoadingEvidenceTypes(true);
        const response = await fetch(`/api/cases/${caseData.id}/evidence-types`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch evidence types');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          setEditableItems(result.data);
          
          // Initialize evidenceData for each evidence type
          const initialEvidenceData: Record<string, { files: File[]; uploading: boolean; uploadedFiles: CaseFile[]; showSuccess: boolean }> = 
            result.data.reduce((acc: any, item: CaseEvidenceType) => ({
              ...acc,
              [item.key]: { files: [], uploading: false, uploadedFiles: [], showSuccess: false }
            }), {});

          // Populate uploadedFiles from caseData.files
          caseData.files?.forEach(file => {
            if (initialEvidenceData[file.type]) {
              initialEvidenceData[file.type].uploadedFiles.push(file);
            }
          });
          
          setEvidenceData(initialEvidenceData);
        }
      } catch (error) {
        console.error('Error fetching evidence types:', error);
        // Use empty array if fetch fails
        setEditableItems([]);
      } finally {
        setIsLoadingEvidenceTypes(false);
      }
    };

    if (caseData.id) {
      fetchEvidenceTypes();
    }
  }, [caseData.id]);

  // Function to check if there are any pending uploads
  const checkPendingUploads = () => {
    const hasPending = Object.values(evidenceData).some(item => item.uploading);
    setHasPendingUploads(hasPending);
    onPendingUploadsChange?.(hasPending);
  };

  // Update pending uploads state whenever evidenceData changes
  useEffect(() => {
    checkPendingUploads();
  }, [evidenceData]);

  const updateEvidenceItem = (key: string, field: 'files' | 'uploading' | 'uploadedFiles' | 'showSuccess', value: File[] | CaseFile[] | boolean) => {
    setEvidenceData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { files: [], uploading: false, uploadedFiles: [], showSuccess: false }),
        [field]: value
      }
    }));
  };

  const handleFileUpload = async (key: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
      if (files) {
        const fileArray = Array.from(files);
        
        // Check file sizes (100MB = 100 * 1024 * 1024 bytes)
        const maxFileSize = 100 * 1024 * 1024; // 100MB in bytes
        const oversizedFiles = fileArray.filter(file => file.size > maxFileSize);
        
        if (oversizedFiles.length > 0) {
          const fileNames = oversizedFiles.map(file => file.name);
          setOversizedFiles(fileNames);
          setShowFileSizeModal(true);
          // Clear the input
          event.target.value = '';
          return;
        }
        
        // Verify token balance first
        try {
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
            // Clear the input
            event.target.value = '';
            return;
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          alert('Failed to verify token balance. Please try again.');
          // Clear the input
          event.target.value = '';
          return;
        }
        
        // Update UI immediately
      updateEvidenceItem(key, 'files', fileArray);
      updateEvidenceItem(key, 'uploading', true);
      
      // Upload files to server
      try {
        const uploadedFiles = [];
        for (const file of fileArray) {
          const result = await uploadFile(key, file);
          uploadedFiles.push(result.data);
        }
        
        // Update with uploaded file info (append to existing files)
        const currentUploadedFiles = evidenceData[key as keyof typeof evidenceData]?.uploadedFiles || [];
        const newCaseFiles: CaseFile[] = uploadedFiles.map(file => ({
          id: String(file.id),
          type: file.type,
          fileName: file.fileName,
          fileKey: file.fileKey,
          caseId: caseData.id
        }));
        updateEvidenceItem(key, 'uploadedFiles', [...currentUploadedFiles, ...newCaseFiles]);
        updateEvidenceItem(key, 'uploading', false);
        updateEvidenceItem(key, 'files', []); // Clear the files array after successful upload
        updateEvidenceItem(key, 'showSuccess', true);
        
        // Hide success message after 3 seconds
        const timeoutId = setTimeout(() => {
          updateEvidenceItem(key, 'showSuccess', false);
          timeoutRefs.current.delete(key); // Clean up the ref
        }, 3000);
        
        // Store timeout ID for cleanup
        timeoutRefs.current.set(key, timeoutId);
        
        console.log(`Successfully uploaded ${fileArray.length} file(s) for ${key}`);
      } catch (error) {
        console.error('Upload failed:', error);
        updateEvidenceItem(key, 'uploading', false);
        updateEvidenceItem(key, 'files', []); // Clear the files array even on error
        // You could add a toast notification here
        alert('Upload failed. Please try again.');
      }
    }
  };

  const uploadFile = async (evidenceType: string, file: File) => {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('caseId', caseData.id);
    formData.append('evidenceType', evidenceType);

    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Upload failed: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    
    // Return the first uploaded file result
    if (result.success) {
      return {
        data: {
          id: result.data.fileId,
          type: evidenceType, // Map evidenceType to type to match CaseFile interface
          fileName: result.data.fileName,
          fileKey: result.data.fileKey,
        }
      };
    }
    
    throw new Error('No files were uploaded');
  };

  // Add new row function
  const addNewRow = () => {
    const tempKey = `temp-${Date.now()}`;
    const newItem: CaseEvidenceType = {
      id: tempKey,
      caseId: caseData.id,
      key: tempKey,
      title: '',
      description: '',
      isDefault: false,
      displayOrder: editableItems.length + 1,
    };
    setEditableItems(prev => [...prev, newItem]);
    setEditingItem(tempKey);
  };

  // Update item title
  const updateItemTitle = (key: string, value: string) => {
    setEditableItems(prev => prev.map((item) => 
      item.key === key ? { ...item, title: value } : item
    ));
  };

  // Update item description
  const updateItemDescription = (key: string, value: string) => {
    setEditableItems(prev => prev.map((item) => 
      item.key === key ? { ...item, description: value } : item
    ));
  };

  // Save editing changes
  const saveEditing = async (key: string) => {
    const item = editableItems.find(i => i.key === key);
    
    if (!item) return;
    
    // Only save custom (non-default) items
    if (!item.isDefault) {
      // Check if this is a new item (temporary ID)
      if (key.startsWith('temp-')) {
        try {
          // Create new custom evidence type via API
          const response = await fetch(`/api/cases/${caseData.id}/evidence-types`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: item.title,
              description: item.description,
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to create custom evidence type');
          }
          
          const result = await response.json();
          
          if (result.success && result.data) {
            // Replace the temporary item with the real one from the server
            setEditableItems(prev => prev.map(i => 
              i.key === key ? result.data : i
            ));
            
            // Initialize evidence data for the new type
            setEvidenceData(prev => ({
              ...prev,
              [result.data.key]: { files: [], uploading: false, uploadedFiles: [], showSuccess: false }
            }));
          }
        } catch (error) {
          console.error('Error creating custom evidence type:', error);
          alert('Failed to create custom evidence type. Please try again.');
          return;
        }
      } else {
        // Update existing custom evidence type via API
        try {
          const response = await fetch(`/api/cases/${caseData.id}/evidence-types`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              evidenceTypeId: item.id,
              title: item.title,
              description: item.description,
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to update custom evidence type');
          }
          
          const result = await response.json();
          
          if (result.success && result.data) {
            // Update the item with the server response
            setEditableItems(prev => prev.map(i => 
              i.id === item.id ? result.data : i
            ));
          }
        } catch (error) {
          console.error('Error updating custom evidence type:', error);
          alert('Failed to update custom evidence type. Please try again.');
          return;
        }
      }
    }
    
    setEditingItem(null);
  };

  // Cancel editing and remove the item if it's a new one
  const cancelEditing = (key: string) => {
    if (key.startsWith('temp-')) {
      // Only remove temporary items that haven't been saved yet
      setEditableItems(prev => prev.filter(item => item.key !== key));
    }
    // For existing items (including saved custom ones), just exit edit mode
    setEditingItem(null);
  };

  // Delete uploaded file
  const handleDeleteFile = async (fileId: string, evidenceType: string) => {
    console.log('Attempting to delete file:', { fileId, evidenceType });
    
    if (!fileId) {
      console.error('File ID is undefined!');
      alert('Error: File ID is missing. Cannot delete file.');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
        // Use new database API for files loaded from database
        const response = await fetch(`/api/files/${fileId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Delete failed');
        }

      // Remove file from local state
      setEvidenceData(prev => ({
        ...prev,
        [evidenceType]: {
          ...prev[evidenceType],
          uploadedFiles: prev[evidenceType]?.uploadedFiles.filter((file: any) => file.id !== fileId) || []
        }
      }));


      console.log('File deleted successfully');
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  


  // Handle files uploaded from PDF splitter
  const handleFilesUploaded = (evidenceType: string, files: any[]) => {
    const currentUploadedFiles = evidenceData[evidenceType]?.uploadedFiles || [];
    const newCaseFiles = files.map(file => ({
      id: file.id,
      type: file.type,
      fileName: file.fileName,
      fileKey: file.fileKey,
      caseId: caseData.id
    }));
    
    updateEvidenceItem(evidenceType, 'uploadedFiles', [...currentUploadedFiles, ...newCaseFiles]);
    updateEvidenceItem(evidenceType, 'showSuccess', true);
    
    // Hide success message after 3 seconds
    const timeoutId = setTimeout(() => {
      updateEvidenceItem(evidenceType, 'showSuccess', false);
    }, 3000);
    
    console.log(`Successfully added ${files.length} split file(s) to ${evidenceType}`);
  };

  // Calculate total uploaded files
  const totalUploadedFiles = Object.values(evidenceData).reduce((total, item) => total + (item.uploadedFiles?.length || 0), 0);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-ink-950)] mb-2">Evidence checklist. Upload Your Evidence</h2>
            <p className="text-[var(--color-ink-500)]">Select the types of supporting documents you have and upload them (Max 100MB/file)</p>
          </div>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Scissors className="w-4 h-4" />
            AI Split PDF
          </button>
        </div>
      </div>

      {/* Evidence Checklist Table */}
      <div className="bg-white border border-[var(--color-line)] rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-[var(--color-line)]">
          <thead className="bg-[var(--color-cream-50)]">
            <tr>
               <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-ink-700)] uppercase tracking-wider">
                 Type of Supporting Document
               </th>
               <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-ink-700)] uppercase tracking-wider w-[48rem]">
                 Upload
               </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[var(--color-line)]">
            {isLoadingEvidenceTypes ? (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-[var(--color-saffron-500)] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[var(--color-ink-500)]">Loading evidence types...</span>
                  </div>
                </td>
              </tr>
            ) : editableItems.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-[var(--color-ink-500)]">
                  No evidence types found. Click "Add Custom Evidence Type" to add one.
                </td>
              </tr>
            ) : (
              editableItems.map((item, index) => (
              <tr key={item.key} className="hover:bg-[var(--color-cream-50)]">
                <td className="px-6 py-4">
                  <div>
                    {editingItem === item.key ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItemTitle(item.key, e.target.value)}
                          className="text-black w-full px-3 py-2 text-sm border border-[var(--color-line-strong)] rounded-md focus:ring-2 focus:ring-[var(--color-saffron-500)] focus:border-[var(--color-saffron-500)]"
                          placeholder="Enter document type"
                        />
                        <textarea
                          value={item.description || ''}
                          onChange={(e) => updateItemDescription(item.key, e.target.value)}
                          className="text-black w-full px-3 py-2 text-sm border border-[var(--color-line-strong)] rounded-md focus:ring-2 focus:ring-[var(--color-saffron-500)] focus:border-[var(--color-saffron-500)]"
                          rows={2}
                          placeholder="Enter description"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveEditing(item.key)}
                            className="px-3 py-1.5 text-sm bg-[var(--color-emerald-500)] text-white rounded-md hover:bg-[var(--color-emerald-500)] transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => cancelEditing(item.key)}
                            className="px-3 py-1.5 text-sm bg-[var(--color-cream-50)]0 text-white rounded-md hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-[var(--color-ink-950)] mb-1">
                            {item.title || 'Untitled'}
                            {!item.isDefault && (
                              <span className="ml-2 text-xs text-[var(--color-ink-500)] bg-[var(--color-cream-100)] px-2 py-0.5 rounded">Custom</span>
                            )}
                          </div>
                          <div className="text-sm text-[var(--color-ink-500)] leading-relaxed">{item.description || 'No description'}</div>
                        </div>
                        {!item.isDefault && (
                          <button
                            onClick={() => setEditingItem(item.key)}
                            className="ml-2 text-[var(--color-saffron-600)] hover:text-[var(--color-ink-800)] text-xs underline"
                            title="Edit custom evidence type"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    {/* Upload Area */}
                    <div className="relative">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => handleFileUpload(item.key, e)}
                        className="hidden"
                        id={`file-upload-${item.key}`}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                        disabled={evidenceData[item.key as keyof typeof evidenceData]?.uploading || editingItem === item.key}
                      />
                      
                      <label
                        htmlFor={`file-upload-${item.key}`}
                        className={`block w-full px-3 py-2 text-sm rounded-lg border-2 border-dashed transition-all duration-200 ${
                          !evidenceData[item.key as keyof typeof evidenceData]?.uploading && editingItem !== item.key
                            ? 'border-[var(--color-saffron-500)]/40 bg-[var(--color-saffron-500)]/10 text-[var(--color-saffron-600)] hover:border-[var(--color-saffron-400)] hover:bg-[var(--color-saffron-500)]/15 cursor-pointer'
                            : 'border-[var(--color-line-strong)] bg-[var(--color-cream-50)] text-[var(--color-ink-300)] cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-center space-x-2">
                          {evidenceData[item.key as keyof typeof evidenceData]?.uploading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-[var(--color-saffron-500)] border-t-transparent rounded-full animate-spin"></div>
                              <span className="font-medium">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span className="font-medium">Upload Files</span>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                    
                    {/* File Status */}
                    {evidenceData[item.key as keyof typeof evidenceData]?.uploadedFiles && 
                     evidenceData[item.key as keyof typeof evidenceData]?.uploadedFiles.length > 0 && (
                      <div className="space-y-1.5">
                        {/* Success Message - Shows temporarily after upload */}
                        {evidenceData[item.key as keyof typeof evidenceData]?.showSuccess && (
                          <div className="text-sm text-[var(--color-emerald-500)] text-center font-medium animate-pulse">
                            ✓ {evidenceData[item.key as keyof typeof evidenceData]?.uploadedFiles.length} file(s) uploaded successfully
                          </div>
                        )}
                        {/* Uploaded Files List */}
                        <div className="space-y-1.5">
                          {evidenceData[item.key as keyof typeof evidenceData]?.uploadedFiles.map((file: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-sm text-[var(--color-ink-700)] bg-[var(--color-cream-50)] px-2 py-1.5 rounded-md border">
                              <span className="truncate flex-1" title={file.fileName}>
                                📄 {file.fileName.length > 96 ? file.fileName.substring(0, 96) + '...' : file.fileName}
                              </span>
                              <div className="flex items-center space-x-1 ml-2">
                                {/* <button
                                  onClick={() => handleDownloadFile(file.filePath, file.originalName)}
                                  className="text-[var(--color-saffron-500)] hover:text-[var(--color-saffron-600)] p-1 rounded hover:bg-[var(--color-saffron-500)]/10 transition-colors"
                                  title="Download file"
                                >
                                  <Download className="w-4 h-4" />
                                </button> */}
                                <button
                                  onClick={() => handleDeleteFile(file.id, item.key)}
                                  className="text-[var(--color-rose-500)] hover:text-[var(--color-rose-500)] p-1 rounded hover:bg-[var(--color-rose-500)]/10 transition-colors"
                                  title="Delete file"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
        
        {/* Add Row Button */}
        <div className="bg-[var(--color-cream-50)] px-6 py-3 border-t border-[var(--color-line)]">
          <button
            onClick={addNewRow}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--color-saffron-600)] bg-[var(--color-saffron-500)]/10 border border-[var(--color-saffron-500)]/30 rounded-md hover:bg-[var(--color-saffron-500)]/15 focus:outline-none focus:ring-2 focus:ring-[var(--color-saffron-500)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Custom Evidence Type
          </button>
        </div>
      </div>

      {/* Upload Summary */}
      {totalUploadedFiles > 0 && (
        <div className="mt-4 p-3 bg-[var(--color-saffron-500)]/10 rounded-lg border border-[var(--color-saffron-500)]/30">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-[var(--color-ink-950)] text-sm">Upload Summary</h4>
            <div className="text-sm">
              <span className="text-[var(--color-saffron-600)] font-medium">Total Files:</span>
              <span className="ml-2 text-[var(--color-ink-800)] font-semibold">
                {totalUploadedFiles}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PDF Split Drawer */}
      <PdfSplitDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        caseData={caseData}
        onFilesUploaded={handleFilesUploaded}
      />

      {/* File Size Limit Modal */}
      {showFileSizeModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-line)]">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[var(--color-rose-500)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-ink-950)]">
                  File Size Limit Exceeded
                </h3>
              </div>
              <button
                onClick={() => setShowFileSizeModal(false)}
                className="text-[var(--color-ink-300)] hover:text-[var(--color-ink-500)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-[var(--color-ink-700)] mb-4">
                The following files exceed the 100MB limit and cannot be uploaded:
              </p>
              
              <div className="bg-[var(--color-rose-500)]/10 border border-[var(--color-rose-500)]/30 rounded-lg p-4 mb-4">
                <ul className="space-y-2">
                  {oversizedFiles.map((fileName, index) => (
                    <li key={index} className="text-sm text-[var(--color-rose-500)] flex items-start">
                      <span className="mr-2">•</span>
                      <span className="break-all">{fileName}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <p className="text-sm text-[var(--color-ink-500)] mb-6">
                Please select smaller files or split your files before uploading.
              </p>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setShowFileSizeModal(false)}
                  className="px-4 py-2 bg-[var(--color-saffron-500)] text-white rounded-lg hover:bg-[var(--color-saffron-600)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-saffron-500)]"
                >
                  OK
                </button>
              </div>
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
                  <svg className="h-6 w-6 text-[var(--color-saffron-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-medium text-[var(--color-ink-950)]">
                  Insufficient Balance
                </h3>
              </div>
              <button
                onClick={() => setShowInsufficientBalanceModal(false)}
                className="text-[var(--color-ink-300)] hover:text-[var(--color-ink-500)] transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-6">
              <p className="text-sm text-[var(--color-ink-500)] mb-4">
                You don't have enough tokens to upload files. Please top up your account to continue.
              </p>
              <div className="bg-[var(--color-saffron-500)]/10 border border-[var(--color-saffron-500)]/30 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-[var(--color-saffron-600)] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-[var(--color-saffron-600)]">
                    <strong>Need more tokens?</strong> Visit your account settings to purchase additional tokens.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowInsufficientBalanceModal(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] bg-white border border-[var(--color-line-strong)] rounded-lg hover:bg-[var(--color-cream-50)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowInsufficientBalanceModal(false);
                  // Top-up flow is not part of Vakil — left as a no-op.
                }}
                className="px-4 py-2 bg-[var(--color-saffron-500)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-saffron-600)] transition-colors"
              >
                Top Up Account
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
