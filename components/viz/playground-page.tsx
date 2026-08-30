"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import VizStudio from "./viz-studio";
import { ACCENT } from "./primitives";

const PLAYGROUND_KEY = "md-book:playground-code";
const PLAYGROUND_TITLE_KEY = "md-book:playground-title";

interface PlaygroundExample {
  name: string;
  code: string;
}

export const PLAYGROUND_EXAMPLES: PlaygroundExample[] = [
  {
    name: "Fibonacci list",
    code: `def fib(n):
    """Fill a list with the first n Fibonacci numbers."""
    out = [0, 1]
    while len(out) < n:
        out.append(out[-1] + out[-2])
    return out
print(fib(10))`,
  },
  {
    name: "Two-pointer palindrome",
    code: `def isPalindrome(a):
    """Two pointers close in from both ends — watch the cursors meet."""
    i, j = 0, len(a) - 1
    while i < j:
        if a[i] != a[j]:
            return False
        i += 1
        j -= 1
    return True
print(isPalindrome([3, 7, 9, 7, 3]))`,
  },
  {
    name: "BFS flood fill",
    code: `from collections import deque
def flood(grid, r, c):
    """Breadth-first flood fill — a deque walks the grid and marks the region."""
    m, n = len(grid), len(grid[0])
    q = deque([(r, c)])
    while q:
        i, j = q.popleft()
        grid[i][j] = 9
        for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ni, nj = i + di, j + dj
            if 0 <= ni < m and 0 <= nj < n and grid[ni][nj] == 1:
                q.append((ni, nj))
    return grid
print(flood([[1, 1, 0], [1, 0, 0], [0, 1, 1]], 0, 0))`,
  },
  {
    name: "Bracket matching (stack)",
    code: `def matches(s):
    """Push openers on a stack; matching closers pop them off."""
    stack = []
    pairs = {")": "(", "]": "[", "}": "{"}
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif stack and stack[-1] == pairs[ch]:
            stack.pop()
        else:
            return False
    return True
print(matches("([{}])"))`,
  },
  {
    name: "Binary search",
    code: `def search(a, x):
    """Binary search — shrink the window and watch low and high meet."""
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == x:
            return mid
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
print(search([1, 3, 5, 7, 9, 11], 7))`,
  },
];

