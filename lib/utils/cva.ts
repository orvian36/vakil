import { cn } from "./cn";

type VariantValue = string | string[];
type VariantConfig = Record<string, Record<string, VariantValue>>;

type VariantProps<C extends VariantConfig> = {
  [K in keyof C]?: keyof C[K];
};

/**
 * Tiny class-variance helper. Inspired by class-variance-authority but
 * dependency-free. Returns a function that takes variant selections and
 * returns the merged className.
 *
 *   const button = cva("base", {
 *     variants: {
 *       variant: { primary: "bg-gold-500", ghost: "bg-transparent" },
 *       size: { sm: "h-8", md: "h-10" },
 *     },
 *     defaultVariants: { variant: "primary", size: "md" },
 *   });
 *   button({ variant: "ghost" }); // "base bg-transparent h-10"
 */
export function cva<C extends VariantConfig>(
  base: string,
  config: { variants: C; defaultVariants?: VariantProps<C> },
) {
  return function variantFn(
    props?: VariantProps<C> & { className?: string },
  ): string {
    const out: string[] = [base];
    const merged = { ...config.defaultVariants, ...props };
    for (const key of Object.keys(config.variants) as (keyof C)[]) {
      const selection = (merged as VariantProps<C>)[key];
      if (selection == null) continue;
      const value = config.variants[key][selection as string];
      if (value == null) continue;
      out.push(Array.isArray(value) ? value.join(" ") : value);
    }
    if (props?.className) out.push(props.className);
    return cn(...out);
  };
}

export type { VariantProps };
