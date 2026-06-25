"use client";

import { useReadingSettings, type Theme, type FontSize } from "@/lib/reading-settings";

const themes: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "sepia", label: "Sepia", icon: "📜" },
  { value: "dark", label: "Dark", icon: "🌙" },
];

const fonts: { value: FontSize; label: string }[] = [
  { value: "sm", label: "A" },
  { value: "base", label: "A" },
  { value: "lg", label: "A" },
  { value: "xl", label: "A" },
  { value: "2xl", label: "A" },
];

export default function ReadingControls() {
  const {
    theme, setTheme, fontSize, setFontSize,
    lineHeight, setLineHeight, readingMode, setReadingMode,
  } = useReadingSettings();

  const fontSizeIndex = fonts.findIndex((f) => f.value === fontSize);

  return (
    <div className="flex items-center gap-3">
      {/* Theme */}
      <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5 shadow-sm">
        {themes.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-all ${
              theme === t.value
                ? "bg-[var(--accent)] text-white shadow-sm scale-105"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            }`}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-[var(--border-subtle)]" />

      {/* Font size */}
      <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 shadow-sm">
        <button
          onClick={() => {
            const idx = fontSizeIndex - 1;
            if (idx >= 0) setFontSize(fonts[idx].value);
          }}
          disabled={fontSizeIndex === 0}
          className="flex h-6 w-6 items-center justify-center rounded text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          −
        </button>
        <div className="flex items-center gap-2 px-1">
          {fonts.map((f, i) => (
            <button
              key={f.value}
              onClick={() => setFontSize(f.value)}
              className={`leading-none transition-all ${
                fontSize === f.value
                  ? "text-[var(--accent)] font-bold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-tertiary)]"
              }`}
              style={{ fontSize: i === 0 ? "11px" : i === 1 ? "13px" : i === 2 ? "15px" : i === 3 ? "17px" : "19px" }}
            >
              A
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            const idx = fontSizeIndex + 1;
            if (idx < fonts.length) setFontSize(fonts[idx].value);
          }}
          disabled={fontSizeIndex === fonts.length - 1}
          className="flex h-6 w-6 items-center justify-center rounded text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          +
        </button>
      </div>

      <div className="h-5 w-px bg-[var(--border-subtle)]" />

      {/* Line height */}
      <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 shadow-sm">
        <button
          onClick={() => setLineHeight(Math.max(1.3, lineHeight - 0.15))}
          disabled={lineHeight <= 1.3}
          className="flex h-6 w-6 items-center justify-center rounded text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] min-w-[28px] justify-center font-medium">
          {lineHeight.toFixed(2)}
        </div>
        <button
          onClick={() => setLineHeight(Math.min(2.5, lineHeight + 0.15))}
          disabled={lineHeight >= 2.5}
          className="flex h-6 w-6 items-center justify-center rounded text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 8.25l7.5 7.5 7.5-7.5" />
          </svg>
        </button>
      </div>

      <div className="h-5 w-px bg-[var(--border-subtle)]" />

      {/* Reading mode */}
      <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5 shadow-sm">
        <button
          onClick={() => setReadingMode("scroll")}
          className={`flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-all ${
            readingMode === "scroll"
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25" />
          </svg>
          Scroll
        </button>
        <button
          onClick={() => setReadingMode("page")}
          className={`flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-all ${
            readingMode === "page"
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Page
        </button>
      </div>
    </div>
  );
}
