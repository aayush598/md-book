"use client";

import { useEffect, useRef, useState } from "react";
import { renderCircuit } from "@/lib/viz/pyodide";

type State =
  | { status: "loading" }
  | { status: "ready"; source: string; svg: string }
  | { status: "error"; source: string; message: string };

/**
 * Renders a ```circuit fenced block from the markdown as an inline schematic.
 *
 * Everything happens in the visitor's browser: the snippet goes to the existing
 * Pyodide worker, which installs schemdraw on first use and returns an SVG
 * string. The SVG is injected as markup, so nothing is downloaded, saved, or
 * handed to an external viewer.
 */
export default function CircuitFence({ source }: { source: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const runId = useRef(0);

  useEffect(() => {
    const id = runId.current + 1;
    runId.current = id;

    renderCircuit(source)
      .then((svg) => {
        if (runId.current === id) {
          setState({ status: "ready", source, svg });
        }
      })
      .catch((err: unknown) => {
        if (runId.current !== id) return;
        setState({
          status: "error",
          source,
          message: err instanceof Error ? err.message : String(err),
        });
      });
  }, [source]);

  // A stale result belongs to a previous `source`; show the loading state
  // until the render for the current snippet lands.
  const current: State =
    state.status === "loading" || state.source === source
      ? state
      : { status: "loading" };

  if (current.status === "error") {
    return (
      <div
        className="my-5 rounded-xl px-4 py-3 text-sm"
        style={{
          border: "1px solid rgba(248,81,73,0.35)",
          background: "rgba(248,81,73,0.08)",
          color: "var(--text-primary)",
        }}
      >
        <div
          className="mb-1 text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#f85149" }}
        >
          Circuit error
        </div>
        <pre
          className="overflow-x-auto whitespace-pre-wrap font-mono text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          {current.message}
        </pre>
      </div>
    );
  }

  if (current.status === "loading") {
    return (
      <div
        className="my-5 flex items-center gap-2 rounded-xl px-4 py-6 text-sm"
        style={{
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-elevated)",
          color: "var(--text-tertiary)",
        }}
      >
        <span
          className="inline-block h-3 w-3 animate-spin rounded-full"
          style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--accent)" }}
        />
        Rendering circuit…
      </div>
    );
  }

  return (
    <figure
      className="my-6 overflow-x-auto rounded-xl p-4"
      style={{
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-elevated)",
      }}
    >
      <div
        // schemdraw output is generated locally from the book's own source
        dangerouslySetInnerHTML={{ __html: current.svg }}
      />
    </figure>
  );
}
