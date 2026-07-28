"use client";

import { useState, useMemo } from "react";
import { generateEpub } from "@/lib/epub-generator";
import { saveProject, contentToMarkdown, type EbookProject } from "@/lib/ebook-storage";
import { getTemplate } from "./templates";
import { processContentHtml } from "@/lib/markdown-extensions";
import { themeToCss } from "@/lib/ebook-theme";
import { renderCoverPage, getCoverCss } from "@/lib/cover-page";
import { saveAs } from "file-saver";

interface ExportPanelProps {
  project: EbookProject;
  onProjectChange: (p: EbookProject) => void;
}

export default function ExportPanel({ project, onProjectChange }: ExportPanelProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const template = getTemplate(project.templateId);

  const themeCss = useMemo(() => themeToCss(project.theme), [project.theme]);
  const coverCss = useMemo(() => getCoverCss(project.cover, project.pageSize), [project.cover, project.pageSize]);

  const pageSizeMap: Record<string, { width: string; height: string }> = {
    "5x8": { width: "5in", height: "8in" },
    "5.5x8.5": { width: "5.5in", height: "8.5in" },
    "6x9": { width: "6in", height: "9in" },
    "6.14x9.21": { width: "6.14in", height: "9.21in" },
    "7x9": { width: "7in", height: "9in" },
    "8.5x11": { width: "8.5in", height: "11in" },
  };

  function exportPipeline() {
    const sorted = [...project.chapters].sort((a, b) => a.order - b.order);
    const bodyHtml = sorted.map((ch) => {
      const content = processContentHtml(ch.content);
      return `<section class="chapter">
  <h1 class="chapter-title">${ch.title}</h1>
  ${content}
</section>`;
    }).join("\n");

    return { sorted, bodyHtml };
  }

  function commonHeadStyles(printMode: boolean): string {
    const ps = pageSizeMap[project.pageSize] || pageSizeMap["6x9"];
    const printStyles = printMode
      ? `@page{margin:0.75in;size:${ps.width} ${ps.height}}
@media print{.chapter{page-break-before:always}.chapter:first-of-type{page-break-before:auto}}`
      : "";
    return `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@200;300;400;500;600;700;800;900&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Lora:ital,wght@0,400;0;500;0,600;0,700;1,400&family=Merriweather:wght@300;400;700;900&family=Playfair+Display:wght@400;500;600;700;800;900&family=Source+Sans+3:wght@200;300;400;600&family=Cabin:wght@400;500;600;700&display=swap');
${themeCss}
${template.css}
${coverCss}
${printStyles}
/* Neutralize first-letter drop caps inside Mermaid and cover */
.mermaid *::first-letter,.mermaid *::first-line{all:unset!important;font-size:inherit!important;float:none!important;color:inherit!important}
.cover-page *::first-letter,.cover-page *::first-line{all:unset!important;font-size:inherit!important;float:none!important;color:inherit!important}
`;
  }

  function fullHtmlDoc(bodyHtml: string, printMode: boolean): string {
    const coverHtml = project.cover.showCoverPage
      ? renderCoverPage(project.cover, project.pageSize)
      : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${project.name}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.0/styles/github.min.css" crossorigin="anonymous"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous" />
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" crossorigin="anonymous"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" crossorigin="anonymous" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]})"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true,theme:'base',themeVariables:{primaryColor:'var(--accent-color,#6366f1)',primaryTextColor:'var(--body-color,#333)',primaryBorderColor:'var(--accent-color,#6366f1)',lineColor:'var(--accent-color,#6366f1)',secondaryColor:'var(--code-bg,#f5f5f5)',tertiaryColor:'var(--bg-color,#fff)'}});</script>
<style>
${commonHeadStyles(printMode)}
</style>
</head>
<body>
${coverHtml}
${bodyHtml}
<footer class="doc-footer" style="text-align:center;padding:1em 0;font-size:0.75em;color:#999;border-top:1px solid #ddd;margin-top:2em">
  <p>Generated with md book \u00b7 ${new Date().toLocaleDateString()}</p>
