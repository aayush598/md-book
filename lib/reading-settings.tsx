"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

interface ReadingSettings {
  theme: Theme;
  fontSize: FontSize;
  lineHeight: number;
  readingMode: ReadingMode;
  sidebarPinned: boolean;
  setTheme: (t: Theme) => void;
  setFontSize: (s: FontSize) => void;
  setLineHeight: (h: number) => void;
  setReadingMode: (m: ReadingMode) => void;
  setSidebarPinned: (p: boolean) => void;
  getFontSizePx: () => string;
}

const ReadingContext = createContext<ReadingSettings | null>(null);

export function ReadingProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [fontSize, setFontSize] = useState<FontSize>("base");
  const [lineHeight, setLineHeight] = useState(1.75);
  const [readingMode, setReadingMode] = useState<ReadingMode>("scroll");
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("md-book-settings");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.theme) setTheme(s.theme);
        if (s.fontSize) setFontSize(s.fontSize);
        if (s.lineHeight) setLineHeight(s.lineHeight);
        if (s.readingMode) setReadingMode(s.readingMode);
        if (s.sidebarPinned !== undefined) setSidebarPinned(s.sidebarPinned);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(
      "md-book-settings",
      JSON.stringify({ theme, fontSize, lineHeight, readingMode, sidebarPinned })
    );
  }, [theme, fontSize, lineHeight, readingMode, sidebarPinned, mounted]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const getFontSizePx = () => FONT_SIZE_MAP[fontSize];

  return (
    <ReadingContext
      value={{
        theme, fontSize, lineHeight, readingMode, sidebarPinned,
        setTheme, setFontSize, setLineHeight, setReadingMode, setSidebarPinned,
        getFontSizePx,
      }}
    >
      {children}
    </ReadingContext>
  );
}

export function useReadingSettings() {
  const ctx = useContext(ReadingContext);
  if (!ctx) throw new Error("useReadingSettings must be inside ReadingProvider");
  return ctx;
}
