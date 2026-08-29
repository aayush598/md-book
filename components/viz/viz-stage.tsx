"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { planStep, roleFor } from "@/lib/viz/layout";
import { diffStep } from "@/lib/viz/diff";
import type { SnapScalar, VizStep, VizTrace } from "@/lib/viz/types";
import VizScene from "./viz-scene";
import VizControls from "./viz-controls";
import VizWorkspace, { type VizPanelId } from "./viz-workspace";
import {
  ACCENT,
  ChangeFeed,
  ChangeLog,
  OtherVars,
  ScalarCards,
  type FeedItem,
} from "./primitives";

function formatArr(items: SnapScalar[]): string {
  if (items.length <= 8) return `[${items.map((x) => String(x)).join(", ")}]`;
  return `[${items.slice(0, 7).map((x) => String(x)).join(", ")}…]`;
}

function argChipText(v: unknown): string {
  if (v && typeof v === "object" && "__t" in v) {
    const s = v as { __t: string; v?: unknown };
    if (s.__t === "v") return s.v === null || s.v === undefined ? "" : String(s.v);
    if (s.__t === "arr" && Array.isArray(s.v)) return formatArr(s.v as SnapScalar[]);
    if (s.__t === "grid" && Array.isArray(s.v)) {
      const rows = s.v as SnapScalar[][];
      const row = (r: SnapScalar[]) => (r.length <= 5 ? `[${r.map((x) => String(x)).join(", ")}]` : `[${r.slice(0, 4).map((x) => String(x)).join(", ")}…]`);
      if (rows.length <= 3) return `[${rows.map(row).join(", ")}]`;
      return `[${rows.slice(0, 2).map(row).join(", ")}…]`;
    }
  }
  if (Array.isArray(v)) return formatArr(v as SnapScalar[]);
  return v === null || v === undefined ? "" : String(v);
}

/** True/false line tint: taken branch = green, skipped = red, else blue. */
type Tone = "acc" | "ok" | "fail";

interface CondPart {
  e: string;
  p: boolean | null;
  /** Clause rewritten with its live values substituted (e.g. `3 < 1`). */
  s?: string | null;
}

