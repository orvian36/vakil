"use client";

import React from "react";
import Markdown from "markdown-to-jsx";
import dynamic from "next/dynamic";

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Renderer-specific styles (Toast UI theme)
const rendererStyles = {
  container: {
    color: 'var(--color-paper-ink)',
    lineHeight: '160%',
    maxWidth: 'none',
  },
};

// Main MdxRenderer component using markdown-to-jsx
interface MdxRendererProps {
  source: string;
  components?: Record<string, React.ComponentType<any>>;
  /** "paper" (default) targets cream document surfaces; "ink" targets dark chrome. */
  variant?: "paper" | "ink";
}

const MdxRenderer = ({ source, components = {}, variant = "paper" }: MdxRendererProps) => {
  const linkColor = variant === "paper" ? "var(--color-gold-700)" : "var(--color-gold-500)";
  const linkHover = variant === "paper" ? "var(--color-gold-500)" : "var(--color-gold-300)";

  return (
    <article className="prose max-w-none" style={rendererStyles.container}>
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Toast UI Editor Content Styles */
          .prose {
            font-family: 'Open Sans', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
            font-size: 13px;
            color: #222;
            line-height: 160%;
            max-width: none;
            display: block;
            overflow: hidden;
          }

          .prose *:not(table) {
            line-height: 160%;
            box-sizing: content-box;
          }

          .prose i,
          .prose cite,
          .prose em,
          .prose var,
          .prose address,
          .prose dfn {
            font-style: italic;
          }

          .prose strong {
            font-weight: bold;
          }

          .prose p {
            margin: 10px 0;
            color: #222;
            display: block;
          }

          .prose p > div {
            display: block;
          }

          .prose > *:first-child {
            margin-top: 0 !important;
          }

          .prose > h1:first-of-type {
            margin-top: 0;
          }

          .prose h1,
          .prose h2,
          .prose h3,
          .prose h4,
          .prose h5,
          .prose h6 {
            font-weight: bold;
            color: #222;
          }

          .prose h1 {
            font-size: 24px;
            line-height: 28px;
            border-bottom: 3px double #999;
            margin: 20px 0 15px 0;
            padding-bottom: 7px;
          }

          .prose h2 {
            font-size: 22px;
            line-height: 23px;
            border-bottom: 1px solid #dbdbdb;
            margin: 20px 0 13px 0;
            padding-bottom: 7px;
          }

          .prose h3 {
            font-size: 20px;
            line-height: 18px;
            margin: 18px 0 2px;
          }

          .prose h4 {
            font-size: 18px;
            line-height: 18px;
            margin: 10px 0 2px;
          }

          .prose h5 {
            font-size: 16px;
            line-height: 17px;
            margin: 9px 0 -4px;
          }

          .prose h6 {
            font-size: 14px;
            line-height: 17px;
            margin: 9px 0 -4px;
          }

          .prose del {
            color: #999;
          }

          .prose blockquote {
            margin: 14px 0;
            border-left: 4px solid #e5e5e5;
            padding: 0 16px;
            color: #999;
          }

          .prose blockquote p,
          .prose blockquote ul,
          .prose blockquote ol {
            color: #999;
          }

          .prose blockquote > :first-child {
            margin-top: 0;
          }

          .prose blockquote > :last-child {
            margin-bottom: 0;
          }

          .prose pre,
          .prose code {
            font-family: Consolas, Courier, 'Lucida Grande', 'Segoe UI', monospace;
            border: 0;
            border-radius: 0;
          }

          .prose pre {
            margin: 2px 0 8px;
            padding: 18px;
            background-color: #f4f7f8;
          }

          .prose code {
            color: #c1798b;
            background-color: #f9f2f4;
            padding: 2px 3px;
            letter-spacing: -0.3px;
            border-radius: 2px;
          }

          .prose pre code {
            padding: 0;
            color: inherit;
            white-space: pre-wrap;
            background-color: transparent;
          }

          .prose img {
            margin: 4px 0 10px;
            box-sizing: border-box;
            vertical-align: top;
            max-width: 100%;
          }

          .prose table {
            border: 1px solid rgba(0, 0, 0, 0.1);
            margin: 12px 0 14px;
            color: #222;
            width: auto;
            border-collapse: collapse;
            box-sizing: border-box;
          }

          .prose table th,
          .prose table td {
            border: 1px solid rgba(0, 0, 0, 0.1);
            padding: 5px 14px 5px 12px;
            height: 32px;
          }

          .prose table th {
            background-color: #555;
            font-weight: 300;
            color: #fff;
            padding-top: 6px;
          }

          .prose th p {
            margin: 0;
            color: #fff;
          }

          .prose td p {
            margin: 0;
            padding: 0 2px;
          }

          .prose ul,
          .prose menu,
          .prose ol,
          .prose dir {
            display: block;
            list-style-type: none;
            padding-left: 24px;
            margin: 6px 0 10px;
            color: #222;
          }

          .prose ol {
            counter-reset: li;
          }

          .prose ol > li {
            counter-increment: li;
          }

          .prose ul > li::before,
          .prose ol > li::before {
            display: inline-block;
            position: absolute;
          }

          .prose ul > li::before {
            content: '';
            margin-top: 6px;
            margin-left: -17px;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background-color: #ccc;
          }

          .prose ol > li::before {
            content: '.' counter(li);
            margin-left: -28px;
            width: 24px;
            text-align: right;
            direction: rtl;
            color: #aaa;
          }

          .prose ul ul,
          .prose ul ol,
          .prose ol ol,
          .prose ol ul {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }

          .prose ul li,
          .prose ol li {
            position: relative;
          }

          .prose ul p,
          .prose ol p {
            margin: 0;
          }

          .prose hr {
            border-top: 1px solid #eee;
            margin: 16px 0;
          }

          .prose a {
            text-decoration: underline;
            color: ${linkColor};
          }

          .prose a:hover {
            color: ${linkHover};
          }

          .prose .task-list-item {
            border: 0;
            list-style: none;
            padding-left: 24px;
            margin-left: -24px;
          }

          .prose .task-list-item::before {
            background-repeat: no-repeat;
            background-size: 18px 18px;
            background-position: center;
            content: '';
            margin-left: 0;
            margin-top: 0;
            border-radius: 2px;
            height: 18px;
            width: 18px;
            position: absolute;
            left: 0;
            top: 1px;
            cursor: pointer;
            background: transparent url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgdmlld0JveD0iMCAwIDE4IDE4Ij4KICAgIDxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgZmlsbD0iI0ZGRiIgc3Ryb2tlPSIjQ0NDIj4KICAgICAgICAgICAgPGc+CiAgICAgICAgICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMTAzMCAtMjk2KSB0cmFuc2xhdGUoNzg4IDE5MikgdHJhbnNsYXRlKDI0MiAxMDQpIj4KICAgICAgICAgICAgICAgICAgICA8cmVjdCB3aWR0aD0iMTciIGhlaWdodD0iMTciIHg9Ii41IiB5PSIuNSIgcng9IjIiLz4KICAgICAgICAgICAgICAgIDwvZz4KICAgICAgICAgICAgPC9nPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+Cg==);
          }

          .prose .task-list-item.checked::before {
            background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgdmlld0JveD0iMCAwIDE4IDE4Ij4KICAgIDxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgZmlsbD0iIzRCOTZFNiI+CiAgICAgICAgICAgIDxnPgogICAgICAgICAgICAgICAgPGc+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE2IDBjMS4xMDUgMCAyIC44OTUgMiAydjE0YzAgMS4xMDUtLjg5NSAyLTIgMkgyYy0xLjEwNSAwLTItLjg5NS0yLTJWMkMwIC44OTUuODk1IDAgMiAwaDE0em0tMS43OTMgNS4yOTNjLS4zOS0uMzktMS4wMjQtLjM5LTEuNDE0IDBMNy41IDEwLjU4NSA1LjIwNyA4LjI5M2wtLjA5NC0uMDgzYy0uMzkyLS4zMDUtLjk2LS4yNzgtMS4zMi4wODMtLjM5LjM5LS4zOSAxLjAyNCAwIDEuNDE0bDMgMyAuMDk0LjA4M2MuMzkyLjMwNS45Ni4yNzggMS4zMi0uMDgzbDYtNiAuMDgzLS4wOTRjLjMwNS0uMzkyLjI3OC0uOTYtLjA4My0xLjMyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEwNTAgLTI5NikgdHJhbnNsYXRlKDc4OCAxOTIpIHRyYW5zbGF0ZSgyNjIgMTA0KSIvPgogICAgICAgICAgICAgICAgPC9nPgogICAgICAgICAgICA8L2c+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4K);
          }
        `
      }} />
      <Markdown
        options={{
          overrides: {
            ...components,
          },
          forceBlock: true,
          forceInline: false,
          wrapper: React.Fragment,
          createElement: (type, props, ...children) => {
            // Handle custom components like Hoverable
            if (typeof type === 'string' && components[type]) {
              return React.createElement(components[type], props, ...children);
            }
            return React.createElement(type, props, ...children);
          },
        }}
      >
        {source}
      </Markdown>
    </article>
  );
};

// Dynamic export with SSR disabled and loading component
const DynamicMdxRenderer = dynamic(
  () => Promise.resolve(MdxRenderer),
  { 
    ssr: false,
    loading: () => <LoadingSpinner />
  }
);

export default DynamicMdxRenderer;