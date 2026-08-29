import type { VizTrace } from "./types";

// Lazy, singleton Pyodide worker backed loader.
// Pyodide itself is fetched from the CDN by public/pyodide-worker.js and is
// never bundled, so the first-load bundle stays small (Vercel free tier).

let worker: Worker | null = null;
let loadPromise: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>();
const WAIT_TIMEOUT_MS = 30_000;

function getWorker(): Worker {
  if (typeof window === "undefined") {
    throw new Error("visualisation runs in the browser only");
  }
  if (!worker) {
    worker = new Worker("/pyodide-worker.js");
    worker.onmessage = (event) => {
      const { id, type, payload, message } = event.data ?? {};
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (type === "error") {
        p.reject(new Error(message ?? "pyodide worker failed"));
      } else {
        p.resolve(payload);
      }
    };
    worker.onerror = (event) => {
      for (const [, p] of pending) p.reject(new Error(event.message || "worker crashed"));
      pending.clear();
    };
  }
  return worker;
}

function callWorker(message: { type: string } & Record<string, unknown>): Promise<unknown> {
  const id = nextId++;
  const w = getWorker();
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, ...message });
    window.setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error("visualisation timed out"));
      }
    }, WAIT_TIMEOUT_MS);
  });
}

/** Ensures the worker has loaded Pyodide. Idempotent; retries after failures. */
export async function loadVizEngine(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("visualisation runs in the browser only");
  }
  if (!loadPromise) {
    loadPromise = callWorker({ type: "load" }).then(() => undefined);
    loadPromise.catch(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

export async function visualisePython(source: string): Promise<VizTrace> {
  await loadVizEngine();
  const payload = await callWorker({ type: "run", source });
  return payload as VizTrace;
}

/** Quick heuristic: does this look like a runnable algorithm we can animate? */
export function looksLikePython(code: string): boolean {
  if (!code || code.length > 12_000) return false;
  if (!/\bdef\s+\w+\s*\(/.test(code)) return false;
  if (!/\bprint\s*\(/.test(code) && !/\bdp\b/.test(code)) return false;
  // exclude markdown fences accidentally passed through
  if (/^```/m.test(code) || /^~~~/.test(code)) return false;
  return true;
}