import { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  tagline?: string;
}

export function AuthShell({
  children,
  tagline = "Drafts while you strategise.",
}: AuthShellProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink-950">
      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      {/* Editorial side panel — hidden on small screens */}
      <aside className="hidden lg:flex items-center justify-center bg-ink-900 border-l border-line-soft p-12 relative">
        <div className="absolute top-12 left-12 w-12 h-px bg-gold-500" />
        <h2 className="text-5xl font-display text-ink-100 leading-tight max-w-md">
          {tagline}
        </h2>
        <div className="absolute bottom-12 left-12 text-xs uppercase tracking-widest text-ink-400">
          Vakil · AI paralegal
        </div>
      </aside>
    </div>
  );
}
