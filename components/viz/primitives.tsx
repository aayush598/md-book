"use client";

import { useState } from "react";
import type { SnapArr, SnapGrid, SnapScalar } from "@/lib/viz/types";
import type { Change, Tag } from "@/lib/viz/diff";
import type { BarsScene, DequeScene, GridScene, StackScene } from "@/lib/viz/layout";

export const ACCENT = "#58a6ff";
export const POS = "#2ea043";
export const READ = "#39b6ff";
export const MUT = "#3fb950";
export const NEG = "#f85149";
export const MUTED = "rgba(255,255,255,0.45)";

function cellColor(v: SnapScalar, max: number, tag?: Tag): string {
  if (tag === "w") return "rgba(63,185,80,0.45)";
  if (v === null || v === undefined) return "rgba(255,255,255,0.06)";
  if (typeof v === "boolean") return v ? POS : "rgba(248,81,73,0.55)";
  if (typeof v === "number") {
    if (v === 0) return "rgba(255,255,255,0.10)";
    const t = max > 0 ? Math.min(Math.abs(v) / max, 1) : 1;
    if (v < 0) return `rgba(248,81,73,${0.25 + t * 0.6})`;
    return `rgba(46,160,67,${0.15 + t * 0.6})`;
  }
  return "rgba(255,255,255,0.22)";
}

function ringFor(tag: Tag | undefined, atCursor: boolean): string | undefined {
  if (atCursor) return ACCENT;
  if (tag === "w") return MUT;
  if (tag === "r") return READ;
  return undefined;
}

function cellClass(tag: Tag | undefined): string {
  if (tag === "w") return "viz-mut";
  if (tag === "r") return "viz-read";
  return "";
}

