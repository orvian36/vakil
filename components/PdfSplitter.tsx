import React, { useState, useEffect } from 'react';
import SplitRangeDisplay from './SplitRangeDisplay';
import { FileRecord, CaseEvidenceType } from '@/types/case';
import { SplitSegment } from '@/types/case';
import '@/lib/pdfjs-config';

// Types for PDF.js
type PDFDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<any>;
  destroy: () => void;
};



interface PdfSplitterProps {
  isSplitMode: boolean;
  addSegment: () => void;
  splitAndUpload: () => void;
  splitAndDownload: () => void;
  segmentsValid: boolean;
  isSplitting: boolean;
  splitSegments: SplitSegment[]; // This line should be present and correct
  totalPages: number | undefined;
  updateSegment: (id: string, updates: Partial<SplitSegment>) => void;
  removeSegment: (id: string) => void;
  pdfDocument: PDFDocumentProxy | null; // Receive pdfDocument prop
  loadingPdf: boolean;
  fileName: string;
  activeFile: FileRecord | null; // Add activeFile prop
  hasAIData: boolean; // Add hasAIData prop
  evidenceTypes: CaseEvidenceType[]; // Evidence types from database
  selectedPdfFile: File | null; // Original PDF file for download
}

const PdfSplitter: React.FC<PdfSplitterProps> = ({
  isSplitMode,
  addSegment,
  splitAndUpload,
  splitAndDownload,
  segmentsValid,
  isSplitting,
  splitSegments, // Destructure splitSegments
  totalPages,
  updateSegment,
  removeSegment,
  pdfDocument, // Destructure pdfDocument
  loadingPdf,
  fileName,
  activeFile, // Destructure activeFile
  hasAIData, // Destructure hasAIData
  evidenceTypes, // Destructure evidenceTypes
  selectedPdfFile, // Destructure selectedPdfFile
}) => {
  // pdfDocument is now passed directly as a prop, no need for internal state
  // const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  // The loadingPdf state is also now managed by the parent, no need for internal state
  // const [loadingPdf, setLoadingPdf] = useState(false);

  // Remove this useEffect as PDF loading is handled by the parent component
  // useEffect(() => {
  //   const loadPdf = async () => {
  //     if (!pdfUrl) {
  //       setPdfDocument(null);
  //       return;
  //     }

  //     setLoadingPdf(true);
  //     try {
  //       const loadedPdf = await getDocument({ url: pdfUrl }).promise;
  //       setPdfDocument(loadedPdf);
  //     } catch (error) {
  //       console.error("Error loading PDF:", error);
  //       setPdfDocument(null);
  //     } finally {
  //       setLoadingPdf(false); // Ensure loading state is reset on success or error
  //     }
  //   };

  //   loadPdf();
  // }, [pdfUrl]);

  useEffect(() => {
    // When the pdfDocument changes (i.e., a new PDF is loaded),
    // re-initialize splitSegments to reflect the new document's properties.
    // This ensures that the split UI is always fresh for the current PDF.
    if (pdfDocument && totalPages !== undefined && splitSegments.length === 0) {
      addSegment(); // Add initial segment (1 to totalPages) for new PDF
    }
  }, [pdfDocument, totalPages, addSegment, splitSegments.length]);

  if (!isSplitMode) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Configure Document Splits</h3>
            <p className="text-sm text-gray-600">
              Define page ranges, document names, and categories for each split segment
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              Total Pages: <span className="font-medium text-gray-700">{totalPages || 0}</span>
            </div>
            <div className="text-sm text-gray-500">
              Segments: <span className="font-medium text-gray-700">{splitSegments.length}</span>
            </div>
          </div>
        </div>
      </div>
      {splitSegments.map((s: SplitSegment, index: number) => (
        <SplitRangeDisplay
          key={s.id}
          segment={s}
          rangeIndex={index}
          totalPages={totalPages}
          updateSegment={updateSegment}
          removeSegment={removeSegment}
          pdfDocument={pdfDocument}
          loadingPdf={loadingPdf} // Pass loadingPdf from props
          fileName={fileName} // Pass fileName from props
          activeFile={activeFile} // Pass activeFile prop
          allSplitSegments={splitSegments} // Pass all split segments
          hasAIData={hasAIData} // Pass hasAIData prop
          evidenceTypes={evidenceTypes} // Pass evidenceTypes from props
          selectedPdfFile={selectedPdfFile} // Pass selectedPdfFile for download
        />
      ))}
      
      {/* Action buttons at the bottom */}
      <div className="flex items-center justify-center gap-3 pt-6 border-t border-gray-200 mt-6">
        <button
          onClick={addSegment}
          className="px-4 py-2 rounded-md text-sm bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Add Segment
        </button>
        <button
          onClick={splitAndDownload}
          disabled={!segmentsValid || isSplitting}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
            segmentsValid && !isSplitting 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
        >
          {isSplitting ? 'Splitting…' : 'Split & Download All'}
        </button>
        <button
          onClick={splitAndUpload}
          disabled={!segmentsValid || isSplitting}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
            segmentsValid && !isSplitting 
              ? 'bg-gray-800 text-white hover:bg-gray-900' 
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
        >
          {isSplitting ? 'Splitting…' : 'Split & Upload All'}
        </button>
      </div>
    </div>
  );
};

export default PdfSplitter;
