// Generates public/pyodide-worker.js by embedding lib/viz/viz_tracer.py
// into a JS template literal. Run: node scripts/gen_pyodide_worker.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "lib/viz/viz_tracer.py"), "utf8");
const circuitSource = readFileSync(join(root, "lib/viz/circuit.py"), "utf8");

// escape for a JS template literal
const escapeForTemplate = (text) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");

const embedded = escapeForTemplate(source);
const embeddedCircuit = escapeForTemplate(circuitSource);

const worker = `// Dedicated Web Worker that runs Python solutions through the
// visualization tracer (lib/viz/viz_tracer.py) using Pyodide.
//
// Pyodide is loaded lazily at runtime from the jsDelivr CDN and is never
// bundled, so the app stays small and Vercel free-tier safe: all the heavy
// work happens in the visitor's browser, not on a serverless function.
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

const VIS_TRACER_PY = \`${embedded}\`;

const CIRCUIT_PY = \`${embeddedCircuit}\`;

let pyodide = null;
let loadPromise = null;
let schemdrawPromise = null;

// schemdraw is a pure-python wheel (no compiled deps), installed lazily into
// the running Pyodide only when a \`\`\`circuit fence is first rendered. Shared
// across every circuit on the page.
async function ensureSchemdraw() {
  if (!schemdrawPromise) {
    schemdrawPromise = (async () => {
      await pyodide.loadPackage("micropip");
      const micropip = pyodide.pyimport("micropip");
      await micropip.install("schemdraw==0.23");
      await pyodide.runPythonAsync(CIRCUIT_PY);
    })();
    schemdrawPromise.catch(() => {
      schemdrawPromise = null;
    });
  }
  return schemdrawPromise;
}

async function ensureLoaded() {
  if (pyodide) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
      });
      await pyodide.runPythonAsync(VIS_TRACER_PY);
    })();
  }
  await loadPromise;
}

self.onmessage = async (event) => {
  const { id, type, source } = event.data || {};
  if (!id) return;
  try {
    if (type === "load") {
      await ensureLoaded();
      postMessage({ id, type: "loaded" });
    } else if (type === "circuit") {
      await ensureLoaded();
      await ensureSchemdraw();
      pyodide.globals.set("__circuit_source__", source);
      const json = pyodide.runPython(
        "import json; json.dumps({'svg': render_circuit(__circuit_source__)})"
      );
      postMessage({
        id,
        type: "result",
        payload: typeof json === "string" ? JSON.parse(json) : json,
      });
    } else if (type === "run") {
      await ensureLoaded();
      pyodide.globals.set("__viz_source__", source);
      const json = pyodide.runPython(
        "import json; json.dumps(build_result(__viz_source__))"
      );
      postMessage({
        id,
        type: "result",
        payload: typeof json === "string" ? JSON.parse(json) : json,
      });
    }
  } catch (error) {
    postMessage({
      id,
      type: "error",
      message: String(error && error.message ? error.message : error),
    });
  }
};
`;

writeFileSync(join(root, "public/pyodide-worker.js"), worker);
console.log("wrote public/pyodide-worker.js:", worker.length, "bytes");