"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";

export type VizPanelId =
  | "code"
  | "feed"
  | "caption"
  | "condition"
  | "changed"
  | "graphs"
  | "vars";

export type VizLayout = "split" | "stack";

const PANEL_IDS: VizPanelId[] = [
  "code",
  "feed",
  "caption",
  "condition",
  "changed",
  "graphs",
  "vars",
];

const TITLES: Record<VizPanelId, string> = {
  code: "Running code",
  feed: "Change history",
  caption: "Step",
  condition: "Branch test",
  changed: "Changes",
  graphs: "Data structures",
  vars: "Variables",
};

const ICONS: Record<VizPanelId, ReactNode> = {
  code: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  feed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  caption: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  ),
  condition: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  ),
  changed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  graphs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  ),
  vars: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
};

/** Heights used in the stacked layout so content never hits zero-height panels. */
const STACK_H: Partial<Record<VizPanelId, number>> = { code: 240, feed: 210, graphs: 260 };

const DEFAULT_COLS: { left: VizPanelId[]; right: VizPanelId[] } = {
  left: ["code", "feed"],
  right: ["caption", "condition", "graphs", "changed", "vars"],
};

const STORAGE_KEY = "md-book:viz-ws2";
const DEFAULT_LEFT_PCT = 42;

interface Persisted {
  layout?: VizLayout;
  cols?: { left: VizPanelId[]; right: VizPanelId[] };
  height?: Partial<Record<VizPanelId, number>>;
  collapsed?: Partial<Record<VizPanelId, boolean>>;
  hidden?: VizPanelId[];
  leftPct?: number;
}

