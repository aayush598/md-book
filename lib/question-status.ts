// Per-question progress tracking for problem sheets ("Coding questions"
// browser). Statuses are keyed by sheet path + question number and persisted
// in localStorage so a user's progress survives reloads and visits.

export type QuestionStatus = "pending" | "attempted" | "completed";

export const QUESTION_STATUS_ORDER: QuestionStatus[] = ["pending", "attempted", "completed"];

export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  pending: "Pending",
  attempted: "Attempted",
  completed: "Completed",
};

const STORAGE_KEY = "md-book:question-status";

/** Stable identity of one question inside a sheet. */
export function questionKey(path: string, number: string): string {
  return `${path}#${number}`;
}

export function readQuestionStatuses(): Record<string, QuestionStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, QuestionStatus> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === "pending" || v === "attempted" || v === "completed") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeQuestionStatuses(statuses: Record<string, QuestionStatus>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  } catch {
    /* storage unavailable — ignore */
  }
}

export interface QuestionProgress {
  total: number;
  completed: number;
  attempted: number;
  pending: number;
  /** 0–100, fraction of questions marked completed. */
  pct: number;
}

/** Aggregate progress across the sibling questions of one sheet. */
export function progressFor(
  statuses: Record<string, QuestionStatus>,
  questions: readonly { number?: string; title: string }[],
  path?: string
): QuestionProgress | null {
  if (!path || questions.length === 0) return null;
  let completed = 0;
  let attempted = 0;
  for (const q of questions) {
    const s = statuses[questionKey(path, q.number ?? q.title)] ?? "pending";
    if (s === "completed") completed += 1;
    else if (s === "attempted") attempted += 1;
  }
  const total = questions.length;
  return {
    total,
    completed,
    attempted,
    pending: total - completed - attempted,
    pct: Math.round((completed / total) * 100),
  };
}