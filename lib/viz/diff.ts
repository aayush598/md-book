import type { SnapScalar, Snapshot, VizStep } from "./types";

export type Tag = "w" | "r";

export interface Change {
  name: string;
  kind: "set" | "append" | "remove" | "init";
  idx?: number;
  ci?: number;
  old?: SnapScalar;
  val?: SnapScalar;
}

export interface StepDiff {
  /** name -> index -> "w" (write/new) or "r" (read). */
  marks: Record<string, Record<number, Tag>>;
  /** name -> "r,c" -> tag, for 2-D snapshots. */
  gridMarks: Record<string, Record<string, Tag>>;
  /** Ordered list of concrete mutations (for the visual change log). */
  changes: Change[];
}

function arr(v: Snapshot | undefined): (SnapScalar | null)[] | null {
  return v && v.__t === "arr" ? v.v : null;
}

function grid(v: Snapshot | undefined): (SnapScalar | null)[][] | null {
  return v && v.__t === "grid" ? v.v : null;
}

function isVal(v: Snapshot | undefined): v is { __t: "v"; v: SnapScalar } {
  return !!v && v.__t === "v";
}

function same(a: SnapScalar, b: SnapScalar): boolean {
  return String(a) === String(b);
}

/**
 * Compare the previous step's snapshot to this one and produce per-cell
 * write/read marks plus a concrete change log (set / append / remove / init).
 * Reads come from the supplied `reads` map (defaults to the tracer's `r`).
 * Pass the current step's `r` when `cur` is a *shifted* (post-line) snapshot so
 * the highlight still matches the statement being executed.
 */
export function diffStep(
  prev: VizStep | undefined,
  cur: VizStep,
  reads?: Record<string, number[]>
): StepDiff {
  const marks: Record<string, Record<number, Tag>> = {};
  const gridMarks: Record<string, Record<string, Tag>> = {};
  const changes: Change[] = [];

  const prevV = prev?.v ?? {};

  for (const [name, snap] of Object.entries(cur.v)) {
    const prevSnap = prevV[name];
    const snapArr = arr(snap);
    const snapGrid = grid(snap);

    if (snapArr) {
      const prevArr = prevSnap ? arr(prevSnap) : null;
      const idxMarks: Record<number, Tag> = {};

      // elements existing before
      if (prevArr) {
        const common = Math.min(prevArr.length, snapArr.length);
        for (let i = 0; i < common; i++) {
          if (!same(prevArr[i], snapArr[i])) {
            idxMarks[i] = "w";
            changes.push({ name, kind: "set", idx: i, old: prevArr[i], val: snapArr[i] });
          }
        }
        // appended tail
        for (let i = common; i < snapArr.length; i++) {
          idxMarks[i] = "w";
          changes.push({ name, kind: "append", idx: i, val: snapArr[i] });
        }
        // removed tail (a real len shrink; truncation caps are rare at these sizes)
        if (snapArr.length < prevArr.length) {
          for (let i = snapArr.length; i < prevArr.length; i++) {
            changes.push({ name, kind: "remove", idx: i, old: prevArr[i] });
          }
        }
      } else {
        // brand-new variable
        for (let i = 0; i < snapArr.length; i++) idxMarks[i] = "w";
        changes.push({ name, kind: "init" });
      }
      if (Object.keys(idxMarks).length) marks[name] = idxMarks;
      continue;
    }

    if (snapGrid) {
      const prevGrid = prevSnap ? grid(prevSnap) : null;
      const keyMarks: Record<string, Tag> = {};
      for (let r = 0; r < snapGrid.length; r++) {
        const row = snapGrid[r];
        for (let c = 0; c < row.length; c++) {
          const before = prevGrid ? prevGrid[r]?.[c] : undefined;
          const sameCell = prevGrid && before !== undefined && same(before, row[c]);
          if (!sameCell) {
            keyMarks[`${r},${c}`] = "w";
            changes.push({ name, kind: "set", idx: r, ci: c, old: before, val: row[c] });
          }
        }
      }
      if (Object.keys(keyMarks).length) gridMarks[name] = keyMarks;
      if (!prevGrid) changes.push({ name, kind: "init" });
      continue;
    }

    // scalar change worth surfacing (a brand-new variable shows as "created")
    if (isVal(snap)) {
      if (!prevSnap) {
        changes.push({ name, kind: "init", val: snap.v });
      } else if (isVal(prevSnap) && !same(prevSnap.v, snap.v)) {
        changes.push({ name, kind: "set", old: prevSnap.v, val: snap.v });
      }
    }
  }

  // merge tracer-known reads (writes always win)
  for (const [name, indices] of Object.entries(reads ?? cur.r ?? {})) {
    const targets = gridMarks[name];
    if (targets) {
      Object.keys(targets).forEach((key) => {
        if (targets[key] !== "w") targets[key] = "r";
      });
      continue;
    }
    let idxMarks = marks[name];
    if (!idxMarks) {
      idxMarks = {};
      marks[name] = idxMarks;
    }
    for (const idx of indices) {
      if (idxMarks[idx] !== "w") idxMarks[idx] = "r";
    }
  }

  return { marks, gridMarks, changes };
}