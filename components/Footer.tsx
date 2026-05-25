import { VakilLogo } from "@/components/ui";

export default function Footer() {
  return (
    <footer className="border-t border-line-soft mt-12 py-4 text-sm text-ink-400">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-2 text-center">
        <span aria-hidden="true">©&nbsp;2026</span>
        <VakilLogo className="h-5 w-auto text-ink-300" />
        <span aria-hidden="true" className="hidden sm:inline text-ink-500">
          ·
        </span>
        <span>
          Built by{" "}
          <a
            href="https://github.com/orvian36"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-500 underline-offset-2 hover:underline"
          >
            Habibur Rahman
          </a>
        </span>
      </div>
    </footer>
  );
}
