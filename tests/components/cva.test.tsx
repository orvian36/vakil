import { describe, it, expect } from "vitest";
import { cva } from "@/lib/utils/cva";

describe("cva", () => {
  const button = cva("base", {
    variants: {
      variant: { primary: "bg-gold-500", ghost: "bg-transparent" },
      size: { sm: "h-8", md: "h-10" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  });

  it("applies defaults when no props passed", () => {
    expect(button()).toBe("base bg-gold-500 h-10");
  });

  it("overrides defaults when prop given", () => {
    expect(button({ variant: "ghost" })).toBe("base bg-transparent h-10");
  });

  it("appends arbitrary className", () => {
    expect(button({ className: "extra" })).toBe("base bg-gold-500 h-10 extra");
  });
});
