"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-css";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";

interface AnswerRendererProps {
  text: string;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        background: "var(--accent-bg)",
        color: "var(--accent)",
        padding: "1px 5px",
        borderRadius: 4,
        fontSize: "inherit",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      }}
    >
      {children}
    </code>
  );
}

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const lang = className?.replace("language-", "") || "text";
  const code = String(children).replace(/\n$/, "");

  useEffect(() => {
    if (ref.current) {
      Prism.highlightElement(ref.current);
    }
  }, [code, lang]);

  return (
    <div
      style={{
        margin: "8px 0",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {lang && lang !== "text" && (
        <div
          style={{
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-muted)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {lang}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: 12,
          overflowX: "auto",
          fontSize: 11,
          lineHeight: 1.5,
          background: "#1e1e2e",
        }}
      >
        <code ref={ref} className={className}>
          {code}
        </code>
      </pre>
    </div>
  );
}

const components = {
  code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
    const isInline = !className;
    if (isInline) {
      return <InlineCode>{children}</InlineCode>;
    }
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  pre({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
  },
  p({ children }: { children?: React.ReactNode }) {
    return <p style={{ margin: "4px 0", lineHeight: 1.6 }}>{children}</p>;
  },
  ul({ children }: { children?: React.ReactNode }) {
    return <ul style={{ margin: "4px 0", paddingLeft: 20 }}>{children}</ul>;
  },
  ol({ children }: { children?: React.ReactNode }) {
    return <ol style={{ margin: "4px 0", paddingLeft: 20 }}>{children}</ol>;
  },
  li({ children }: { children?: React.ReactNode }) {
    return <li style={{ margin: "2px 0" }}>{children}</li>;
  },
  strong({ children }: { children?: React.ReactNode }) {
    return <strong style={{ fontWeight: 600 }}>{children}</strong>;
  },
  em({ children }: { children?: React.ReactNode }) {
    return <em>{children}</em>;
  },
  a({ href, children }: { href?: string; children?: React.ReactNode }) {
    return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>{children}</a>;
  },
  h1({ children }: { children?: React.ReactNode }) {
    return <h1 style={{ fontSize: 14, fontWeight: 700, margin: "8px 0 4px" }}>{children}</h1>;
  },
  h2({ children }: { children?: React.ReactNode }) {
    return <h2 style={{ fontSize: 13, fontWeight: 700, margin: "8px 0 4px" }}>{children}</h2>;
  },
  h3({ children }: { children?: React.ReactNode }) {
    return <h3 style={{ fontSize: 12, fontWeight: 700, margin: "8px 0 4px" }}>{children}</h3>;
  },
  blockquote({ children }: { children?: React.ReactNode }) {
    return (
      <blockquote
        style={{
          margin: "6px 0",
          paddingLeft: 10,
          borderLeft: "3px solid var(--border-subtle)",
          color: "var(--text-secondary)",
          fontStyle: "italic",
        }}
      >
        {children}
      </blockquote>
    );
  },
  table({ children }: { children?: React.ReactNode }) {
    return (
      <div style={{ overflowX: "auto", margin: "6px 0" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>{children}</table>
      </div>
    );
  },
  th({ children }: { children?: React.ReactNode }) {
    return <th style={{ border: "1px solid var(--border-subtle)", padding: "4px 8px", fontWeight: 600, background: "rgba(255,255,255,0.04)", textAlign: "left" }}>{children}</th>;
  },
  td({ children }: { children?: React.ReactNode }) {
    return <td style={{ border: "1px solid var(--border-subtle)", padding: "4px 8px" }}>{children}</td>;
  },
  hr() {
    return <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid var(--border-subtle)" }} />;
  },
};

export default function AnswerRenderer({ text }: AnswerRendererProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {text}
    </ReactMarkdown>
  );
}
