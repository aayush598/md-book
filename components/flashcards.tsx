"use client";

import { Component, useState, useMemo, useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { parseFlashcardsFromFiles } from "@/lib/flashcards";
import { useFlashcardStore } from "@/lib/stores/flashcard-store";
import { playFlipSound, playNextSound, playPrevSound, isSoundMuted, toggleSound, subscribeToSoundMuted } from "@/lib/sounds";
import { fetchFileContent, type BookConfig } from "@/lib/github";
import ChatPanel from "@/components/chat-panel";
import TTSControls from "@/components/tts-controls";
import { useTTS } from "@/lib/use-tts";
import toast from "react-hot-toast";

class FlashcardErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Flashcard error</p>
            <p className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>{this.state.error.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface FlashcardsProps {
  files: { path: string; content: string }[];
  currentPath: string | null;
  bookName?: string;
  onClose: () => void;
  bookId?: string;
  initialView?: "cards" | "dashboard";
  config?: BookConfig;
  allFilePaths?: string[];
}

type StudyMode = "sequential" | "random";

interface DayData {
  date: string;
  count: number;
}

function FlashcardsInner({ files, currentPath, bookName, onClose, bookId, initialView = "cards", config, allFilePaths }: FlashcardsProps) {
  const store = useFlashcardStore();
  const soundMuted = useSyncExternalStore(subscribeToSoundMuted, isSoundMuted);
  const [mode, setMode] = useState<StudyMode>("random");
  const [flipped, setFlipped] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [showDashboard, setShowDashboard] = useState(initialView === "dashboard");
  const [stats, setStats] = useState({ totalPoints: 0, longestStreak: 0, currentStreak: 0, totalCardsReviewed: 0 });
  const [contributions, setContributions] = useState<DayData[]>([]);
  const autoFlipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const tts = useTTS();
  const [swiping, setSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const [allFileContents, setAllFileContents] = useState<{ path: string; content: string }[] | null>(null);
  const [allLoading, setAllLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const allFileCache = useRef<{ path: string; content: string }[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scopeRef = useRef(store.scope);
  scopeRef.current = store.scope;

  // Fetch content for all files when scope is "all"
  useEffect(() => {
    if (store.scope !== "all") return;
    if (!config || !allFilePaths || allFilePaths.length === 0) return;

    // Use cached content across scope toggles
    if (allFileCache.current) {
      setAllFileContents(allFileCache.current);
      return;
    }

    const loadedPaths = new Set(files.map((f) => f.path));
    const missing = allFilePaths.filter((p) => !loadedPaths.has(p));
    if (missing.length === 0) {
      allFileCache.current = files;
      setAllFileContents(files);
      return;
    }

    // Abort any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAllLoading(true);
    setFetchError(null);

    const CONCURRENCY = 5;
    const total = missing.length;
    const allFetched: { path: string; content: string }[] = [];
    let cursor = 0;

    async function fetchBatch(): Promise<void> {
      while (cursor < total && !controller.signal.aborted) {
        const batch = missing.slice(cursor, cursor + CONCURRENCY);
        cursor += CONCURRENCY;
        const results = await Promise.all(
          batch.map((p) => fetchFileContent(config!, p).then((c) => ({ path: p, content: c })))
        );
        if (controller.signal.aborted) return;
        allFetched.push(...results);
        // Progressive update — show cards as batches arrive
        const combined = [...files, ...allFetched];
        setAllFileContents(combined);
      }
    }

    fetchBatch()
      .then(() => {
        if (controller.signal.aborted) return;
        const combined = [...files, ...allFetched];
        allFileCache.current = combined;
        setAllFileContents(combined);
        setAllLoading(false);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setFetchError((e as Error).message);
        setAllLoading(false);
      });
  }, [store.scope, config, allFilePaths, files]);

  const parsedSource = store.scope === "all" ? allFileContents || files : files;

  const allCards = useMemo(
    () => parseFlashcardsFromFiles(parsedSource, store.scope, currentPath || undefined),
    [parsedSource, store.scope, currentPath]
  );

  const availableCards = useMemo(() => {
    if (store.allowRepeat) return allCards;
    return allCards.filter((c) => !reviewedIds.has(c.id));
  }, [allCards, store.allowRepeat, reviewedIds]);

  const [shuffledSeed, setShuffledSeed] = useState(() => Math.floor(Math.random() * 233280));
  const orderedCards = useMemo(() => {
    if (mode === "random") {
      const arr = [...availableCards];
      let seed = shuffledSeed;
      for (let i = arr.length - 1; i > 0; i--) {
        seed = (seed * 9301 + 49297) % 233280;
        const j = Math.floor((seed / 233280) * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    return availableCards;
  }, [availableCards, mode, shuffledSeed]);

  const current = orderedCards[currentIdx] || null;
  const totalCards = orderedCards.length;
  const progress = totalCards > 0 ? ((currentIdx + 1) / totalCards) * 100 : 0;

  const fetchStats = useCallback(async () => {
    const { getFlashcardStats, getDailyActivity } = await import("@/lib/flashcard-storage");
    setStats(getFlashcardStats());
    setContributions(getDailyActivity(91).map((d) => ({ date: d.date, count: d.cardsReviewed })));
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    setCurrentIdx(0);
    setFlipped(false);
  }, [mode, store.allowRepeat]);

  const recordReview = useCallback(async (count: number) => {
    const { recordFlashcardReview } = await import("@/lib/flashcard-storage");
    recordFlashcardReview(count);
  }, []);

  const handleNext = useCallback(() => {
    playNextSound();
    if (current && !reviewedIds.has(current.id)) {
      setReviewedIds((prev) => { const n = new Set(prev); n.add(current.id); return n; });
      store.incrementSession();
      recordReview(1);
      fetchStats();
    }
    if (currentIdx < totalCards - 1) {
      setCurrentIdx((p) => p + 1);
      setFlipped(false);
      setChatOpen(false);
    }
  }, [current, currentIdx, totalCards, reviewedIds, recordReview, fetchStats, store]);

  const handlePrev = useCallback(() => {
    playPrevSound();
    if (currentIdx > 0) { setCurrentIdx((p) => p - 1); setFlipped(false); setChatOpen(false); }
  }, [currentIdx]);

  const handleFlip = useCallback(() => {
    playFlipSound();
    setFlipped((p) => !p);
  }, []);

  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;

  useEffect(() => {
    if (store.autoFlip && flipped) {
      autoFlipTimer.current = setTimeout(() => handleNextRef.current(), 3000);
      return () => { if (autoFlipTimer.current) clearTimeout(autoFlipTimer.current); };
    }
  }, [store.autoFlip, flipped]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); handleFlip(); }
    else if (e.key === "ArrowRight" || e.key === "n") handleNext();
    else if (e.key === "ArrowLeft" || e.key === "p") handlePrev();
    else if (e.key === "d") setShowDashboard((p) => !p);
  }, [handleFlip, handleNext, handlePrev]);

  const SWIPE_THRESHOLD = 60;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setSwiping(true);
    setSwipeOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeStart.current) return;
    const dx = e.touches[0].clientX - swipeStart.current.x;
    setSwipeOffset(dx);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeStart.current) return;
    const dx = e.changedTouches[0].clientX - swipeStart.current.x;
    const dy = e.changedTouches[0].clientY - swipeStart.current.y;
    setSwiping(false);
    setSwipeOffset(0);
    swipeStart.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) handlePrev();
      else handleNext();
    }
  }, [handleNext, handlePrev]);

  const reshuffle = useCallback(() => {
    setShuffledSeed(Math.floor(Math.random() * 100000));
    toast.success("Cards reshuffled");
  }, []);

  const maxCount = Math.max(...contributions.map((c) => c.count), 1);

  // GitHub-style contribution calendar
  function ContributionCalendar({ data }: { data: DayData[] }) {
    const weeks: DayData[][] = [];
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < sorted.length; i += 7) {
      weeks.push(sorted.slice(i, i + 7));
    }
    const levels = ["bg-[var(--bg-hover)]", "opacity-25", "opacity-50", "opacity-75", "opacity-100"];

    return (
      <div className="flex gap-[2px] overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[2px]">
            {Array.from({ length: 7 }, (_, di) => {
              const day = week[di];
              if (!day) return <div key={di} className="h-3 w-3 rounded-sm" style={{ background: "var(--bg-hover)" }} />;
              const level = day.count === 0 ? 0 : Math.min(Math.ceil((day.count / maxCount) * 4), 4);
              return (
                <div key={day.date} className="group relative">
                  <div
                    className={`h-3 w-3 rounded-sm transition-all ${levels[level]}`}
                    style={{ background: day.count > 0 ? "var(--accent)" : "var(--bg-hover)" }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 rounded-lg px-2 py-1 text-[10px] whitespace-nowrap shadow-lg"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                    {day.count} cards on {day.date}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  if (showDashboard) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Flashcard Dashboard</h2>
          <button onClick={() => setShowDashboard(false)}
            className="text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
            style={{ color: "var(--accent)", background: "var(--accent-bg)" }}>
            Back to cards
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Top stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Points", value: stats.totalPoints.toLocaleString(), accent: false },
              { label: "Cards Reviewed", value: stats.totalCardsReviewed.toLocaleString(), accent: false },
              { label: "Current Streak", value: `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`, accent: true },
              { label: "Best Streak", value: `${stats.longestStreak} day${stats.longestStreak !== 1 ? "s" : ""}`, accent: false },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="mt-1.5 text-2xl font-bold" style={{ color: s.accent ? "var(--accent)" : "var(--text-primary)" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* GitHub-style contribution graph */}
          <div className="rounded-2xl p-6" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Contribution Activity</h3>
              <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((l) => (
                  <div key={l} className="h-3 w-3 rounded-sm" style={{ background: l === 0 ? "var(--bg-hover)" : `var(--accent)` }} />
                ))}
                <span>More</span>
              </div>
            </div>
            <ContributionCalendar data={contributions} />
            <div className="flex justify-between mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <span>~3 months ago</span>
              <span>today</span>
            </div>
          </div>

          {/* Session summary */}
          {store.sessionCards > 0 && (
            <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: "var(--accent-bg)", border: "1px solid var(--border-subtle)" }}>
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>This session</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{store.sessionCards} cards reviewed</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>+{store.sessionCards * 10}</p>
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>points earned</p>
              </div>
            </div>
          )}

          {/* Streak info */}
          {stats.currentStreak > 0 && (
            <div className="rounded-2xl p-5 text-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {stats.currentStreak >= 7 ? "🔥 On fire!" : stats.currentStreak >= 3 ? "💪 Getting consistent" : "🌱 Building a habit"}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                {stats.currentStreak}-day streak &middot; study daily to maintain it
              </p>
            </div>
          )}

          {/* Progress to next milestone */}
          {stats.totalPoints > 0 && (
            <div className="rounded-2xl p-5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-[11px] font-medium uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Progress</p>
              <div className="space-y-3">
                {[
              { label: "Next Level", current: stats.totalPoints, target: Math.max(100, Math.ceil((stats.totalPoints + 1) / 100) * 100) },
                    { label: "Cards Today", current: store.sessionCards, target: 10 },
                ].map((p) => {
                  const pct = Math.min(100, (p.current / p.target) * 100);
                  return (
                    <div key={p.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: "var(--text-tertiary)" }}>{p.label}</span>
                        <span style={{ color: "var(--text-muted)" }}>{p.current} / {p.target}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                        <div className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-soft))" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="flex flex-col flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors" style={{ color: "var(--text-tertiary)" }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Flashcards</span>
            {bookName && <span className="ml-2 text-xs" style={{ color: "var(--text-tertiary)" }}>{bookName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDashboard(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ color: "var(--accent)", background: "var(--accent-bg)" }}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Dashboard
          </button>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <span className="font-medium" style={{ color: "var(--text-secondary)" }}>+{store.sessionCards * 10}</span> pts
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 overflow-x-auto" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-sidebar)" }}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Scope</span>
          {(["current", "all"] as const).map((s) => (
            <button key={s} onClick={() => { store.setScope(s); }}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${store.scope === s ? "shadow-sm" : ""}`}
              style={{ background: store.scope === s ? "var(--accent-bg)" : "var(--bg-hover)", color: store.scope === s ? "var(--accent)" : "var(--text-tertiary)" }}>
              {s === "current" ? "Current file" : "All files"}
            </button>
          ))}
          {allLoading && <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{allFileContents ? allFileContents.length : 0}/{allFilePaths?.length || 0} files...</span>}
          {fetchError && <span className="text-[11px]" style={{ color: "#ef4444" }}>{fetchError}</span>}
        </div>
        <div className="w-px h-5" style={{ background: "var(--border-subtle)" }} />
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Order</span>
          {(["sequential", "random"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); toast.success(`${m} mode`); }}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${mode === m ? "shadow-sm" : ""}`}
              style={{ background: mode === m ? "var(--accent-bg)" : "var(--bg-hover)", color: mode === m ? "var(--accent)" : "var(--text-tertiary)" }}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div className="w-px h-5" style={{ background: "var(--border-subtle)" }} />
        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
          <input type="checkbox" checked={store.allowRepeat} onChange={(e) => store.setAllowRepeat(e.target.checked)} className="rounded" />
          Repeat
        </label>
        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
          <input type="checkbox" checked={store.autoFlip} onChange={(e) => store.setAutoFlip(e.target.checked)} className="rounded" />
          Auto-flip
        </label>
        {mode === "random" && (
          <button onClick={reshuffle} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all"
            style={{ color: "var(--text-tertiary)", background: "var(--bg-hover)" }} title="Reshuffle cards">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Reshuffle
          </button>
        )}
        <button onClick={toggleSound} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all"
          style={{ color: soundMuted ? "var(--text-muted)" : "var(--accent)", background: "var(--bg-hover)" }}
          title={soundMuted ? "Unmute sounds" : "Mute sounds"}>
          {soundMuted ? (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
          <span>{soundMuted ? "Muted" : "Sound"}</span>
        </button>
        <TTSControls
          enabled={tts.enabled}
          speaking={tts.speaking}
          paused={tts.paused}
          speed={tts.speed}
          voices={tts.voices}
          selectedVoice={tts.selectedVoice}
          onToggle={tts.toggleEnabled}
          onSetSpeed={tts.setSpeed}
          onSetVoice={tts.setSelectedVoice}
          onStop={tts.stop}
          onPause={tts.pause}
          onResume={tts.resume}
        />
      </div>

      {/* Main content area */}
      {totalCards === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--accent-bg)" }}>
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--accent)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No flashcards found</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>No Q&A content found{store.scope === "current" ? " in this file. Try switching scope to \"All files\"." : "."}</p>
          </div>
        </div>
      ) : current ? (
        <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-6 py-4 sm:py-8">
          <div className="w-full max-w-lg mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>{currentIdx + 1} / {totalCards}</span>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{totalCards - currentIdx - 1} remaining</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-soft))" }} />
            </div>
          </div>

          <div className="w-full max-w-lg perspective cursor-pointer select-none" onClick={handleFlip}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}>
            <div className={`relative w-full min-h-[280px] transition-transform duration-500 preserve-3d ${flipped ? "rotate-y-180" : ""}`}
              style={{
                transformStyle: "preserve-3d",
                ...(swiping ? { transition: "none", transform: `translateX(${swipeOffset}px) rotateY(${flipped ? 180 : 0}deg)` } : {}),
              }}>
              {swiping && (
                <div className="absolute inset-y-0 flex items-center z-10 pointer-events-none"
                  style={{ [swipeOffset > 0 ? "left" : "right"]: 12, opacity: Math.min(1, Math.abs(swipeOffset) / SWIPE_THRESHOLD) }}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--text-muted)" }}>
                    {swipeOffset > 0
                      ? <><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></>
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></>
                    }
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 backface-hidden rounded-2xl p-4 sm:p-8 flex flex-col shadow-sm border"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", backfaceVisibility: "hidden" }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                    style={{ background: current.difficulty === "hard" ? "rgba(239,68,68,0.1)" : current.difficulty === "medium" ? "rgba(234,179,8,0.1)" : "rgba(34,197,94,0.1)", color: current.difficulty === "hard" ? "#ef4444" : current.difficulty === "medium" ? "#eab308" : "#22c55e" }}>
                    {current.difficulty}
                  </span>
                  {current.source && <span className="text-[10px] truncate max-w-[120px]" style={{ color: "var(--text-muted)" }} title={current.source}>{current.source}</span>}
                  <button onClick={(e) => { e.stopPropagation(); setChatOpen(true); }}
                    className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:opacity-70" style={{ color: chatOpen ? "var(--accent)" : "var(--text-muted)" }} title="Ask AI">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); tts.speak(current.question); }}
                    className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:opacity-70" style={{ color: tts.speaking ? "var(--accent)" : "var(--text-muted)" }} title="Read aloud">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`Q: ${current.question}\nA: ${current.answer}`); toast.success("Copied"); }}
                    className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:opacity-70" style={{ color: "var(--text-muted)" }} title="Copy Q&A">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-lg font-medium leading-relaxed text-center" style={{ color: "var(--text-primary)" }}>{current.question}</p>
                </div>
              </div>
              <div className="absolute inset-0 backface-hidden rounded-2xl p-4 sm:p-8 flex flex-col shadow-sm border rotate-y-180"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", backfaceVisibility: "hidden" }}>
                <div className="flex items-center gap-2 mb-4">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--accent)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                  <span className="text-[10px] font-medium" style={{ color: "var(--accent)" }}>Answer</span>
                  <button onClick={(e) => { e.stopPropagation(); tts.speak(current.answer); }}
                    className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:opacity-70" style={{ color: tts.speaking ? "var(--accent)" : "var(--text-muted)" }} title="Read aloud">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`Q: ${current.question}\nA: ${current.answer}`); toast.success("Copied"); }}
                    className="ml-auto flex h-5 w-5 items-center justify-center rounded transition-colors hover:opacity-70" style={{ color: "var(--text-muted)" }} title="Copy Q&A">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{current.answer}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 mt-6 sm:mt-8 flex-wrap justify-center">
            <button onClick={handlePrev} disabled={currentIdx === 0}
              className="flex items-center gap-1.5 rounded-xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button onClick={handleFlip} className="flex items-center gap-1.5 rounded-xl px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-medium transition-all shadow-sm"
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              {flipped ? "Hide" : "Show"}
            </button>
            <button onClick={handleNext}
              className="flex items-center gap-1.5 rounded-xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-all"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-soft))", color: "white" }}>
              <span className="hidden sm:inline">Next</span>
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
            <span><kbd className="rounded border px-1 py-0.5 font-mono" style={{ borderColor: "var(--border-default)", background: "var(--bg-hover)" }}>Space</kbd> flip</span>
            <span><kbd className="rounded border px-1 py-0.5 font-mono" style={{ borderColor: "var(--border-default)", background: "var(--bg-hover)" }}>←</kbd> <kbd className="rounded border px-1 py-0.5 font-mono" style={{ borderColor: "var(--border-default)", background: "var(--bg-hover)" }}>→</kbd> navigate</span>
            <span><kbd className="rounded border px-1 py-0.5 font-mono" style={{ borderColor: "var(--border-default)", background: "var(--bg-hover)" }}>D</kbd> dashboard</span>
            <span>Swipe ← →</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--accent-bg)" }}>
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--accent)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>All done!</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>You&apos;ve reviewed all available flashcards.</p>
            {!store.allowRepeat && (
              <button onClick={() => store.setAllowRepeat(true)}
                className="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                Enable repeat to go again
              </button>
            )}
          </div>
        </div>
      )}
      </div>
      {chatOpen && current && (
        <>
          {/* Mobile overlay backdrop */}
          <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" onClick={() => setChatOpen(false)} />
          <div className="w-full sm:w-80 flex-shrink-0 flex flex-row fixed sm:relative bottom-0 right-0 z-50 sm:z-auto max-h-[70vh] sm:max-h-none rounded-t-2xl sm:rounded-none shadow-2xl sm:shadow-none"
            style={{ background: "var(--bg-page)", borderLeft: "1px solid var(--border-subtle)" }}>
            <button
              onClick={() => setChatOpen(false)}
              className="flex items-center justify-center w-6 self-stretch cursor-pointer transition-colors"
              style={{ background: "var(--bg-page)", color: "var(--text-tertiary)" }}
              title="Close sidebar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <ChatPanel question={current.question} answer={current.answer} source={current.source} bookName={bookName} onClose={() => setChatOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}

export default function Flashcards(props: FlashcardsProps) {
  return (
    <FlashcardErrorBoundary>
      <FlashcardsInner {...props} />
    </FlashcardErrorBoundary>
  );
}
