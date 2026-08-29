// Editing the arguments of the solution's `fn(...)` call so a user can trace
// the same code against their own inputs. The tracer reports the exact source
// span of that call (see VizTrace.call), so we can slice and swap it safely.

import type { VizTrace } from "./types";

/** Source span of the `fn(...)` call inside the traced source. */
export interface CallSpan {
  line: number;
  col: number;
  end: number;
  name: string;
}

/** The current argument text between the call's parens, or null if unknown. */
export function callArgsText(source: string, call: CallSpan): string | null {
  const lines = source.split("\n");
  const line = lines[call.line];
  if (line === undefined) return null;
  const open = line.indexOf("(", call.col);
  if (open === -1) return null;
  const close = Math.max(open, call.end - 1);
  return line.slice(open + 1, close).trim();
}

/** Rebuild the source with `fn(<args>)` swapped in for the traced call. */
export function replaceCallArgs(
  source: string,
  call: CallSpan,
  args: string
): string | null {
  const lines = source.split("\n");
  const line = lines[call.line];
  if (line === undefined) return null;
  // Reconstruct the whole `fn(old args)` and swap the argument text.
  const rebuilt =
    line.slice(0, call.col) +
    call.name +
    "(" +
    args +
    ")" +
    line.slice(call.end);
  lines[call.line] = rebuilt;
  return lines.join("\n");
}

/** A one-line, human-readable form of a trace's args (for the input box label). */
export function argsSummary(trace: VizTrace): string {
  return trace.args
    .map((a) => `${a.name} = ${JSON.stringify(a.v)}`)
    .join(", ");
}