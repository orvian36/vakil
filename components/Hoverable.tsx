"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import HighlightedMdxRenderer from "./MdxTooltip";
import Citation from "./Citation";

interface HoverableProps {
  children: React.ReactNode;
  searchText: string;
  highlightClassName?: string;
  /** "paper" (default) targets cream document surfaces. */
  variant?: "paper" | "ink";
}

export default function Hoverable({
  children,
  searchText,
  highlightClassName = "highlighted-text",
  variant = "paper",
}: HoverableProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isTooltipPinned, setIsTooltipPinned] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Dynamic MDX source content from localStorage
  const mdxSource = (() => {
    if (typeof window === 'undefined') return '';
    
    const particularsData = localStorage.getItem('particulars_markdown') || '';
    const chronologyData = localStorage.getItem('chronology_markdown') || '';
    
    // Combine particulars and chronology data
    let combinedData = '';
    
    if (particularsData) {
      combinedData += `${particularsData}\n\n`;
    }
    
    if (chronologyData) {
      combinedData += `${chronologyData}`;
    }
    
    // If no data is available, provide a default message
    if (!particularsData && !chronologyData) {
      combinedData = `# Case Information Database\n\nNo case information available. Please generate particulars and chronology data first.`;
    }
    
    return combinedData;
  })();

  const calculateTooltipPosition = (event: React.MouseEvent) => {
    const tooltipWidth = 600;
    const tooltipHeight = 400;
    const padding = 20;
    
    let x = event.clientX + 10;
    let y = event.clientY - 10;
    
    if (x + tooltipWidth > window.innerWidth - padding) {
      x = event.clientX - tooltipWidth - 10;
    }
    
    if (x < padding) {
      x = padding;
    }
    
    if (y - tooltipHeight < padding) {
      y = event.clientY + 10;
    }
    
    return { x, y };
  };

  const handleHover = (event: React.MouseEvent) => {
    if (!isTooltipPinned) {
      setTooltipPosition(calculateTooltipPosition(event));
      setShowTooltip(true);
    }
  };

  const handleClick = (event: React.MouseEvent) => {
    setTooltipPosition(calculateTooltipPosition(event));
    setShowTooltip(true);
    setIsTooltipPinned(true);
  };

  const handleLeave = () => {
    if (!isTooltipPinned) {
      setShowTooltip(false);
    }
  };

  const closeTooltip = () => {
    setShowTooltip(false);
    setIsTooltipPinned(false);
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        closeTooltip();
      }
    };

    if (showTooltip && isTooltipPinned) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTooltip, isTooltipPinned]);

  const surfaceClass = variant === "paper"
    ? "bg-cream-50 border border-line-paper text-paper-ink"
    : "bg-ink-800 border border-line-strong text-ink-100";
  const metaTextClass = variant === "paper" ? "text-paper-ink/70" : "text-ink-400";
  const accentTextClass = "text-gold-700";
  const closeButtonClass = variant === "paper"
    ? "text-paper-ink/50 hover:text-paper-ink"
    : "text-ink-400 hover:text-ink-100";
  const triggerClass = variant === "paper"
    ? "cursor-pointer hover:bg-gold-500/15 px-1 rounded transition-colors inline-block underline italic hover:text-gold-700"
    : "cursor-pointer hover:bg-gold-500/15 px-1 rounded transition-colors inline-block underline italic hover:text-gold-500";

  const tooltipContent = showTooltip && (
    <div
      ref={tooltipRef}
      className={`fixed z-50 rounded-lg shadow-xl p-4 max-h-80 overflow-auto ${surfaceClass}`}
      style={{
        left: `${tooltipPosition.x}px`,
        top: `${tooltipPosition.y}px`,
        transform: tooltipPosition.y > window.innerHeight / 2 ? 'translateY(-100%)' : 'translateY(0)',
        maxWidth: `${Math.min(600, window.innerWidth - 40)}px`,
        width: '600px'
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <div className={`text-sm font-medium ${metaTextClass}`}>
          Search results for: <span className={accentTextClass}>"{searchText}"</span>
        </div>
        <button
          onClick={closeTooltip}
          className={`${closeButtonClass} text-lg leading-none`}
          aria-label="Close tooltip"
        >
          ×
        </button>
      </div>
      <div className="text-xs border-t pt-2">
        <div className="tooltip-content">
          <HighlightedMdxRenderer
            source={mdxSource}
            searchText={searchText}
            highlightClassName={highlightClassName}
            components={{ Citation }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <span
        className={triggerClass}
        onMouseEnter={handleHover}
        onMouseLeave={handleLeave}
        onClick={handleClick}
      >
        {children}
      </span>

      {/* Render tooltip in portal to avoid HTML nesting issues */}
      {typeof window !== 'undefined' && tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  );
}
