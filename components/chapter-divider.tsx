"use client";

interface ChapterDividerProps {
  chapterName: string;
  chapterCount: number;
  totalCount: number;
  onContinue: () => void;
  loading?: boolean;
}

export default function ChapterDivider({
  chapterName,
  chapterCount,
  totalCount,
  onContinue,
  loading,
}: ChapterDividerProps) {
  return (
    <div className="chapter-divider animate-reveal my-8">
      <div
        className="mx-auto max-w-md rounded-2xl p-6 text-center"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
      >
        {/* Decorative dots */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="h-1 w-1 rounded-full" style={{ background: "var(--text-muted)" }} />
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="h-1 w-1 rounded-full" style={{ background: "var(--text-muted)" }} />
        </div>

        <p className="text-[11px] font-medium uppercase tracking-[0.15em]" style={{ color: "var(--text-muted)" }}>
          End of section
        </p>

        <h3
          className="mt-2 text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {chapterName}
        </h3>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "var(--text-tertiary)" }}>
            <span>Book progress</span>
            <span>
              {chapterCount} / {totalCount} files
            </span>
          </div>
          <div className="h-1 rounded-full" style={{ background: "var(--border-subtle)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(chapterCount / totalCount) * 100}%`,
                background: "linear-gradient(90deg, var(--accent), var(--accent-soft))",
              }}
            />
          </div>
        </div>

        {/* Continue button */}
        <div className="mt-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2"
                style={{ borderColor: "var(--border-subtle)", borderTopColor: "var(--accent)" }}
              />
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Loading next...</span>
            </div>
          ) : (
            <button
              onClick={onContinue}
              className="group inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-soft))",
                color: "#fff",
              }}
            >
              <span>Continue reading</span>
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
