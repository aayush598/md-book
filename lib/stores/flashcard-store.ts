import { create } from "zustand";
import type { Flashcard } from "@/lib/flashcards";

interface FlashcardState {
  cards: Flashcard[];
  currentIndex: number;
  flipped: boolean;
  mode: "sequential" | "random";
  scope: "current" | "all";
  allowRepeat: boolean;
  autoFlip: boolean;
  sessionCards: number;
  setCards: (cards: Flashcard[]) => void;
  setCurrentIndex: (i: number) => void;
  setFlipped: (f: boolean) => void;
  setMode: (m: "sequential" | "random") => void;
  setScope: (s: "current" | "all") => void;
  setAllowRepeat: (r: boolean) => void;
  setAutoFlip: (a: boolean) => void;
  incrementSession: () => void;
  resetSession: () => void;
}

export const useFlashcardStore = create<FlashcardState>((set) => ({
  cards: [],
  currentIndex: 0,
  flipped: false,
  mode: "random",
  scope: "current",
  allowRepeat: true,
  autoFlip: false,
  sessionCards: 0,
  setCards: (cards) => set({ cards, currentIndex: 0, flipped: false }),
  setCurrentIndex: (currentIndex) => set({ currentIndex, flipped: false }),
  setFlipped: (flipped) => set({ flipped }),
  setMode: (mode) => set({ mode, currentIndex: 0, flipped: false }),
  setScope: (scope) => set({ scope, currentIndex: 0, flipped: false }),
  setAllowRepeat: (allowRepeat) => set({ allowRepeat, currentIndex: 0, flipped: false }),
  setAutoFlip: (autoFlip) => set({ autoFlip }),
  incrementSession: () => set((s) => ({ sessionCards: s.sessionCards + 1 })),
  resetSession: () => set({ sessionCards: 0 }),
}));
