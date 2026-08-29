export type SnapScalar = number | string | boolean | null;

export interface SnapArr {
  __t: "arr";
  v: (SnapScalar | null)[];
  trunc?: boolean;
}

export interface SnapGrid {
  __t: "grid";
  v: (SnapScalar | null)[][];
  trunc?: boolean;
}

export interface SnapVal {
  __t: "v";
  v: SnapScalar;
}

export type Snapshot = SnapArr | SnapGrid | SnapVal;

export type StepKind = "as" | "au" | "br" | "fl" | "rt" | "op" | "ca" | "st";

export interface VizStep {
  /** 0-based line index into the solution source. */
  l: number;
  /** Variable-name -> value snapshot at this line. */
  v: Record<string, Snapshot>;
  /** Plain-English caption for the statement just run. */
  c?: string;
  /** Statement kind, drives which visuals the panel shows. */
  k?: StepKind;
  /** For branches: the evaluated condition. `parts` carries each short-circuit clause when compound. */
  cx?: {
    e: string;
    p: boolean;
    parts?: {
      e: string;
      p: boolean | null;
      /** Clause spelled out with its live values substituted (e.g. `3 < 1`). */
      s?: string | null;
    }[];
  };
  /** Container cells read by this statement: name -> [indices]. */
  r?: Record<string, number[]>;
  /** 0-based source lines that were skipped on this step (an un-taken branch). */
  sk?: number[];
}

export interface VizArg {
  name: string;
  v: Snapshot;
}

export interface VizTrace {
  src: string;
  lines: string[];
  fn: string;
  goal: string;
  args: VizArg[];
  steps: VizStep[];
  /** The printed answer (trimmed stdout). */
  result: string;
  notes?: string[];
  error?: string;
  /** Source span of the `fn(...)` call, used to swap in custom arguments. */
  call?: { line: number; col: number; end: number; name: string };
}