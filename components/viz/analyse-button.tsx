"use client";

import { useRouter } from "next/navigation";
import { storeAnalysePayload } from "@/lib/viz/analyse-session";
import { useAnalyseMeta } from "./analyse-context";

const ACCENT = "#58a6ff";

export default function AnalyseButton({ source, title }: { source: string; title?: string }) {
  const router = useRouter();
  const lookup = useAnalyseMeta();

  return (
    <div className="mt-2 rounded-xl" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
      <button
        type="button"
        onClick={() => {
          const meta = lookup ? lookup(source) : null;
          const q = meta ? meta.questions[meta.active] : undefined;
          storeAnalysePayload({
            source,
            title: q?.title || title,
            path: meta?.path,
            questions: meta?.questions,
            active: meta?.active,
          });
          const sp = new URLSearchParams();
          sp.set("src", source);
          sp.set("title", q?.title || title || "");
          router.push(`/analyse?${sp.toString()}`);
        }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-95"
      >
        <span className="viz-chip shrink-0" style={{ background: "rgba(88,166,255,0.15)", color: ACCENT, border: "1px solid rgba(88,166,255,0.35)" }}>
          <svg className="h-3.5 w-3.5 inline mr-1 -mt-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Analyse this solution
        </span>
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          watch it run step by step in a full-page visualizer — it executes live in your browser, nothing is uploaded. You can jump to other questions and share a direct link to this one.
        </span>
      </button>
    </div>
  );
}