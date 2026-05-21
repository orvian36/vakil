"use client";

import { useState, useEffect } from "react";
import { 
  MDXEditor, 
  headingsPlugin, 
  listsPlugin, 
  quotePlugin, 
  thematicBreakPlugin, 
  markdownShortcutPlugin, 
  diffSourcePlugin, 
  toolbarPlugin, 
  UndoRedo, 
  BoldItalicUnderlineToggles, 
  BlockTypeSelect, 
  ListsToggle, 
  jsxPlugin, 
  tablePlugin, 
  Separator,
  linkDialogPlugin,
  imagePlugin
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import { preProcessMD } from '@/utils/remarkFixVoidTags';

// Custom editors that don't show gear icons
function CustomCitationEditor(props: any) {
  const mdastNode = props?.mdastNode;
  const children = mdastNode?.children?.[0]?.value || mdastNode?.children?.[0]?.children?.[0]?.value || 'Citation';

  return (
    <span className="bg-gold-500/15 text-gold-700 px-1 rounded">
      {children}
    </span>
  );
}

function CustomHoverableTextEditor(props: any) {
  const mdastNode = props?.mdastNode;
  const children = mdastNode?.children?.[0]?.value || mdastNode?.children?.[0]?.text || 'No content';

  return (
    <span className="bg-emerald-500/15 text-emerald-500 px-1 rounded">
      {children}
    </span>
  );
}

// Define JSX component descriptors for the editor
const jsxComponentDescriptors = [
  {
    name: 'HoverableText',
    kind: 'text' as const, // inline component
    props: [
      { name: 'searchText', type: 'string' as const }
    ],
    hasChildren: true,
    Editor: CustomHoverableTextEditor
  },
  {
    name: 'Citation',
    kind: 'text' as const, // inline component
    props: [
      { name: 'reference', type: 'string' as const }
    ],
    hasChildren: true,
    Editor: CustomCitationEditor
  }
];

interface MdxEditorProps {
  initialMarkdown?: string;
  onChange?: (markdown: string) => void;
  className?: string;
  placeholder?: string;
  /** "paper" (default) targets cream document surfaces; "ink" targets dark chrome. */
  variant?: "paper" | "ink";
}

export default function MdxEditorComponent({
  initialMarkdown = '',
  onChange,
  className = '',
  placeholder = 'Start writing...',
  variant = 'paper',
}: MdxEditorProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [processedMarkdown, setProcessedMarkdown] = useState(initialMarkdown);
  const [isClient, setIsClient] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setMarkdown(initialMarkdown);
    // Process the markdown when it changes
    preProcessMD(initialMarkdown).then(setProcessedMarkdown);
  }, [initialMarkdown]);

  // Process markdown when it changes
  useEffect(() => {
    preProcessMD(markdown).then(setProcessedMarkdown);
  }, [markdown]);

  const handleChange = (newMarkdown: string) => {
    setMarkdown(newMarkdown);
    onChange?.(newMarkdown);
  };

  const handleError = (error: any) => {
    console.error('MDXEditor rendering error:', error);
    setHasError(true);
  };

  const wrapperClass = variant === 'paper'
    ? `border border-line-paper rounded-lg overflow-hidden bg-cream-50 ${className}`
    : `border border-line-strong rounded-lg overflow-hidden bg-ink-800 ${className}`;
  const stateBgClass = variant === 'paper' ? 'bg-cream-100' : 'bg-ink-800';
  const stateTextClass = variant === 'paper' ? 'text-paper-ink/70' : 'text-ink-400';

  if (!isClient) {
    return (
      <div className={`border border-line-paper rounded-lg overflow-hidden h-96 flex items-center justify-center ${stateBgClass} ${className}`}>
        <div className={stateTextClass}>Loading Editor...</div>
      </div>
    );
  }

  // Error fallback component
  if (hasError) {
    return (
      <div className={`border border-line-paper rounded-lg overflow-hidden h-96 flex items-center justify-center ${stateBgClass} ${className}`}>
        <div className="text-center p-6 max-w-md">
          <div className="mb-4">
            <svg className="w-16 h-16 text-rose-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${variant === 'paper' ? 'text-paper-ink' : 'text-ink-100'}`}>Editor Failed to Load</h3>
          <p className={stateTextClass}>
            Unable to render content.<br/>
            Invalid syntax or corrupted AI data.<br/>
            <span className="text-sm mt-2 inline-block opacity-80">Try regenerating the content.</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        /* Table controls are now visible - removed hiding CSS */

        .mdx-editor-content {
          font-family: 'Open Sans', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
          font-size: 13px;
          color: #222;
          line-height: 160%;
          max-width: none;
          display: block;
          overflow: hidden;
        }

        .mdx-editor-content *:not(table) {
          line-height: 160%;
          box-sizing: content-box;
        }

        .mdx-editor-content i,
        .mdx-editor-content cite,
        .mdx-editor-content em,
        .mdx-editor-content var,
        .mdx-editor-content address,
        .mdx-editor-content dfn {
          font-style: italic;
        }

        .mdx-editor-content strong {
          font-weight: bold;
        }

        .mdx-editor-content p {
          margin: 10px 0;
          color: #222;
          display: block;
        }

        .mdx-editor-content p > div {
          display: block;
        }

        .mdx-editor-content > *:first-child {
          margin-top: 0 !important;
        }

        .mdx-editor-content > h1:first-of-type {
          margin-top: 0;
        }

        .mdx-editor-content h1,
        .mdx-editor-content h2,
        .mdx-editor-content h3,
        .mdx-editor-content h4,
        .mdx-editor-content h5,
        .mdx-editor-content h6 {
          font-weight: bold;
          color: #222;
        }

        .mdx-editor-content h1 {
          font-size: 24px;
          line-height: 28px;
          border-bottom: 3px double #999;
          margin: 20px 0 15px 0;
          padding-bottom: 7px;
        }

        .mdx-editor-content h2 {
          font-size: 22px;
          line-height: 23px;
          border-bottom: 1px solid #dbdbdb;
          margin: 20px 0 13px 0;
          padding-bottom: 7px;
        }

        .mdx-editor-content h3 {
          font-size: 20px;
          line-height: 18px;
          margin: 18px 0 2px;
        }

        .mdx-editor-content h4 {
          font-size: 18px;
          line-height: 18px;
          margin: 10px 0 2px;
        }

        .mdx-editor-content h5 {
          font-size: 16px;
          line-height: 17px;
          margin: 9px 0 -4px;
        }

        .mdx-editor-content h6 {
          font-size: 14px;
          line-height: 17px;
          margin: 9px 0 -4px;
        }

        .mdx-editor-content del {
          color: #999;
        }

        .mdx-editor-content blockquote {
          margin: 14px 0;
          border-left: 4px solid #e5e5e5;
          padding: 0 16px;
          color: #999;
        }

        .mdx-editor-content blockquote p,
        .mdx-editor-content blockquote ul,
        .mdx-editor-content blockquote ol {
          color: #999;
        }

        .mdx-editor-content blockquote > :first-child {
          margin-top: 0;
        }

        .mdx-editor-content blockquote > :last-child {
          margin-bottom: 0;
        }

        .mdx-editor-content pre,
        .mdx-editor-content code {
          font-family: Consolas, Courier, 'Lucida Grande', 'Segoe UI', monospace;
          border: 0;
          border-radius: 0;
        }

        .mdx-editor-content pre {
          margin: 2px 0 8px;
          padding: 18px;
          background-color: #f4f7f8;
        }

        .mdx-editor-content code {
          color: #c1798b;
          background-color: #f9f2f4;
          padding: 2px 3px;
          letter-spacing: -0.3px;
          border-radius: 2px;
        }

        .mdx-editor-content pre code {
          padding: 0;
          color: inherit;
          white-space: pre-wrap;
          background-color: transparent;
        }

        .mdx-editor-content img {
          margin: 4px 0 10px;
          box-sizing: border-box;
          vertical-align: top;
          max-width: 100%;
        }

        .mdx-editor-content table {
          border: 1px solid rgba(0, 0, 0, 0.1);
          margin: 12px 0 14px;
          color: #222;
          width: auto;
          border-collapse: collapse;
          box-sizing: border-box;
        }

        .mdx-editor-content table th,
        .mdx-editor-content table td {
          border: 1px solid rgba(0, 0, 0, 0.1);
          padding: 5px 14px 5px 12px;
          height: 32px;
        }

        .mdx-editor-content table th {
          background-color: #ffffff;
          font-weight: 300;
          color: #222;
          padding-top: 6px;
        }

        .mdx-editor-content th p {
          margin: 0;
          color: #222;
        }

        .mdx-editor-content td p {
          margin: 0;
          padding: 0 2px;
        }

        .mdx-editor-content ul,
        .mdx-editor-content menu,
        .mdx-editor-content ol,
        .mdx-editor-content dir {
          display: block;
          list-style-type: none;
          padding-left: 24px;
          margin: 6px 0 10px;
          color: #222;
        }

        .mdx-editor-content ol {
          counter-reset: li;
        }

        .mdx-editor-content ol > li {
          counter-increment: li;
        }

        .mdx-editor-content ul > li::before,
        .mdx-editor-content ol > li::before {
          display: inline-block;
          position: absolute;
        }

        .mdx-editor-content ul > li::before {
          content: '';
          margin-top: 6px;
          margin-left: -17px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #ccc;
        }

        .mdx-editor-content ol > li::before {
          content: '.' counter(li);
          margin-left: -28px;
          width: 24px;
          text-align: right;
          direction: rtl;
          color: #aaa;
        }

        .mdx-editor-content ul ul,
        .mdx-editor-content ul ol,
        .mdx-editor-content ol ol,
        .mdx-editor-content ol ul {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }

        .mdx-editor-content ul li,
        .mdx-editor-content ol li {
          position: relative;
        }

        .mdx-editor-content ul p,
        .mdx-editor-content ol p {
          margin: 0;
        }

        .mdx-editor-content hr {
          border-top: 1px solid #eee;
          margin: 16px 0;
        }

        .mdx-editor-content a {
          text-decoration: underline;
          color: var(--color-gold-700);
        }

        .mdx-editor-content a:hover {
          color: var(--color-gold-500);
        }

        .mdx-editor-content .task-list-item {
          border: 0;
          list-style: none;
          padding-left: 24px;
          margin-left: -24px;
        }

        .mdx-editor-content .task-list-item::before {
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

        .mdx-editor-content .task-list-item.checked::before {
          background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgdmlld0JveD0iMCAwIDE4IDE4Ij4KICAgIDxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgZmlsbD0iIzRCOTZFNiI+CiAgICAgICAgICAgIDxnPgogICAgICAgICAgICAgICAgPGc+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE2IDBjMS4xMDUgMCAyIC44OTUgMiAydjE0YzAgMS4xMDUtLjg5NSAyLTIgMkgyYy0xLjEwNSAwLTItLjg5NS0yLTJWMkMwIC44OTUuODk1IDAgMiAwaDE0em0tMS43OTMgNS4yOTNjLS4zOS0uMzktMS4wMjQtLjM5LTEuNDE0IDBMNy41IDEwLjU4NSA1LjIwNyA4LjI5M2wtLjA5NC0uMDgzYy0uMzkyLS4zMDUtLjk2LS4yNzgtMS4zMi4wODMtLjM5LjM5LS4zOSAxLjAyNCAwIDEuNDE0bDMgMyAuMDk0LjA4M2MuMzkyLjMwNS45Ni4yNzggMS4zMi0uMDgzbDYtNiAuMDgzLS4wOTRjLjMwNS0uMzkyLjI3OC0uOTYtLjA4My0xLjMyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEwNTAgLTI5NikgdHJhbnNsYXRlKDc4OCAxOTIpIHRyYW5zbGF0ZSgyNjIgMTA0KSIvPgogICAgICAgICAgICAgICAgPC9nPgogICAgICAgICAgICA8L2c+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4K);
        }
      `}</style>
      
      <div className={wrapperClass}>
        <MDXEditor
          markdown={processedMarkdown}
          onChange={handleChange}
          onError={handleError}
          placeholder={placeholder}
          contentEditableClassName="mdx-editor-content"
          plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          linkDialogPlugin(),
          imagePlugin(),
          tablePlugin(),
          diffSourcePlugin(),
          jsxPlugin({
            jsxComponentDescriptors,
          }),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <ListsToggle />
                <Separator />
                
              </>
            )
          })
        ]}
      />
      </div>
    </>
  );
}
