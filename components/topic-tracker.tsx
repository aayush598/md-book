"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readTopics,
  addTopic,
  updateTopic,
  incrementTopicDone,
  removeTopic,
  type TopicRecord,
} from "@/lib/topic-tracker";

/** Derive a suggested topic name from the currently open file path, e.g.
 *  "samora-ai/Agent2UI/README.md" → "Agent2UI" (the file's parent folder). */
export function topicNameFromFile(filePath?: string | null): string {
  if (!filePath) return "";
  const parts = filePath.split("/").filter(Boolean);
  if (parts.length < 2) return "";
  return parts[parts.length - 2];
}

const DEFAULT_TOTAL = "100";
const DEFAULT_DONE = "100";

export default function TopicTracker({
  bookId,
  bookName,
  currentFile,
  onClose,
}: {
  bookId: string;
  bookName: string;
  currentFile?: string | null;
  onClose: () => void;
}) {
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [name, setName] = useState(() => topicNameFromFile(currentFile));
  const [total, setTotal] = useState(DEFAULT_TOTAL);
  const [done, setDone] = useState(DEFAULT_DONE);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setTopics(readTopics(bookId));
      const onClick = () => setMenuFor(null);
      window.addEventListener("click", onClick);
      return () => window.removeEventListener("click", onClick);
    }, 0);
    return () => window.clearTimeout(t);
  }, [bookId]);

  const totalQuestions = topics.reduce((s, t) => s + t.total, 0);
  const doneQuestions = topics.reduce((s, t) => s + t.done, 0);
  const pct = totalQuestions > 0 ? Math.round((doneQuestions / totalQuestions) * 100) : 0;

  const handleAdd = useCallback(() => {
    const n = name.trim();
    const t = parseInt(total, 10);
    if (!n || !Number.isFinite(t) || t <= 0) return;
    setTopics(addTopic(bookId, { name: n, total: t, done: parseInt(done, 10) || 0 }));
    setName("");
    setTotal("");
    setDone("");
  }, [bookId, name, total, done]);

  const closeOnEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", closeOnEsc);
    return () => window.removeEventListener("keydown", closeOnEsc);
  }, [closeOnEsc]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-bg)" }}>
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Topic tracker</h2>
            <p className="truncate text-[11px]" style={{ color: "var(--text-tertiary)" }}>{bookName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            title="Close (Esc)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Overall summary */}
          {topics.length > 0 && (
            <div className="rounded-xl px-4 py-3" style={{ background: "var(--accent-bg)" }}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold" style={{ color: "var(--accent)" }}>
                  {doneQuestions} / {totalQuestions} questions covered
                </span>
                <span className="font-bold" style={{ color: pct === 100 ? "#22c55e" : "var(--accent)" }}>{pct}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-hover)" }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), #22c55e)" }} />
              </div>
              <p className="mt-1.5 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                {topics.length} {topics.length === 1 ? "topic" : "topics"} · {topics.filter((t) => t.done >= t.total).length} complete
              </p>
            </div>
          )}

          {/* Topic list */}
          {topics.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No topics yet</p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                Add a topic (e.g. &quot;Agent2UI&quot; along with its question count) and tick off questions as you cover them.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {topics.map((topic) => {
                const tp = topic.total > 0 ? Math.round((topic.done / topic.total) * 100) : 0;
                const complete = topic.total > 0 && topic.done >= topic.total;
                return (
                  <div key={topic.id} className="group rounded-xl px-3.5 py-3 relative" style={{ background: "var(--bg-hover)", border: `1px solid ${complete ? "rgba(34,197,94,0.4)" : "var(--border-subtle)"}` }}>
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: complete ? "#22c55e" : "var(--text-primary)" }}>
                        {topic.name}
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold" style={{ color: complete ? "#22c55e" : "var(--text-muted)" }}>
                        {topic.done}/{topic.total}
                        {complete && <span className="ml-1">✓</span>}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => setTopics(incrementTopicDone(bookId, topic.id, -1))}
                          disabled={topic.done <= 0}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold transition-all disabled:opacity-30"
                          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                          title="Decrease covered count"
                        >
                          −
                        </button>
                        <button
                          onClick={() => setTopics(incrementTopicDone(bookId, topic.id, 1))}
                          disabled={topic.done >= topic.total}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold transition-all disabled:opacity-30"
                          style={{ background: "var(--bg-elevated)", color: complete ? "#22c55e" : "var(--accent)" }}
                          title="Covered one more question"
                        >
                          +
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === topic.id ? null : topic.id); }}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold transition-all"
                          style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}
                          title="More options"
                        >
                          ⋯
                        </button>
                      </div>
                    </div>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full" style={{ background: "var(--bg-elevated)" }}>
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${tp}%`, background: complete ? "#22c55e" : "var(--accent)" }} />
                    </div>
                    {topic.notes && (
                      <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>{topic.notes}</p>
                    )}
                    {menuFor === topic.id && (
                      <div className="absolute right-2 top-11 z-10 overflow-hidden rounded-lg shadow-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setMenuFor(null);
                            const n = window.prompt("Total questions for this topic:", String(topic.total));
                            if (n === null) return;
                            const t = parseInt(n, 10);
                            if (!Number.isFinite(t) || t < 0) return;
                            setTopics(updateTopic(bookId, topic.id, { total: t }));
                          }}
                          className="block w-full px-3 py-2 text-left text-xs transition-colors"
                          style={{ color: "var(--text-secondary)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          Edit total
                        </button>
                        <button
                          onClick={() => {
                            setMenuFor(null);
                            const n = window.prompt("Questions already covered:", String(topic.done));
                            if (n === null) return;
                            const d = parseInt(n, 10);
                            if (!Number.isFinite(d) || d < 0) return;
                            setTopics(updateTopic(bookId, topic.id, { done: d }));
                          }}
                          className="block w-full px-3 py-2 text-left text-xs transition-colors"
                          style={{ color: "var(--text-secondary)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          Set covered count
                        </button>
                        <button
                          onClick={() => {
                            setMenuFor(null);
                            if (!window.confirm(`Delete topic "${topic.name}"?`)) return;
                            setTopics(removeTopic(bookId, topic.id));
                          }}
                          className="block w-full px-3 py-2 text-left text-xs font-medium transition-colors"
                          style={{ color: "#ef4444" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          Delete topic
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new topic */}
          <div className="rounded-xl p-3.5 space-y-2.5" style={{ background: "var(--bg-hover)", border: "1px dashed var(--border-subtle)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Add a topic</p>
              {name && (
                <span className="rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                  Detected from current page
                </span>
              )}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Topic name (already filled for current page)"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
            <div className="flex gap-2">
              <input
                value={total}
                onChange={(e) => setTotal(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Total questions"
                inputMode="numeric"
                className="w-1/2 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
              <input
                value={done}
                onChange={(e) => setDone(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Already covered (0)"
                inputMode="numeric"
                className="w-1/2 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!name.trim() || !(parseInt(total, 10) > 0)}
              className="w-full rounded-lg px-3 py-2 text-sm font-semibold transition-all disabled:opacity-30"
              style={{ background: "var(--accent)", color: "#0d1117" }}
            >
              Add topic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}