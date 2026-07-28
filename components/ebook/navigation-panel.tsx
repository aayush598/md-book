"use client";

import { useMemo, useState } from "react";
import type { EbookProject } from "@/lib/ebook-storage";

interface NavigationPanelProps {
  project: EbookProject;
  activeChapterId?: string;
  onChapterClick?: (id: string) => void;
}

export default function NavigationPanel({ project, activeChapterId, onChapterClick }: NavigationPanelProps) {
  const [showRefs, setShowRefs] = useState(true);

  const chapters = useMemo(() =>
    [...project.chapters].sort((a, b) => a.order - b.order),
    [project.chapters]
  );

  const activeIdx = useMemo(() =>
    chapters.findIndex((c) => c.id === activeChapterId),
    [chapters, activeChapterId]
  );

  // Find cross-references: links to other chapters
  const crossRefs = useMemo(() => {
    if (!activeChapterId) return [];
    const active = chapters[activeIdx];
    if (!active) return [];
    const refs: { target: string; text: string }[] = [];
    const linkRegex = /\[([^\]]+)\]\(#([^)]+)\)/g;
    let mm: RegExpExecArray;
    while ((mm = linkRegex.exec(active.content) as unknown as RegExpExecArray) && mm !== null) {
      if (mm[1] && mm[2]) {
        const target = chapters.find((c) => c.title.toLowerCase().replace(/[^\w]+/g, "-") === mm[2]);
        if (target) refs.push({ target: target.title, text: mm[1] });
      }
    }
    return refs;
  }, [chapters, activeIdx, activeChapterId]);

  // Backlinks: which chapters link to this one
  const backlinks = useMemo(() => {
    if (!activeChapterId) return [];
    const active = chapters[activeIdx];
    if (!active) return [];
    const anchor = active.title.toLowerCase().replace(/[^\w]+/g, "-");
    const links: { source: string; text: string }[] = [];
    for (const ch of chapters) {
      if (ch.id === activeChapterId) continue;
      const linkRegex = new RegExp(`\\[([^\\]]+)\\]\\(#${anchor}\\)`, "g");
      let lm: RegExpExecArray;
      while ((lm = linkRegex.exec(ch.content) as unknown as RegExpExecArray) && lm !== null) {
        if (lm[1]) links.push({ source: ch.title, text: lm[1] });
      }
    }
    return links;
  }, [chapters, activeIdx, activeChapterId]);

  if (!activeChapterId) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Navigation</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Select a chapter to view navigation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Navigation</h3>
        <p className="text-xs mt-px" style={{ color: "var(--text-tertiary)" }}>Prev / Next & cross-references</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Prev / Next */}
        <div className="rounded-xl p-3" style={{ background: "var(--bg-hover)" }}>
          <div className="text-[10px] font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>Chapter Navigation</div>
          <div className="flex gap-2">
            <button onClick={() => activeIdx > 0 && onChapterClick?.(chapters[activeIdx - 1].id)}
              disabled={activeIdx <= 0}
              className="flex-1 py-2 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30"
              style={{ background: "var(--bg-active)", color: "var(--text-primary)" }}
            >◀ Previous</button>
            <button onClick={() => activeIdx < chapters.length - 1 && onChapterClick?.(chapters[activeIdx + 1].id)}
              disabled={activeIdx >= chapters.length - 1}
              className="flex-1 py-2 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30"
              style={{ background: "var(--bg-active)", color: "var(--text-primary)" }}
            >Next ▶</button>
          </div>
          <div className="text-[10px] mt-2 text-center" style={{ color: "var(--text-muted)" }}>
            {activeIdx + 1} of {chapters.length} · {chapters[activeIdx]?.title}
          </div>
        </div>

        {/* Cross-references in this chapter */}
        {crossRefs.length > 0 && (
          <div className="rounded-xl p-3" style={{ background: "var(--bg-hover)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>Cross-References</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>{crossRefs.length}</span>
            </div>
            <div className="space-y-1">
              {crossRefs.map((ref, i) => (
                <button key={i} onClick={() => {
                  const target = chapters.find((c) => c.title === ref.target);
                  if (target) onChapterClick?.(target.id);
                }}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] transition-all"
                  style={{ color: "var(--accent)", background: "var(--accent-bg)" }}
                >↗ {ref.target}</button>
              ))}
            </div>
          </div>
        )}

        {/* Backlinks */}
        {backlinks.length > 0 && (
          <div className="rounded-xl p-3" style={{ background: "var(--bg-hover)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>References to this Chapter</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>{backlinks.length}</span>
            </div>
            <div className="space-y-1">
              {backlinks.map((bl, i) => (
                <button key={i} onClick={() => {
                  const source = chapters.find((c) => c.title === bl.source);
                  if (source) onChapterClick?.(source.id);
                }}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] transition-all"
                  style={{ color: "var(--accent)", background: "var(--accent-bg)" }}
                >← {bl.source}</button>
              ))}
            </div>
          </div>
        )}

        {crossRefs.length === 0 && backlinks.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No cross-references found</p>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>Use [text](#chapter-title) to link chapters</p>
          </div>
        )}

      </div>
    </div>
  );
}