function readStored(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStored(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export default function PlaygroundPage() {
  const [code, setCode] = useState(() => readStored(PLAYGROUND_KEY).trimEnd());
  const [title, setTitle] = useState(() => readStored(PLAYGROUND_TITLE_KEY) || undefined);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    writeStored(PLAYGROUND_KEY, code);
  }, [code]);

  const hasDef = /\bdef\s+\w+\s*\(/.test(code);
  const hasTopPrint = /\bprint\s*\(/.test(code);
  const hints = useMemo(() => {
    const out: string[] = [];
    if (!hasDef)
      out.push("Start with at least one function — the visualizer walks every line of it.");
    else if (!hasTopPrint)
      out.push("Finish with a top-level print(yourfunc(...)) call so the function is actually run and animated.");
    if (code.includes("input("))
      out.push("The visualizer runs locally and doesn't support input() — hard-code your test data instead.");
    return out;
  }, [code, hasDef, hasTopPrint]);

  const isValid = code.trim().length > 0 && hasDef;

  const loadExample = (name: string) => {
    const ex = PLAYGROUND_EXAMPLES.find((e) => e.name === name);
    if (!ex) return;
    setCode(ex.code);
    setRunning(false);
    setTitle(ex.name);
    writeStored(PLAYGROUND_TITLE_KEY, ex.name);
  };

  // ---- Edit view: paste, tweak, then run ----
  if (!running) {
    return (
      <div className="viz-dark flex h-full flex-col overflow-y-auto" style={{ background: "#0d1117", color: "#e6edf3" }}>
        <div className="viz-play-top">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "white" }}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight">md book</span>
            <span className="viz-chip" style={{ background: "rgba(88,166,255,0.12)", color: ACCENT, border: "1px solid rgba(88,166,255,0.3)", fontSize: 10 }}>
              Playground
            </span>
          </div>
          <Link
            href="/"
            className="viz-ctrl ml-auto px-2.5 py-1.5 text-[11px] font-semibold"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            Home
          </Link>
        </div>

        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Visualise any Python code, step by step</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "#8b949e" }}>
            Paste your own algorithm — arrays, 2-D grids, stacks, deques, loops, conditions and variables are all animated as the code runs. Everything happens locally in your browser.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="viz-caption-label">Try an example</span>
            <select className="viz-play-select" onChange={(e) => loadExample(e.target.value)} value="">
              <option value="" disabled>
                Choose one…
              </option>
              {PLAYGROUND_EXAMPLES.map((ex) => (
                <option key={ex.name} value={ex.name}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              placeholder={'def fn(data):\n    # your code here\n    ...\n\nprint(fn([1, 2, 3]))'}
              className="viz-play-code"
              aria-label="Python code to visualise"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRunning(true)}
              disabled={!isValid}
              className="viz-ctrl px-4 py-2 text-[13px] font-semibold"
              style={{
                background: isValid ? "rgba(88,166,255,0.18)" : "var(--bg-hover)",
                color: isValid ? ACCENT : "var(--text-tertiary)",
                border: "1px solid " + (isValid ? "rgba(88,166,255,0.45)" : "var(--border-subtle)"),
              }}
              title={isValid ? undefined : "Write a Python function first"}
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5.14v13.72c0 .8.87 1.3 1.56.9l11.05-6.86a1.05 1.05 0 0 0 0-1.8L9.56 4.24A1.05 1.05 0 0 0 8 5.14Z" />
              </svg>
              Visualise step by step
            </button>
            <button
              onClick={() => {
                setCode("");
                setTitle(undefined);
                writeStored(PLAYGROUND_TITLE_KEY, "");
              }}
              disabled={!code}
              className="viz-ctrl px-3 py-2 text-xs"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
            >
              Clear
            </button>
            <span className="ml-auto text-[11px] text-right" style={{ color: "var(--text-tertiary)" }}>
              Code stays on your device — nothing is uploaded.
            </span>
          </div>

          {(hints.length > 0 || !isValid) && (
            <div className="viz-note mt-5 px-4 py-3" style={{ background: "rgba(210,153,34,0.08)", border: "1px solid rgba(210,153,34,0.25)", color: "var(--text-secondary)" }}>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: "#d29922" }}>
                Before you run
              </div>
              <ul className="space-y-1 pl-4 text-xs list-disc" style={{ color: "var(--text-secondary)" }}>
                {!isValid ? (
                  <li>Add a Python function with the word <code className="font-mono">def</code> so there is something to animate.</li>
                ) : null}
                {hints.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Running view: the step-by-step visualizer fills the screen ----
  return (
    <div className="viz-dark flex h-full min-h-0 flex-col" style={{ background: "#0d1117", color: "#e6edf3" }}>
      <div className="viz-play-top">
        <button
          onClick={() => setRunning(false)}
          className="viz-ctrl px-2.5 py-1.5 text-[11px] font-semibold"
          style={{ background: "rgba(88,166,255,0.15)", color: ACCENT, border: "1px solid rgba(88,166,255,0.4)" }}
          title="Back to the editor"
        >
          <svg className="h-3.5 w-3.5 mr-1 inline -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Edit code
        </button>
        <span className="truncate text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
          {title ?? "Your code"}
        </span>
        <span className="viz-chip ml-auto" style={{ background: "rgba(88,166,255,0.12)", color: ACCENT, border: "1px solid rgba(88,166,255,0.3)", fontSize: 10 }}>
          Playground
        </span>
      </div>
      <VizStudio
        source={code}
        title={title}
        onBack={() => setRunning(false)}
        onSourceChange={(src) => setCode(src)}
      />
    </div>
  );
}