"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, ReactNode } from "react";

export type Theme = "light" | "sepia" | "dark";
export type FontSize = "sm" | "base" | "lg" | "xl" | "2xl";
export type ReadingMode = "scroll" | "page";

const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: "0.9375rem",
  base: "1.0625rem",
  lg: "1.1875rem",
  xl: "1.375rem",
  "2xl": "1.5rem",
};

interface StoredSettings {
  theme: Theme;
  fontSize: FontSize;
  lineHeight: number;
  readingMode: ReadingMode;
  sidebarPinned: boolean;
}

interface ReadingSettings extends StoredSettings {
  setTheme: (t: Theme) => void;
  setFontSize: (s: FontSize) => void;
  setLineHeight: (h: number) => void;
  setReadingMode: (m: ReadingMode) => void;
  setSidebarPinned: (p: boolean) => void;
  getFontSizePx: () => string;
}

const STORAGE_KEY = "md-book-settings";
const CHANGE_EVENT = "md-book-settings-change";

const DEFAULTS: StoredSettings = {
  theme: "light",
  fontSize: "base",
  lineHeight: 1.75,
  readingMode: "scroll",
  sidebarPinned: true,
};

function parse(raw: string): StoredSettings {
  const s = JSON.parse(raw) as Partial<StoredSettings>;
  return {
    theme: s.theme === "light" || s.theme === "sepia" || s.theme === "dark" ? s.theme : DEFAULTS.theme,
    fontSize: s.fontSize && FONT_SIZE_MAP[s.fontSize] ? s.fontSize : DEFAULTS.fontSize,
    lineHeight: typeof s.lineHeight === "number" ? s.lineHeight : DEFAULTS.lineHeight,
    readingMode: s.readingMode === "scroll" || s.readingMode === "page" ? s.readingMode : DEFAULTS.readingMode,
    sidebarPinned: typeof s.sidebarPinned === "boolean" ? s.sidebarPinned : DEFAULTS.sidebarPinned,
  };
}

let cached: StoredSettings | null = null;
let cachedRaw: string | null = null;

function getSnapshot(): StoredSettings {
  if (typeof window === "undefined") return DEFAULTS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw && cached) return cached;
  cachedRaw = raw;
  try {
    cached = raw ? parse(raw) : DEFAULTS;
  } catch {
    cached = DEFAULTS;
  }
  return cached;
}

function writeSettings(patch: Partial<StoredSettings>) {
  const next = { ...getSnapshot(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  cached = next;
  cachedRaw = JSON.stringify(next);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(CHANGE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGE_EVENT, cb);
  };
}

export function ReadingProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULTS);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  const value = useMemo<ReadingSettings>(
    () => ({
      ...settings,
      setTheme: (theme) => writeSettings({ theme }),
      setFontSize: (fontSize) => writeSettings({ fontSize }),
      setLineHeight: (lineHeight) => writeSettings({ lineHeight }),
      setReadingMode: (readingMode) => writeSettings({ readingMode }),
      setSidebarPinned: (sidebarPinned) => writeSettings({ sidebarPinned }),
      getFontSizePx: () => FONT_SIZE_MAP[settings.fontSize],
    }),
    [settings]
  );

  return (
    <ReadingContext
      value={value}
    >
      {children}
    </ReadingContext>
  );
}

const ReadingContext = createContext<ReadingSettings | null>(null);

export function useReadingSettings() {
  const ctx = useContext(ReadingContext);
  if (!ctx) throw new Error("useReadingSettings must be inside ReadingProvider");
  return ctx;
}