"use client";

import { useState, useMemo } from "react";
import type { EbookProject, EbookChapter } from "@/lib/ebook-storage";

interface TocGeneratorProps {
  project: EbookProject;
  onUpdateToc: (tocHtml: string) => void;
}

export default function TocGenerator({ project, onUpdateToc }: TocGeneratorProps) {
  const [style, setStyle] = useState<"standard" | "nested" | "minimal" | "fancy" | "modern">("standard");
  const [showNumbers, setShowNumbers] = useState(true);
  const [showIcons, setShowIcons] = useState(false);
  const [numeralStyle, setNumeralStyle] = useState<"decimal" | "roman" | "alpha">("decimal");
  const [showDescriptions, setShowDescriptions] = useState(false);

  const contentChapters = useMemo(() =>
    project.chapters.filter((c) => !c.isStandard).sort((a, b) => a.order - b.order),
    [project.chapters]
  );

  const parts = useMemo(() => {
    const p = new Map<string, EbookChapter[]>();
    for (const ch of contentChapters) {
      const key = ch.part || "__no_part";
      if (!p.has(key)) p.set(key, []);
      p.get(key)!.push(ch);
    }
    return p;
  }, [contentChapters]);

  const numeral = (i: number): string => {
    switch (numeralStyle) {
      case "roman": return toRoman(i + 1);
      case "alpha": return String.fromCharCode(97 + (i % 26));
      default: return String(i + 1);
    }
  };

  const iconFor = (ch: EbookChapter): string => {
    if (!showIcons) return "";
    if (ch.isStandard) return "📄";
    const icons = ["📖", "📘", "📗", "📕", "📙", "📓", "📔", "📒"];
    return icons[ch.order % icons.length];
  };

  const generatedToc = useMemo(() => {
    const lines: string[] = [];
    const prefix = showNumbers ? numeral : () => "";
    lines.push("# Table of Contents\n");

    for (const [partName, chapters] of parts) {
      if (partName !== "__no_part") {
        lines.push(`\n## ${partName}\n`);
      }
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        const num = showNumbers ? `${prefix(i)}. ` : "";
        const icon = iconFor(ch) ? `${iconFor(ch)} ` : "";
        const desc = showDescriptions && ch.content ? ` — ${ch.content.slice(0, 80).replace(/\n/g, " ").trim()}...` : "";
        const anchor = ch.title.toLowerCase().replace(/[^\w]+/g, "-");
        lines.push(`- [${num}${icon}${ch.title}](#${anchor})${desc}`);
      }
    }

    // Standard pages
    const stdPages = project.chapters.filter((c) => c.isStandard).sort((a, b) => a.order - b.order);
    if (stdPages.length > 0) {
      lines.push("\n## Front & Back Matter\n");
      for (const ch of stdPages) {
        const anchor = ch.title.toLowerCase().replace(/[^\w]+/g, "-");
        lines.push(`- [${ch.title}](#${anchor})`);
      }
    }

    return lines.join("\n");
  }, [contentChapters, parts, style, showNumbers, showIcons, numeralStyle, showDescriptions, project.chapters]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>TOC Generator</h3>
        <p className="text-xs mt-px" style={{ color: "var(--text-tertiary)" }}>Customize your table of contents</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        <div>
          <label className="text-[10px] font-medium mb-1.5 block" style={{ color: "var(--text-tertiary)" }}>Style</label>
          <div className="flex gap-1">
            {(["standard", "nested", "minimal", "fancy", "modern"] as const).map((s) => (
              <button key={s} onClick={() => setStyle(s)}
                className="flex-1 py-1.5 text-[10px] font-medium rounded-lg capitalize transition-all"
                style={{
                  background: style === s ? "var(--accent)" : "var(--bg-hover)",
                  color: style === s ? "#fff" : "var(--text-secondary)",
                  border: style === s ? "none" : "1px solid var(--border-subtle)",
                }}
              >{s}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>Show Numbers</span>
          <button onClick={() => setShowNumbers(!showNumbers)}
            className="h-4 w-7 rounded-full transition-all relative"
            style={{ background: showNumbers ? "var(--accent)" : "var(--bg-hover)", border: "1px solid var(--border-subtle)" }}
          >
            <div className={`h-3 w-3 rounded-full bg-white transition-all absolute top-0.5 ${showNumbers ? "left-3.5" : "left-0.5"}`} />
          </button>
        </div>

        {showNumbers && (
          <div>
            <label className="text-[10px] font-medium mb-1.5 block" style={{ color: "var(--text-tertiary)" }}>Number Style</label>
            <div className="flex gap-1">
              {([{ id: "decimal", name: "1,2,3" }, { id: "roman", name: "I,II,III" }, { id: "alpha", name: "a,b,c" }] as const).map((ns) => (
                <button key={ns.id} onClick={() => setNumeralStyle(ns.id)}
                  className="flex-1 py-1.5 text-[10px] font-medium rounded-lg transition-all"
                  style={{
                    background: numeralStyle === ns.id ? "var(--accent)" : "var(--bg-hover)",
                    color: numeralStyle === ns.id ? "#fff" : "var(--text-secondary)",
                    border: numeralStyle === ns.id ? "none" : "1px solid var(--border-subtle)",
                  }}
                >{ns.name}</button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>Show Icons</span>
          <button onClick={() => setShowIcons(!showIcons)}
            className="h-4 w-7 rounded-full transition-all relative"
            style={{ background: showIcons ? "var(--accent)" : "var(--bg-hover)", border: "1px solid var(--border-subtle)" }}
          >
            <div className={`h-3 w-3 rounded-full bg-white transition-all absolute top-0.5 ${showIcons ? "left-3.5" : "left-0.5"}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>Descriptions</span>
          <button onClick={() => setShowDescriptions(!showDescriptions)}
            className="h-4 w-7 rounded-full transition-all relative"
            style={{ background: showDescriptions ? "var(--accent)" : "var(--bg-hover)", border: "1px solid var(--border-subtle)" }}
          >
            <div className={`h-3 w-3 rounded-full bg-white transition-all absolute top-0.5 ${showDescriptions ? "left-3.5" : "left-0.5"}`} />
          </button>
        </div>

        {/* Preview */}
        <div className="rounded-xl p-3" style={{ background: "var(--bg-hover)" }}>
          <div className="text-[10px] font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>Preview</div>
          <pre className="text-[10px] leading-relaxed whitespace-pre-wrap font-mono" style={{ color: "var(--text-primary)", maxHeight: "200px", overflow: "auto" }}>
            {generatedToc}
          </pre>
        </div>

        <button onClick={() => onUpdateToc(generatedToc)}
          className="w-full py-2 rounded-lg text-xs font-medium transition-all"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Apply to TOC Page
        </button>

      </div>
    </div>
  );
}

function toRoman(n: number): string {
  const vals: [number, string][] = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let s = "";
  for (const [v, r] of vals) { while (n >= v) { s += r; n -= v; } }
  return s;
}
