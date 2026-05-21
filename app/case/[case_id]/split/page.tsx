"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Case } from "@/types/case";
import { Loader2 } from "lucide-react";
import { Workshop } from "@/components/pdf-split/Workshop";
import { fadeUp } from "@/lib/motion";

export default function SplitPdfPage() {
  const params = useParams();
  const caseId = params.case_id as string;
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}`);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        if (!cancelled) setCaseData(data);
      } catch (err) {
        console.error("Failed to load case for split:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-400" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-ink-400">Case not found.</p>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
      <Workshop caseData={caseData} />
    </motion.div>
  );
}
