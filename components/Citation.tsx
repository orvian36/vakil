"use client";

import { useState } from "react";
import React from "react";
import { createPortal } from "react-dom";

interface CitationProps {
  reference: string;
  children: React.ReactNode;
}

export default function Citation({ reference, children }: CitationProps) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const openDrawer = () => {
    setMounted(true);
    // Ensure transition runs on next frame
    requestAnimationFrame(() => setShow(true));
    // Load PDF when drawer opens
    loadPDF();
  };

  const closeDrawer = () => {
    setShow(false);
    // Unmount after transition ends
    setTimeout(() => setMounted(false), 300);
    // Reset PDF state when closing
    setPdfUrl(null);
    setPdfError(null);
  };

  const loadPDF = async () => {
    if (!reference) return;
    
    setIsLoadingPdf(true);
    setPdfError(null);
    
    try {
      // Get the PDF URL from the storage API using the document ID
      const response = await fetch(`/api/files/download/${reference}`);
      
      if (response.ok) {
        const result = await response.json();
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
      setPdfError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  return (
    <>
      <button 
        type="button"
        onClick={openDrawer} 
        className="text-blue-500 italic font-bold hover:text-blue-700 cursor-pointer"
      >
        {children}
      </button>

      {mounted && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-40 transition-opacity duration-300 ${show ? 'bg-black/40 opacity-100' : 'bg-black/40 opacity-0'}`}
            onClick={closeDrawer}
            aria-hidden="true"
          />

          {/* Drawer */}
          <aside
            className={`fixed right-0 top-0 h-dvh w-[80vw] max-w-[95vw] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${show ? 'translate-x-0' : 'translate-x-full'}`}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-base text-black font-semibold">Source Reference</h3>
              <button
                onClick={closeDrawer}
                aria-label="Close drawer"
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              {/* PDF Viewer */}
              <div className="flex-1 relative min-h-0">
                {isLoadingPdf ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                      <p className="text-sm text-gray-500">Loading PDF...</p>
                    </div>
                  </div>
                ) : pdfUrl ? (
                  <div className="absolute inset-0">
                    <iframe 
                      src={pdfUrl}
                      className="w-full h-full border-0"
                      style={{ minHeight: '100%' }}
                      title={`PDF Viewer - Document ${reference}`}
                    />
                    {/* Fallback for browsers that don't support iframe PDF viewing */}
                    <div className="absolute bottom-2 right-2 bg-white bg-opacity-90 rounded-lg p-2 shadow-sm">
                      <a 
                        href={pdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Open in new tab</span>
                      </a>
                    </div>
                  </div>
                ) : pdfError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <div className="text-center py-8 px-6">
                      <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">PDF Loading Error</h3>
                      <p className="text-sm text-gray-600 mb-4">{pdfError}</p>
                      <button
                        onClick={loadPDF}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <div className="text-center py-8 px-6">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Document Preview</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Document ID: {reference}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </>,
        document.body
      )}
    </>
  );
}