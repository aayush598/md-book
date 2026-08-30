"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { visualisePython } from "@/lib/viz/pyodide";
import type { VizTrace } from "@/lib/viz/types";
import type { AnalyseQuestion } from "@/lib/viz/analyse-session";
import { callArgsText, replaceCallArgs } from "@/lib/viz/custom-input";
import { questionKey, progressFor, readQuestionStatuses, writeQuestionStatuses, type QuestionStatus } from "@/lib/question-status";
import VizStage from "./viz-stage";
import { StatusControl } from "./question-status";
import { ACCENT } from "./primitives";

export type Phase = "loading" | "ready" | "error";

interface VizStudioProps {
  source: string;
  title?: string;
  /** Sheet file path, for progress tracking (status toggles). */
  path?: string;
  /** Sibling questions in the sheet (prev/next + question text). */
  questions?: AnalyseQuestion[];
  active?: number;
  onBack: () => void;
  onNavigate?: (index: number) => void;
  /** Swap the source (custom input) and keep the shared URL in sync. */
  onSourceChange?: (source: string, title?: string) => void;
}

function speak(text: string) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    /* speech not available */
  }
}

function stopSpeak() {
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
}

function ToolbarBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="viz-ctrl px-2 py-1 text-[11px] font-semibold"
      style={{
        background: active ? "rgba(88,166,255,0.18)" : "var(--bg-hover)",
        color: active ? ACCENT : "var(--text-secondary)",
        border: `1px solid ${active ? "rgba(88,166,255,0.4)" : "var(--border-subtle)"}`,
      }}
    >
      {children}
    </button>
  );
}

