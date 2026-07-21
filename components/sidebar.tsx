"use client";

import { BookChapter, normalizeName } from "@/lib/github";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { getBookmarks, type Bookmark } from "@/lib/storage";

interface SidebarProps {
  chapters: BookChapter[];
  currentFile: string | null;
  onFileSelect: (chapter: BookChapter, file: string) => void;
  bookId?: string;
  bookName?: string;
}

interface TreeNode {
  chapter: BookChapter;
  children: TreeNode[];
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

function BookmarkIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--accent)" }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
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

function DotIcon() {
  return (
    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--text-muted)" }}>
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function buildTree(chapters: BookChapter[]): TreeNode[] {
  const roots: TreeNode[] = [];
  const map = new Map<string, TreeNode>();
  for (const ch of chapters) {
    map.set(ch.path, { chapter: ch, children: [] });
  }
  for (const ch of chapters) {
    const node = map.get(ch.path)!;
    const sep = ch.path.lastIndexOf("/");
    if (sep > 0) {
      const parentPath = ch.path.slice(0, sep);
      const parent = map.get(parentPath);
      if (parent) {
        parent.children.push(node);
        continue;
      }
    }
    roots.push(node);
  }
  return roots;
}

function fileBelongsToChapter(chapterPath: string, filePath: string): boolean {
  return filePath.startsWith(chapterPath + "/") || filePath.startsWith(chapterPath);
}

function findActiveChapterPath(tree: TreeNode[], currentFile: string | null): string | null {
  if (!currentFile) return null;
  for (const node of tree) {
    if (node.chapter.files.some((f) => f.path === currentFile)) return node.chapter.path;
    const child = findActiveChapterPath(node.children, currentFile);
    if (child) return child;
    if (fileBelongsToChapter(node.chapter.path, currentFile)) return node.chapter.path;
  }
  return null;
}

function TreeNodeComponent({
  node, depth, currentFile, onFileSelect, expanded, onToggle, activePath,
}: {
  node: TreeNode;
  depth: number;
  currentFile: string | null;
  onFileSelect: (chapter: BookChapter, file: string) => void;
  expanded: Record<string, boolean>;
  onToggle: (path: string) => void;
  activePath: string | null;
}) {
  const isExpanded = expanded[node.chapter.path] ?? false;
  const chapterActive = node.chapter.files.some((f) => f.path === currentFile) || activePath === node.chapter.path;
  const hasChildren = node.children.length > 0;
  const hasFiles = node.chapter.files.length > 0;
  const indent = depth * 8;
  const fileCount = node.chapter.files.length + node.children.reduce((sum, c) => sum + c.chapter.files.length, 0);

  return (
    <div className="mb-0.5">
      <button
        onClick={() => onToggle(node.chapter.path)}
        data-active={chapterActive ? "true" : undefined}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-all"
        style={{
          paddingLeft: `${8 + indent}px`,
          background: chapterActive ? "var(--bg-active)" : "transparent",
          color: chapterActive ? "var(--accent)" : "var(--text-tertiary)",
        }}
        onMouseEnter={(e) => { if (!chapterActive) e.currentTarget.style.background = "var(--bg-hover)"; }}
        onMouseLeave={(e) => { if (!chapterActive) e.currentTarget.style.background = "transparent"; }}
      >
        <Chevron open={isExpanded} />
        {hasChildren && !hasFiles ? (
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        ) : (
          <ChapterIcon />
        )}
        <span className="truncate flex-1">{node.chapter.name}</span>
        <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>
          {fileCount}
        </span>
      </button>

      {isExpanded && (
        <div className="ml-3 mt-0.5 space-y-0.5" style={{ borderLeft: "1px solid var(--border-subtle)" }}>
          {hasChildren && node.children.map((child) => (
            <TreeNodeComponent
              key={child.chapter.path}
              node={child}
              depth={depth + 1}
              currentFile={currentFile}
              onFileSelect={onFileSelect}
              expanded={expanded}
              onToggle={onToggle}
              activePath={activePath}
            />
          ))}
          {hasFiles && node.chapter.files.map((file) => {
            const isFileActive = file.path === currentFile;
            return (
              <button
                key={file.path}
                data-active={isFileActive ? "true" : undefined}
                onClick={() => onFileSelect(node.chapter, file.path)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-all"
                style={{
                  paddingLeft: `${16 + indent + (hasChildren ? 0 : 8)}px`,
                  background: isFileActive ? "var(--accent-bg)" : "transparent",
                  color: isFileActive ? "var(--accent)" : "var(--text-tertiary)",
                  fontWeight: isFileActive ? 500 : 400,
                }}
                onMouseEnter={(e) => { if (!isFileActive) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { if (!isFileActive) e.currentTarget.style.background = "transparent"; }}
              >
                <DotIcon />
                <span className="truncate">{normalizeName(file.name)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SIDEBAR_WIDTH_KEY = "md-book-sidebar-width";

export default function Sidebar({ chapters, currentFile, onFileSelect, bookId }: SidebarProps) {
  const tree = useMemo(() => buildTree(chapters), [chapters]);
  const activePath = useMemo(() => findActiveChapterPath(tree, currentFile), [tree, currentFile]);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return 280;
    try { return parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY) || "280", 10); }
    catch { return 280; }
  });

  const widthRef = useRef(width);
  widthRef.current = width;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const newWidth = Math.max(180, Math.min(500, ev.clientX));
      setWidth(newWidth);
    };

    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(widthRef.current));
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    if (activePath) state[activePath] = true;
    return state;
  });

  // Expand active chapter and all its ancestors
  useEffect(() => {
    if (!activePath) return;
    const paths = [activePath];
    const parts = activePath.split("/");
    for (let i = 1; i < parts.length; i++) {
      paths.push(parts.slice(0, i).join("/"));
    }
    setExpanded((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const p of paths) {
        if (!next[p]) { next[p] = true; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [activePath]);

  const [search, setSearch] = useState("");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    if (bookId) {
      setBookmarks(getBookmarks().filter((b) => b.bookId === bookId));
    }
  }, [bookId, currentFile]);

  const toggle = (path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const filtered = useMemo(() => {
    if (!search) return tree;
    const q = search.toLowerCase();
    const matches = (node: TreeNode): boolean =>
      node.chapter.name.toLowerCase().includes(q) ||
      node.chapter.shortName.toLowerCase().includes(q) ||
      node.chapter.files.some((f) => normalizeName(f.name).toLowerCase().includes(q)) ||
      node.children.some(matches);
    return tree.filter(matches);
  }, [tree, search]);

  const handleBookmarkClick = (filePath: string) => {
    const chapter = chapters.find((ch) => ch.files.some((f) => f.path === filePath));
    if (chapter) onFileSelect(chapter, filePath);
  };

  const navRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active file
  useEffect(() => {
    if (!navRef.current || !currentFile) return;
    const active = navRef.current.querySelector('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [currentFile, expanded]);

  return (
    <aside ref={sidebarRef} className="flex h-full flex-col relative" style={{ background: "var(--bg-sidebar)", borderRight: "1px solid var(--border-subtle)", width }}>
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

      {/* Bookmarks section */}
      {bookmarks.length > 0 && (
        <div className="px-2 pt-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5">
            <BookmarkIcon />
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Bookmarks ({bookmarks.length})
            </span>
          </div>
          <div className="ml-1 space-y-0.5">
            {bookmarks.map((bm) => (
              <button
                key={bm.filePath}
                onClick={() => handleBookmarkClick(bm.filePath)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-all"
                style={{
                  background: bm.filePath === currentFile ? "var(--accent-bg)" : "transparent",
                  color: bm.filePath === currentFile ? "var(--accent)" : "var(--text-tertiary)",
                  fontWeight: bm.filePath === currentFile ? 500 : 400,
                }}
                onMouseEnter={(e) => { if (bm.filePath !== currentFile) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { if (bm.filePath !== currentFile) e.currentTarget.style.background = "transparent"; }}
              >
                <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--accent)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                <span className="truncate">{bm.title}</span>
              </button>
            ))}
          </div>
          <div className="my-2 mx-2.5" style={{ borderBottom: "1px solid var(--border-subtle)" }} />
        </div>
      )}

      <nav ref={navRef} className="flex-1 overflow-y-auto sidebar-scroll px-2 py-2">
        {filtered.map((node) => (
          <TreeNodeComponent
            key={node.chapter.path}
            node={node}
            depth={0}
            currentFile={currentFile}
            onFileSelect={onFileSelect}
            expanded={expanded}
            onToggle={toggle}
            activePath={activePath}
          />
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: "var(--text-muted)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No chapters found</p>
          </div>
        )}
      </nav>
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 z-20 w-3 cursor-col-resize flex items-center justify-center group"
      >
        <div className="h-8 w-0.5 rounded-full transition-all group-hover:h-10 group-active:h-10" style={{ background: "var(--border-subtle)" }} />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(90deg, transparent, var(--accent-glow), transparent)" }} />
      </div>
    </aside>
  );
}
