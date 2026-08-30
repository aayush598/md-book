"use client";

import {
  QUESTION_STATUS_LABEL,
  QUESTION_STATUS_ORDER,
  type QuestionStatus,
} from "@/lib/question-status";

// Status → accent colour. The same icon set reads as a natural progress
// journey: an open circle (pending) → half-filled circle (attempted) → a
// filled checkmark (completed).
const STATUS_UI: Record<QuestionStatus, { fg: string; bg: string }> = {
  pending: { fg: "#8b949e", bg: "rgba(139,148,158,0.14)" },
  attempted: { fg: "#f59e0b", bg: "rgba(245,158,11,0.16)" },
  completed: { fg: "#22c55e", bg: "rgba(34,197,94,0.16)" },
};

function StatusIcon({ status }: { status: QuestionStatus }) {
  if (status === "completed") {
    return (
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    );
  }
  if (status === "attempted") {
    return (
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 1 0 0 18z" fill="currentColor" stroke="none" opacity={0.9} />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function StatusControl({
  value,
  onChange,
}: {
  value: QuestionStatus;
  onChange: (s: QuestionStatus) => void;
}) {
  return (
    <div
      className="flex shrink-0 select-none items-center gap-0.5 rounded-full p-0.5"
      style={{ background: "var(--bg-hover)", border: "1px solid var(--border-subtle)" }}
      title="Question progress: Pending · Attempted · Completed"
    >
      {QUESTION_STATUS_ORDER.map((s) => {
        const ui = STATUS_UI[s];
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={active}
            title={`${QUESTION_STATUS_LABEL[s]}${active ? " (current)" : ""}`}
            className="flex h-6 items-center gap-1.5 rounded-full px-2 text-[11px] font-medium transition-all"
            style={
              active
                ? { background: ui.bg, color: ui.fg, boxShadow: `inset 0 0 0 1px ${ui.fg}38` }
                : { background: "transparent", color: "var(--text-tertiary)" }
            }
          >
            <StatusIcon status={s} />
            <span className="hidden sm:inline">{QUESTION_STATUS_LABEL[s]}</span>
          </button>
        );
      })}
    </div>
  );
}