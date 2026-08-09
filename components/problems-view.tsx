"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js";
import type { Components } from "react-markdown";
import { parseProblemFile, type Problem, type ProblemFile } from "@/lib/problem-files";

interface ProblemsViewProps {
  files: { path: string; content: string }[];
  currentPath: string | null;
}

interface CodeViewInfo {
  code: string;
  lang: string;
  label: string;
}

function copyText(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function CodeFullscreen({ info, onClose }: { info: CodeViewInfo; onClose: () => void }) {
  const langName = info.lang;
  const highlighted = useMemo(() => {
    const text = info.code.replace(/\n$/, "");
    try {
      if (langName && hljs.getLanguage(langName)) {
        return hljs.highlight(text, { language: langName, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(text).value;
    } catch {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }, [info.code, langName]);
  const lineCount = useMemo(() => info.code.split("\n").length, [info.code]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: "#0d1117", color: "#e6edf3" }}
    >
      <div
        className="flex items-center gap-3 px-3 sm:px-4 py-2.5 shrink-0 select-none"
        style={{ background: "#161b22", borderBottom: "1px solid #21262d" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
        </div>
        <div className="hidden sm:flex items-center gap-1.5 min-w-0 ml-2">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "#7d8590" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
          <span className="truncate text-xs font-medium font-mono" style={{ color: "#e6edf3" }}>{info.label}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {langName && (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-1 font-mono" style={{ background: "rgba(110,118,129,0.15)", color: "#7ee787" }}>
              {langName}
            </span>
          )}
          <span className="text-[10px] font-mono hidden sm:inline" style={{ color: "#7d8590" }}>{lineCount} lines</span>
          <button
            onClick={() => copyText(info.code)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
            style={{ background: "#21262d", color: "#e6edf3" }}
            title="Copy code"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            Copy
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 rounded-lg transition-colors hover:opacity-90"
            style={{ background: "#21262d", color: "#e6edf3" }}
            title="Close (Esc)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-max">
          <div
            className="select-none text-right font-mono text-[13px] leading-[1.6] pt-4 pb-4 px-3 sticky left-0 shrink-0"
            style={{ color: "#484f58", background: "#0d1117", minWidth: "3.5rem" }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre
            className="font-mono text-[13px] leading-[1.6] py-4 pr-4"
            style={{ color: "#e6edf3", whiteSpace: "pre" }}
          >
            <code
              className="hljs"
              style={{ background: "transparent", color: "inherit", padding: 0 }}
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </pre>
        </div>
      </div>
    </div>
  );
}

function MdInlineCode({ children }: any) {
  return (
    <code
      className="fc-inline-code"
      style={{
        background: "var(--code-bg)",
        color: "var(--code-text)",
        padding: "0.1em 0.4em",
        borderRadius: 6,
        fontFamily: "var(--font-mono), monospace",
        fontSize: "0.85em",
        wordBreak: "break-word",
      }}
    >
      {children}
    </code>
  );
}

function MdBlockCode({ className, children, onExpand }: any) {
  const [copied, setCopied] = useState(false);
  const langMatch = /language-([\w+-]+)/.exec(className || "");
  const langName = langMatch ? langMatch[1].toLowerCase() : "";
  const code = String(children).replace(/\n$/, "");

  const html = useMemo(() => {
    try {
      if (langName && hljs.getLanguage(langName)) {
        return hljs.highlight(code, { language: langName, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }, [code, langName]);

  const handleCopy = useCallback(() => {
    copyText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="my-2.5">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg"
        style={{ background: "var(--pre-bg)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        {langName ? (
          <span className="text-[10px] font-bold uppercase tracking-wider font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>{langName}</span>
        ) : (
          <span className="text-[10px] font-semibold tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>CODE</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all"
            style={{ background: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.08)", color: copied ? "#22c55e" : "rgba(255,255,255,0.6)" }}
            title="Copy code"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={() => onExpand({ code, lang: langName || "", label: `Solution.${langName || "txt"}` })}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all"
            style={{ background: "rgba(56,139,253,0.18)", color: "#58a6ff" }}
            title="View fullscreen (IDE view)"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v18m0-18h18M3.75 3.75h6m8.25-3H21v3m0 8.25V21H5.25V9" />
            </svg>
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
        </div>
      </div>
      <pre
        className="overflow-x-auto rounded-b-lg"
        style={{ background: "var(--pre-bg)", margin: 0, padding: "0.85rem 1rem", lineHeight: 1.55 }}
      >
        <code
          className="hljs font-mono text-[0.8rem]"
          style={{ background: "transparent", color: "var(--pre-text)", padding: 0 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}

function makeMiniComponents(onExpand: (i: CodeViewInfo) => void): Components {
  return {
    pre: ({ children }) => <>{children}</>,
    p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
    h4: ({ children }) => <p className="mb-2 text-sm font-semibold mt-3" style={{ color: "var(--text-primary)" }}>{children}</p>,
    h5: ({ children }) => <p className="mb-2 text-[13px] font-semibold mt-2" style={{ color: "var(--text-primary)" }}>{children}</p>,
    h6: ({ children }) => <p className="mb-2 text-[13px] font-semibold mt-2" style={{ color: "var(--text-primary)" }}>{children}</p>,
    blockquote: ({ children }) => (
      <blockquote className="mb-2 border-l-2 pl-3 py-1" style={{ borderColor: "var(--accent)", color: "var(--text-secondary)" }}>{children}</blockquote>
    ),
    strong: ({ children }) => <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{children}</strong>,
    em: ({ children }) => <em style={{ color: "var(--text-secondary)" }}>{children}</em>,
    a: ({ children, href }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 2 }}>{children}</a>
    ),
    ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    code: ({ className, children }: any) => {
      const text = String(children);
      const isInline = !className && !text.includes("\n");
      if (isInline) return <MdInlineCode>{children}</MdInlineCode>;
      return <MdBlockCode className={className} onExpand={onExpand}>{children}</MdBlockCode>;
    },
    table: ({ children, ...props }) => (
      <div className="mb-3 overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border-subtle)" }}>
        <table className="min-w-full text-[0.8rem]" {...props}>{children}</table>
      </div>
    ),
    thead: ({ children, ...props }) => <thead style={{ background: "var(--table-header-bg)" }} {...props}>{children}</thead>,
    th: ({ children, ...props }) => <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }} {...props}>{children}</th>,
    td: ({ children, ...props }) => <td className="px-3 py-2 font-mono text-[0.8rem]" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border-subtle)" }} {...props}>{children}</td>,
  };
}

function SectionMd({ content, onExpand }: { content: string; onExpand: (info: CodeViewInfo) => void }) {
  const components = useMemo(() => makeMiniComponents(onExpand), [onExpand]);
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}

const DIFF_COLORS: Record<string, { fg: string; bg: string }> = {
  Hard: { fg: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  Medium: { fg: "#eab308", bg: "rgba(234,179,8,0.12)" },
  Easy: { fg: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  None: { fg: "var(--text-tertiary)", bg: "var(--bg-hover)" },
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function ProblemCard({
  problem,
  open, onToggle, onSectionToggle, expandedSections, onExpandCode,
}: {
  problem: Problem;
  open: boolean;
  onToggle: () => void;
  onSectionToggle: (id: string) => void;
  expandedSections: Set<string>;
  onExpandCode: (info: CodeViewInfo) => void;
}) {
  const diff = problem.difficulty;
  const diffColor = DIFF_COLORS[diff] || DIFF_COLORS.None;

  return (
    <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 sm:px-4 py-3 text-left transition-colors"
        style={{ background: open ? "var(--accent-bg)" : "transparent" }}
      >
        <Chevron open={open} />
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
          style={{ background: "var(--bg-hover)", color: "var(--accent)" }}
        >
          {problem.number || "·"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {problem.title}
          </span>
          {problem.lcNumber && (
            <span className="mt-0.5 block text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              LeetCode #{problem.lcNumber}
            </span>
          )}
        </span>
        {diff !== "None" && (
          <span
            className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: diffColor.bg, color: diffColor.fg }}
          >
            {diff}
          </span>
        )}
      </button>

      {open && (
        <div className="px-3 sm:px-4 pb-3 pt-2 space-y-2">
          {problem.sections.map((section) => {
            const sid = section.id;
            const isOpen = expandedSections.has(sid);
            return (
              <div key={sid} className="overflow-hidden rounded-lg" style={{ border: "1px solid var(--border-subtle)" }}>
                <button
                  onClick={() => onSectionToggle(sid)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
                  style={{ background: "var(--bg-hover)" }}
                >
                  <Chevron open={isOpen} />
                  <span className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{section.title || "Intro"}</span>
                  <span className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                    {section.hasCode ? "Code" : "Text"}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-3 py-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <SectionMd content={section.content} onExpand={onExpandCode} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProblemsView({ files, currentPath }: ProblemsViewProps) {
  const [activePath, setActivePath] = useState<string>(currentPath || (files[0]?.path ?? ""));
  const [openProblems, setOpenProblems] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [codeView, setCodeView] = useState<CodeViewInfo | null>(null);

  useEffect(() => {
    if (currentPath) setActivePath(currentPath);
  }, [currentPath]);

  const parsed = useMemo(() => {
    const map = new Map<string, ProblemFile>();
    for (const f of files) map.set(f.path, parseProblemFile(f.content, f.path));
    return map;
  }, [files]);

  const activeFile = parsed.get(activePath);
  const problems = activeFile?.problems ?? [];

  const withProblems = Array.from(parsed.values()).filter((pf) => pf.problems.length > 0);
  const visible = problems.filter((p) => !filter || p.title.toLowerCase().includes(filter.toLowerCase()));

  const toggleProblem = useCallback((id: string) => {
    setOpenProblems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onExpandCode = useCallback((info: CodeViewInfo) => setCodeView(info), []);

  return (
    <div className="flex flex-1 flex-col min-h-0" style={{ background: "var(--bg-page)" }}>
      {withProblems.length > 1 && (
        <div className="flex items-center gap-2 px-3 sm:px-6 pt-3 overflow-x-auto shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider shrink-0" style={{ color: "var(--text-tertiary)" }}>Files</span>
          {withProblems.map((pf) => {
            const active = pf.path === activePath;
            return (
              <button
                key={pf.path}
                onClick={() => setActivePath(pf.path)}
                className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all"
                style={{
                  background: active ? "var(--accent-bg)" : "var(--bg-hover)",
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  border: `1px solid ${active ? "transparent" : "var(--border-subtle)"}`,
                }}
              >
                {pf.fileName} <span style={{ color: "var(--text-muted)" }}>({pf.problems.length})</span>
              </button>
            );
          })}
        </div>
      )}

      {!activeFile || problems.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--accent-bg)" }}>
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--accent)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No coding problems found</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
              This file doesn&apos;t appear to contain numbered question headings (e.g. <code className="rounded px-1 py-0.5 font-mono" style={{ background: "var(--bg-hover)" }}>## 1. Title</code>). Try another file from the list above.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" style={{ background: "transparent" }}>
          <div className="mx-auto max-w-3xl px-3 sm:px-6 py-4 sm:py-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold tracking-tight truncate" style={{ color: "var(--text-primary)" }}>
                  {activeFile?.title}
                </h2>
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {problems.length} problem{problems.length === 1 ? "" : "s"} · {problems.filter((p) => p.difficulty === "Hard").length} hard
                </p>
              </div>
              <div className="relative w-full sm:w-56 shrink-0">
                <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--text-muted)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter questions..."
                  className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none transition-colors"
                  style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="text-sm py-10 text-center" style={{ color: "var(--text-muted)" }}>No questions match &quot;{filter}&quot;.</p>
            ) : (
              visible.map((problem) => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  open={openProblems.has(problem.id)}
                  onToggle={() => toggleProblem(problem.id)}
                  onSectionToggle={toggleSection}
                  expandedSections={expandedSections}
                  onExpandCode={onExpandCode}
                />
              ))
            )}
          </div>
        </div>
      )}

      {codeView && <CodeFullscreen info={codeView} onClose={() => setCodeView(null)} />}
    </div>
  );
}