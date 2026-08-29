import type {
  SnapArr,
  SnapGrid,
  SnapScalar,
  Snapshot,
  VizStep,
} from "./types";
import { diffStep, type Change, type Tag } from "./diff";

export type Role = "bars" | "grid" | "stack" | "deque";

export interface BarsScene {
  role: "bars";
  name: string;
  value: (SnapScalar | null)[];
  cursor?: number;
  marks?: Record<number, Tag>;
}

export interface GridScene {
  role: "grid";
  name: string;
  value: (SnapScalar | null)[][];
  cursor?: [number, number];
  /** "r,c" -> tag */
  marks?: Record<string, Tag>;
}

export interface StackScene {
  role: "stack";
  name: string;
  value: (SnapScalar | null)[];
  marks?: Record<number, Tag>;
}

export interface DequeScene {
  role: "deque";
  name: string;
  value: (SnapScalar | null)[];
  marks?: Record<number, Tag>;
}

export type Scene = BarsScene | GridScene | StackScene | DequeScene;

const ARRAY_ROLE: Array<[Role, string[]]> = [
  ["deque", ["dq", "deque", "window", "q", "queue"]],
  ["stack", ["stack", "st", "mono_stack", "monostack"]],
  ["grid", []], // handled by shape below
  ["bars", ["dp", "prefix", "nums", "arr", "a", "heights", "cost", "amount", "prices", "price", "coins", "sticks", "cuts", "available", "values", "result", "res", "target"]],
];

const SCALAR_PREF = ["result", "max", "min", "best", "ans", "profit", "area", "count", "sum", "n", "m", "step", "length", "total", "score", "prev", "next", "cur", "curr"];

export function roleFor(name: string, isGrid: boolean): Role | null {
  for (const [role, names] of ARRAY_ROLE) {
    if (role !== "grid" && names.includes(name)) return role;
  }
  if (isGrid) return "grid";
  return "bars";
}

function cellMarksAsGrid(marks: Record<number, Tag>, gridValues: unknown[][]): Record<string, Tag> {
  const out: Record<string, Tag> = {};
  for (let r = 0; r < gridValues.length; r++) {
    const tag = marks[r];
    if (tag) out[`${r},0`] = tag;
  }
  return out;
}

function toArray(snap: Snapshot): (SnapScalar | null)[] | null {
  return snap && snap.__t === "arr" ? snap.v : null;
}

function toGrid(snap: Snapshot): (SnapScalar | null)[][] | null {
  return snap && snap.__t === "grid" ? snap.v : null;
}

function isScalarSnap(snap: Snapshot): snap is { __t: "v"; v: SnapScalar } {
  return snap && snap.__t === "v";
}

/** Pick what to draw for one animated step.
 *
 * `reads` lets the caller rebind highlight reads when showing a *shifted*
 * (post-line) snapshot, so the blue "in use" marks still match the statement
 * whose caption the user is reading.
 */
