"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface ScanLineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Duration of one top→bottom sweep in seconds. Defaults to 1.6s. */
  duration?: number;
  /** When true (default), the scan-line loops. When false, it plays once. */
  loop?: boolean;
}

export function ScanLine({
  duration = 1.6,
  loop = true,
  className,
  ...rest
}: ScanLineProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden
      {...rest}
    >
      <motion.div
        initial={{ y: "-100%" }}
        animate={{ y: "100%" }}
        transition={{
          duration,
          repeat: loop ? Infinity : 0,
          ease: "easeInOut",
        }}
        className="absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-gold-500/30 to-transparent"
      />
    </div>
  );
}
