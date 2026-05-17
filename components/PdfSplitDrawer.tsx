"use client";

import { useState, useEffect } from "react";
import { X, Scissors, Upload, File, Brain, Loader2, AlertTriangle } from "lucide-react";
import { Case, SplitSegment, FileRecord, CaseEvidenceType } from "@/types/case";
import PdfSplitter from "./PdfSplitter";
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import '@/lib/pdfjs-config';

// Types for intelligent splitting
interface SplitSegmentSuggestion {
  id: string;
  fromPage: number;
  toPage: number;
  suggestedName: string;
  suggestedCategory: string;
  confidence: number;
  description: string;
  documentType: string;
}

interface IntelligentAnalysisResult {
  success: boolean;
  data?: {
    totalPages: number;
    suggestedSegments: SplitSegmentSuggestion[];
    analysisConfidence: number;
  };
  error?: string;
}

// Types for PDF.js
type PDFDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<any>;
  destroy: () => void;
};

interface PdfSplitDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case;
  onFilesUploaded?: (evidenceType: string, files: any[]) => void;
}

export default function PdfSplitDrawer({ isOpen, onClose, caseData, onFilesUploaded }: PdfSplitDrawerProps) {
  // PDF Splitter state
  const [splitSegments, setSplitSegments] = useState<SplitSegment[]>([]);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [activeFile, setActiveFile] = useState<FileRecord | null>(null);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splittingAction, setSplittingAction] = useState<'upload' | 'download' | null>(null);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdfSplitter, setShowPdfSplitter] = useState(false);
  
  // Intelligent analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<IntelligentAnalysisResult | null>(null);
  const [useIntelligentMode, setUseIntelligentMode] = useState(true); // Always start with AI mode
  const [hasAIData, setHasAIData] = useState(false);
  
  // Evidence types from database
  const [evidenceTypes, setEvidenceTypes] = useState<CaseEvidenceType[]>([]);
  
  // File size validation states
  const [showFileSizeModal, setShowFileSizeModal] = useState(false);
  const [oversizedFiles, setOversizedFiles] = useState<{name: string, size: number}[]>([]);
  
  // Fetch evidence types when drawer opens
  useEffect(() => {
    const fetchEvidenceTypes = async () => {
      if (isOpen && caseData.id) {
        try {
          const response = await fetch(`/api/cases/${caseData.id}/evidence-types`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              setEvidenceTypes(result.data);
            }
          }
        } catch (error) {
          console.error('Error fetching evidence types:', error);
        }
      }
    };
    
    fetchEvidenceTypes();
  }, [isOpen, caseData.id]);

  // PDF file selection and loading
  const handlePdfFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedPdfFile(file);
      setLoadingPdf(true);
      
      try {
        // Create object URL for local file
        const fileUrl = URL.createObjectURL(file);
        setPdfUrl(fileUrl);
        
        // Load PDF document using dynamic import
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        
        // Configure worker if not already configured
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          //pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.min.mjs`;
          pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;
        }
        
        const pdfDoc = await pdfjsLib.getDocument({ url: fileUrl }).promise;
        setPdfDocument(pdfDoc);
        
        // Create a mock FileRecord for the selected file
        const mockFileRecord: FileRecord = {
          id: `local-${Date.now()}`,
          fileName: file.name,
          fileKey: fileUrl,
          caseId: caseData.id,
          type: 'pdf',
          createdAt: new Date(),
          updatedAt: new Date(),
          processingStatus: 'completed',
          ocrData: null,
          errorMessage: null,
          entities: null,
          documentDate: null,
          summary: null,
          orderIndex: null,
          itemNumber: undefined,
          startPageNumber: undefined,
          continuousItemNumber: undefined,
          continuousPageStart: undefined,
          continuousPageEnd: undefined
        };
        
        setActiveFile(mockFileRecord);
        
        // Always try intelligent analysis first
        await performIntelligentAnalysis(file);
        
      } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF file');
      } finally {
        setLoadingPdf(false);
      }
    } else {
      alert('Please select a valid PDF file');
    }
  };

  // Perform intelligent analysis
  const performIntelligentAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caseId', caseData.id);
      
      const response = await fetch('/api/analyze-pdf-split', {
        method: 'POST',
        body: formData,
      });
      
      const result: IntelligentAnalysisResult = await response.json();
      
      if (result.success && result.data) {
        setAnalysisResult(result);
        
        // Convert AI suggestions to split segments
        const aiSegments: SplitSegment[] = result.data.suggestedSegments.map(suggestion => ({
          id: suggestion.id,
          from: suggestion.fromPage,
          to: suggestion.toPage,
          name: suggestion.suggestedName,
          category: suggestion.suggestedCategory
        }));
        
        console.log('Setting AI segments:', aiSegments); // Debug log
        
        setSplitSegments(aiSegments);
        setHasAIData(true); // Mark that we have AI-generated data
        setShowPdfSplitter(true); // Go directly to PDF splitter
        
        // Update the PDF document total pages if we got it from AI
        if (pdfDocument && result.data.totalPages && result.data.totalPages !== pdfDocument.numPages) {
          console.log(`AI detected ${result.data.totalPages} pages, PDF.js detected ${pdfDocument.numPages} pages`);
        }
        
        console.log(`AI Analysis completed: ${aiSegments.length} segments suggested with ${(result.data.analysisConfidence * 100).toFixed(1)}% confidence - proceeding directly to splitter`);
      } else {
        console.error('AI Analysis failed:', result.error);
        
        // Show more user-friendly error messages
        let errorMessage = result.error || 'Unknown error occurred';
        if (errorMessage.includes('AI service not configured')) {
          errorMessage = 'AI analysis is currently unavailable. Please use manual mode.';
        } else if (errorMessage.includes('File size exceeds') || errorMessage.includes('20MB limit')) {
          errorMessage = 'File is too large for AI analysis (max 20MB). Please use manual mode or reduce file size.';
        } else if (errorMessage.includes('timed out') || errorMessage.includes('taking too long')) {
          errorMessage = 'AI analysis timed out. The file may be too complex. Please try manual mode or use a simpler PDF.';
        } else if (errorMessage.includes('service is busy') || errorMessage.includes('UNAVAILABLE')) {
          errorMessage = 'AI service is currently busy. Please try again later or use manual mode.';
        } else if (errorMessage.includes('Failed to upload file to AI service')) {
          errorMessage = 'Could not process file with AI. Please try manual mode.';
        }
        
        // Show a less prominent notification instead of alert
        console.warn(`AI Analysis failed: ${errorMessage} Falling back to manual mode.`);
        
        // Fall back to manual mode
        setUseIntelligentMode(false);
        setShowPdfSplitter(true);
        addSegment();
        
        // Show a subtle notification that we fell back to manual mode
        setTimeout(() => {
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 right-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg shadow-md z-50';
          notification.innerHTML = '⚠️ AI analysis unavailable. Using manual mode.';
          document.body.appendChild(notification);
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 5000);
        }, 100);
      }
      
    } catch (error) {
      console.error('Error during intelligent analysis:', error);
      console.warn('Failed to analyze PDF with AI. Falling back to manual mode.');
      
      // Fall back to manual mode
      setUseIntelligentMode(false);
      setShowPdfSplitter(true);
      addSegment();
      
      // Show a subtle notification that we fell back to manual mode
      setTimeout(() => {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg shadow-md z-50';
        notification.innerHTML = '⚠️ AI analysis failed. Using manual mode.';
        document.body.appendChild(notification);
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 5000);
      }, 100);
    } finally {
      setIsAnalyzing(false);
    }
  };

  

  // PDF Splitter functions
  const addSegment = () => {
    const newSegment: SplitSegment = {
      id: `segment-${Date.now()}`,
      from: '',
      to: '',
      name: '',
      category: ''
    };
    setSplitSegments(prev => [...prev, newSegment]);
  };

  const updateSegment = (id: string, updates: Partial<SplitSegment>) => {
    setSplitSegments(prev => 
      prev.map(segment => 
        segment.id === id ? { ...segment, ...updates } : segment
      )
    );
  };

  const removeSegment = (id: string) => {
    setSplitSegments(prev => prev.filter(segment => segment.id !== id));
  };

  // Upload function similar to Step1Evidence
  const uploadFile = async (evidenceType: string, file: File, filename?: string) => {
    console.log('Uploading file:', file.name, 'Type:', file.type, 'Size:', file.size); // Debug log
    
    const formData = new FormData();
    // If we have a custom filename, append with that name
    if (filename) {
      formData.append('files', file, filename);
    } else {
      formData.append('files', file);
    }
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
    
    if (result.success) {
      return {
        data: {
          id: result.data.fileId,
          type: evidenceType,
          fileName: result.data.fileName,
          fileKey: result.data.fileKey,
        }
      };
    }
    
    throw new Error('No files were uploaded');
  };

  const splitAndDownload = async () => {
    if (!selectedPdfFile || !pdfDocument || splitSegments.length === 0) {
      alert('Please select a PDF and define split segments first');
      return;
    }

    setIsSplitting(true);
    setSplittingAction('download');
    try {
      // Read the original PDF file as array buffer
      const arrayBuffer = await selectedPdfFile.arrayBuffer();
      const originalPdf = await PDFDocument.load(arrayBuffer);
      
      // Create a new ZIP file
      const zip = new JSZip();
      let totalAdded = 0;
      
      // Process each segment and add to ZIP
      for (const segment of splitSegments) {
        if (segment.from === '' || segment.to === '' || !segment.name || !segment.category) {
          continue; // Skip invalid segments
        }
        
        const fromPage = typeof segment.from === 'number' ? segment.from : parseInt(String(segment.from));
        const toPage = typeof segment.to === 'number' ? segment.to : parseInt(String(segment.to));
        
        if (isNaN(fromPage) || isNaN(toPage) || fromPage > toPage) {
          console.warn(`Invalid page range for segment: ${segment.name}`);
          continue;
        }
        
        // Create new PDF for this segment
        const newPdf = await PDFDocument.create();
        
        // Copy pages from original PDF (pdf-lib uses 0-based indexing)
        const pageIndices = [];
        for (let i = fromPage - 1; i < toPage && i < originalPdf.getPageCount(); i++) {
          pageIndices.push(i);
        }
        
        const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
        copiedPages.forEach((page) => newPdf.addPage(page));
        
        // Generate PDF bytes
        const pdfBytes = await newPdf.save();
        
        // Create filename
        const filename = `${segment.name.trim() || `segment-${fromPage}-${toPage}`}.pdf`;
        
        // Add to ZIP file
        zip.file(filename, pdfBytes);
        totalAdded++;
      }
      
      if (totalAdded === 0) {
        alert('No valid segments to split and download. Please check your page ranges, names, and categories.');
        return;
      }
      
      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Create download link for the ZIP file
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedPdfFile.name.replace('.pdf', '')}-split.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Show success message
      alert(`Successfully downloaded ${totalAdded} PDF file(s) in a ZIP archive!`);
      
      // Close the drawer after successful download
      onClose();
      
    } catch (error) {
      console.error('Error splitting and downloading PDF:', error);
      alert(`Error splitting and downloading PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSplitting(false);
      setSplittingAction(null);
    }
  };

  const splitAndUpload = async () => {
    if (!selectedPdfFile || !pdfDocument || splitSegments.length === 0) {
      alert('Please select a PDF and define split segments first');
      return;
    }

    setIsSplitting(true);
    setSplittingAction('upload');
    try {
      // Read the original PDF file as array buffer
      const arrayBuffer = await selectedPdfFile.arrayBuffer();
      const originalPdf = await PDFDocument.load(arrayBuffer);
      
      // Check file sizes before processing (100MB = 100 * 1024 * 1024 bytes)
      const maxFileSize = 100 * 1024 * 1024; // 100MB in bytes
      const oversizedFilesList: {name: string, size: number}[] = [];
      
      // First pass: Check all segments for size without uploading
      for (const segment of splitSegments) {
        if (segment.from === '' || segment.to === '' || !segment.name || !segment.category) {
          continue; // Skip invalid segments
        }
        
        const fromPage = typeof segment.from === 'number' ? segment.from : parseInt(String(segment.from));
        const toPage = typeof segment.to === 'number' ? segment.to : parseInt(String(segment.to));
        
        if (isNaN(fromPage) || isNaN(toPage) || fromPage > toPage) {
          console.warn(`Invalid page range for segment: ${segment.name}`);
          continue;
        }
        
        // Create new PDF for this segment to check size
        const newPdf = await PDFDocument.create();
        
        // Copy pages from original PDF (pdf-lib uses 0-based indexing)
        const pageIndices = [];
        for (let i = fromPage - 1; i < toPage && i < originalPdf.getPageCount(); i++) {
          pageIndices.push(i);
        }
        
        const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
        copiedPages.forEach((page) => newPdf.addPage(page));
        
        // Generate PDF bytes to check size
        const pdfBytes = await newPdf.save();
        
        // Check file size
        if (pdfBytes.length > maxFileSize) {
          const filename = `${segment.name.trim() || `segment-${fromPage}-${toPage}`}.pdf`;
          oversizedFilesList.push({
            name: filename,
            size: pdfBytes.length
          });
        }
      }
      
      // If any files are oversized, show modal and stop
      if (oversizedFilesList.length > 0) {
        setOversizedFiles(oversizedFilesList);
        setShowFileSizeModal(true);
        setIsSplitting(false);
        setSplittingAction(null);
        return;
      }
      
      // Second pass: Only proceed with upload if all files are under size limit
      // Group segments by category for organized uploading
      const segmentsByCategory: Record<string, SplitSegment[]> = {};
      
      for (const segment of splitSegments) {
        if (segment.from === '' || segment.to === '' || !segment.name || !segment.category) {
          continue; // Skip invalid segments
        }
        
        if (!segmentsByCategory[segment.category]) {
          segmentsByCategory[segment.category] = [];
        }
        segmentsByCategory[segment.category].push(segment);
      }
      
      let totalUploaded = 0;
      const uploadResults: Record<string, any[]> = {};
      
      // Process each category
      for (const [category, segments] of Object.entries(segmentsByCategory)) {
        const uploadedFiles = [];
        
        for (const segment of segments) {
          const fromPage = typeof segment.from === 'number' ? segment.from : parseInt(String(segment.from));
          const toPage = typeof segment.to === 'number' ? segment.to : parseInt(String(segment.to));
          
          if (isNaN(fromPage) || isNaN(toPage) || fromPage > toPage) {
            console.warn(`Invalid page range for segment: ${segment.name}`);
            continue;
          }
          
          // Create new PDF for this segment
          const newPdf = await PDFDocument.create();
          
          // Copy pages from original PDF (pdf-lib uses 0-based indexing)
          const pageIndices = [];
          for (let i = fromPage - 1; i < toPage && i < originalPdf.getPageCount(); i++) {
            pageIndices.push(i);
          }
          
          const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
          copiedPages.forEach((page) => newPdf.addPage(page));
          
          // Generate PDF bytes
          const pdfBytes = await newPdf.save();
          
          // Create filename
          const filename = `${segment.name.trim() || `segment-${fromPage}-${toPage}`}.pdf`;
          
          // Convert to File object for upload
          const uint8Array = new Uint8Array(pdfBytes);
          
          // Create a simple object that mimics File interface for FormData
          const file = {
            name: filename,
            type: 'application/pdf',
            size: uint8Array.length,
            lastModified: Date.now(),
            webkitRelativePath: '',
            // Add the buffer data for FormData to read
            stream: () => new ReadableStream({
              start(controller) {
                controller.enqueue(uint8Array);
                controller.close();
              }
            }),
            arrayBuffer: () => Promise.resolve(uint8Array.buffer),
            slice: (start?: number, end?: number) => new Blob([uint8Array.slice(start, end)], { type: 'application/pdf' }),
            text: () => Promise.resolve(''),
            // Make it work with FormData by providing the raw data
            [Symbol.toStringTag]: 'File'
          };
          
          // Create a Blob and assign the filename for FormData compatibility
          const blob = new Blob([uint8Array], { type: 'application/pdf' });
          (blob as any).name = filename;
          
          console.log('Created file with name:', filename); // Debug log
          
          // Upload the blob with filename
          const uploadResult = await uploadFile(category, blob as any, filename);
          uploadedFiles.push({
            id: String(uploadResult.data.id),
            type: uploadResult.data.type,
            fileName: uploadResult.data.fileName,
            fileKey: uploadResult.data.fileKey,
            caseId: caseData.id
          });
          
          totalUploaded++;
        }
        
        if (uploadedFiles.length > 0) {
          uploadResults[category] = uploadedFiles;
        }
      }
      
      if (totalUploaded === 0) {
        alert('No valid segments to split and upload. Please check your page ranges, names, and categories.');
        return;
      }
      
      // Notify parent component about uploaded files
      if (onFilesUploaded) {
        for (const [category, files] of Object.entries(uploadResults)) {
          onFilesUploaded(category, files);
        }
      }
      
      // Close the drawer after successful upload
      onClose();
      
    } catch (error) {
      console.error('Error splitting and uploading PDF:', error);
      alert(`Error splitting and uploading PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSplitting(false);
      setSplittingAction(null);
    }
  };

  const segmentsValid = splitSegments.length > 0 && splitSegments.every(segment => 
    segment.from !== '' && segment.to !== '' && segment.name !== '' && segment.category !== ''
  );

  // Cleanup function for object URLs
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Reset drawer state when closing
  const handleCloseDrawer = () => {
    onClose();
    setShowPdfSplitter(false);
    setSelectedPdfFile(null);
    setPdfUrl(null);
    setPdfDocument(null);
    setActiveFile(null);
    setSplitSegments([]);
    setIsSplitting(false);
    setSplittingAction(null);
    
    // Reset intelligent analysis states
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setUseIntelligentMode(true); // Always reset to AI mode
    setHasAIData(false);
    
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Drawer Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <h3 className="text-lg font-semibold text-black">Split PDF</h3>
        <button
          onClick={handleCloseDrawer}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-black" />
        </button>
      </div>
      
      {/* Drawer Content - Full Screen */}
      <div className="h-[calc(100vh-80px)] overflow-y-auto text-black p-6">
        {isSplitting ? (
          // Loading state during PDF splitting
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {splittingAction === 'download' ? 'Splitting and Preparing Download' : 'Splitting and Uploading PDF'}
              </h2>
              <p className="text-gray-600">
                {splittingAction === 'download' 
                  ? 'Please wait while we process your PDF segments and create a ZIP file for download...'
                  : 'Please wait while we process your PDF segments and upload them to the respective evidence categories...'}
              </p>
            </div>
          </div>
        ) : isAnalyzing ? (
          // AI Analysis loading state
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center max-w-md">
              <Brain className="w-16 h-16 text-gray-700 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">AI is Analyzing Your PDF</h2>
              <p className="text-gray-600 mb-4">Our AI is examining the document to suggest intelligent splitting...</p>
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                <span className="text-sm text-gray-600">This may take 1-3 minutes</span>
              </div>
              
              
            </div>
          </div>
        ) : !showPdfSplitter ? (
          // File Selection Interface
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="mb-6">
                <Brain className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered PDF Splitting</h2>
                <p className="text-gray-600 mb-4">
                  Our AI will analyze your PDF and suggest intelligent document splits automatically
                </p>
              </div>

               {/* File size info */}
               <div className="text-center">
                 <p className="text-sm text-gray-600">
                   Maximum file size: <span className="font-medium text-gray-800">200MB</span>
                 </p>
               </div>
              
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfFileSelect}
                  className="hidden"
                  id="pdf-file-input"
                  disabled={loadingPdf}
                />
                
                <label
                  htmlFor="pdf-file-input"
                  className={`block w-full px-6 py-4 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    loadingPdf
                      ? 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100'
                  }`}
                >
                  {loadingPdf ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-medium">Loading PDF...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Upload className="w-5 h-5" />
                      <span className="font-medium">Select PDF File</span>
                    </div>
                  )}
                </label>
                
                {selectedPdfFile && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <File className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-800 font-medium">
                        Selected: {selectedPdfFile.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // PDF Splitter Interface
          <PdfSplitter
            isSplitMode={true}
            addSegment={addSegment}
            splitAndUpload={splitAndUpload}
            splitAndDownload={splitAndDownload}
            segmentsValid={segmentsValid}
            isSplitting={isSplitting}
            splitSegments={splitSegments}
            totalPages={pdfDocument?.numPages}
            updateSegment={updateSegment}
            removeSegment={removeSegment}
            pdfDocument={pdfDocument}
            loadingPdf={loadingPdf}
            fileName={activeFile?.fileName || ""}
            activeFile={activeFile}
            hasAIData={hasAIData}
            evidenceTypes={evidenceTypes}
            selectedPdfFile={selectedPdfFile}
          />
        )}
      </div>
      
      {/* File Size Limit Modal */}
      {showFileSizeModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  File Size Limit Exceeded
                </h3>
              </div>
              <button
                onClick={() => setShowFileSizeModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                The following split files exceed the 100MB limit and cannot be uploaded:
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <ul className="space-y-2">
                  {oversizedFiles.map((file, index) => (
                    <li key={index} className="text-sm text-red-700 flex items-start justify-between">
                      <span className="break-all flex-1">• {file.name}</span>
                      <span className="text-xs text-red-600 ml-2">
                        ({(file.size / (1024 * 1024)).toFixed(1)}MB)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                Please split your segments into smaller page ranges to create files under 100MB each. Consider breaking large segments into multiple smaller ones.
              </p>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setShowFileSizeModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