export function planStep(
  step: VizStep,
  prev?: VizStep,
  reads?: Record<string, number[]>,
  known?: string[]
): {
  scenes: Scene[];
  other: { name: string; snap: SnapArr | SnapGrid }[];
  scalars: { name: string; value: SnapScalar; changed: boolean }[];
  changes: Change[];
} {
  const diff = diffStep(prev, step, reads);
  const { changes } = diff;
  const pairs = Object.entries(step.v).map(([name, snap]) => ({ name, snap }));

  // Structures we've seen anywhere in the trace stay on screen even on steps
  // taken before they were created — so a deque/stack reads "empty" from step 0
  // instead of quietly vanishing.
  const have = new Set(pairs.map((p) => p.name));
  for (const name of known ?? []) {
    if (have.has(name)) continue;
    const r = roleFor(name, false);
    if (r === "deque" || r === "stack") {
      pairs.push({ name, snap: { __t: "arr", v: [] as (SnapScalar | null)[] } });
    }
  }
  const scenes: Scene[] = [];
  const seen = new Set<string>();
  const other: { name: string; snap: SnapArr | SnapGrid }[] = [];
  const scalars: { name: string; value: SnapScalar; changed: boolean }[] = [];

  // Variables mutated / created this step stay highlighted even off-screen.
  const changedSet = new Set<string>();
  for (const c of changes) changedSet.add(c.name);

  // Protagonists first: deque, stack, grid, then arrays
  const prior = (name: string, snap: Snapshot): number => {
    const isGrid = snap && snap.__t === "grid";
    if (isGrid) return 0;
    if (snap && snap.__t === "arr") {
      const r = roleFor(name, isGrid);
      if (r === "deque") return 0;
      if (r === "stack") return 1;
      return 2;
    }
    return 9;
  };
  const ordered = pairs
    .filter(({ snap }) => (snap && snap.__t === "grid") || (snap && snap.__t === "arr"))
    .sort((a, b) => prior(a.name, a.snap) - prior(b.name, b.snap));

  for (const { name, snap } of ordered) {
    if (scenes.length >= 4) break;
    const grid = toGrid(snap);
    if (grid) {
      scenes.push({
        role: "grid",
        name,
        value: grid,
        marks: diff.gridMarks[name] ?? (diff.marks[name] ? cellMarksAsGrid(diff.marks[name], grid) : undefined),
      });
      seen.add(name);
      continue;
    }
    const arr = toArray(snap);
    if (!arr) continue;
    const marks = diff.marks[name];
    const role = roleFor(name, false);
    if (role === "deque") {
      scenes.push({ role: "deque", name, value: arr, marks });
    } else if (role === "stack") {
      scenes.push({ role: "stack", name, value: arr, marks });
    } else {
      scenes.push({ role: "bars", name, value: arr, marks });
    }
    seen.add(name);
  }

  // Cursor scalar → highlight index in the first bars scene. Prefer true loop
  // indices (i/j/lo/hi/…); `k` counts as an index only when it's the loop var
  // (no other numeric index exists) so a window size never rings a random bar.
  const primary = scenes.find((s) => s.role === "bars") as BarsScene | undefined;
  if (primary) {
    const len = primary.value.length;
    const scalarNum = (nm: string): number | undefined => {
      const e = pairs.find((p) => p.name === nm && isScalarSnap(p.snap));
      const v = e && (e.snap as { v: unknown }).v;
      return typeof v === "number" ? v : undefined;
    };
    const INDEX_NAMES = ["i", "j", "idx", "index", "lo", "hi", "left", "right", "pos", "start", "cur"];
    const inRange = (v: number) => v >= 0 && v < len;
    let cursor: number | undefined;
    const chosen = INDEX_NAMES.find((nm) => {
      const v = scalarNum(nm);
      return v !== undefined && inRange(v);
    });
    if (chosen !== undefined) {
      cursor = scalarNum(chosen);
    } else if (!INDEX_NAMES.some((nm) => scalarNum(nm) !== undefined)) {
      const kv = scalarNum("k");
      if (kv !== undefined && inRange(kv)) cursor = kv;
    }
    primary.cursor = cursor;
  }
  const curI = pairs.find((e) => isScalarSnap(e.snap) && e.name === "i" && typeof (e.snap as { v: unknown }).v === "number");
  const curJ = pairs.find((e) => isScalarSnap(e.snap) && e.name === "j" && typeof (e.snap as { v: unknown }).v === "number");
  const gridPrimary = scenes.find((s) => s.role === "grid") as GridScene | undefined;
  if (gridPrimary && curI && typeof (curI.snap as { v: unknown }).v === "number") {
    const ci = (curI.snap as { v: number }).v;
    const cj = curJ && typeof (curJ.snap as { v: unknown }).v === "number" ? (curJ.snap as { v: number }).v : 0;
    gridPrimary.cursor = [ci, cj];
  }

  // Any container that didn't fit as a full scene is still surfaced as live values.
  for (const { name, snap } of ordered) {
    if (seen.has(name)) continue;
    if (snap.__t === "arr" || snap.__t === "grid") other.push({ name, snap });
  }

  // Scalar cards: every live number/bool, preferred names first, changed ones flagged.
  const remaining = pairs.filter((e) => !seen.has(e.name) && isScalarSnap(e.snap));
  const byPref = [...remaining].sort((a, b) => {
    const ia = SCALAR_PREF.indexOf(a.name);
    const ib = SCALAR_PREF.indexOf(b.name);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  for (const e of byPref) {
    const v = e.snap.v;
    if (typeof v !== "number" && typeof v !== "boolean") continue;
    if (typeof v === "number" && Math.abs(v) > 1e9) continue;
    scalars.push({
      name: e.name,
      value: v,
      changed: changedSet.has(e.name),
    });
    if (scalars.length >= 10) break;
  }

  return { scenes, other, scalars, changes };
}