"use client";

import { BookChapter, normalizeName } from "@/lib/github";
import { useState } from "react";

interface SidebarProps {
  chapters: BookChapter[];
  currentFile: string | null;
  onFileSelect: (chapter: BookChapter, file: string) => void;
}

function ChapterIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      style={{ color: "var(--text-muted)" }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

export default function Sidebar({ chapters, currentFile, onFileSelect }: SidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    chapters.forEach((ch) => {
      state[ch.path] = ch.files.some((f) => f.path === currentFile) || true;
    });
    return state;
  });
  const [search, setSearch] = useState("");

  const toggle = (path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const filtered = chapters.filter((ch) =>
    ch.name.toLowerCase().includes(search.toLowerCase()) ||
    ch.shortName.toLowerCase().includes(search.toLowerCase()) ||
    ch.files.some((f) => normalizeName(f.name).toLowerCase().includes(search.toLowerCase()))
  );

  // Calculate max depth for indentation
  const maxDepth = Math.max(...chapters.map((c) => c.depth), 0);

  return (
    <aside className="flex h-full flex-col" style={{ background: "var(--bg-sidebar)", borderRight: "1px solid var(--border-subtle)" }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-soft))" }}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Chapters</span>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            style={{ color: "var(--text-muted)" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search chapters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none transition-all"
            style={{
              background: "var(--bg-hover)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.background = "var(--bg-elevated)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.background = "var(--bg-hover)";
            }}
          />
        </div>
      </div>

      {/* Chapter list */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll px-2 py-2">
        {filtered.map((chapter) => {
          const isExpanded = expanded[chapter.path] ?? true;
          const chapterActive = chapter.files.some((f) => f.path === currentFile);
          const indent = Math.min(chapter.depth - 1, maxDepth - 1) * 8;

          return (
            <div key={chapter.path} className="mb-0.5">
              <button
                onClick={() => toggle(chapter.path)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-all"
                style={{
                  paddingLeft: `${8 + indent}px`,
                  background: chapterActive ? "var(--bg-active)" : "transparent",
                  color: chapterActive ? "var(--accent)" : "var(--text-tertiary)",
                }}
                onMouseEnter={(e) => {
                  if (!chapterActive) e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!chapterActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <Chevron open={isExpanded} />
                <ChapterIcon />
                <span className="truncate flex-1">{chapter.name}</span>
                <span
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
                >
                  {chapter.files.length}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-3 mt-0.5 space-y-0.5" style={{ borderLeft: "1px solid var(--border-subtle)" }}>
                  {chapter.files.map((file) => {
                    const isFileActive = file.path === currentFile;
                    return (
                      <button
                        key={file.path}
                        onClick={() => onFileSelect(chapter, file.path)}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-all"
                        style={{
                          paddingLeft: `${16 + indent}px`,
                          background: isFileActive ? "var(--accent-bg)" : "transparent",
                          color: isFileActive ? "var(--accent)" : "var(--text-tertiary)",
                          fontWeight: isFileActive ? 500 : 400,
                        }}
                        onMouseEnter={(e) => {
                          if (!isFileActive) e.currentTarget.style.background = "var(--bg-hover)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isFileActive) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <FileIcon />
                        <span className="truncate">{normalizeName(file.name)}</span>
                      </button>
                    );
                  })}
                  {chapter.files.length === 0 && (
                    <p className="px-2.5 py-1.5 text-[11px] italic" style={{ color: "var(--text-muted)" }}>No files</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: "var(--text-muted)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No chapters found</p>
          </div>
        )}
      </nav>
    </aside>
  );
}
