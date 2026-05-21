"use client";

import { useState, useEffect } from "react";
import MdxRenderer from "@/components/MdxRenderer";
import { Case } from "@/types/case";
import Hoverable from "@/components/Hoverable";

interface StatementOfDamagesTabProps {
  caseId: string;
  caseData: Case;
  content?: string;
  isGenerating?: boolean;
}

export default function StatementOfDamagesTab({
  content: propContent = "",
  isGenerating: propIsGenerating = false,
}: StatementOfDamagesTabProps) {
  const [content, setContent] = useState(propContent);

  useEffect(() => {
    if (propContent) setContent(propContent);
  }, [propContent]);

  if (propIsGenerating) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto mb-4" />
          <p className="text-paper-ink/70">
            Loading particulars and chronology data to generate the Statement of Damages…
          </p>
        </div>
      </div>
    );
  }

  return <MdxRenderer source={content} components={{ Hoverable }} variant="paper" />;
}
