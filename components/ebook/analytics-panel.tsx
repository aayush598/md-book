"use client";

import { useMemo } from "react";
import type { EbookProject } from "@/lib/ebook-storage";
import { computeAnalytics } from "@/lib/ebook-analytics";

interface AnalyticsPanelProps {
  project: EbookProject;
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--bg-hover)" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>{label}</span>
      </div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function Badge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{
      background: active ? "var(--accent-bg)" : "var(--bg-hover)",
      color: active ? "var(--accent)" : "var(--text-tertiary)",
      border: `1px solid ${active ? "var(--accent)" : "var(--border-subtle)"}`,
    }}>{label}</span>
  );
}

export default function AnalyticsPanel({ project }: AnalyticsPanelProps) {
  const allContent = useMemo(() =>
    project.chapters.sort((a, b) => a.order - b.order).map((c) => c.content).join("\n"),
    [project.chapters]
  );

  const analytics = useMemo(() =>
    computeAnalytics(allContent, project.pageSize, project.chapters.length),
    [allContent, project.pageSize, project.chapters.length]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Analytics</h3>
        <p className="text-xs mt-px" style={{ color: "var(--text-tertiary)" }}>Book statistics and readability</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Total Words" value={analytics.totalWords.toLocaleString()} icon="📝" color="var(--accent)" />
          <StatCard label="Characters" value={analytics.totalChars.toLocaleString()} icon="🔤" color="var(--text-primary)" />
          <StatCard label="Reading Time" value={`${analytics.readingTimeMin}m ${analytics.readingTimeSec}s`} icon="⏱️" color="#22c55e" />
          <StatCard label="Chapters" value={String(analytics.chapterCount)} icon="📚" color="#6366f1" />
          <StatCard label="Pages" value={String(analytics.pageEstimate)} icon="📄" color="#f59e0b" />
          <StatCard label="Flesch Score" value={String(analytics.fleschScore)} icon="🎯" color={
            analytics.fleschScore >= 60 ? "#22c55e" : analytics.fleschScore >= 30 ? "#f59e0b" : "#ef4444"
          } />
        </div>

        <div className="rounded-xl p-3" style={{ background: "var(--bg-hover)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Complexity</span>
          </div>
          <div className="flex gap-1.5">
            <Badge label="Beginner" active={analytics.complexity === "beginner"} />
            <Badge label="Intermediate" active={analytics.complexity === "intermediate"} />
            <Badge label="Advanced" active={analytics.complexity === "advanced"} />
          </div>
        </div>

        <div className="rounded-xl p-3" style={{ background: "var(--bg-hover)" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Readability</div>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span style={{ color: "var(--text-tertiary)" }}>Reading Level</span>
              <span style={{ color: "var(--text-primary)" }}>{analytics.readingLevel}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--text-tertiary)" }}>Avg Words/Sentence</span>
              <span style={{ color: "var(--text-primary)" }}>{analytics.avgWordsPerSentence}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--text-tertiary)" }}>Avg Letters/Word</span>
              <span style={{ color: "var(--text-primary)" }}>{analytics.avgCharsPerWord}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--text-tertiary)" }}>Sentences</span>
              <span style={{ color: "var(--text-primary)" }}>{analytics.sentenceCount.toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
