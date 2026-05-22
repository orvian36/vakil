import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface VakilLogoProps
  extends Omit<React.SVGAttributes<SVGSVGElement>, "aria-label"> {
  className?: string;
}

export function VakilLogo({ className, ...props }: VakilLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 720 200"
      fill="none"
      role="img"
      aria-label="Vakil"
      className={cn("h-8 w-auto", className)}
      {...props}
    >
      <rect x="35" y="30" width="120" height="4" fill="var(--color-gold-500)" />
      <path
        fill="currentColor"
        d="M 35 44 L 84 44 L 84 54 L 76 54 L 95 160 L 43 54 L 35 54 Z"
      />
      <path
        fill="currentColor"
        d="M 120 44 L 155 44 L 155 54 L 147 54 L 95 160 L 128 54 L 120 54 Z"
      />
      <text
        x="200"
        y="156"
        fontSize="132"
        fontWeight={600}
        letterSpacing={-2}
        fill="currentColor"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Vakil
      </text>
    </svg>
  );
}
