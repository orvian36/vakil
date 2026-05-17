"use client";

import * as React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils/cn";

export const Tabs = RadixTabs.Root;

export const TabsList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(function TabsList({ className, ...rest }, ref) {
  return (
    <RadixTabs.List
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 border-b border-line-soft",
        className,
      )}
      {...rest}
    />
  );
});

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(function TabsTrigger({ className, ...rest }, ref) {
  return (
    <RadixTabs.Trigger
      ref={ref}
      className={cn(
        "relative px-3 py-2 text-sm font-medium text-ink-400 transition-colors hover:text-ink-100 focus-gold data-[state=active]:text-gold-500",
        "after:absolute after:left-3 after:right-3 after:-bottom-px after:h-0.5 after:bg-transparent data-[state=active]:after:bg-gold-500",
        className,
      )}
      {...rest}
    />
  );
});

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(function TabsContent({ className, ...rest }, ref) {
  return (
    <RadixTabs.Content
      ref={ref}
      className={cn("pt-4 focus:outline-none", className)}
      {...rest}
    />
  );
});
