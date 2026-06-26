"use client";

import toast from "react-hot-toast";
import AnswerRenderer from "@/components/answer-renderer";

interface ChatPanelProps {
  question: string;
  answer: string;
  source?: string;
  bookName?: string;
  onClose: () => void;
}

export default function ChatPanel({ question, answer, source, bookName, onClose }: ChatPanelProps) {
  const topic = source
    ?.replace(/^book\//, "")
    ?.split("/")
    ?.slice(0, -1)
    ?.join(" › ") || "";
  const prompt =
`I'm studying a flashcard and want a deeper explanation.

📖 Book: ${bookName || "Unknown"}
${topic ? `📂 Topic: ${topic}` : ""}
${source ? `📄 Source: ${source}` : ""}

Question: ${question}
Answer: ${answer}

---

Please explain this concept in simple terms with:
1. A plain-language breakdown of the answer
2. A real-world analogy or example
3. One follow-up question to test my understanding`;

  function handleCopy() {
    navigator.clipboard.writeText(prompt).then(() => {
      toast.success("Copied!");
    });
  }

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "var(--bg-page)", borderLeft: "1px solid var(--border-subtle)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--accent)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Share</span>
        </div>
        <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:opacity-70" style={{ color: "var(--text-tertiary)" }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="rounded-xl px-3.5 py-3 text-xs leading-relaxed" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
          <p className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>Question:</p>
          <p>{question}</p>
        </div>

        <div className="rounded-xl px-3.5 py-3 text-xs leading-relaxed" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
          <p className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>Answer:</p>
          <div className="text-xs leading-relaxed"><AnswerRenderer text={answer} /></div>
        </div>

        <div className="rounded-xl px-3.5 py-3 text-xs" style={{ background: "var(--accent-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
          <p className="font-medium mb-1" style={{ color: "var(--accent)" }}>Formatted prompt</p>
          <p className="whitespace-pre-wrap break-words font-mono text-[11px]">{prompt}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <button onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-soft))", color: "white" }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Copy to clipboard
        </button>
      </div>
    </div>
  );
}
