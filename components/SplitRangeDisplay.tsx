import React, { useRef, useEffect, useState } from 'react';
import { SplitSegment, FileRecord, CaseEvidenceType } from '@/types/case';
import { ChevronDown, Download } from 'lucide-react';
import '@/lib/pdfjs-config';
import { PDFDocument } from 'pdf-lib';

// Types for PDF.js
type PDFDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<any>;
  destroy: () => void;
};

interface SplitRangeDisplayProps {
  segment: SplitSegment;
  rangeIndex: number;
  totalPages: number | undefined;
  updateSegment: (id: string, updates: Partial<SplitSegment>) => void;
  removeSegment: (id: string) => void;
  pdfDocument: PDFDocumentProxy | null; // Add pdfDocument prop
  loadingPdf: boolean; // Add loadingPdf prop
  fileName?: string; // Add fileName prop
  activeFile: FileRecord | null; // Add activeFile prop
  allSplitSegments: SplitSegment[]; // All segments for cross-validation
  hasAIData: boolean; // Add hasAIData prop
  evidenceTypes: CaseEvidenceType[]; // Evidence types from database
  selectedPdfFile: File | null; // Original PDF file for download
}

const SplitRangeDisplay: React.FC<SplitRangeDisplayProps> = ({
  segment,
  rangeIndex,
  totalPages,
  updateSegment,
  removeSegment,
  pdfDocument,
  loadingPdf,
  fileName,
  activeFile,
  allSplitSegments,
  hasAIData,
  evidenceTypes,
  selectedPdfFile,
}) => {
  const fromCanvasRef = useRef<HTMLCanvasElement>(null);
  const toCanvasRef = useRef<HTMLCanvasElement>(null);
  const fromRenderTaskRef = useRef<any>(null); // Ref to store from-page render task
  const toRenderTaskRef = useRef<any>(null); // Ref to store to-page render task
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [errors, setErrors] = useState<{ from?: string; to?: string; name?: string; category?: string }>({});
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const prevPdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const prevTotalPagesRef = useRef<number | undefined>(undefined);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  useEffect(() => {
    if (!pdfDocument) {
      return;
    }

    const loadPdfAndRenderPage = async (pageNumber: number, canvasRef: React.RefObject<HTMLCanvasElement | null>, renderTaskRef: React.MutableRefObject<any>) => {
      if (!canvasRef.current || !pageNumber) {
        return;
      }

      setLoadingThumbnails(true);
      
      try {
        // Use the passed pdfDocument instead of loading it again
        const page = await pdfDocument.getPage(pageNumber);

        const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for clearer thumbnails
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');

        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          // Cancel previous render task if it exists
          if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
          }

          const renderTask = page.render({ canvasContext: context, viewport, canvas });
          renderTaskRef.current = renderTask; // Store the new render task

          await renderTask.promise;
          setLoadingThumbnails(false);
        }
      } catch (error) {
        // Ignore cancelled rendering errors
        if (error instanceof Error && error.name === 'RenderingCancelledException') {
          console.log(`Rendering for page ${pageNumber} was cancelled.`);
        } else {
          console.error(`Error rendering page ${pageNumber}:`, error);
          if (canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
              context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              context.fillStyle = 'red';
              context.fillText('Error', 10, 20);
            }
          }
        }
      }
    };

    loadPdfAndRenderPage(segment.from as number, fromCanvasRef, fromRenderTaskRef);
    loadPdfAndRenderPage(segment.to as number, toCanvasRef, toRenderTaskRef);

    // Cleanup function to cancel rendering tasks on unmount or dependency change
    return () => {
      if (fromRenderTaskRef.current) {
        fromRenderTaskRef.current.cancel();
        fromRenderTaskRef.current = null;
      }
      if (toRenderTaskRef.current) {
        toRenderTaskRef.current.cancel();
        toRenderTaskRef.current = null;
      }
    };

  }, [pdfDocument, segment.from, segment.to]);

  useEffect(() => {
    // This effect ensures that when the PDF document or total pages change,
    // the segment's editable fields (name, category, from, to) are reset
    // or adjusted to sensible defaults, preventing stale data from previous PDFs.
    const prevPdfDocument = prevPdfDocumentRef.current;
    const prevTotalPages = prevTotalPagesRef.current;

    // Only run if pdfDocument or totalPages have actually changed from their previous values
    // AND only if this is a legitimate reset scenario (not when AI data is already present)
    if ((pdfDocument !== prevPdfDocument || totalPages !== prevTotalPages) && !hasAIData) {
      const updates: Partial<SplitSegment> = {};

      if (pdfDocument && totalPages !== undefined) {
        // Only reset if this segment appears to be uninitialized
        // Check if this looks like a default/empty segment that needs initialization
        const isEmptySegment = (!segment.name || segment.name === '') && 
                              (!segment.category || segment.category === '') &&
                              (segment.from === '' || segment.from === 0 || segment.from === 1) &&
                              (segment.to === '' || segment.to === 0 || segment.to === totalPages);

        // If this is an empty segment, initialize it with defaults
        if (isEmptySegment) {
          if (!segment.name) updates.name = ''; 
          if (!segment.category) updates.category = '';
          if (segment.from === '' || segment.from === 0) {
            updates.from = 1;
          }
          if (segment.to === '' || segment.to === 0) {
            updates.to = totalPages;
          }
        }
        // If segment has data (like AI-generated data), don't touch it

      } else if (!pdfDocument) {
        // If no PDF is loaded (pdfDocument is null), clear all relevant fields
        updates.name = '';
        updates.category = '';
        updates.from = 1;
        updates.to = 1;
      }

      if (Object.keys(updates).length > 0) {
        console.log(`Updating segment ${segment.id}:`, updates, 'Current segment:', segment, 'hasAIData:', hasAIData); // Debug log
        updateSegment(segment.id, updates);
      }
    }

    // Update refs for the next render
    prevPdfDocumentRef.current = pdfDocument;
    prevTotalPagesRef.current = totalPages;

  }, [pdfDocument, totalPages, segment.id, updateSegment, hasAIData]);

  useEffect(() => {
    // Validate segments when they change or totalPages changes
    const newErrors: typeof errors = {};
    const fromPage = segment.from === '' ? undefined : Number(segment.from);
    const toPage = segment.to === '' ? undefined : Number(segment.to);

    if (fromPage === undefined || fromPage === 0) {
      newErrors.from = "From page cannot be empty or zero.";
    } else if (fromPage < 1) {
      newErrors.from = "From page cannot be less than 1.";
    }

    if (toPage === undefined || toPage === 0) {
      newErrors.to = "To page cannot be empty or zero.";
    } else if (toPage < 1) {
      newErrors.to = "To page cannot be less than 1.";
    }

    if (fromPage !== undefined && toPage !== undefined) {
      if (fromPage > toPage) {
        newErrors.from = "From page cannot be greater than to page.";
      }
    }

    if (totalPages !== undefined && toPage !== undefined) {
      if (toPage > totalPages) {
        newErrors.to = `To page cannot exceed maximum page number (${totalPages}).`;
      }
    }

    if (!segment.name || segment.name.trim() === '') {
      newErrors.name = "Document name is mandatory.";
    } else {
      // Check for duplicate names among other segments
      const duplicateName = allSplitSegments.some(
        (s) => s.id !== segment.id && s.name.trim() === segment.name.trim()
      );
      if (duplicateName) {
        newErrors.name = "Document name must be unique.";
      }
      // Check if the name conflicts with the original document name
      if (fileName && segment.name.trim() === fileName.split('.')[0]) {
        newErrors.name = "Document name cannot be the same as the original document.";
      }
    }


    if (!segment.category || segment.category.trim() === '') {
      newErrors.category = "Category is mandatory.";
    }

    setErrors(newErrors);
  }, [segment, totalPages, allSplitSegments, fileName]);

  const downloadSegment = async () => {
    if (!selectedPdfFile || !segment.from || !segment.to) {
      alert('Cannot download segment: Missing PDF file or page range');
      return;
    }

    try {
      // Read the original PDF file as array buffer
      const arrayBuffer = await selectedPdfFile.arrayBuffer();
      const originalPdf = await PDFDocument.load(arrayBuffer);
      
      // Create a new PDF with just the segment's pages
      const segmentPdf = await PDFDocument.create();
      const fromPage = Number(segment.from);
      const toPage = Number(segment.to);
      
      // Copy pages from the original PDF
      const pagesToCopy = await segmentPdf.copyPages(
        originalPdf, 
        Array.from({ length: toPage - fromPage + 1 }, (_, i) => fromPage - 1 + i)
      );
      
      pagesToCopy.forEach((page) => {
        segmentPdf.addPage(page);
      });
      
      // Save the PDF and create a download link
      const pdfBytes = await segmentPdf.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${segment.name || 'segment'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading segment:', error);
      alert('Failed to download segment. Please try again.');
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4 relative">
      {(loadingThumbnails || loadingPdf) && (
        <div className="absolute inset-0 bg-gray-200 bg-opacity-75 flex flex-col items-center justify-center rounded-lg z-10">
          <div className="text-gray-700 text-lg mb-2">Loading PDF...</div>
          {fileName && <div className="text-gray-600 text-sm mb-4">{fileName}</div>}
          {/* A simple spinner or loading animation can be added here */}
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
        </div>
      )}
      
      {/* Top Section: Form Fields (Full Width) */}
      <div className="mb-6">
        <div className="text-lg font-semibold mb-3 text-center">Segment {rangeIndex + 1} : Page {segment.from} to {segment.to}</div>
        
        {/* First Row: Document Name and Category */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1 font-medium">Document Name</label>
            <input type="text" value={segment.name}
              onChange={e => updateSegment(segment.id, { name: e.target.value })}
              placeholder="Document name"
              className={`w-full border rounded-md px-3 py-2 text-sm ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
            <div className="min-h-[16px] mt-0.5">
              {errors.name && <p className="text-red-500 text-xs leading-tight">{errors.name}</p>}
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1 font-medium">Category</label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className={`w-full border rounded-md px-3 py-2 text-sm text-left flex items-center justify-between ${errors.category ? 'border-red-500' : 'border-gray-300'}`}
              >
                <span className={segment.category ? 'text-gray-900' : 'text-gray-500'}>
                  {segment.category ? evidenceTypes.find(cat => cat.key === segment.category)?.title || segment.category : 'Select category'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {isCategoryDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {evidenceTypes.map((category) => (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => {
                        updateSegment(segment.id, { category: category.key });
                        setIsCategoryDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      {category.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="min-h-[16px] mt-0.5">
              {errors.category && <p className="text-red-500 text-xs leading-tight">{errors.category}</p>}
            </div>
          </div>
        </div>

        {/* Second Row: From Page and To Page */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1 font-medium">From Page</label>
            <input type="number" value={(segment.from as number) || ''} min={1} max={totalPages || undefined}
              onChange={e => updateSegment(segment.id, { from: e.target.value ? parseInt(e.target.value) : '' })}
              className={`w-full border rounded-md px-3 py-2 text-sm ${errors.from ? 'border-red-500' : 'border-gray-300'}`} />
            <div className="min-h-[16px] mt-0.5">
              {errors.from && <p className="text-red-500 text-xs leading-tight">{errors.from}</p>}
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1 font-medium">To Page</label>
            <input type="number" value={(segment.to as number) || ''} min={1} max={totalPages || undefined}
              onChange={e => updateSegment(segment.id, { to: e.target.value ? parseInt(e.target.value) : '' })}
              className={`w-full border rounded-md px-3 py-2 text-sm ${errors.to ? 'border-red-500' : 'border-gray-300'}`} />
            <div className="min-h-[16px] mt-0.5">
              {errors.to && <p className="text-red-500 text-xs leading-tight">{errors.to}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Page Previews (Full Width) */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-center space-x-6 mb-6">
          <div className="flex flex-col items-center relative">
            <label className="block text-sm text-gray-600 mb-2 font-medium">From Page</label>
            <canvas ref={fromCanvasRef} className="w-[520px] h-[720px] border-2 border-gray-300 rounded-lg shadow-lg" />
            {(loadingThumbnails || loadingPdf) && (
              <div className="absolute inset-0 w-[520px] h-[720px] bg-gray-100 flex items-center justify-center rounded-lg shadow-lg text-gray-400 text-sm mt-8">
                Loading...
              </div>
            )}
            <div className="mt-2 text-base text-gray-700 font-medium">Page {segment.from}</div>
          </div>
          
          <div className="text-3xl font-bold text-gray-400 self-center mb-8">...</div>
          
          <div className="flex flex-col items-center relative">
            <label className="block text-sm text-gray-600 mb-2 font-medium">To Page</label>
            <canvas ref={toCanvasRef} className="w-[520px] h-[720px] border-2 border-gray-300 rounded-lg shadow-lg" />
            {(loadingThumbnails || loadingPdf) && (
              <div className="absolute inset-0 w-[520px] h-[720px] bg-gray-100 flex items-center justify-center rounded-lg shadow-lg text-gray-400 text-sm mt-8">
                Loading...
              </div>
            )}
            <div className="mt-2 text-base text-gray-700 font-medium">Page {segment.to}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button 
            onClick={downloadSegment}
            className="px-4 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Segment
          </button>
          <button 
            onClick={() => removeSegment(segment.id)} 
            className="px-4 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-colors"
          >
            Remove Segment
          </button>
        </div>
      </div>
    </div>
  );
};

export default SplitRangeDisplay;