export function ArrayBars({ scene, tall }: { scene: BarsScene; tall?: boolean }) {
  const { value, name, cursor, marks } = scene;
  const n = value.length;
  const num = value.map((x) => (typeof x === "number" ? x : NaN));
  const finite = num.filter(Number.isFinite);
  const max = finite.length ? Math.max(...finite) : 0;
  const min = finite.length ? Math.min(...finite, 0) : 0;
  const span = Math.max(max - min, 1);
  const H = tall ? 190 : 104;
  const base = 18;

  if (n === 0) {
    return <div className="viz-empty">“{name}” is empty right now</div>;
  }

  const barW = Math.max(2, Math.min(64, Math.floor((tall ? 680 : 520) / n) - 2));

  return (
    <div className="w-full select-none">
      <div className="viz-name">{name}</div>
      <div className="mt-1 rounded-xl px-2 pt-2" style={{ background: "var(--bg-hover)", overflowX: "auto" }}>
        <div className="flex items-end gap-[2px]" style={{ height: H }}>
          {value.map((v, i) => {
            const x = num[i];
            const isN = Number.isFinite(x);
            const h = isN ? Math.max(2, ((x - min) / span) * (H - base)) : 4;
            const tag = marks?.[i];
            const atCursor = cursor !== undefined && i === cursor;
            const ring = ringFor(tag, atCursor);
            const showLabel = tag !== undefined || atCursor || n <= 24;
            const vmax = Math.max(max, Math.abs(min));
            return (
              <div key={i} className="flex flex-col items-center justify-end self-end shrink-0" style={{ width: barW, height: "100%" }}>
                {atCursor && n > 24 && (
                  <div className="viz-cursor-flag">{i}</div>
                )}
                <div
                  className={`viz-bar ${cellClass(tag)}`}
                  key={String(tag ?? "") + i}
                  style={{
                    height: `${h}px`,
                    width: barW,
                    background: isN ? cellColor(x as number, vmax, tag) : "rgba(255,255,255,0.08)",
                    boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
                    borderRadius: "3px 3px 0 0",
                  }}
                />
                {showLabel && (
                  <div className="viz-cell-label" style={{ color: tag === "w" ? MUT : atCursor || tag === "r" ? accentFor(tag) : MUTED }}>
                    {isN ? String(x) : tag === "w" ? "new" : "-"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function accentFor(tag: Tag | undefined): string {
  if (tag === "w") return MUT;
  if (tag === "r") return READ;
  return MUTED;
}

export function HeatGrid({ scene, tall }: { scene: GridScene; tall?: boolean }) {
  const { value, name, cursor, marks } = scene;
  const rows = value.length;
  if (rows === 0) return <div className="viz-empty">“{name}” is empty right now</div>;
  const cols = Math.max(...value.map((r) => r.length), 0);
  const all = value.flat();
  const vmax = Math.max(
    ...all.filter((x): x is number => typeof x === "number").map((x) => Math.abs(x)),
    1
  );

  const cell = tall ? "h-10 min-w-10" : "h-7 min-w-7";

  return (
    <div className="w-full select-none">
      <div className="viz-name">{name}</div>
      <div className="mt-1.5 overflow-x-auto">
        <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {value.map((row, i) =>
            row.map((v, j) => {
              const tag = marks?.[`${i},${j}`];
              const atCursor = cursor && cursor[0] === i && cursor[1] === j;
              const ring = ringFor(tag, !!atCursor);
              return (
                <div
                  key={`${i}-${j}`}
                  className={`viz-cell ${cell} ${cellClass(tag)}`}
                  style={{
                    background: cellColor(v, vmax, tag),
                    color: typeof v === "number" ? (v < 0 ? "#f0b6b6" : "#d2ffe0") : "#e6edf3",
                    boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
                  }}
                  title={`${name}[${i}][${j}] = ${String(v ?? "")}`}
                >
                  {rows * cols <= 45 || tag || atCursor ? String(v ?? (tag ? "x" : "")) : ""}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function StackViz({ scene }: { scene: StackScene }) {
  const { value, name, marks } = scene;
  const n = value.length;
  if (n === 0) return <div className="viz-empty">“{name}” has no items</div>;
  const visible = Math.min(n, 10);
  const items = value.slice(-visible);
  const base = n - visible;
  return (
    <div className="w-full select-none">
      <div className="viz-name">{name}</div>
      <div className="mt-1.5 flex flex-col-reverse gap-1 w-max rounded-xl px-2 py-2" style={{ background: "var(--bg-hover)" }}>
        {base > 0 && <div className="viz-stack-more">{base} more below</div>}
        {items.map((v, idx) => {
          const i = base + idx;
          const isTop = i === n - 1;
          const tag = marks?.[i];
          const ring = ringFor(tag, isTop);
          return (
            <div
              key={i}
              className={`viz-chip ${cellClass(tag)}`}
              style={{
                background: tag === "w" ? "rgba(63,185,80,0.22)" : isTop ? "rgba(88,166,255,0.18)" : "rgba(255,255,255,0.07)",
                border: ring ? `1px solid ${ring}` : isTop ? `1px solid ${ACCENT}` : "1px solid transparent",
                color: "#e6edf3",
              }}
            >
              {String(v ?? "?")}
            </div>
          );
        })}
        <div className="viz-stack-top">top</div>
      </div>
    </div>
  );
}

export function DequeViz({ scene }: { scene: DequeScene }) {
  const { value, name, marks } = scene;
  const n = value.length;
  if (n === 0) return <div className="viz-empty">“{name}” is empty right now</div>;
  const visible = Math.min(n, 12);
  const items = value.slice(0, visible);
  const more = n - visible;
  return (
    <div className="w-full select-none">
      <div className="viz-name">{name}</div>
      <div className="mt-1.5 flex items-center gap-1 rounded-xl px-2 py-2 w-max" style={{ background: "var(--bg-hover)" }}>
        <span className="viz-stack-top" style={{ marginRight: 2 }}>front</span>
        {items.map((v, i) => {
          const tag = marks?.[i];
          const ring = ringFor(tag, false);
          return (
            <div
              key={i}
              className={`viz-chip ${cellClass(tag)}`}
              style={{
                background: tag === "w" ? "rgba(63,185,80,0.22)" : i === 0 ? "rgba(46,160,67,0.22)" : "rgba(255,255,255,0.07)",
                border: ring ? `1px solid ${ring}` : "1px solid transparent",
                color: "#e6edf3",
              }}
            >
              {String(v ?? "?")}
            </div>
          );
        })}
        {more > 0 && <div className="viz-stack-more">… +{more}</div>}
        <span className="viz-stack-top" style={{ marginLeft: 2 }}>back</span>
      </div>
    </div>
  );
}

export function ScalarPills({ scalars }: { scalars: { name: string; value: SnapScalar }[] }) {
  if (!scalars.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 select-none">
      {scalars.map(({ name, value }) => (
        <span key={name} className="viz-pill" style={{ background: "var(--bg-hover)", border: "1px solid var(--border-subtle)" }}>
          <span style={{ color: ACCENT }}>{name}</span>
          <span style={{ color: "#e6edf3" }}>{String(value ?? "")}</span>
        </span>
      ))}
    </div>
  );
}

function val(x: SnapScalar | undefined): string {
  return x === null || x === undefined ? "∅" : String(x);
}

/** Render one change as a compact text + color, shared by the log and the feed. */
export function changeLabel(c: Change): { text: string; color: string } {
  let text: string;
  let color: string = MUT;
  if (c.kind === "init") {
    text = `${c.name} created`;
    color = ACCENT;
  } else if (c.kind === "append") {
    text = `${c.name} ← +${val(c.val)}`;
  } else if (c.kind === "remove") {
    text = `${c.name} −${val(c.old)}`;
    color = NEG;
  } else if (c.kind === "set" && c.idx !== undefined) {
    const pos = c.ci !== undefined ? `[${c.idx}][${c.ci}]` : `[${c.idx}]`;
    text = `${c.name}${pos}: ${val(c.old)} → ${val(c.val)}`;
  } else if (c.kind === "set") {
    text = `${c.name}: ${val(c.old)} → ${val(c.val)}`;
  } else {
    text = `${c.name}: ${val(c.old)} → ${val(c.val)}`;
  }
  return { text, color };
}

/** Visual change log: exactly what changed and where, as compact chips. */
export function ChangeLog({ changes, max = 5 }: { changes: Change[]; max?: number }) {
  const shown = changes.slice(0, max);
  if (!shown.length) return null;
  const extra = changes.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1.5 select-none">
      <span className="viz-caption-label">Changed</span>
      {shown.map((c, i) => {
        const { text, color } = changeLabel(c);
        return (
          <span key={i} className="viz-pill" style={{ background: "var(--bg-elevated)", border: `1px solid ${color}55`, color }}>
            <span className="font-mono">{text}</span>
          </span>
        );
      })}
      {extra > 0 && (
        <span className="viz-stack-more">+{extra} more</span>
      )}
    </div>
  );
}

/** Every live scalar as a visible card (big value), flashing when it changed. */
export function ScalarCards({
  scalars,
  involved,
}: {
  scalars: { name: string; value: SnapScalar; changed: boolean }[];
  involved?: Set<string>;
}) {
  if (!scalars.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 select-none">
      {scalars.map(({ name, value, changed }) => {
        const active = involved?.has(name);
        return (
          <div
            key={name}
            className={`viz-var-card ${changed ? "viz-var-changed" : ""} ${active ? "viz-var-involved" : ""}`}
            style={{
              boxShadow: changed ? `0 0 0 2px ${MUT}` : active ? `0 0 0 2px ${READ}` : undefined,
              borderColor: changed ? MUT : active ? READ : undefined,
            }}
            title={
              changed
                ? `${name} changed this step`
                : active
                  ? `${name} was read this step`
                  : `${name} = ${String(value ?? "")}`
            }
          >
            <span className="viz-var-name">{name}</span>
            <span className="viz-var-val">{String(value ?? "")}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Containers that didn't fit as full scenes still get their live values shown. */
export function OtherVars({
  other,
}: {
  other: { name: string; snap: SnapArr | SnapGrid }[];
}) {
  if (!other.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 select-none">
      <span className="viz-caption-label">Other data</span>
      {other.map((o) => {
        const label =
          o.snap.__t === "arr"
            ? `[${o.snap.v.slice(0, 10).map((x) => String(x ?? "")).join(", ")}${o.snap.v.length > 10 ? "…" : ""}]`
            : `<${o.snap.v.length}×${o.snap.v[0]?.length ?? 0} grid>`;
        return (
          <span key={o.name} className="viz-chip" style={{ background: "var(--bg-hover)", border: "1px solid var(--border-subtle)", color: "#e6edf3" }}>
            <span style={{ color: ACCENT }}>{o.name}</span> <span style={{ color: MUTED }}>{label}</span>
          </span>
        );
      })}
    </div>
  );
}

export interface FeedItem {
  step: number;
  /** 0-based line of the statement. */
  line: number;
  label: string;
  changes: Change[];
}

/** Continuous "what happened at each recent step" feed for loops. */
export function ChangeFeed({ feed, collapsed = false }: { feed: FeedItem[]; collapsed?: boolean }) {
  const [open, setOpen] = useState(!collapsed);
  if (!feed.length) return null;
  return (
    <div className="viz-feed">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="viz-feed-head w-full"
        title={open ? "Collapse the change history" : "Expand the change history"}
      >
        <span className="viz-caption-label">Running change history</span>
        <span className="viz-feed-live-count">{open ? "−" : `${feed.length} steps +`}</span>
      </button>
      {open && (
        <div className="viz-feed-list">
          {feed.map((it) => {
            const live = it.step === feed[0].step;
            const chip = it.changes[0] ? changeLabel(it.changes[0]) : null;
            return (
              <div key={it.step} className={`viz-feed-item ${live ? "viz-feed-live" : ""}`}>
                <span className="viz-feed-step">{it.step + 1}</span>
                <span className="viz-feed-line">L{it.line + 1}</span>
                <span className="viz-feed-label">{it.label || "—"}</span>
                {chip && (
                  <span className="viz-feed-chip" style={{ borderColor: `${chip.color}66`, color: chip.color }}>
                    {chip.text}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}