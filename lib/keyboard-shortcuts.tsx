"use client";

import { useEffect, useRef, useState } from "react";

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
  description: string;
  category?: string;
}

export function useKeyboard(shortcuts: Shortcut[], enabled: boolean = true) {
  const cache = useRef<Shortcut[]>(shortcuts);
  cache.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const s of cache.current) {
        const matchKey = e.key.toLowerCase() === s.key.toLowerCase();
        const matchCtrl = !!s.ctrl === (e.ctrlKey || e.metaKey);
        const matchShift = !!s.shift === e.shiftKey;
        const matchAlt = !!s.alt === e.altKey;
        if (matchKey && matchCtrl && matchShift && matchAlt) {
          e.preventDefault();
          e.stopPropagation();
          s.handler(e);
          break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}

export function ShortcutHelp({
  shortcuts,
  onClose,
}: {
  shortcuts: Shortcut[];
  onClose: () => void;
}) {
  const categories = [...new Set(shortcuts.map((s) => s.category || "Other"))];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-lg rounded-2xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto"
        style={{ background: "var(--bg-content)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {categories.map((cat) => (
          <div key={cat} className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              {cat}
            </h3>
            <div className="space-y-1.5">
              {shortcuts
                .filter((s) => (s.category || "Other") === cat)
                .map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-secondary)" }}>{s.description}</span>
                    <kbd
                      className="px-2 py-0.5 rounded text-xs font-mono"
                      style={{
                        background: "var(--bg-hover)",
                        color: "var(--accent)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {[
                        s.ctrl ? "Ctrl" : "",
                        s.shift ? "Shift" : "",
                        s.alt ? "Alt" : "",
                        s.key.length === 1 ? s.key.toUpperCase() : s.key,
                      ]
                        .filter(Boolean)
                        .join("+")}
                    </kbd>
                  </div>
                ))}
            </div>
          </div>
        ))}

        <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
          Press <kbd className="px-1 rounded" style={{ background: "var(--bg-hover)" }}>?</kbd> to toggle this panel
        </p>
      </div>
    </div>
  );
}
