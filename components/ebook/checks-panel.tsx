"use client";

import { useMemo, useState } from "react";
import type { EbookProject } from "@/lib/ebook-storage";
import { runChecks, type CheckResult } from "@/lib/ebook-checks";
import { computeAnalytics } from "@/lib/ebook-analytics";

interface ChecksPanelProps {
  project: EbookProject;
}

const STATUS_ICONS: Record<string, string> = { pass: "✅", warn: "⚠️", fail: "❌", info: "ℹ️" };
const CAT_COLORS: Record<string, string> = {
  typography: "#6366f1", contrast: "#8b5cf6", spacing: "#22c55e",
  margins: "#f59e0b", links: "#3b82f6", images: "#ec4899",
  accessibility: "#14b8a6", print: "#f97316", metadata: "#a855f7", content: "#ef4444",
};

export default function ChecksPanel({ project }: ChecksPanelProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const allContent = useMemo(() =>
    project.chapters.sort((a, b) => a.order - b.order).map((c) => c.content).join("\n"),
    [project.chapters]
  );

  const analytics = useMemo(() =>
    computeAnalytics(allContent, project.pageSize, project.chapters.length),
    [allContent, project.pageSize, project.chapters.length]
  );

  const checks = useMemo(() => runChecks(project, analytics), [project, analytics]);

  const filtered = activeFilter ? checks.filter((c) => c.category === activeFilter) : checks;
  const counts = { pass: checks.filter((c) => c.status === "pass").length, warn: checks.filter((c) => c.status === "warn").length, fail: checks.filter((c) => c.status === "fail").length, info: checks.filter((c) => c.status === "info").length };

  const categories = [...new Set(checks.map((c) => c.category))];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Pre-flight Checks</h3>
        <p className="text-xs mt-px" style={{ color: "var(--text-tertiary)" }}>Validate before publishing</p>
        <div className="flex gap-2 mt-2 text-[10px]">
          <span style={{ color: "#22c55e" }}>✅ {counts.pass}</span>
          <span style={{ color: "#f59e0b" }}>⚠️ {counts.warn}</span>
          <span style={{ color: "#ef4444" }}>❌ {counts.fail}</span>
          <span style={{ color: "var(--text-muted)" }}>ℹ️ {counts.info}</span>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <button onClick={() => setActiveFilter(null)}
          className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all"
          style={{ background: !activeFilter ? "var(--accent)" : "var(--bg-hover)", color: !activeFilter ? "#fff" : "var(--text-secondary)" }}
        >All</button>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
            className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium capitalize transition-all"
            style={{ background: activeFilter === cat ? CAT_COLORS[cat] || "var(--accent)" : "var(--bg-hover)", color: activeFilter === cat ? "#fff" : "var(--text-secondary)" }}
          >{cat}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {filtered.map((check) => (
          <div key={check.id} className="rounded-xl p-3" style={{ background: "var(--bg-hover)" }}>
            <div className="flex items-start gap-2">
              <span className="text-sm shrink-0 mt-px">{STATUS_ICONS[check.status]}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{check.label}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ background: `${CAT_COLORS[check.category]}18`, color: CAT_COLORS[check.category] }}>{check.category}</span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{check.message}</p>
                {check.fix && <p className="text-[10px] mt-1 italic" style={{ color: "var(--accent)" }}>💡 {check.fix}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
