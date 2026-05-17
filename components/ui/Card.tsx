import * as React from "react";
import { cva, type VariantProps } from "@/lib/utils/cva";
import { cn } from "@/lib/utils/cn";

const card = cva(
  "rounded-[var(--radius-lg)] p-5 transition-colors",
  {
    variants: {
      variant: {
        chrome: "bg-ink-800 border border-line-soft",
        "chrome-raised": "bg-ink-700 border border-line-strong",
        "gold-accent":
          "bg-ink-800 border border-line-gold shadow-[inset_0_1px_0_rgba(240,176,64,0.08)]",
        "cream-paper": "cream-paper",
      },
    },
    defaultVariants: { variant: "chrome" },
  },
);

const cardVariantsMap = {
  variant: { chrome: "", "chrome-raised": "", "gold-accent": "", "cream-paper": "" },
};

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariantsMap> {
  variant?: "chrome" | "chrome-raised" | "gold-accent" | "cream-paper";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, ...rest },
  ref,
) {
  return <div ref={ref} className={cn(card({ variant }), className)} {...rest} />;
});

Card.displayName = "Card";