function readPersisted(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

export interface VizWorkspaceProps {
  /** Rendered body for each panel. Panels with a missing node still render their shell. */
  contents: Partial<Record<VizPanelId, ReactNode>>;
  /** Panels forced hidden (e.g. code while beginner mode is on). */
  lockedHidden?: ReadonlySet<VizPanelId>;
}

export default function VizWorkspace({ contents, lockedHidden }: VizWorkspaceProps) {
  const [layout, setLayout] = useState<VizLayout>("split");
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [height, setHeight] = useState<Partial<Record<VizPanelId, number>>>({});
  const [collapsed, setCollapsed] = useState<Partial<Record<VizPanelId, boolean>>>({});
  const [userHidden, setUserHidden] = useState<Set<VizPanelId>>(new Set());
  const [leftPct, setLeftPct] = useState(DEFAULT_LEFT_PCT);
  const [dragId, setDragId] = useState<VizPanelId | null>(null);
  const [dropHint, setDropHint] = useState<{ id: VizPanelId; after: boolean } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const dragInfo = useRef<{
    axis: "h" | "v";
    a: { id: VizPanelId; base: number } | null;
    b: { id: VizPanelId; base: number } | null;
    start: number;
    rect: DOMRect | null;
    el: HTMLElement | null;
  } | null>(null);

  // Restore the user's arrangement once after mount (hydration-safe: only after
  // first paint). Persisting is gated on this flag, otherwise the persist effect
  // below would overwrite the saved layout with the fresh default state before
  // the restore has a chance to read it back.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    const t = window.setTimeout(() => {
      hydratedRef.current = true;
      const p = readPersisted();
      if (!p) return;
      if (p.layout) setLayout(p.layout);
      if (p.cols) setCols(p.cols);
      if (p.height) setHeight(p.height);
      if (p.collapsed) setCollapsed(p.collapsed);
      if (p.hidden) setUserHidden(new Set(p.hidden));
      if (typeof p.leftPct === "number") setLeftPct(p.leftPct);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const p: Persisted = { layout, cols, height, collapsed, hidden: [...userHidden], leftPct };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [layout, cols, height, collapsed, userHidden, leftPct]);

  const hiddenSet = useMemo(() => {
    const s = new Set<VizPanelId>(userHidden);
    if (lockedHidden) for (const id of lockedHidden) s.add(id);
    return s;
  }, [userHidden, lockedHidden]);

  // Divider / resize dragging (row dividers between stacked panels, plus the
  // vertical divider between the left and right columns). A divider follows
  // the pointer: dragging down grows the panel above the grip and shrinks the
  // one below, while the flexible panel (if neighbouring) absorbs the rest.
  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const axis = t.dataset.vdrag;
      if (!axis) return;
      e.preventDefault();
      if (axis === "v") {
        dragInfo.current = {
          axis: "v",
          a: null,
          b: null,
          start: e.clientX,
          rect: t.closest(".viz-ws-grid")?.getBoundingClientRect() ?? null,
          el: t,
        };
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        return;
      }
      const aEl = t.closest(".viz-panel") as HTMLElement | null;
      const aId = aEl?.dataset.panel as VizPanelId | undefined;
      const bId = (t.dataset.panel as VizPanelId | undefined) ?? undefined;
      let bEl: HTMLElement | null = null;
      if (aEl && bId) {
        bEl = aEl
          .closest(".viz-ws-grid")
          ?.querySelector(`[data-panel="${bId}"]`) as HTMLElement | null;
      }
      if (!aEl || !aId || !bId || !bEl) return;
      setCollapsed((c) => {
        const nc = { ...c };
        if (nc[aId]) nc[aId] = false;
        if (nc[bId]) nc[bId] = false;
        return nc;
      });
      dragInfo.current = {
        axis: "h",
        a: { id: aId, base: aEl.offsetHeight },
        b: { id: bId, base: bEl.offsetHeight },
        start: e.clientY,
        rect: null,
        el: t,
      };
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    };
    const move = (e: MouseEvent) => {
      const d = dragInfo.current;
      if (!d) return;
      if (d.axis === "v") {
        if (d.rect && d.rect.width > 0) {
          const pct = ((e.clientX - d.rect.left) / d.rect.width) * 100;
          setLeftPct(Math.max(30, Math.min(70, pct)));
        }
        return;
      }
      if (!d.a || !d.b) return;
      const dy = e.clientY - d.start;
      const clamp = (v: number) => Math.max(64, Math.min(1200, v));
      const flexible = layout === "split" ? ["feed", "graphs"] : [];
      if (flexible.includes(d.a.id)) {
        // Above panel absorbs the change — just move the panel below.
        setHeight((h) => ({ ...h, [d.b!.id]: clamp(d.b!.base - dy) }));
      } else if (flexible.includes(d.b.id)) {
        // Below panel absorbs the change — just move the panel above.
        setHeight((h) => ({ ...h, [d.a!.id]: clamp(d.a!.base + dy) }));
      } else {
        // Neither absorbs — shift both neighbours so the grip stays under the pointer.
        setHeight((h) => ({
          ...h,
          [d.a!.id]: clamp(d.a!.base + dy),
          [d.b!.id]: clamp(d.b!.base - dy),
        }));
      }
    };
    const up = () => {
      const d = dragInfo.current;
      if (d) {
        if (d.el) d.el.removeAttribute("data-active");
        dragInfo.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [layout]);

  const resetLayout = () => {
    setLayout("split");
    setCols(DEFAULT_COLS);
    setHeight({});
    setCollapsed({});
    setUserHidden(new Set());
    setLeftPct(DEFAULT_LEFT_PCT);
  };

  const movePanel = (
    did: VizPanelId,
    target: VizPanelId | null,
    after: boolean,
    colKey: "left" | "right",
  ) => {
    setCols((prev) => {
      const srcKey: "left" | "right" = prev.left.includes(did) ? "left" : "right";
      const srcList = prev[srcKey].filter((id) => id !== did);
      const tgtKey =
        target !== null
          ? prev.left.includes(target)
            ? "left"
            : prev.right.includes(target)
              ? "right"
              : colKey
          : colKey;
      const tgtList = prev[tgtKey].filter((id) => id !== did);
      if (target !== null) {
        const i = tgtList.indexOf(target);
        if (i !== -1) tgtList.splice(i + (after ? 1 : 0), 0, did);
        else tgtList.push(did);
      } else {
        tgtList.push(did);
      }
      const next = { ...prev };
      if (srcKey === tgtKey) {
        next[srcKey] = tgtList;
      } else {
        next[srcKey] = srcList;
        next[tgtKey] = tgtList;
      }
      return next;
    });
  };

  const panelStyle = (id: VizPanelId): CSSProperties => {
    const h = height[id];
    if (h != null) return { flex: "0 0 auto", height: h };
    if (layout === "stack") {
      const d = STACK_H[id];
      return d ? { flex: "0 0 auto", height: d } : { flex: "0 0 auto" };
    }
    // The data-structure view is the star of the right column: give it the
    // largest floor and let it absorb whatever the slender panels leave over.
    if (id === "graphs") return { flex: "1 1 0px", minHeight: 360 };
    // The code pane hugs its content (capped so long code scrolls inside),
    // and the change-history feed below absorbs the remaining column space.
    if (id === "code") return { flex: "0 0 auto", maxHeight: "calc(100% - 140px)" };
    if (id === "feed") return { flex: "1 1 0px", minHeight: 0 };
    if (id === "condition") return { flex: "0 0 auto", maxHeight: 140 };
    if (id === "changed") return { flex: "0 0 auto", maxHeight: 150 };
    if (id === "vars") return { flex: "0 0 auto", maxHeight: 240 };
    return { flex: "0 0 auto", maxHeight: 200 };
  };

  const panelNodes = (list: VizPanelId[]): ReactNode[] => {
    const vis = list.filter((id) => !hiddenSet.has(id));
    const nodes: ReactNode[] = [];
    vis.forEach((id, i) => {
      const isCollapsed = collapsed[id] ?? false;
      const nextCollapsed = i < vis.length - 1 ? collapsed[vis[i + 1]] : false;
      const drop = dropHint?.id === id;
      nodes.push(
        <div
          key={id}
          data-panel={id}
          className={`viz-panel ${isCollapsed ? "viz-panel-collapsed" : ""} ${drop ? (dropHint?.after ? "viz-panel-drop-after" : "viz-panel-drop-before") : ""}`}
          style={isCollapsed ? { flex: "0 0 auto" } : panelStyle(id)}
          onDragOver={(e) => {
            if (!dragId || dragId === id) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            const r = e.currentTarget.getBoundingClientRect();
            setDropHint({ id, after: e.clientY > r.top + r.height / 2 });
          }}
          onDragLeave={() => setDropHint((dh) => (dh && dh.id === id ? null : dh))}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dragId && dragId !== id) {
              const r = e.currentTarget.getBoundingClientRect();
              const after = e.clientY > r.top + r.height / 2;
              movePanel(dragId, id, after, "right");
            }
            setDropHint(null);
          }}
        >
          <div
            className="viz-panel-head"
            draggable
            aria-grabbed={dragId === id}
            onDragStart={(e) => {
              setDragId(id);
              e.dataTransfer.setData("text/plain", id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              setDragId(null);
              setDropHint(null);
            }}
            title="Drag to move this panel"
          >
            <span className="viz-panel-grip" aria-hidden="true" />
            <span className="viz-panel-icon" aria-hidden="true">
              {ICONS[id]}
            </span>
            <span className="viz-panel-title">{TITLES[id]}</span>
            <button
              type="button"
              draggable={false}
              className="viz-panel-toggle"
              onClick={() => setCollapsed((c) => ({ ...c, [id]: !c[id] }))}
              title={isCollapsed ? `Expand ${TITLES[id]}` : `Collapse ${TITLES[id]}`}
            >
              {isCollapsed ? (
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 15 12 9 18 15" />
                </svg>
              )}
            </button>
          </div>
          {!isCollapsed && (
            <div className={`viz-panel-body ${id === "code" ? "" : "viz-panel-body-scroll"}`}>
              {contents[id] ?? <div className="viz-panel-empty">Nothing to show here yet.</div>}
            </div>
          )}
          {i < vis.length - 1 && !nextCollapsed && !isCollapsed && (
            <div
              className="viz-divider"
              data-vdrag="h"
              data-panel={vis[i + 1]}
              title="Drag to resize"
            />
          )}
        </div>,
      );
    });
    return nodes;
  };

  const colDrop =
    (colKey: "left" | "right") =>
    (e: DragEvent<HTMLDivElement>) => {
      if (!dragId) return;
      e.preventDefault();
      if (dragId) movePanel(dragId, null, true, colKey);
      setDropHint(null);
    };

  const leftVisible = cols.left.filter((id) => !hiddenSet.has(id));
  const rightVisible = cols.right.filter((id) => !hiddenSet.has(id));
  const showVsplit = layout === "split" && leftVisible.length > 0 && rightVisible.length > 0;

  return (
    <div className="viz-ws flex min-h-0 flex-1 flex-col">
      <div className="viz-ws-tools flex flex-wrap items-center gap-2">
        <span className="viz-ws-tools-label" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          View
        </span>
        <div className="viz-ws-seg" role="tablist" aria-label="Layout">
          <button
            type="button"
            role="tab"
            aria-selected={layout === "split"}
            className={`viz-ws-seg-btn ${layout === "split" ? "viz-ws-seg-on" : ""}`}
            onClick={() => setLayout("split")}
            title="Code and change history on the left; step, condition, graphs, variables on the right"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Side-by-side
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={layout === "stack"}
            className={`viz-ws-seg-btn ${layout === "stack" ? "viz-ws-seg-on" : ""}`}
            onClick={() => setLayout("stack")}
            title="Everything flows top to bottom in a single column"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Stacked
          </button>
        </div>
        <div className="relative">
          <button
            type="button"
            className={`viz-ws-btn ${menuOpen ? "viz-ws-btn-on" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Panels
          </button>
          {menuOpen && (
            <>
              <div className="viz-ws-menu-layer" onClick={() => setMenuOpen(false)} />
              <div className="viz-ws-menu">
                <div className="viz-ws-menu-head">
                  <span className="viz-ws-menu-title">Panels</span>
                  <span className="viz-ws-menu-sub">Show or hide a section — layouts auto-adjust.</span>
                </div>
                {PANEL_IDS.map((id) => {
                  const on = !hiddenSet.has(id);
                  const locked = !!lockedHidden && lockedHidden.has(id);
                  return (
                    <label
                      key={id}
                      className={`viz-ws-menu-item ${on ? "viz-ws-menu-on" : ""} ${locked ? "viz-ws-menu-locked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={locked}
                        onChange={() =>
                          setUserHidden((s) => {
                            const n = new Set(s);
                            if (n.has(id)) n.delete(id);
                            else n.add(id);
                            return n;
                          })
                        }
                      />
                      <span className="viz-ws-menu-icon" aria-hidden="true">
                        {ICONS[id]}
                      </span>
                      <span>{TITLES[id]}</span>
                    </label>
                  );
                })}
                <div className="viz-ws-menu-foot">
                  <button type="button" className="viz-ws-btn viz-ws-btn-ghost" onClick={resetLayout}>
                    Reset layout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <span className="viz-ws-hint">Grab any divider to resize · drag a header to rearrange</span>
      </div>

      <div className={`viz-ws-grid min-h-0 flex-1 ${layout === "stack" ? "viz-ws-stack-grid" : ""}`}>
        {layout === "split" ? (
          <>
            {leftVisible.length > 0 && (
              <div className="viz-col" style={{ flex: `0 0 ${leftPct}%` }} onDragOver={(e) => { if (dragId) e.preventDefault(); }} onDrop={colDrop("left")}>
                {panelNodes(cols.left)}
              </div>
            )}
            {showVsplit && (
              <div className="viz-vdivider" data-vdrag="v" title="Drag to resize columns" />
            )}
            {rightVisible.length > 0 && (
              <div className="viz-col" style={{ flex: "1 1 0px" }} onDragOver={(e) => { if (dragId) e.preventDefault(); }} onDrop={colDrop("right")}>
                {panelNodes(cols.right)}
              </div>
            )}
          </>
        ) : (
          <div className="viz-col" onDragOver={(e) => { if (dragId) e.preventDefault(); }} onDrop={colDrop("left")}>
            {panelNodes([...cols.left, ...cols.right])}
          </div>
        )}
      </div>
    </div>
  );
}