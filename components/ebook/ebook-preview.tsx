"use client";

import { type EbookProject, type EbookChapter } from "@/lib/ebook-storage";
import { getTemplate } from "./templates";
import { useMemo, useEffect, useRef, useCallback } from "react";
import { processContentHtml } from "@/lib/markdown-extensions";
import { themeToCss, pageSizes } from "@/lib/ebook-theme";
import { renderCoverPage, getCoverCss } from "@/lib/cover-page";

interface EbookPreviewProps {
  project: EbookProject;
  activeChapterId?: string;
  onChapterClick?: (chapterId: string) => void;
}

const WORDS_PER_PAGE_MAP: Record<string, number> = {
  "5x8": 200, "5.5x8.5": 220, "6x9": 250, "6.14x9.21": 280, "7x9": 300, "8.5x11": 380,
};

const HLJS_CSS = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.0/styles/github.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />`;

function estimateWords(html: string): number {
  return html.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
}

function splitChapterIntoPages(ch: EbookChapter, targetWords: number): { html: string; pageNum: number }[] {
  const html = processContentHtml(ch.content);
  const totalWords = estimateWords(html);
  if (totalWords === 0) {
    return [{ html: `<p style="color:#999;font-style:italic;text-align:center;padding:4em 0;">Write your content here...</p>`, pageNum: 1 }];
  }

  const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/g) || [];
  if (paragraphs.length === 0) {
    return [{ html, pageNum: 1 }];
  }

  const result: { html: string; pageNum: number }[] = [];
  let currentPage: string[] = [];
  let currentWords = 0;

  for (const para of paragraphs) {
    const pw = estimateWords(para);
    if (currentWords + pw > targetWords && currentPage.length > 0) {
      result.push({ html: currentPage.join("\n"), pageNum: result.length + 1 });
      currentPage = [para];
      currentWords = pw;
    } else {
      currentPage.push(para);
      currentWords += pw;
    }
  }
  if (currentPage.length > 0) {
    const remaining = currentPage.join("\n");
    if (result.length > 0 && estimateWords(remaining) < targetWords * 0.3) {
      const last = result.pop()!;
      result.push({ html: last.html + "\n" + remaining, pageNum: result.length + 1 });
    } else {
      result.push({ html: remaining, pageNum: result.length + 1 });
    }
  }

  return result;
}

export default function EbookPreview({ project, activeChapterId, onChapterClick }: EbookPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const template = getTemplate(project.templateId);

  const sortedChapters = useMemo(() =>
    [...project.chapters].sort((a, b) => a.order - b.order),
    [project.chapters]
  );

  const activeChapter = useMemo(() => {
    if (activeChapterId) return sortedChapters.find((c) => c.id === activeChapterId) || sortedChapters[0];
    return sortedChapters[0];
  }, [sortedChapters, activeChapterId]);

  const activeIndex = useMemo(() =>
    sortedChapters.findIndex((c) => c.id === activeChapter?.id),
    [sortedChapters, activeChapter]
  );

  const targetWords = WORDS_PER_PAGE_MAP[project.pageSize] || 250;

  const pageSizeInfo = useMemo(() =>
    pageSizes().find((ps) => ps.id === project.pageSize) || pageSizes()[2],
    [project.pageSize]
  );

  const themeCssStr = useMemo(() => themeToCss(project.theme), [project.theme]);

  const coverCss = useMemo(() => getCoverCss(project.cover, project.pageSize), [project.cover, project.pageSize]);

  const pages = useMemo(() => {
    if (!activeChapter) return [];
    return splitChapterIntoPages(activeChapter, targetWords);
  }, [activeChapter, targetWords]);

  const html = useMemo(() => {
    if (!activeChapter) return "";

    const titleHtml = `<h1 class="chapter-title" data-ch-id="${activeChapter.id}" style="cursor:pointer;">${activeChapter.title}</h1>`;

    // Build chapter pages
    const chapterPagesHtml = pages.map((p, i) => `
      <div class="preview-page">
        ${i > 0 ? titleHtml : ""}
        ${p.html}
        <div class="page-number-marker">— ${p.pageNum} —</div>
      </div>
      ${i < pages.length - 1 ? '<div class="page-separator"><span>\u2022 \u2022 \u2022</span></div>' : ''}
    `).join("\n");

    const coverHtml = project.cover.showCoverPage
      ? renderCoverPage(project.cover, project.pageSize)
      : "";

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${project.name} — Preview</title>
${HLJS_CSS}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous" />
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" crossorigin="anonymous"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" crossorigin="anonymous" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]})"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true,theme:'base',themeVariables:{primaryColor:'var(--accent-color,#6366f1)',primaryTextColor:'var(--body-color,#333)',primaryBorderColor:'var(--accent-color,#6366f1)',lineColor:'var(--accent-color,#6366f1)',secondaryColor:'var(--code-bg,#f5f5f5)',tertiaryColor:'var(--bg-color,#fff)'}});</script>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@200;300;400;500;600;700;800;900&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Lora:ital,wght@0,400;0;500;0,600;0,700;1,400&family=Merriweather:wght@300;400;700;900&family=Playfair+Display:wght@400;500;600;700;800;900&family=Source+Sans+3:wght@200;300;400;600&family=Cabin:wght@400;500;600;700&display=swap');
${themeCssStr}
${template.css}
${coverCss}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow-y:auto;margin:0;padding:0}
body{background:${project.bgColor || "#fff"}}
.content-body{
  padding:var(--page-margin-top,2em) var(--page-margin-right,2.2em) var(--page-margin-bottom,2em) var(--page-margin-left,2.2em);
  color:var(--body-color,#333);
  font-family:var(--body-font,Georgia,serif);
  font-size:var(--body-size,1.05rem);
  line-height:var(--body-line-height,1.7);
}
.preview-page{page-break-inside:avoid;break-inside:avoid}
.chapter-title{margin-top:0.5em}
[data-ch-id]{cursor:pointer;transition:background 0.15s;border-radius:4px;padding:0.1em 0.2em}
[data-ch-id]:hover{background:rgba(99,102,241,0.08)}
.page-number-marker{text-align:center;font-size:0.75em;color:#999;margin-top:1.5em;padding-top:0.5em}
.page-separator{text-align:center;margin:2em 0;position:relative}
.page-separator::before{content:"";position:absolute;left:10%;right:10%;top:50%;height:1px;background:rgba(0,0,0,0.06)}
.page-separator span{position:relative;background:${project.bgColor || "#fff"};padding:0 1em;font-size:0.75em;color:#bbb;letter-spacing:0.3em}
/* Neutralize first-letter drop caps inside Mermaid diagrams */
.mermaid *::first-letter,.mermaid *::first-line{all:unset!important;font-size:inherit!important;float:none!important;color:inherit!important}
/* Neutralize first-letter drop caps inside cover page */
.cover-page *::first-letter,.cover-page *::first-line{all:unset!important;font-size:inherit!important;float:none!important;color:inherit!important}
</style>
<script>
document.addEventListener('click',function(e){
  var el=e.target.closest('[data-ch-id]');
  if(el){
    e.preventDefault();
    window.parent.postMessage({type:'chapter-click',id:el.getAttribute('data-ch-id')},'*');
  }
});
</script>
</head>
<body>
${coverHtml}
<div class="content-body">
${chapterPagesHtml}
</div>
</body>
</html>`;
  }, [activeChapter, pages, template, project.bgColor, project.theme, project.pageSize, project.cover, themeCssStr, coverCss, project.name]);

  useEffect(() => {
    if (iframeRef.current && html) {
      iframeRef.current.srcdoc = html;
    }
  }, [html]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "chapter-click" && onChapterClick) {
        onChapterClick(event.data.id);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onChapterClick]);

  // Preload CDN resources when component mounts
  useEffect(() => {
    if (typeof window === "undefined") return;
    const links = [
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.0/styles/github.min.css",
      "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css",
    ];
    links.forEach((href) => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      }
    });
    const scripts = [
      "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js",
      "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js",
      "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js",
    ];
    scripts.forEach((src) => {
      if (!document.querySelector(`script[src="${src}"]`)) {
        const script = document.createElement("script");
        script.src = src;
        script.defer = true;
        document.head.appendChild(script);
      }
    });
  }, []);

  const goToChapter = (dir: -1 | 1) => {
    const idx = activeIndex + dir;
    if (idx >= 0 && idx < sortedChapters.length) {
      onChapterClick?.(sortedChapters[idx].id);
    }
  };

  return (
    <div className="h-full w-full flex flex-col" style={{ background: "var(--bg-page)" }}>
      <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>Preview</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
            {template.name}
          </span>
          <span className="text-[10px] truncate max-w-[180px]" style={{ color: "var(--text-muted)" }}>
            {activeChapter?.title}
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => goToChapter(-1)}
            disabled={activeIndex <= 0}
            className="p-1 rounded transition-all disabled:opacity-30"
            style={{ color: "var(--text-tertiary)" }}
            title="Previous chapter"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-[10px] font-medium tabular-nums" style={{ color: "var(--text-muted)" }}>
            {activeIndex + 1}/{sortedChapters.length}
          </span>
          <button
            onClick={() => goToChapter(1)}
            disabled={activeIndex >= sortedChapters.length - 1}
            className="p-1 rounded transition-all disabled:opacity-30"
            style={{ color: "var(--text-tertiary)" }}
            title="Next chapter"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 flex items-start justify-center overflow-auto py-6" style={{ background: "#8884" }}>
        <div
          className="shadow-2xl rounded-lg overflow-hidden"
          style={{
            width: pageSizeInfo.width,
            minHeight: pageSizeInfo.height,
            background: project.bgColor || "#fff",
          }}
        >
          {html ? (
            <iframe
              ref={iframeRef}
              title="Ebook Preview"
              className="w-full"
              style={{
                height: "calc(100vh - 160px)",
                minHeight: pageSizeInfo.height,
                background: project.bgColor || "#fff",
                border: "none",
              }}
            />
          ) : (
            <div className="flex items-center justify-center" style={{ height: "400px", color: "#999" }}>
              Select a chapter to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