export default function VizStudio({
  source,
  title,
  path,
  questions,
  active,
  onBack,
  onNavigate,
  onSourceChange,
}: VizStudioProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [trace, setTrace] = useState<VizTrace | null>(null);
  const [error, setError] = useState("");

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mult, setMult] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [beginner, setBeginner] = useState(false);

  // Toolbar toggles (code font size is remembered across visits)
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window === "undefined") return 15;
    try {
      // Values below the old default are stale leftovers — jump to 15px.
      const v = Math.round(Number(window.localStorage.getItem("md-book:viz-font")));
      if (Number.isFinite(v) && v >= 14 && v <= 24) return v;
    } catch { /* storage unavailable — ignore */ }
    return 15;
  });
  const [showQuestion, setShowQuestion] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const [argsText, setArgsText] = useState("");

  // The first source this page session saw (before any custom input), kept
  // across URL replaces so Reset can return to it. Initialized once.
  const [baseSource] = useState<string>(source);

  // Per-question progress (pending / attempted / completed), shared with the
  // "Coding questions" browser via localStorage (keyed `path#number`).
  const [statuses, setStatuses] = useState<Record<string, QuestionStatus>>({});
  useEffect(() => {
    const t = window.setTimeout(() => setStatuses(readQuestionStatuses()), 0);
    return () => window.clearTimeout(t);
  }, []);

  const start = useCallback(async (src: string) => {
    setPhase("loading");
    setError("");
    setStep(0);
    setPlaying(false);
    try {
      const t = await visualisePython(src);
      if (t.error) {
        setError(t.error);
        setPhase("error");
        return;
      }
      setTrace(t);
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, []);

  // Re-trace whenever the URL-resolved source changes (question nav, Apply).
  const lastSourceRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastSourceRef.current === source) return;
    lastSourceRef.current = source;
    void start(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const total = trace?.steps.length ?? 0;
  const currentSource = trace?.src ?? source;

  useEffect(() => {
    try {
      window.localStorage.setItem("md-book:viz-font", String(fontSize));
    } catch { /* storage unavailable — ignore */ }
  }, [fontSize]);

  const jump = useCallback(
    (i: number) => {
      setPlaying(false);
      setStep(Math.max(0, Math.min(i, Math.max(total - 1, 0))));
    },
    [total]
  );

  const atEnd = total > 0 && step >= total - 1;

  const togglePlay = useCallback(() => {
    if (atEnd) jump(0);
    else setPlaying((p) => !p);
  }, [atEnd, jump]);

  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (!playing) return;
    const ms = Math.max(160, Math.round(900 / mult));
    const t = window.setInterval(() => {
      if (stepRef.current >= Math.max(total - 1, 0)) {
        setPlaying(false);
        return;
      }
      setStep((s) => Math.min(s + 1, Math.max(total - 1, 0)));
    }, ms);
    return () => window.clearInterval(t);
  }, [playing, mult, total]);

  const current = total > 0 ? trace?.steps[Math.min(step, total - 1)] : undefined;
  useEffect(() => {
    if (!speaking) return;
    if (current?.c) speak(current.c);
  }, [step, current?.c, speaking]);

  useEffect(() => () => stopSpeak(), []);

  // ---- Question navigation ----
  const qCount = questions?.length ?? 0;
  const canNav = qCount > 1 && !!onNavigate;
  const activeIdx = Math.min(Math.max(active ?? 0, 0), Math.max(qCount - 1, 0));
  const curQ = questions && questions[activeIdx];
  const go = useCallback(
    (i: number) => {
      if (!canNav) return;
      onNavigate!(Math.max(0, Math.min(i, qCount - 1)));
    },
    [canNav, onNavigate, qCount]
  );

  // Active question's progress status. Only meaningful when we know the sheet
  // path; the question number is preferred, the title is the fallback key.
  const statusKey = path && curQ ? questionKey(path, curQ.number ?? curQ.title) : null;
  const curStatus: QuestionStatus | null = statusKey ? (statuses[statusKey] ?? "pending") : null;
  const setStatus = useCallback(
    (s: QuestionStatus) => {
      if (!statusKey) return;
      setStatuses((prev) => {
        const next = { ...prev, [statusKey]: s };
        writeQuestionStatuses(next);
        return next;
      });
    },
    [statusKey]
  );

  const progress = progressFor(statuses, questions ?? [], path);

  // ---- Custom input ----
  const applyInput = useCallback(() => {
    if (!trace?.call) return;
    const modified = replaceCallArgs(currentSource, trace.call, argsText ?? "");
    if (!modified || modified === currentSource) return;
    setShowInputs(false);
    onSourceChange?.(modified, title);
  }, [trace, currentSource, argsText, onSourceChange, title]);

  // Toggle the custom-input panel; when opening, prime it with the args the
  // solution was actually called with so a fresh "Apply" is a no-op reset.
  const openInputs = useCallback(
    (force?: boolean) => {
      if (force) {
        if (trace?.call) {
          const t = callArgsText(trace.src, trace.call);
          if (t !== null) setArgsText(t);
        }
        setShowInputs(true);
        return;
      }
      setShowInputs((v) => {
        const next = !v;
        if (next && trace?.call) {
          const t = callArgsText(trace.src, trace.call);
          if (t !== null) setArgsText(t);
        }
        return next;
      });
    },
    [trace]
  );

  const resetInput = useCallback(() => {
    setShowInputs(false);
    if (source !== baseSource) {
      onSourceChange?.(baseSource, title);
    } else if (trace?.call) {
      const t = callArgsText(trace.src, trace.call);
      if (t !== null) setArgsText(t);
    }
  }, [source, baseSource, title, onSourceChange, trace]);

  // ---- Keyboard shortcuts ----
  interface ApiShape {
    togglePlay: () => void;
    next: () => void;
    prev: () => void;
    restart: () => void;
    goEnd: () => void;
    speed: (m: number) => void;
    beginnerToggle: () => void;
    speakToggle: () => void;
    questionToggle: () => void;
    inputsToggle: () => void;
    fontUp: () => void;
    fontDown: () => void;
    fontReset: () => void;
    goNextQ: () => void;
    goPrevQ: () => void;
    canNav: boolean;
  }
  const noop = () => {};
  const apiRef = useRef<ApiShape>({
    togglePlay: noop,
    next: noop,
    prev: noop,
    restart: noop,
    goEnd: noop,
    speed: () => {},
    beginnerToggle: noop,
    speakToggle: noop,
    questionToggle: noop,
    inputsToggle: noop,
    fontUp: noop,
    fontDown: noop,
    fontReset: noop,
    goNextQ: noop,
    goPrevQ: noop,
    canNav: false,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    apiRef.current = {
      togglePlay,
      next: () => jump(stepRef.current + 1),
      prev: () => jump(stepRef.current - 1),
      restart: () => jump(0),
      goEnd: () => jump(Math.max(total - 1, 0)),
      speed: setMult,
      beginnerToggle: () => setBeginner((b) => !b),
      speakToggle: () =>
        setSpeaking((s) => {
          if (s) stopSpeak();
          return !s;
        }),
      questionToggle: () => setShowQuestion((v) => !v),
      inputsToggle: () => openInputs(),
      fontUp: () => setFontSize((s) => Math.min(24, s + 1)),
      fontDown: () => setFontSize((s) => Math.max(12, s - 1)),
      fontReset: () => setFontSize(15),
      goNextQ: () => go(activeIdx + 1),
      goPrevQ: () => go(activeIdx - 1),
      canNav,
    };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (
        t.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) ||
        (t.tagName === "BUTTON" || !!t.closest("button")) &&
          (e.key === " " || e.key === "Enter")
      ) {
        return;
      }
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          apiRef.current.togglePlay();
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          apiRef.current.next();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          apiRef.current.prev();
          break;
        case "Home":
          e.preventDefault();
          apiRef.current.restart();
          break;
        case "End":
          e.preventDefault();
          apiRef.current.goEnd();
          break;
        case "r":
        case "R":
          e.preventDefault();
          apiRef.current.restart();
          break;
        case "1":
          apiRef.current.speed(1);
          break;
        case "2":
          apiRef.current.speed(2);
          break;
        case "3":
          apiRef.current.speed(4);
          break;
        case "b":
        case "B":
          apiRef.current.beginnerToggle();
          break;
        case "s":
        case "S":
          apiRef.current.speakToggle();
          break;
        case "h":
        case "H":
          apiRef.current.questionToggle();
          break;
        case "i":
        case "I":
          apiRef.current.inputsToggle();
          break;
        case "n":
        case "N":
          if (apiRef.current.canNav) apiRef.current.goNextQ();
          break;
        case "p":
        case "P":
          if (apiRef.current.canNav) apiRef.current.goPrevQ();
          break;
        case "+":
        case "=":
          e.preventDefault();
          apiRef.current.fontUp();
          break;
        case "-":
        case "_":
          e.preventDefault();
          apiRef.current.fontDown();
          break;
        case "0":
          apiRef.current.fontReset();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const questionMd = curQ?.question;

  return (
    <div
      className="viz-dark flex min-h-0 h-full flex-col gap-2 p-3 sm:p-4"
      style={{ background: "#0d1117", color: "#e6edf3" }}
    >
      {/* ---- Toolbar: navigate questions, question/input toggles, font ---- */}
      <div className="flex flex-wrap items-center gap-1.5 select-none">
        {canNav && (
          <>
            <ToolbarBtn title="Previous question (P)" onClick={() => go(activeIdx - 1)}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </ToolbarBtn>
            <select
              value={activeIdx}
              onChange={(e) => go(Number(e.target.value))}
              title="Jump to another question"
              className="viz-ctrl max-w-[220px] text-[11px] font-medium"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)", padding: "5px 8px" }}
            >
              {questions!.map((q, i) => (
                <option key={i} value={i}>
                  {i + 1}. {q.title}
                </option>
              ))}
            </select>
            <ToolbarBtn title="Next question (N)" onClick={() => go(activeIdx + 1)}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </ToolbarBtn>
            <span className="viz-step-count hidden sm:inline">{activeIdx + 1}/{qCount}</span>
            {curStatus !== null && (
              <>
                <div className="mx-1 h-4 w-px" style={{ background: "var(--border-subtle)" }} />
                <StatusControl value={curStatus} onChange={setStatus} />
                {progress && (
                  <>
                    <div className="ml-1.5 h-1 w-8 overflow-hidden rounded-full" style={{ background: "var(--bg-hover)" }}>
                      <div className="h-full rounded-full" style={{ width: `${progress.pct}%`, background: "#22c55e" }} />
                    </div>
                    <span className="viz-step-count" title={`${progress.completed} of ${progress.total} questions done`}>
                      {progress.pct}%
                    </span>
                  </>
                )}
              </>
            )}
            <div className="mx-1 h-4 w-px" style={{ background: "var(--border-subtle)" }} />
          </>
        )}

        <ToolbarBtn title={showQuestion ? "Hide the question (H)" : "Show the question (H)"} active={showQuestion} onClick={() => setShowQuestion((v) => !v)}>
          <svg className="h-3.5 w-3.5 mr-1 inline -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          Question
        </ToolbarBtn>

        <ToolbarBtn title="Custom input — edit the arguments and re-run (I)" active={showInputs} onClick={() => openInputs()}>
          <svg className="h-3.5 w-3.5 mr-1 inline -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
          Custom input
        </ToolbarBtn>

        <div className="mx-1 h-4 w-px" style={{ background: "var(--border-subtle)" }} />

        <ToolbarBtn title="Smaller code font (-)" onClick={() => setFontSize((s) => Math.max(12, s - 1))}>A−</ToolbarBtn>
        <span className="viz-step-count">{fontSize}px</span>
        <ToolbarBtn title="Larger code font (+)" onClick={() => setFontSize((s) => Math.min(24, s + 1))}>A+</ToolbarBtn>

        <div className="ml-auto hidden md:flex items-center gap-1 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          <kbd className="viz-kbd">Space</kbd> play
          <span className="mx-0.5" style={{ color: "var(--text-muted)" }}>·</span>
          <kbd className="viz-kbd">←→</kbd> step
          <span className="mx-0.5" style={{ color: "var(--text-muted)" }}>·</span>
          <kbd className="viz-kbd">123</kbd> speed
          <span className="mx-0.5" style={{ color: "var(--text-muted)" }}>·</span>
          <kbd className="viz-kbd">N/P</kbd> question
        </div>
      </div>

      {/* ---- Collapsible question text ---- */}
      {showQuestion && (
        <div className="viz-question-panel">
          <div className="flex items-center gap-2">
            <span className="viz-caption-label">Question</span>
            <span className="truncate text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              {curQ?.title ?? title ?? "Exercise"}
            </span>
            <button
              onClick={() => setShowQuestion(false)}
              className="ml-auto viz-ctrl px-1.5 py-0.5 text-[10px]"
              style={{ color: "var(--text-tertiary)" }}
              title="Hide (H)"
            >
              ✕
            </button>
          </div>
          {questionMd ? (
            <div className="viz-question-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{questionMd}</ReactMarkdown>
            </div>
          ) : curQ?.title || title ? (
            <p className="viz-question-body text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {curQ?.title || title}
            </p>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              No statement text saved for this question.
            </p>
          )}
        </div>
      )}

      {/* ---- Custom input ---- */}
      {showInputs && (
        <div className="viz-input-panel">
          <div className="flex items-center gap-2">
            <span className="viz-caption-label">Custom input</span>
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              Python arguments for {trace?.fn ?? "fn"}() — comma separated, e.g. <code className="font-mono">[1, 3, -1], 2</code>. By default it uses the solution&apos;s own inputs.
            </span>
          </div>
          <textarea
            value={argsText}
            onChange={(e) => setArgsText(e.target.value)}
            rows={2}
            spellCheck={false}
            placeholder={trace?.call ? "" : "waiting for the trace to load…"}
            className="viz-input"
            style={{ background: "#0d1117", color: "#e6edf3", border: "1px solid var(--border-subtle)", borderRadius: 8, fontFamily: "var(--font-mono), monospace", fontSize: 12, padding: "6px 10px", width: "100%" }}
          />
          <div className="flex items-center gap-2">
            <button onClick={applyInput} disabled={!trace?.call} className="viz-ctrl px-3 py-1 text-[11px] font-semibold" style={{ background: "rgba(88,166,255,0.15)", color: ACCENT, border: "1px solid rgba(88,166,255,0.35)" }}>
              Apply &amp; re-run
            </button>
            <button onClick={resetInput} className="viz-ctrl px-3 py-1 text-[11px]" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
              Reset to the original inputs
            </button>
            <button onClick={() => setShowInputs(false)} className="viz-ctrl px-3 py-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              Close
            </button>
          </div>
        </div>
      )}

      {phase === "loading" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="viz-spinner" />
          <div>
            <p className="text-sm font-medium" style={{ color: "#e6edf3" }}>
              {title ? `${title}: ` : ""}tracing the solution…
            </p>
            <p className="mt-1 text-xs" style={{ color: "#8b949e" }}>
              First time here? The Python runtime is loading locally (~5–10 s one-off). Code never leaves your device.
            </p>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="m-auto w-full max-w-lg">
          <div className="viz-note px-4 py-3" style={{ background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.35)", color: "#f85149" }}>
            Couldn&apos;t run this solution: {error}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setTrace(null);
                void start(source);
              }}
              className="viz-ctrl px-3 py-1.5 text-xs font-semibold flex-1"
              style={{ background: "rgba(88,166,255,0.15)", color: ACCENT, border: "1px solid rgba(88,166,255,0.35)" }}
            >
              Retry
            </button>
            <button onClick={onBack} className="viz-ctrl px-3 py-1.5 text-xs flex-1" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
              Back
            </button>
          </div>
        </div>
      )}

      {phase === "ready" && trace && (
        <div className="min-h-0 flex-1 flex flex-col">
          <VizStage
            trace={trace}
            tall
            fontSize={fontSize}
            onBack={onBack}
            step={step}
            playing={playing}
            mult={mult}
            speaking={speaking}
            beginner={beginner}
            onJump={jump}
            onPlay={togglePlay}
            onSpeed={setMult}
            onSpeak={() =>
              setSpeaking((s) => {
                if (s) stopSpeak();
                return !s;
              })
            }
            onBeginner={() => setBeginner((b) => !b)}
          />
        </div>
      )}
    </div>
  );
}