function ConditionBadge({
  cx,
}: {
  cx: { e: string; p: boolean; parts?: CondPart[] };
}) {
  return (
    <div className={`viz-cond ${cx.p ? "viz-cond-true" : "viz-cond-false"}`}>
      <span className="viz-caption-label" style={{ color: "inherit" }}>
        Condition
      </span>
      <code className="viz-cond-expr">{cx.e}</code>
      <span className="viz-cond-arrow">→</span>
      <span className="viz-cond-result">{cx.p ? "TRUE" : "FALSE"}</span>
      <span className="viz-cond-hint">
        {cx.p ? "this path runs · line turns green" : "this path is skipped · line turns red"}
      </span>
      {cx.parts && (
        <span className="viz-cond-parts">
          {cx.parts.map((part, i) => (
            <span
              key={i}
              className={`viz-cond-part ${
                part.p === null ? "viz-cond-part-skip" : part.p ? "viz-cond-part-t" : "viz-cond-part-f"
              } ${part.s ? "viz-cond-part-sub" : ""}`}
              title={part.s && part.s !== part.e ? `as written: ${part.e}` : undefined}
            >
              <code>{part.s ?? part.e}</code>
              <span className="viz-cond-to">→</span>
              {part.p === null ? "not reached" : part.p ? "TRUE" : "FALSE"}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

function CodePane({
  lines,
  active,
  tone,
  skip,
  fontSize,
  onLine,
}: {
  lines: string[];
  active: number;
  tone: Tone;
  skip: Set<number>;
  fontSize: number;
  onLine: (l: number) => void;
}) {
  const paneRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const pane = paneRef.current;
    const el = activeRef.current;
    if (pane && el) {
      pane.scrollTop = Math.max(0, el.offsetTop - pane.clientHeight / 2);
    }
  }, [active]);
  return (
    <div className="viz-code-pane" ref={paneRef} style={{ fontSize }}>
      {lines.map((line, i) => {
        const activeLine = i === active;
        const isSkip = !activeLine && skip.has(i);
        const cls =
          `viz-line ${activeLine ? `viz-line-active viz-line-${tone}` : ""} ${isSkip ? "viz-line-skip" : ""}`;
        return (
          <div
            key={i}
            ref={activeLine ? activeRef : undefined}
            onClick={() => onLine(i)}
            title={
              isSkip
                ? `This line was skipped this step (its branch didn't run)`
                : activeLine
                  ? `Executing line ${i + 1}`
                  : `Jump the visualizer to line ${i + 1}`
            }
            className={cls}
          >
            <span className="viz-line-num">{i + 1}</span>
            <span className="viz-line-text">{line || " "}</span>
            {activeLine && tone !== "acc" && (
              <span className={`viz-line-cx viz-line-cx-${tone}`}>
                {tone === "ok" ? "✓ True" : "✗ False"}
              </span>
            )}
            {activeLine && <span className={`viz-line-arrow viz-line-arrow-${tone}`}>▸</span>}
          </div>
        );
      })}
    </div>
  );
}

export interface VizStageProps {
  trace: VizTrace;
  tall: boolean;
  onBack: () => void;
  step: number;
  playing: boolean;
  mult: number;
  speaking: boolean;
  beginner: boolean;
  fontSize?: number;
  onJump: (i: number) => void;
  onPlay: () => void;
  onSpeed: (m: number) => void;
  onSpeak: () => void;
  onBeginner: () => void;
}

export default function VizStage(props: VizStageProps) {
  const {
    trace,
    tall,
    onBack,
    step,
    playing,
    mult,
    speaking,
    beginner,
    fontSize = 15,
    onJump,
    onPlay,
    onSpeed,
    onSpeak,
    onBeginner,
  } = props;

  const steps = trace.steps;
  const total = steps.length;
  const current: VizStep | undefined = steps[Math.min(step, Math.max(total - 1, 0))];

  // Show the state AFTER each line runs: caption/line come from `current`,
  // but the live data comes from the next snapshot, so a "append" caption
  // lines up with the element physically appearing. Diff is run between the
  // two displayed snapshots so the marks/chips describe exactly that line.
  const shown = steps[Math.min(step + 1, total - 1)];
  const prevShown = steps[Math.min(step, total - 1)];
  const reads = current?.r;

  const skip = useMemo(
    () => new Set<number>(current?.sk ?? []),
    [current]
  );

  // Names of structures (deque/stack) that exist anywhere in the run — they
  // are drawn as empty from the very first step so they never "disappear".
  const knownContainers = useMemo(() => {
    const arrNames = new Set<string>();
    for (const s of steps) {
      for (const [name, snap] of Object.entries(s.v)) {
        if (snap && snap.__t === "arr") arrNames.add(name);
      }
    }
    return Array.from(arrNames).filter((n) => {
      const r = roleFor(n, false);
      return r === "deque" || r === "stack";
    });
  }, [steps]);

  const plan = useMemo(
    () =>
      shown ? planStep(shown, prevShown, reads, knownContainers) : { scenes: [], other: [], scalars: [], changes: [] },
    [shown, prevShown, reads, knownContainers]
  );

  const feed = useMemo(() => {
    if (!steps.length) return [];
    const out: FeedItem[] = [];
    for (let j = step; j >= Math.max(0, step - 7); j--) {
      const sj = steps[Math.min(j + 1, total - 1)];
      const pj = steps[Math.min(j, total - 1)];
      out.push({
        step: j,
        line: steps[j].l,
        label: steps[j].c ?? "",
        changes: diffStep(pj, sj, steps[j].r ?? undefined).changes,
      });
    }
    return out;
  }, [steps, step, total]);

  const lineToStep = useMemo(() => {
    const m = new Map<number, number>();
    steps.forEach((s, i) => {
      if (!m.has(s.l)) m.set(s.l, i);
    });
    return m;
  }, [steps]);

  const goToLine = useCallback(
    (line: number) => {
      let t = lineToStep.get(line);
      if (t === undefined) {
        t = steps.findIndex((s) => s.l >= line);
        if (t === -1) t = Math.max(steps.length - 1, 0);
      }
      onJump(t);
    },
    [lineToStep, steps, onJump]
  );

  const caption = current?.c;
  const tone: Tone =
    current?.k === "br" && current.cx ? (current.cx.p ? "ok" : "fail") : "acc";

  // Every name read or written on this step, to spotlight the live var cards.
  const involved = useMemo(() => {
    const s = new Set<string>();
    if (current?.r) for (const k of Object.keys(current.r)) s.add(k);
    for (const c of plan.changes) s.add(c.name);
    return s;
  }, [current, plan.changes]);

  const contents = {
    code: (
      <CodePane
        lines={trace.lines}
        active={current?.l ?? 0}
        tone={tone}
        skip={skip}
        fontSize={fontSize}
        onLine={goToLine}
      />
    ),
    feed:
      feed.length > 1 ? (
        <ChangeFeed feed={feed} />
      ) : (
        <div className="viz-panel-empty">Step through the run — every line’s effect lands here.</div>
      ),
    caption: (
      <div className="viz-status flex flex-col gap-1.5">
        <div
          className="viz-caption"
          style={{ minHeight: 32, background: "rgba(88,166,255,0.08)", border: "1px solid rgba(88,166,255,0.22)", color: "#e6edf3" }}
        >
          {caption ?? `Working at line ${current ? current.l + 1 : 1}.`}
        </div>
        {trace.notes?.map((note, i) => (
          <div key={i} className="viz-note" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", color: "#d29922" }}>
            {note}
          </div>
        ))}
      </div>
    ),
    condition:
      current?.k === "br" && current.cx ? (
        <ConditionBadge cx={current.cx} />
      ) : (
        <span className="viz-caption-label" style={{ color: "var(--text-tertiary)" }}>
          — no condition on this line
        </span>
      ),
    changed: plan.changes.length ? (
      <ChangeLog changes={plan.changes} />
    ) : (
      <span className="viz-caption-label" style={{ color: "var(--text-tertiary)" }}>
        — this line changed nothing visible
      </span>
    ),
    graphs:
      plan.scenes.length > 0 ? (
        <VizScene scenes={plan.scenes} tall={tall} />
      ) : (
        <div className="viz-panel-empty">No data structures are live on this step yet.</div>
      ),
    vars:
      plan.scalars.length > 0 || plan.other.length > 0 ? (
        <div className="flex flex-col gap-2">
          <ScalarCards scalars={plan.scalars} involved={involved} />
          <OtherVars other={plan.other} />
        </div>
      ) : (
        <div className="viz-panel-empty">No plain variables on this step.</div>
      ),
  };

  return (
    <div className="viz-stage viz-dark flex min-h-0 flex-1 flex-col gap-3 text-sm" style={{ height: "100%" }}>
      {/* header */}
      <div className="flex flex-wrap items-center gap-2 pr-1">
        <span className="viz-chip" style={{ background: "rgba(88,166,255,0.15)", color: ACCENT, border: "1px solid rgba(88,166,255,0.35)" }}>
          {trace.fn}()
        </span>
        <span className="viz-goal" style={{ color: "var(--text-secondary)" }}>{trace.goal}</span>
        {trace.result !== "" && (
          <span className="viz-chip" style={{ background: "rgba(46,160,67,0.15)", color: "#3fb950", border: "1px solid rgba(46,160,67,0.35)" }}>
            Answer: {trace.result}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={onBack} className="viz-ctrl px-2.5 py-1.5 text-[11px] font-semibold" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }} title="Back to the problem page">
            <svg className="h-3.5 w-3.5 mr-1 inline -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
        </div>
      </div>

      {/* sample inputs */}
      {trace.args.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="viz-caption-label">Inputs</span>
          {trace.args.map((a) => (
            <span key={a.name} className="viz-chip" style={{ background: "var(--bg-hover)", border: "1px solid var(--border-subtle)", color: "#e6edf3" }}>
              <span style={{ color: "var(--text-tertiary)" }}>{a.name} =</span> {argChipText(a.v)}
            </span>
          ))}
        </div>
      )}

      <VizControls
        step={step}
        total={Math.max(total, 1)}
        playing={playing}
        speaking={speaking}
        beginner={beginner}
        mult={mult}
        onPrev={() => onJump(step - 1)}
        onPlay={onPlay}
        onNext={() => onJump(step + 1)}
        onScrub={onJump}
        onToggleSpeak={onSpeak}
        onToggleBeginner={onBeginner}
        onSpeed={onSpeed}
        onRestart={() => onJump(0)}
      />

      {/* adjustable panel workspace: code + change history on the left,
          step/condition/changed/graphs/vars on the right — all panels are
          draggable and resizable with a couple of layout presets */}
      <VizWorkspace
        contents={contents}
        lockedHidden={beginner ? new Set<VizPanelId>(["code"]) : undefined}
      />
    </div>
  );
}