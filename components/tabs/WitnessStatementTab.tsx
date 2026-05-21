"use client";

import { useState, useEffect } from "react";
import MdxRenderer from "@/components/MdxRenderer";
import { Case } from "@/types/case";
import Hoverable from "@/components/Hoverable";

interface WitnessStatementTabProps {
  caseId: string;
  caseData: Case;
  content?: string;
  bengaliContent?: string;
  bengaliMode?: boolean;
  isGenerating?: boolean;
}

export default function WitnessStatementTab({
  content: propContent = "",
  bengaliContent: propBengaliContent = "",
  bengaliMode = false,
  isGenerating: propIsGenerating = false,
}: WitnessStatementTabProps) {
  const [content, setContent] = useState(propContent);
  const [bengaliContent, setBengaliContent] = useState(propBengaliContent);

  useEffect(() => {
    if (propContent) setContent(propContent);
  }, [propContent]);

  useEffect(() => {
    if (propBengaliContent) setBengaliContent(propBengaliContent);
  }, [propBengaliContent]);

  if (propIsGenerating) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto mb-4" />
          <p className="text-paper-ink/70">
            Loading particulars and chronology data to generate the Witness Statement…
          </p>
        </div>
      </div>
    );
  }

  return (
    <MdxRenderer
      source={bengaliMode ? bengaliContent : content}
      components={{ Hoverable }}
      variant="paper"
    />
  );
}