</footer>
</body>
</html>`;
  }

  const handleExportEpub = async () => {
    setExporting("epub");
    await saveProject(project);
    try {
      await generateEpub(project);
    } catch (e) {
      console.error("Export failed", e);
    }
    setExporting(null);
  };

  const handleExportMarkdown = () => {
    const md = contentToMarkdown(project);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    saveAs(blob, `${project.name.replace(/\s+/g, "-").toLowerCase()}.md`);
  };

  const handleExportHtml = async () => {
    setExporting("html");
    await saveProject(project);
    try {
      const { bodyHtml } = exportPipeline();
      const fullHtml = fullHtmlDoc(bodyHtml, false);
      const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
      saveAs(blob, `${project.name.replace(/\s+/g, "-").toLowerCase()}.html`);
    } catch (e) {
      console.error("HTML export failed", e);
    }
    setExporting(null);
  };

  const handlePrint = () => {
    const { bodyHtml } = exportPipeline();
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(fullHtmlDoc(bodyHtml, true));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleSave = async () => {
    await saveProject(project);
  };

  const pageSizeOptions = [
    { id: "5x8", label: '5" \u00d7 8"', desc: "Pocket book" },
    { id: "5.5x8.5", label: '5.5" \u00d7 8.5"', desc: "Fiction / Novel" },
    { id: "6x9", label: '6" \u00d7 9"', desc: "Standard non-fiction" },
    { id: "6.14x9.21", label: '6.14" \u00d7 9.21"', desc: "Academic" },
    { id: "7x9", label: '7" \u00d7 9"', desc: "Technical / Large" },
    { id: "8.5x11", label: '8.5" \u00d7 11"', desc: "Workbook / Textbook" },
  ];

  function ExportButton({ id, label, icon, onClick, primary }: { id: string; label: string; icon: string; onClick: () => void; primary?: boolean }) {
    const busy = exporting === id;
    return (
      <button
        onClick={onClick}
        disabled={busy}
        className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${primary ? "text-white" : ""}`}
        style={{
          background: primary ? "linear-gradient(135deg, var(--accent), var(--accent-soft))" : "var(--bg-hover)",
          color: primary ? "white" : "var(--text-primary)",
          border: primary ? "none" : "1px solid var(--border-subtle)",
          opacity: busy ? 0.5 : 1,
        }}
        onMouseEnter={(e) => { if (!busy && !primary) e.currentTarget.style.background = "var(--bg-active)"; }}
        onMouseLeave={(e) => { if (!busy && !primary) e.currentTarget.style.background = "var(--bg-hover)"; }}
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Exporting...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span className="text-base">{icon}</span>
            {label}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Export</h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>Publish-ready formats</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

        {/* Page Size */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Page Size</label>
          <div className="grid grid-cols-2 gap-1.5">
            {pageSizeOptions.map((ps) => (
              <button
                key={ps.id}
                onClick={() => onProjectChange({ ...project, pageSize: ps.id })}
                className="text-left p-2 rounded-lg transition-all"
                style={{
                  background: project.pageSize === ps.id ? "var(--accent-bg)" : "var(--bg-hover)",
                  border: project.pageSize === ps.id ? `1px solid var(--accent)` : "1px solid transparent",
                }}
              >
                <div className="text-xs font-medium" style={{ color: project.pageSize === ps.id ? "var(--accent)" : "var(--text-primary)" }}>
                  {ps.label}
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{ps.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Background Color */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Page Background</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={project.bgColor || "#ffffff"}
              onChange={(e) => onProjectChange({ ...project, bgColor: e.target.value })}
              className="h-9 w-12 rounded-lg cursor-pointer"
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {project.bgColor || "#ffffff"}
            </span>
          </div>
        </div>

        {/* KDP Guide */}
        <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
          <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            <span className="mr-1">📘</span> Amazon KDP Guidelines
          </h4>
          <ul className="space-y-1.5">
            {[
              'Use 6" \u00d7 9" for standard non-fiction (most popular)',
              "Ensure margins are at least 0.5\" on all sides",
              "Font size 10\u201312pt for body text recommended",
              "Avoid rich media \u2014 KDP reads EPUB2 format best",
              "Set language metadata for proper rendering",
            ].map((tip, i) => (
              <li key={i} className="text-[11px] flex gap-2" style={{ color: "var(--text-tertiary)" }}>
                <span style={{ color: "var(--accent)" }}>{"\u2022"}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <ExportButton id="save" label="Save Project" icon={"\uD83D\uDCBE"} onClick={handleSave} />
          <ExportButton id="md" label="Export Markdown" icon={"\uD83D\uDCDD"} onClick={handleExportMarkdown} />
          <ExportButton id="html" label="Export HTML" icon={"\uD83C\uDF10"} onClick={handleExportHtml} />
          <ExportButton id="epub" label="Export EPUB" icon={"\uD83D\uDCDA"} onClick={handleExportEpub} primary />
          <ExportButton id="print" label="Print / Save as PDF" icon={"\uD83D\uDD0D"} onClick={handlePrint} />

          <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>
            Print/PDF uses theme + template for consistent output
          </p>
        </div>
      </div>
    </div>
  );
}
