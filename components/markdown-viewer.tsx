"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useCallback } from "react";
import type { Components } from "react-markdown";

const BOX_DRAWING_RE = /[\u2500-\u257F\u2580-\u259F\u25A0-\u25FF\u2190-\u21FF\u2080-\u2089\u25CB\u25A1\u25AA\u25AB\u25AC\u25AD]/;

function isDiagram(text: string): boolean {
  return BOX_DRAWING_RE.test(text);
}

function DiagramBlock({ children }: any) {
  return (
    <div className="diagram-block">
      <pre className="diagram-pre">
        <code className="diagram-code">
          {children}
        </code>
      </pre>
    </div>
  );
}

function CodeBlock({ className, children, ...props }: any) {
  const text = String(children);

  if (isDiagram(text)) {
    return <DiagramBlock>{children}</DiagramBlock>;
  }

  return <CodeBlockInner className={className} {...props}>{children}</CodeBlockInner>;
}

function CodeBlockInner({ className, children, ...props }: any) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const t = String(children).replace(/\n$/, "");
    navigator.clipboard.writeText(t).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [children]);

  return (
    <div className="code-block-wrapper group">
      <button
        onClick={handleCopy}
        className="copy-btn flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all"
        style={{
          background: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.08)",
          color: copied ? "#22c55e" : "rgba(255,255,255,0.5)",
        }}
      >
        {copied ? (
          <>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            Copy
          </>
        )}
      </button>
      <pre className="overflow-x-auto rounded-xl" style={{ background: "var(--pre-bg)" }}>
        <code className={`font-mono text-sm leading-relaxed`} style={{ color: "var(--pre-text)" }} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

function InlineCode({ children, ...props }: any) {
  return (
    <code
      className="rounded-md px-1.5 py-0.5 text-sm font-mono"
      style={{ background: "var(--code-bg)", color: "var(--code-text)" }}
      {...props}
    >
      {children}
    </code>
  );
}

const components: Components = {
  h1: ({ children, ...props }) => (
    <h1 className="text-3xl font-bold tracking-tight mb-6 mt-0 leading-tight" style={{ color: "var(--text-primary)" }} {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-xl font-semibold tracking-tight mt-10 mb-4 leading-snug" style={{ color: "var(--text-primary)" }} {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-lg font-semibold mt-8 mb-3 leading-snug" style={{ color: "var(--text-primary)" }} {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-5 leading-relaxed" style={{ color: "var(--text-secondary)" }} {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-5 ml-5 space-y-1.5" style={{ color: "var(--text-secondary)" }} {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-5 ml-5 space-y-1.5" style={{ color: "var(--text-secondary)" }} {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => <li className="leading-relaxed" {...props}>{children}</li>,
  a: ({ children, href, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-all" style={{ color: "var(--accent)", textDecorationColor: "color-mix(in srgb, var(--accent) 25%, transparent)" }}
       onMouseEnter={(e) => e.currentTarget.style.textDecorationColor = "var(--accent)"}
       onMouseLeave={(e) => e.currentTarget.style.textDecorationColor = "color-mix(in srgb, var(--accent) 25%, transparent)"}
       {...props}>
      {children}
    </a>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="mb-5 py-3 pl-5 pr-4 italic leading-relaxed" style={{ borderLeft: "3px solid var(--blockquote-border)", background: "var(--blockquote-bg)", color: "var(--text-secondary)", borderRadius: "0 10px 10px 0" }} {...props}>
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }: any) => {
    const isInline = !className;
    return isInline ? <InlineCode {...props}>{children}</InlineCode> : <CodeBlock className={className} {...props}>{children}</CodeBlock>;
  },
  hr: (props) => <hr className="my-10" style={{ border: "none", height: "1px", background: "var(--divider-gradient)" }} {...props} />,
  table: ({ children, ...props }) => (
    <div className="mb-6 overflow-x-auto rounded-xl" style={{ border: "1px solid var(--table-border)" }}>
      <table className="min-w-full text-sm" {...props}>{children}</table>
    </div>
  ),
  thead: ({ children, ...props }) => <thead style={{ background: "var(--table-header-bg)" }} {...props}>{children}</thead>,
  th: ({ children, ...props }) => <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }} {...props}>{children}</th>,
  td: ({ children, ...props }) => <td className="px-4 py-3" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--table-border)" }} {...props}>{children}</td>,
  tr: ({ children, ...props }) => <tr style={{ background: "transparent" }} {...props}>{children}</tr>,
  strong: ({ children, ...props }) => <strong style={{ fontWeight: 600, color: "var(--text-primary)" }} {...props}>{children}</strong>,
  em: ({ children, ...props }) => <em style={{ fontStyle: "italic", color: "var(--text-secondary)" }} {...props}>{children}</em>,
  img: ({ alt, src, ...props }) => (
    <img alt={alt || ""} src={src} className="my-6 rounded-xl max-w-full h-auto shadow-sm" style={{ border: "1px solid var(--border-subtle)" }} loading="lazy" {...props} />
  ),
};

interface MarkdownViewerProps {
  content: string;
  enableDropcap?: boolean;
}

export default function MarkdownViewer({ content, enableDropcap }: MarkdownViewerProps) {
  return (
    <div className={`reader-prose ${enableDropcap ? "has-dropcap" : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
