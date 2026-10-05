"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  extractSheetItems,
  readSheetProgress,
  resetSheetProgress,
  setItemStatus,
  setManyStatuses,
  sheetStats,
  type SheetItem,
  type SheetItemStatus,
} from "@/lib/sheet-tracker";

type Filter = "all" | "todo" | "skipped" | "done";

const PAGE = 150;

function jumpToItem(item: SheetItem, filePath: string): void {
  const container = document.querySelector(
    `[data-file-path="${CSS.escape(filePath)}"]`
  );
  if (!container) return;
  const needle =
    item.kind === "question" && item.num != null ? `Q${item.num}.` : null;
  const nodes = container.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li");
  for (const node of nodes) {
    const text = (node.textContent || "").replace(/\s+/g, " ").trim();
    const hit = needle
      ? text.startsWith(needle)
      : text.toLowerCase().startsWith(item.label.slice(0, 32).toLowerCase());
    if (hit) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
  }
}

export default function SheetProgressPanel({
  bookId,
  filePath,
  sheetTitle,
  markdown,
  onClose,
}: {
  bookId: string;
  filePath: string;
  sheetTitle: string;
  markdown: string;
  onClose: () => void;
}) {
  const [statuses, setStatuses] = useState<Record<string, SheetItemStatus>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const items = useMemo(() => extractSheetItems(markdown), [markdown]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setStatuses(readSheetProgress(bookId, filePath).statuses);
      setLimit(PAGE);
    }, 0);
    return () => window.clearTimeout(t);
  }, [bookId, filePath, markdown]);

  const stats = useMemo(() => sheetStats(items, statuses), [items, statuses]);

  const toggle = useCallback(
    (id: string, next: SheetItemStatus) => {
      setStatuses(setItemStatus(bookId, filePath, id, next).statuses);
    },
    [bookId, filePath]
  );

  const bulk = useCallback(
    (ids: string[], next: SheetItemStatus) => {
      if (!ids.length) return;
      setStatuses(setManyStatuses(bookId, filePath, ids, next).statuses);
    },
    [bookId, filePath]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qNum = q ? /^q?\.?\s*(\d+)$/.exec(q) : null;
    const num = qNum ? parseInt(qNum[1], 10) : null;
    return items.filter((it) => {
      const s = statuses[it.id];
      if (filter === "todo" && s !== undefined) return false;
      if (filter === "skipped" && s !== "skipped") return false;
      if (filter === "done" && s !== "done") return false;
      if (!q) return true;
      if (num !== null && it.num === num) return true;
      return (
        it.label.toLowerCase().includes(q) ||
        it.section.toLowerCase().includes(q)
      );
    });
  }, [items, statuses, filter, search]);

  const groups = useMemo(() => {
    const map = new Map<string, SheetItem[]>();
    for (const it of filtered) {
      const list = map.get(it.section);
      if (list) list.push(it);
      else map.set(it.section, [it]);
    }
    return [...map.entries()];
  }, [filtered]);

  const shownIds = useMemo(
    () => new Set(filtered.slice(0, limit).map((i) => i.id)),
    [filtered, limit]
  );

  return (
    <aside
      className="flex h-full w-full shrink-0 flex-col lg:w-[22rem]"
      style={{
        background: "var(--bg-elevated)",
        borderLeft: "1px solid var(--border-subtle)",
      }}
      aria-label="Sheet progress"
    >
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Sheet progress
          </h2>
          <p className="truncate text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {sheetTitle}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title="Hide panel"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="shrink-0 space-y-2.5 px-4 py-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold" style={{ color: "var(--accent)" }}>
            {stats.done} / {stats.total} covered
          </span>
          <span className="font-bold" style={{ color: stats.pct === 100 && stats.total > 0 ? "#22c55e" : "var(--text-secondary)" }}>
            {stats.pct}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-hover)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${stats.pct}%`, background: "linear-gradient(90deg, var(--accent), #22c55e)" }}
          />
        </div>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          <span>{stats.total - stats.done - stats.skipped} to do</span>
          <span style={{ color: "#f59e0b" }}>{stats.skipped} skipped</span>
          <button
            onClick={() => {
              if (!window.confirm(`Clear all progress for "${sheetTitle}"?`)) return;
              setStatuses(resetSheetProgress(bookId, filePath).statuses);
            }}
            className="ml-auto transition-colors hover:underline"
          >
            Reset
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="shrink-0 space-y-2 px-4 pb-3">
          <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "var(--bg-hover)" }}>
            {(
              [
                ["all", "All"],
                ["todo", "To do"],
                ["skipped", "Skipped"],
                ["done", "Done"],
              ] as [Filter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="flex-1 rounded-md py-1 text-[11px] font-medium transition-colors"
                style={
                  filter === key
                    ? { background: "var(--bg-elevated)", color: "var(--text-primary)" }
                    : { color: "var(--text-tertiary)" }
                }
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
            style={{
              background: "var(--bg-page)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {items.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs" style={{ color: "var(--text-tertiary)" }}>
            No numbered questions or checklists found in this sheet.
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs" style={{ color: "var(--text-tertiary)" }}>
            Nothing matches this filter.
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map(([section, list]) => {
              const isCollapsed = collapsed[section] === true;
              const secDone = list.filter((i) => statuses[i.id] === "done").length;
              return (
                <div key={section}>
                  <div className="flex items-center gap-1.5 px-1 py-1.5">
                    <button
                      onClick={() =>
                        setCollapsed((c) => ({ ...c, [section]: !isCollapsed }))
                      }
                      className="flex min-w-0 flex-1 items-center gap-1 text-left"
                      title={isCollapsed ? "Expand" : "Collapse"}
                    >
                      <span
                        className="shrink-0 text-[9px] transition-transform"
                        style={{
                          color: "var(--text-muted)",
                          transform: isCollapsed ? "rotate(-90deg)" : "none",
                        }}
                      >
                        ▼
                      </span>
                      <span
                        className="truncate text-[11px] font-semibold"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {section}
                      </span>
                    </button>
                    <span className="shrink-0 text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {secDone}/{list.length}
                    </span>
                    <button
                      onClick={() => bulk(list.map((i) => i.id), "done")}
                      title="Mark all covered"
                      className="shrink-0 rounded px-1 text-[10px]"
                      style={{ color: "#22c55e" }}
                    >
                      all✓
                    </button>
                  </div>
                  {!isCollapsed &&
                    list
                      .filter((i) => shownIds.has(i.id))
                      .map((item) => {
                        const s = statuses[item.id];
                        const done = s === "done";
                        const skipped = s === "skipped";
                        return (
                          <div
                            key={item.id}
                            className="group flex items-start gap-2 rounded-lg px-2 py-1.5"
                            style={{ background: "var(--bg-page)" }}
                          >
                            <button
                              onClick={() => toggle(item.id, done ? "todo" : "done")}
                              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                              style={{
                                borderColor: done ? "#22c55e" : "var(--border-default)",
                                background: done ? "#22c55e" : "transparent",
                              }}
                              title={done ? "Mark as not covered" : "Mark as covered"}
                            >
                              {done && (
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="#0d1117" strokeWidth={3.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => jumpToItem(item, filePath)}
                              className="min-w-0 flex-1 text-left"
                              title="Jump to this in the reader"
                            >
                              <span
                                className="block text-[11px] leading-snug"
                                style={{
                                  color: done ? "var(--text-muted)" : "var(--text-primary)",
                                  textDecoration: done ? "line-through" : "none",
                                }}
                              >
                                {item.num != null && (
                                  <span className="font-semibold" style={{ color: "var(--accent)" }}>
                                    Q{item.num}.{" "}
                                  </span>
                                )}
                                {item.label}
                              </span>
                            </button>
                            <button
                              onClick={() => toggle(item.id, skipped ? "todo" : "skipped")}
                              className="mt-0.5 h-4 w-4 shrink-0 rounded text-[10px] font-bold leading-none transition-colors"
                              style={{
                                color: skipped ? "#f59e0b" : "var(--text-muted)",
                                background: skipped ? "rgba(245,158,11,0.14)" : "transparent",
                              }}
                              title={skipped ? "Remove from skipped" : "Skip for now"}
                            >
                              →
                            </button>
                          </div>
                        );
                      })}
                </div>
              );
            })}
            {filtered.length > limit && (
              <button
                onClick={() => setLimit((l) => l + PAGE)}
                className="w-full rounded-lg py-2 text-xs font-medium"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
              >
                Show more ({filtered.length - limit} left)
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}