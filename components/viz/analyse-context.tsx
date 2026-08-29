"use client";

import { createContext, useContext } from "react";
import type { AnalyseQuestion } from "@/lib/viz/analyse-session";

export interface AnalyseMeta {
  questions: AnalyseQuestion[];
  active: number;
}

export type AnalyseLookup = (code: string) => AnalyseMeta | null;

export const AnalyseCtx = createContext<AnalyseLookup | null>(null);

export function useAnalyseMeta(): AnalyseLookup | null {
  return useContext(AnalyseCtx);
}