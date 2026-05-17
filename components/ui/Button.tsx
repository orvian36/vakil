"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "@/lib/utils/cva";
import { cn } from "@/lib/utils/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-colors focus-gold disabled:opacity-50 disabled:cursor-not-allowed select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-gold-500 text-ink-950 hover:bg-gold-300 active:bg-gold-700",
        secondary:
          "bg-ink-700 text-ink-100 hover:bg-ink-600 border border-line-strong",
        ghost:
          "bg-transparent text-ink-300 hover:text-ink-100 hover:bg-ink-800",
        destructive:
          "bg-rose-500 text-ink-100 hover:opacity-90 active:opacity-80",
        link: "bg-transparent text-gold-500 hover:underline underline-offset-4 p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariantsMap> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "link";
  size?: "sm" | "md" | "lg" | "icon";
}

const buttonVariantsMap = {
  variant: { primary: "", secondary: "", ghost: "", destructive: "", link: "" },
  size: { sm: "", md: "", lg: "", icon: "" },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      loading,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(button({ variant, size }), className)}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);
