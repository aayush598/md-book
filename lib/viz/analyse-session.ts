// Shares the "analyse this solution" payload between the CTA buttons (which
// navigate to /analyse) and the /analyse page (which reads it back). Stored in
// sessionStorage so large sources don't bloat the URL.
//
// The page consumes it as an external store (useSyncExternalStore): a module
// cache keeps the snapshot identity stable between renders, and an epoch bump
// on every storeAnalysePayload() ensures a later "Analyse" click is picked up
// on the next visit.

export const ANALYSE_STORAGE_KEY = "md-book:analyse-source";

/** One runnable question/solution, used for next/prev navigation + question text. */
export interface AnalyseQuestion {
  title: string;
  source: string;
  /** Markdown of the question statement, kept short. */
  question?: string;
}

export interface AnalysePayload {
  source: string;
  title?: string;
  /** Sibling questions in the same sheet, for prev/next navigation. */
  questions?: AnalyseQuestion[];
  /** Index of this payload's source inside `questions`. */
  active?: number;
}

export type AnalyseStore = { loading: true } | { loading: false; payload: AnalysePayload | null };

export function storeAnalysePayload(payload: AnalysePayload): void {
  epoch += 1;
  clientCache = null;
  try {
    sessionStorage.setItem(ANALYSE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* storage unavailable */
  }
}

let epoch = 0;
let clientCache: { epoch: number; store: AnalyseStore } | null = null;
const loadingStore: AnalyseStore = { loading: true };

export function analyseExternalStore(): AnalyseStore {
  if (typeof window === "undefined") return loadingStore;
  if (clientCache && clientCache.epoch === epoch) return clientCache.store;
  const store: AnalyseStore = { loading: false, payload: loadAnalysePayload() };
  clientCache = { epoch, store };
  return store;
}

export function analyseServerStore(): AnalyseStore {
  return loadingStore;
}

function loadAnalysePayload(): AnalysePayload | null {
  try {
    const raw = sessionStorage.getItem(ANALYSE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AnalysePayload>;
    if (typeof parsed.source !== "string" || parsed.source.length === 0) return null;
    return {
      source: parsed.source,
      title: typeof parsed.title === "string" ? parsed.title : undefined,
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.filter(
            (q): q is AnalyseQuestion =>
              !!q && typeof q.source === "string" && typeof q.title === "string"
          )
        : undefined,
      active: typeof parsed.active === "number" ? parsed.active : undefined,
    };
  } catch {
    return null;
  }
}