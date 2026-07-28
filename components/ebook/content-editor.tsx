"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { EbookChapter, EbookProject } from "@/lib/ebook-storage";
import { getParts, addStandardPage, STANDARD_PAGE_TEMPLATES } from "@/lib/ebook-storage";
import { useKeyboard, type Shortcut } from "@/lib/keyboard-shortcuts";

interface ContentEditorProps {
  project: EbookProject;
  onProjectChange: (project: EbookProject) => void;
  activeChapterId?: string;
  onActiveChapterChange?: (id: string) => void;
}

const frontMatterTypes = ["copyright", "dedication", "quote", "foreword", "preface", "who", "covers"];
const backMatterTypes = ["glossary", "references", "contact", "author"];

function groupChapters(sorted: EbookChapter[]) {
  const frontMatter = sorted.filter((c) => c.isStandard && frontMatterTypes.includes(c.standardType || ""));
  const tocChapter = sorted.filter((c) => c.isStandard && c.standardType === "toc");
  const contentChapters = sorted.filter((c) => !c.isStandard);
  const backMatter = sorted.filter((c) => c.isStandard && backMatterTypes.includes(c.standardType || ""));
  return { frontMatter, tocChapter, contentChapters, backMatter };
}

const RENDER_BATCH = 50;

export default function ContentEditor({ project, onProjectChange, activeChapterId, onActiveChapterChange }: ContentEditorProps) {
  const [editing, setEditing] = useState(true);
  const [showAddStandard, setShowAddStandard] = useState(false);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(RENDER_BATCH);
  const listRef = useRef<HTMLDivElement>(null);

  const chapters = project.chapters;
  const onChange = (chapters: EbookChapter[]) => onProjectChange({ ...project, chapters });

  const sorted = useMemo(() => [...chapters].sort((a, b) => a.order - b.order), [chapters]);

  const [activeId, setActiveId] = useState<string>(activeChapterId || sorted[0]?.id);

  const handleSetActive = (id: string) => {
    setActiveId(id);
    onActiveChapterChange?.(id);
  };

  // Sync active chapter to parent on mount and when chapters change
  useEffect(() => {
    if (!activeChapterId && sorted[0]) {
      onActiveChapterChange?.(sorted[0].id);
    }
  }, []); // only on mount

  // Sync parent-driven activeChapterId changes
  useEffect(() => {
    if (activeChapterId && activeChapterId !== activeId) {
      setActiveId(activeChapterId);
    }
  }, [activeChapterId]);

  const active = sorted.find((c) => c.id === activeId) || sorted[0];
  const parts = getParts(chapters);

  // Scroll active chapter into view
  useEffect(() => {
    if (listRef.current && activeId) {
      const btn = listRef.current.querySelector(`[data-ch-id="${activeId}"]`);
      if (btn) btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeId]);

  const searchRef = useRef<HTMLInputElement>(null);

  const editorShortcuts: Shortcut[] = useMemo(() => {
    const sorted = [...chapters].sort((a, b) => a.order - b.order);
    const currentIdx = sorted.findIndex((c) => c.id === activeId);
    return [
      {
        key: "j",
        ctrl: true,
        handler: () => {
          if (currentIdx < sorted.length - 1) handleSetActive(sorted[currentIdx + 1].id);
        },
        description: "Next chapter",
        category: "Editing",
      },
      {
        key: "k",
        ctrl: true,
        handler: () => {
          if (currentIdx > 0) handleSetActive(sorted[currentIdx - 1].id);
        },
        description: "Previous chapter",
        category: "Editing",
      },
      {
        key: "f",
        ctrl: true,
        handler: () => searchRef.current?.focus(),
        description: "Focus chapter search",
        category: "Editing",
      },
      {
        key: "n",
        ctrl: true,
        handler: () => addChapter(),
        description: "New chapter",
        category: "Editing",
      },
    ];
  }, [chapters, activeId, activeChapterId]);

  const updateChapter = (id: string, field: "title" | "content", value: string) => {
    onChange(chapters.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const addChapter = () => {
    const newCh: EbookChapter = {
      id: crypto.randomUUID(),
      title: `Chapter ${chapters.length + 1}`,
      content: "",
      order: chapters.length,
    };
    onChange([...chapters, newCh]);
    handleSetActive(newCh.id);
    setSearch("");
  };

  const removeChapter = (id: string) => {
    if (chapters.length <= 1) return;
    const remaining = chapters.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i }));
    onChange(remaining);
    if (activeId === id) handleSetActive(remaining[0]?.id || "");
  };

  const resetStandardPage = (id: string) => {
    const ch = chapters.find((c) => c.id === id);
    if (!ch || !ch.isStandard || !ch.standardType) return;
    const tmpl = STANDARD_PAGE_TEMPLATES[ch.standardType];
    if (!tmpl) return;
    const updated = tmpl.content.replace(/\$\{BOOK_NAME\}/g, project.name);
    onChange(chapters.map((c) => (c.id === id ? { ...c, content: updated, title: tmpl.title } : c)));
  };

  const moveChapter = (id: string, dir: -1 | 1) => {
    const sorted = [...chapters].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === id);
    if (idx < 0 || (dir === -1 && idx === 0) || (dir === 1 && idx === sorted.length - 1)) return;
    const newSorted = [...sorted];
    const tmp = newSorted[idx];
    newSorted[idx] = newSorted[idx + dir];
    newSorted[idx + dir] = tmp;
    onChange(newSorted.map((c, i) => ({ ...c, order: i })));
  };

  const handleAddStandard = (type: string) => {
    const updated = addStandardPage(project, type);
    onProjectChange(updated);
    const added = updated.chapters.find((c) => c.standardType === type);
    if (added) handleSetActive(added.id);
    setShowAddStandard(false);
  };

  const existingStandardTypes = useMemo(
    () => new Set(chapters.filter((c) => c.isStandard).map((c) => c.standardType)),
    [chapters]
  );

  const wordCount = useMemo(
    () => active.content.split(/\s+/).filter(Boolean).length,
    [active.content]
  );

  useKeyboard(editorShortcuts, true);

  if (!active) return null;

  const { frontMatter, tocChapter, contentChapters, backMatter } = groupChapters(sorted);

  // Filter by search query
  const q = search.toLowerCase().trim();
  const filteredContent = q
    ? contentChapters.filter((c) => c.title.toLowerCase().includes(q) || (c.part?.toLowerCase().includes(q)))
    : contentChapters;

  const totalFiltered = filteredContent.length;
  const showAll = visibleCount >= totalFiltered;

  const visibleContent = filteredContent.slice(0, visibleCount);

  const totalChapters = sorted.length;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (showAll) return;
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setVisibleCount((prev) => Math.min(prev + RENDER_BATCH, totalFiltered));
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Chapter list with search */}
      <div className="shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        {/* Search + count */}
        <div className="px-3 pt-2 pb-1">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--text-muted)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisibleCount(RENDER_BATCH); }}
              placeholder="Search chapters..."
              className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none transition-all"
              style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 px-1">
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {totalChapters} {totalChapters === 1 ? "chapter" : "chapters"}
              {search && ` (${totalFiltered} matching)`}
            </span>
            <button
              onClick={addChapter}
              className="px-2 py-0.5 rounded text-[10px] font-medium transition-all"
              style={{ color: "var(--accent)", background: "var(--accent-bg)" }}
            >
              + New
            </button>
          </div>
        </div>

        {/* Scrollable chapter list */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="overflow-y-auto"
          style={{ maxHeight: "200px" }}
        >
          {/* Front Matter */}
          {!q && frontMatter.length > 0 && (
            <div className="px-1">
              <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Front Matter</div>
              {frontMatter.map((ch) => (
                <button
                  key={ch.id}
                  data-ch-id={ch.id}
                  onClick={() => handleSetActive(ch.id)}
                  className="w-full text-left px-2 py-1 rounded text-[11px] transition-all truncate"
                  style={{
                    background: activeId === ch.id ? "var(--accent-bg)" : "transparent",
                    color: activeId === ch.id ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: activeId === ch.id ? 600 : 400,
                  }}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          )}

          {/* TOC */}
          {!q && tocChapter.length > 0 && (
            <div className="px-1 mt-1">
              <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>TOC</div>
              {tocChapter.map((ch) => (
                <button
                  key={ch.id}
                  data-ch-id={ch.id}
                  onClick={() => handleSetActive(ch.id)}
                  className="w-full text-left px-2 py-1 rounded text-[11px] transition-all truncate"
                  style={{
                    background: activeId === ch.id ? "var(--accent-bg)" : "transparent",
                    color: activeId === ch.id ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: activeId === ch.id ? 600 : 400,
                  }}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          )}

          {/* Content chapters */}
          <div className="px-1 mt-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {parts.length > 0 ? "Content" : "Chapters"}
              </span>
              <span className="text-[9px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                {filteredContent.length}
              </span>
            </div>
            {visibleContent.map((ch) => (
              <button
                key={ch.id}
                data-ch-id={ch.id}
                onClick={() => handleSetActive(ch.id)}
                className="w-full text-left px-2 py-1 rounded text-[11px] transition-all flex items-center gap-1"
                style={{
                  background: activeId === ch.id ? "var(--accent-bg)" : "transparent",
                  color: activeId === ch.id ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: activeId === ch.id ? 600 : 400,
                }}
              >
                {ch.part && (
                  <span className="text-[9px] opacity-60 shrink-0" style={{ color: "var(--text-muted)" }}>
                    [{ch.part}]
                  </span>
                )}
                <span className="truncate">{ch.title || "Untitled"}</span>
                <span className="ml-auto text-[9px] tabular-nums shrink-0" style={{ color: "var(--text-muted)" }}>
                  {ch.wordCount ?? 0}
                </span>
              </button>
            ))}
            {!showAll && filteredContent.length > RENDER_BATCH && (
              <button
                onClick={() => setVisibleCount(filteredContent.length)}
                className="w-full text-center px-2 py-1 text-[10px] transition-all"
                style={{ color: "var(--accent)" }}
              >
                Show all {totalFiltered} chapters
              </button>
            )}
          </div>

          {/* Back Matter */}
          {!q && backMatter.length > 0 && (
            <div className="px-1 mt-1">
              <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Back Matter</div>
              {backMatter.map((ch) => (
                <button
                  key={ch.id}
                  data-ch-id={ch.id}
                  onClick={() => handleSetActive(ch.id)}
                  className="w-full text-left px-2 py-1 rounded text-[11px] transition-all truncate"
                  style={{
                    background: activeId === ch.id ? "var(--accent-bg)" : "transparent",
                    color: activeId === ch.id ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: activeId === ch.id ? 600 : 400,
                  }}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add standard pages button */}
        <div className="relative px-3 pb-2 mt-1">
          <button
            onClick={() => setShowAddStandard(!showAddStandard)}
            className="w-full py-1 rounded-lg text-[10px] font-medium transition-all"
            style={{ color: "var(--text-muted)", background: "var(--bg-hover)", border: "1px dashed var(--border-subtle)" }}
          >
            + Add Standard Pages
          </button>
          {showAddStandard && (
            <div className="absolute top-full left-2 right-2 z-20 mt-1 rounded-xl p-2 shadow-lg max-h-52 overflow-y-auto"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(STANDARD_PAGE_TEMPLATES).map(([type, tmpl]) => (
                  <button
                    key={type}
                    onClick={() => handleAddStandard(type)}
                    disabled={existingStandardTypes.has(type)}
                    className="text-left px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      color: existingStandardTypes.has(type) ? "var(--text-muted)" : "var(--text-primary)",
                      background: "var(--bg-hover)",
                    }}
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <button onClick={() => moveChapter(active.id, -1)} disabled={active.order === 0}
          className="p-1 rounded transition-all disabled:opacity-30"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          title="Move up"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.5l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <button onClick={() => moveChapter(active.id, 1)} disabled={active.order === sorted.length - 1}
          className="p-1 rounded transition-all disabled:opacity-30"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          title="Move down"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.5l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {chapters.length > 1 && (
          <button
            onClick={() => removeChapter(active.id)}
            className="p-1 rounded transition-all"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
            title="Remove chapter"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        )}
        {active.isStandard && active.standardType && (
          <button
            onClick={() => resetStandardPage(active.id)}
            className="p-1 rounded transition-all"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
            title="Reset to default template"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        )}
        <div className="mx-2 w-px h-4" style={{ background: "var(--border-subtle)" }} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {wordCount} words
        </span>
        {active.isStandard && active.standardType && (
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
            {active.standardType}
          </span>
        )}
        <div className="flex-1" />
        <span
          role="button"
          tabIndex={0}
          onClick={() => setEditing(!editing)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setEditing(!editing); }}
          className="text-xs cursor-pointer px-2 py-0.5 rounded transition-all"
          style={{
            color: editing ? "var(--accent)" : "var(--text-muted)",
            background: editing ? "var(--accent-bg)" : "transparent",
          }}
        >
          {editing ? "Edit" : "Raw"}
        </span>
      </div>

      {/* Editor */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-h-0" style={{ display: editing ? "flex" : "none" }}>
          <input
            value={active.title}
            onChange={(e) => updateChapter(active.id, "title", e.target.value)}
            className="w-full px-4 py-2.5 text-sm font-semibold outline-none"
            style={{ color: "var(--text-primary)", background: "transparent", borderBottom: "1px solid var(--border-subtle)" }}
            placeholder="Chapter Title"
          />
          <textarea
            value={active.content}
            onChange={(e) => updateChapter(active.id, "content", e.target.value)}
            className="flex-1 w-full px-4 py-3 text-sm outline-none resize-none"
            style={{
              color: "var(--text-secondary)",
              background: "transparent",
              fontFamily: "var(--font-mono, monospace)",
              lineHeight: 1.6,
            }}
            placeholder="Write your content in markdown..."
          />
        </div>
        {!editing && (
          <div className="flex-1 overflow-y-auto px-4 py-3 text-sm whitespace-pre-wrap" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono, monospace)", lineHeight: 1.6 }}>
            {active.content || "No content"}
          </div>
        )}
      </div>
    </div>
  );
}
