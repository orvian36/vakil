"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ScanLine } from "@/components/ui";
import { springPaper } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

interface Props {
  children: ReactNode;
  generating?: boolean;
  className?: string;
}

export function PaperCanvas({ children, generating, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPaper}
      className={cn(
        "relative cream-paper overflow-hidden",
        "px-10 py-12 md:px-14 md:py-16",
        "rounded-[var(--radius-xl)]",
        "w-full",
        className,
      )}
    >
      {generating && <ScanLine duration={1.6} />}
      {children}
    </motion.div>
  );
}
