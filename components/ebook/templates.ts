export interface EbookTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  pageWidth: string;
  pageHeight: string;
  css: string;
}

function baseReset(): string {
  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:100%;-webkit-text-size-adjust:100%}
body{font-family:var(--body-font);font-size:var(--body-size);line-height:var(--body-line-height);color:var(--body-color);background:var(--bg-color);widows:2;orphans:2;hyphens:auto;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4,h5,h6{page-break-after:avoid;page-break-inside:avoid;orphans:3;widows:3;font-weight:var(--heading-weight,700);line-height:var(--heading-line-height,1.3)}
p{orphans:3;widows:3;margin-bottom:var(--p-mb,0.5em)}
blockquote,pre,table{margin:1em 0}
a{color:var(--accent-color);text-decoration:none;border-bottom:1px solid transparent;transition:border-color 0.2s}
a:hover{border-bottom-color:var(--accent-color)}
img{max-width:100%;height:auto;border-radius:4px;margin:1.5em 0;display:block;page-break-inside:avoid}
pre{overflow-x:auto;white-space:pre-wrap;word-wrap:break-word;border-radius:8px;margin:1em 0;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
pre code.hljs{padding:1em!important;border-radius:8px!important;font-size:.85em;line-height:1.55}
code:not(.hljs){font-family:monospace;font-size:.85em;padding:0.15em 0.3em;border-radius:3px;background:var(--code-bg,#f5f5f5)}
blockquote{font-style:italic;border-left:3px solid var(--accent-color,#888);padding:0.5em 1em;margin:1em 0;color:var(--blockquote-color,#555);border-radius:0 4px 4px 0;background:var(--blockquote-bg,transparent)}
ul,ol{margin:0.5em 0;padding-left:1.5em}
li{margin-bottom:0.25em}
table{width:100%;border-collapse:collapse;font-size:0.9em;margin:1.5em 0;page-break-inside:avoid;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
th,td{border:1px solid #d0d0d0;padding:0.6em 0.75em;text-align:left;vertical-align:top}
th{background:var(--accent-color,#6366f1);color:#fff;font-weight:600;font-size:0.85em;text-transform:uppercase;letter-spacing:0.05em}
td{background:#fff}
tr:nth-child(even) td{background:rgba(0,0,0,0.015)}
tr:hover td{background:rgba(0,0,0,0.03)}
hr{border:none;border-top:1px solid #d0d0d0;margin:2em 0;height:1px;background:linear-gradient(to right,transparent,#d0d0d0,transparent)}
.page-break{page-break-after:always;break-after:page}
.page-number{text-align:center;font-size:0.75em;color:#999;margin-top:2em;padding-top:0.5em;border-top:1px solid #eee}

/* HTTP method badges */
.http-badge{display:inline-flex;align-items:center;gap:4px;font-weight:700;font-size:.78em;padding:.12em .5em;border-radius:4px;font-family:ui-monospace,monospace;letter-spacing:.03em;line-height:1.4;vertical-align:middle}
.http-path{font-family:ui-monospace,monospace;font-size:.88em;margin-left:.2em;color:var(--body-color)}
.file-path{font-family:ui-monospace,monospace;font-size:.85em;padding:.08em .35em;border-radius:3px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.15);color:var(--accent-color,#6366f1);white-space:nowrap;vertical-align:middle}

/* Callout boxes */
.callout{display:block;padding:0.8em 1em;margin:1em 0;border-radius:6px;border-left:4px solid;font-size:.92em;line-height:1.5}
.callout-tip{background:#f0fdf4;border-color:#22c55e;color:#166534}
.callout-note{background:#eff6ff;border-color:#3b82f6;color:#1e40af}
.callout-warning{background:#fefce8;border-color:#eab308;color:#854d0e}
.callout-danger{background:#fef2f2;border-color:#ef4444;color:#991b1b}
.callout-icon{font-weight:700;margin-right:0.3em}

/* Gradient horizontal rules */
hr.gradient{border:none;height:2px;background:linear-gradient(to right,transparent,var(--accent-color,#888),transparent);margin:2.5em 0;border-radius:1px}

/* Small caps for abbreviations */
abbr{font-variant:all-small-caps;letter-spacing:0.05em}

/* Directory tree view - pure CSS connectors */
.dir-tree{font-family:ui-monospace,monospace;background:#fafbfc;border:1px solid #e8ecf0;border-radius:10px;padding:0.6em 0.2em;margin:1em 0;box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow:hidden}
.dt-ul{list-style:none;margin:0;padding:0;padding-left:1.8em}
.dir-tree>.dt-ul{padding-left:0.6em}
.dt-li{position:relative;margin:0;padding:0.2em 0 0.2em 1em}
.dt-li::before{content:'';position:absolute;left:0;top:0;bottom:50%;width:0.8em;border-left:1.5px solid #d0d5dd;border-bottom:1.5px solid #d0d5dd;border-radius:0 0 0 6px}
.dt-li::after{content:'';position:absolute;left:0;top:50%;width:0.8em;border-bottom:1.5px solid #d0d5dd}
.dt-li:last-child::before{border-bottom-left-radius:0 0}
.dt-li:only-child::before{display:none}
.dt-li:last-child::after{border-left:1.5px solid transparent}
.dt-li > .dt-ul{margin-top:0.2em}
.dt-label{display:inline-flex;align-items:center;gap:0.45em;padding:0.15em 0.5em 0.15em 0.8em;border-radius:4px;cursor:default;transition:background 0.12s;position:relative;z-index:1}
.dt-label:hover{background:rgba(99,102,241,0.06)}
.dt-label-dir{font-weight:600}
.dt-ic{font-size:0.9em;line-height:1;flex-shrink:0}
.dt-n{color:var(--body-color,#333);font-size:0.88em}
.dt-e{font-size:0.68em;padding:0.05em 0.4em;border-radius:3px;font-weight:600;line-height:1.6;background:var(--ec,#6b7280)18;color:var(--ec,#6b7280);flex-shrink:0;text-transform:lowercase}
/* Top-level root items have no connector */
.dir-tree>.dt-ul>.dt-li::before{display:none}
.dir-tree>.dt-ul>.dt-li::after{display:none}
.dir-tree>.dt-ul>.dt-li{padding-left:0.8em}

/* Progress bars */
.prog-bar{display:inline-flex;align-items:center;gap:0.5em;vertical-align:middle}
.prog-track{display:inline-block;width:6em;height:0.6em;background:#e5e7eb;border-radius:99px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.06)}
.prog-fill{display:block;height:100%;border-radius:99px;transition:width 0.3s}
.prog-pct{font-size:0.78em;font-weight:600;font-variant-numeric:tabular-nums;color:#6b7280;min-width:2.5em}

/* Chart bars */
.chart-bar{display:flex;align-items:center;gap:0.75em;margin:0.3em 0;padding:0.25em 0}
.chart-label{flex:0 0 auto;min-width:7em;font-size:0.85em;color:var(--body-color,#333);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chart-track{flex:1;height:1em;background:#e5e7eb;border-radius:99px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.06)}
.chart-fill{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent-color,#6366f1),color-mix(in srgb,var(--accent-color,#6366f1) 70%,#fff));transition:width 0.4s ease}
.chart-val{flex:0 0 auto;min-width:2em;font-size:0.8em;font-weight:600;font-variant-numeric:tabular-nums;color:#6b7280}

/* Smart Components - Timeline */
.timeline{position:relative;margin:2em 0;padding:0}
.timeline::before{content:'';position:absolute;left:50%;top:0;bottom:0;width:2px;background:var(--accent-color,#6366f1);transform:translateX(-50%);border-radius:1px}
.tl-item{position:relative;padding:0.5em 0;margin:1em 0;display:flex;justify-content:flex-start}
.tl-right{flex-direction:row-reverse}
.tl-marker{position:absolute;left:50%;top:1.2em;width:12px;height:12px;background:var(--accent-color,#6366f1);border:2px solid #fff;border-radius:50%;transform:translateX(-50%);z-index:1;box-shadow:0 1px 3px rgba(0,0,0,0.15)}
.tl-content{width:42%;padding:0.8em 1em;background:var(--tl-bg,#f8f9fa);border-radius:8px;font-size:0.9em;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
.tl-left .tl-content{margin-right:auto}
.tl-right .tl-content{margin-left:auto}

/* Pros & Cons */
.pros-box,.cons-box{margin:0.8em 0;padding:1em;border-radius:8px;font-size:0.9em}
.pros-box{background:#f0fdf4;border:1px solid #bbf7d0}
.cons-box{background:#fef2f2;border:1px solid #fecaca}
.pc-header{font-weight:600;margin-bottom:0.5em;font-size:1em}
.pc-body ul,.pc-body ol{margin:0.2em 0;padding-left:1.2em}
.pc-body li{margin-bottom:0.2em}

/* Key Takeaways */
.takeaway-box{margin:1.5em 0;padding:1.2em 1.5em;background:linear-gradient(135deg,#fefce8,#fff7ed);border:1px solid #fed7aa;border-left:4px solid #f59e0b;border-radius:8px}
.takeaway-header{font-weight:700;font-size:1em;margin-bottom:0.6em;color:#92400e}
.takeaway-body ul,.takeaway-body ol{margin:0.3em 0;padding-left:1.2em}
.takeaway-body li{margin-bottom:0.3em}

/* FAQ */
.faq-box{margin:1.5em 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
.faq-item{border-bottom:1px solid #e5e7eb}
.faq-item:last-child{border-bottom:none}
.faq-q{padding:0.8em 1em;cursor:pointer;font-weight:600;font-size:0.92em;background:#f9fafb;list-style:none;position:relative;padding-right:2em;color:var(--heading-color,#1a1208)}
.faq-q::-webkit-details-marker{display:none}
.faq-q::after{content:'+';position:absolute;right:1em;top:50%;transform:translateY(-50%);font-weight:700;color:var(--accent-color,#6366f1);font-size:1.1em}
details[open] .faq-q::after{content:'−'}
.faq-a{padding:0.6em 1em 1em;font-size:0.9em;color:var(--body-color,#333);line-height:1.6}

/* Checklists */
.chk-item{list-style:none !important;margin-left:-1.2em !important}
.chk-list{margin-right:0.5em;accent-color:var(--accent-color,#6366f1);transform:translateY(1px)}

/* GitHub-style callout header */
.callout-header{font-weight:700;margin-bottom:0.3em;font-size:0.92em}
.callout-body{font-size:0.9em}
.callout-info{background:#eff6ff;border-color:#3b82f6;color:#1e40af}
.callout-caution{background:#fefce8;border-color:#eab308;color:#854d0e}

/* Math support */
.math-display{overflow-x:auto;padding:0.5em 0;text-align:center;margin:1em 0}
.math-inline{padding:0 0.15em}
.katex{font-size:1.05em}

/* Mermaid diagrams */
.mermaid{text-align:center;margin:1.5em 0;padding:1em;background:#fafbfc;border:1px solid #e8ecf0;border-radius:10px;overflow-x:auto;min-height:60px}
.mermaid svg{max-width:100%}
/* Prevent template first-letter drop caps from affecting Mermaid SVG text */
.mermaid *::first-letter,.mermaid *::first-line{all:unset!important;font-size:inherit!important;float:none!important;color:inherit!important}
/* Prevent first-letter drop caps on cover page */
.cover-page *::first-letter,.cover-page *::first-line{all:unset!important;font-size:inherit!important;float:none!important;color:inherit!important}

/* Enhanced tables */
.table-responsive{overflow-x:auto;margin:1em 0;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
.table-enhanced{width:100%;border-collapse:separate;border-spacing:0;font-size:0.9em}
.table-enhanced thead.table-thead-sticky{position:sticky;top:0;z-index:2}
.table-enhanced th{padding:0.6em 0.75em;font-weight:600;font-size:0.85em;text-transform:uppercase;letter-spacing:0.05em;text-align:left;white-space:nowrap;border-bottom:2px solid currentColor}
.table-enhanced td{padding:0.5em 0.75em;border-bottom:1px solid rgba(0,0,0,0.06);vertical-align:top}
.table-enhanced tr:last-child td{border-bottom:none}
.table-enhanced tr:hover td{background:rgba(99,102,241,0.03)}
/* Responsive table labels for mobile */
@media (max-width:640px){
  .table-enhanced thead{display:none}
  .table-enhanced tr{display:block;margin-bottom:0.5em;border:1px solid #e5e7eb;border-radius:6px}
  .table-enhanced td{display:block;text-align:right;padding:0.4em 0.6em}
  .table-enhanced td::before{content:attr(data-label);float:left;font-weight:600;font-size:0.82em;color:var(--text-tertiary,#666)}
}

/* Print-specific adjustments */
@media print{
  .mermaid{break-inside:avoid}
  .table-enhanced thead.table-thead-sticky{position:static}
  .table-enhanced tr:hover td{background:transparent}
}

/* Terminal blocks */
.terminal-block{background:#1a1a2e;border-radius:10px;margin:1em 0;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.terminal-header{display:flex;align-items:center;padding:0.6em 0.8em;background:rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.06)}
.terminal-dot{width:10px;height:10px;border-radius:50%;margin-right:5px}
.terminal-body{padding:0.8em 1em;overflow-x:auto}
.terminal-line{white-space:pre-wrap;word-wrap:break-word;font-family:ui-monospace,monospace;font-size:0.82em;line-height:1.6;min-height:1.4em}
.terminal-prompt{color:#22c55e;font-weight:700;user-select:none}
.terminal-command{color:#e4e4e7}
.terminal-output{color:#a1a1aa}

/* Code block separation — adjacent pre blocks */
pre{margin:0.6em 0}
pre+pre{margin-top:0.8em;border-top:2px solid rgba(99,102,241,0.12);padding-top:0.4em}
pre code.hljs{border-radius:8px}

/* Inline terminal */
.inline-terminal{background:#1a1a2e;color:#fff;padding:0.1em 0.5em;border-radius:4px;font-family:ui-monospace,monospace;font-size:0.85em}

/* Grid system */
.grid{display:flex;flex-wrap:wrap;gap:var(--grid-gap,1.5em);margin:1.5em 0;}
.grid-col{flex:1;min-width:200px;padding:var(--grid-padding,1em);background:var(--grid-bg,transparent);border-radius:6px}

/* Image figure */
.image-figure{margin:1.5em 0;text-align:center;page-break-inside:avoid}
.image-figure img{display:block;margin:0 auto 0.5em;border-radius:6px}
.figcaption{font-style:var(--caption-style,italic);font-size:0.85em;color:var(--caption-color,#666);text-align:center;margin-top:0.3em}
.image-wrapper{display:block;text-align:center;margin:1em 0}

/* Glossary / Definition lists */
dl{margin:1em 0;padding:0}
dt{font-weight:600;margin-top:0.8em;color:var(--heading-color,#1a1208)}
dd{margin-left:1.2em;margin-bottom:0.4em;color:var(--body-color,#333)}

/* Appendix / References */
.appendix{margin-top:2em;padding-top:1em;border-top:2px solid var(--accent-color,#8b4513)}
.references{list-style:none;padding:0;margin:1em 0}
.references li{padding:0.3em 0;border-bottom:1px solid rgba(0,0,0,0.05);font-size:0.9em}
.references li::before{content:"[" counter(ref-counter) "] ";counter-increment:ref-counter;font-weight:600;color:var(--accent-color,#8b4513);margin-right:0.5em}
.references{counter-reset:ref-counter}

/* Chapter page styling based on theme */
.chapter-page{page-break-before:always;margin-top:0;padding-top:0}
.chapter-number-decorative{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.2em;color:var(--accent-color,#8b4513);text-align:center;margin-bottom:0.5em}
.chapter-decorative-line{width:60px;height:2px;background:var(--accent-color,#8b4513);margin:0.5em auto 1em;border-radius:1px}
.chapter-title{font-family:var(--heading-font);font-weight:var(--heading-weight,700);line-height:var(--heading-line-height,1.3)}
`;
}

const GARAMOND = "'EB Garamond', 'Garamond', 'Georgia', serif";
const LORA = "'Lora', 'Georgia', serif";
const MERRIWEATHER = "'Merriweather', 'Georgia', serif";
const PLAYFAIR = "'Playfair Display', 'Georgia', serif";
const INTER = "'Inter', -apple-system, 'Helvetica Neue', sans-serif";
const SOURCE_SANS = "'Source Sans 3', 'Helvetica Neue', sans-serif";
const DM_SANS = "'DM Sans', 'Inter', sans-serif";
const JETBRAINS = "'JetBrains Mono', 'Fira Code', monospace";
const CABIN = "'Cabin', 'Inter', sans-serif";

const templates: EbookTemplate[] = [
  {
    id: "classic",
    name: "Timeless Classic",
    description: "Elegant serif typography with warm tones — the timeless book look.",
    category: "General",
    icon: "📖",
    pageWidth: "6in",
    pageHeight: "9in",
    css: `
${baseReset()}
:root{
--body-font:${GARAMOND};
--body-size:1.05rem;
--body-line-height:1.7;
--body-color:#2c2416;
--bg-color:#fefcf7;
--accent-color:#8b4513;
--p-mb:0.6em;
}
h1{font-family:${PLAYFAIR};font-size:2.2rem;font-weight:700;color:#1a1208;text-align:center;margin:2.5em 0 0.8em;letter-spacing:-0.01em}
h2{font-family:${PLAYFAIR};font-size:1.6rem;font-weight:600;color:#1a1208;margin:2em 0 0.6em;letter-spacing:-0.01em}
h3{font-family:${PLAYFAIR};font-size:1.25rem;font-weight:600;color:#3a2a16;margin:1.5em 0 0.4em}
.chapter-title{font-family:${PLAYFAIR};font-size:2.8rem;font-weight:700;color:#1a1208;text-align:center;margin:3em 0 0.3em;letter-spacing:-0.02em}
.chapter-number{font-size:0.85rem;text-transform:uppercase;letter-spacing:0.2em;color:#8b4513;text-align:center;margin-bottom:0.5em}
blockquote{font-family:${LORA};font-size:0.95em;color:#5a4a36}
p:first-of-type::first-letter{font-size:3.2em;float:left;line-height:0.8;padding-right:6px;padding-top:2px;color:#8b4513;font-family:${PLAYFAIR}}
`,
  },
  {
    id: "modern",
    name: "Modern Pro",
    description: "Clean sans-serif design for contemporary non-fiction.",
    category: "Business",
    icon: "📘",
    pageWidth: "6in",
    pageHeight: "9in",
    css: `
${baseReset()}
:root{
--body-font:${INTER};
--body-size:1rem;
--body-line-height:1.6;
--body-color:#1e1e24;
--bg-color:#ffffff;
--accent-color:#2563eb;
--p-mb:0.5em;
}
h1{font-family:${DM_SANS};font-size:1.9rem;font-weight:700;color:#0a0a0f;margin:2em 0 0.6em;letter-spacing:-0.02em}
h2{font-family:${DM_SANS};font-size:1.4rem;font-weight:600;color:#0a0a0f;margin:1.6em 0 0.4em;letter-spacing:-0.01em}
h3{font-family:${DM_SANS};font-size:1.15rem;font-weight:600;color:#1e1e24;margin:1.2em 0 0.3em}
.chapter-title{font-family:${DM_SANS};font-size:2.2rem;font-weight:800;color:#0a0a0f;margin:2.5em 0 0.3em;letter-spacing:-0.03em}
.chapter-number{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.15em;color:#2563eb;font-weight:600}
blockquote{border-left:3px solid #2563eb;background:#f8fafc;padding:0.8em 1em;border-radius:4px;font-style:normal}
pre{background:#f1f5f9;padding:1em;border-radius:8px}
code{background:#f1f5f9;padding:0.15em 0.4em;border-radius:4px}
hr{margin:2em 0;border-top:2px solid #e2e8f0}
`,
  },
  {
    id: "literary",
    name: "Literary",
    description: "For novels and fiction — drop caps, ornamental breaks, elegant spacing.",
    category: "Fiction",
    icon: "📚",
    pageWidth: "5.5in",
    pageHeight: "8.5in",
    css: `
${baseReset()}
:root{
--body-font:${MERRIWEATHER};
--body-size:1rem;
--body-line-height:1.75;
--body-color:#2a2520;
--bg-color:#fefcf8;
--accent-color:#b8860b;
--p-mb:0;
}
p{text-indent:1.5em;margin-bottom:0}
p:first-of-type{text-indent:0}
p:first-of-type::first-letter{font-size:3.6em;float:left;line-height:0.8;padding-right:8px;padding-top:4px;color:#b8860b;font-family:${PLAYFAIR}}
.chapter-title{font-family:${PLAYFAIR};font-size:2.4rem;font-weight:700;color:#1a1510;text-align:center;margin:3em 0 0.2em;letter-spacing:0.02em}
.chapter-number{font-size:0.8rem;text-transform:uppercase;letter-spacing:0.3em;color:#b8860b;text-align:center;margin-bottom:1em}
h1{font-family:${PLAYFAIR};font-size:1.8rem;font-weight:700;color:#1a1510;margin:2em 0 0.5em}
h2{font-family:${PLAYFAIR};font-size:1.4rem;font-weight:600;color:#1a1510;margin:1.5em 0 0.4em}
blockquote{font-style:italic;color:#5a4f42}
hr{border:none;text-align:center;margin:2em 0;font-size:1.2em;color:#b8860b;letter-spacing:0.5em}
hr::after{content:"✻ ✻ ✻"}
`,
  },
  {
    id: "technical",
    name: "Technical",
    description: "Code-friendly with monospace, dark code blocks, and structured layout.",
    category: "Technical",
    icon: "💻",
    pageWidth: "7in",
    pageHeight: "9in",
    css: `
${baseReset()}
:root{
--body-font:${CABIN};
--body-size:0.95rem;
--body-line-height:1.6;
--body-color:#1a1a1e;
--bg-color:#fafafa;
--accent-color:#6366f1;
--p-mb:0.5em;
}
h1{font-family:${DM_SANS};font-size:1.8rem;font-weight:700;color:#0a0a0f;margin:1.8em 0 0.4em;letter-spacing:-0.02em}
h2{font-family:${DM_SANS};font-size:1.35rem;font-weight:600;color:#0a0a0f;margin:1.4em 0 0.3em;letter-spacing:-0.01em}
h3{font-family:${DM_SANS};font-size:1.1rem;font-weight:600;color:#1a1a1e;margin:1em 0 0.2em}
.chapter-title{font-family:${DM_SANS};font-size:2rem;font-weight:800;color:#0a0a0f;margin:2em 0 0.2em;letter-spacing:-0.03em}
.chapter-number{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;font-weight:700;font-family:${JETBRAINS}}
pre{background:#0f172a;color:#e2e8f0;padding:1em;border-radius:8px;font-size:0.8rem;line-height:1.5;margin:0.8em 0;overflow-x:auto}
code{font-family:${JETBRAINS};background:#f1f5f9;padding:0.15em 0.4em;border-radius:4px;font-size:0.85em}
pre code{background:transparent;padding:0}
blockquote{border-left:3px solid #6366f1;background:#f8f8ff;padding:0.8em 1em;margin:0.8em 0}
ul,ol{padding-left:1.2em}
table{font-size:0.85em}
th{background:#6366f1}
`,
  },
  {
    id: "minimal",
    name: "Minimalist",
    description: "Maximum whitespace, subtle typography, modern minimal design.",
    category: "Design",
    icon: "◇",
    pageWidth: "5.5in",
    pageHeight: "8.5in",
    css: `
${baseReset()}
:root{
--body-font:${SOURCE_SANS};
--body-size:1rem;
--body-line-height:1.65;
--body-color:#333336;
--bg-color:#ffffff;
--accent-color:#000000;
--p-mb:0.4em;
}
h1{font-family:${DM_SANS};font-size:1.6rem;font-weight:200;color:#000;margin:2.5em 0 0.5em;letter-spacing:0.05em;text-transform:uppercase}
h2{font-family:${DM_SANS};font-size:1.2rem;font-weight:300;color:#000;margin:1.8em 0 0.3em;letter-spacing:0.03em}
h3{font-family:${DM_SANS};font-size:1rem;font-weight:400;color:#333;margin:1.2em 0 0.2em}
.chapter-title{font-family:${DM_SANS};font-size:2rem;font-weight:200;color:#000;margin:3em 0 0.3em;letter-spacing:0.08em;text-transform:uppercase}
.chapter-number{font-size:0.65rem;letter-spacing:0.3em;color:#999;font-weight:400;text-transform:uppercase}
blockquote{border:none;padding:0.5em 1.5em;color:#666;font-size:0.95em;font-style:normal}
pre{background:#f5f5f5;padding:1em;border-radius:0}
code{background:#f5f5f5;padding:0.15em 0.3em}
table{font-size:0.85em}
th{background:#000;color:#fff;font-weight:400}
hr{border:none;border-top:1px solid #eee}
p:first-of-type::first-letter{font-size:2.8em;float:left;line-height:0.85;padding-right:4px;font-weight:200}
`,
  },
  {
    id: "academic",
    name: "Academic",
    description: "Formal scholarly layout with serif body, footnotes, and structured headings.",
    category: "Academic",
    icon: "🎓",
    pageWidth: "6.14in",
    pageHeight: "9.21in",
    css: `
${baseReset()}
:root{
--body-font:${LORA};
--body-size:0.95rem;
--body-line-height:1.65;
--body-color:#26221c;
--bg-color:#fefcf9;
--accent-color:#7b2d26;
--p-mb:0.4em;
}
h1{font-family:${MERRIWEATHER};font-size:1.6rem;font-weight:600;color:#1a1510;margin:2.5em 0 0.3em}
h2{font-family:${MERRIWEATHER};font-size:1.25rem;font-weight:600;color:#1a1510;margin:2em 0 0.3em}
h3{font-family:${MERRIWEATHER};font-size:1.05rem;font-weight:500;color:#26221c;margin:1.2em 0 0.2em}
.chapter-title{font-family:${MERRIWEATHER};font-size:2rem;font-weight:700;color:#1a1510;margin:2.5em 0 0.3em}
.chapter-number{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#7b2d26}
blockquote{border-left:2px solid #7b2d26;padding:0.5em 1em;font-size:0.9em;color:#4a4036}
pre{background:#f0ede8;padding:0.8em;border-radius:4px;font-size:0.8rem}
code{background:#f0ede8;padding:0.15em 0.3em}
table{font-size:0.8em}
th{background:#7b2d26}
sup{font-size:0.7em;vertical-align:super;line-height:1}
.footnote{font-size:0.8em;color:#666;border-top:1px solid #ccc;margin-top:1.5em;padding-top:0.5em}
`,
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Luxury feel with ornamental dividers, refined colors, premium typography.",
    category: "Premium",
    icon: "✦",
    pageWidth: "6in",
    pageHeight: "9in",
    css: `
${baseReset()}
:root{
--body-font:${PLAYFAIR};
--body-size:1.05rem;
--body-line-height:1.7;
--body-color:#2a2220;
--bg-color:#fdfbf9;
--accent-color:#b8860b;
--p-mb:0.5em;
}
h1{font-family:${PLAYFAIR};font-size:1.9rem;font-weight:600;color:#1a1210;margin:2.5em 0 0.5em;letter-spacing:0.01em}
h2{font-family:${PLAYFAIR};font-size:1.45rem;font-weight:500;color:#1a1210;margin:2em 0 0.4em;letter-spacing:0.01em}
h3{font-family:${PLAYFAIR};font-size:1.15rem;font-weight:500;color:#2a2220;margin:1.2em 0 0.3em}
.chapter-title{font-family:${PLAYFAIR};font-size:2.6rem;font-weight:600;color:#1a1210;text-align:center;margin:2.5em 0 0.2em;letter-spacing:0.05em}
.chapter-number{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.25em;color:#b8860b;text-align:center}
blockquote{color:#5a4f42;border-left:1px solid #b8860b;padding-left:1.2em}
pre{background:#f5f0eb;padding:1em;border-radius:4px}
code{background:#f5f0eb;padding:0.15em 0.4em}
table{font-size:0.85em}
th{background:#b8860b}
hr{border:none;text-align:center;margin:2em 0}
hr::after{content:"✦ ✦ ✦";font-size:0.8em;color:#b8860b;letter-spacing:0.5em}
p:first-of-type::first-letter{font-size:3.5em;float:left;line-height:0.8;padding-right:6px;padding-top:4px;color:#b8860b;font-weight:500}
`,
  },
  {
    id: "bold",
    name: "Bold Contemporary",
    description: "Strong headings, vibrant accent colors, modern editorial design.",
    category: "Business",
    icon: "🔥",
    pageWidth: "6in",
    pageHeight: "9in",
    css: `
${baseReset()}
:root{
--body-font:${DM_SANS};
--body-size:1rem;
--body-line-height:1.6;
--body-color:#1c1917;
--bg-color:#fafaf9;
--accent-color:#dc2626;
--p-mb:0.4em;
}
h1{font-family:${DM_SANS};font-size:2.2rem;font-weight:900;color:#0a0a0f;margin:1.8em 0 0.3em;letter-spacing:-0.03em;text-transform:uppercase}
h2{font-family:${DM_SANS};font-size:1.5rem;font-weight:700;color:#0a0a0f;margin:1.4em 0 0.3em;letter-spacing:-0.02em}
h3{font-family:${DM_SANS};font-size:1.15rem;font-weight:700;color:#1c1917;margin:1em 0 0.2em}
.chapter-title{font-family:${DM_SANS};font-size:2.8rem;font-weight:900;color:#0a0a0f;margin:1.5em 0 0.1em;letter-spacing:-0.04em;text-transform:uppercase;line-height:1.1}
.chapter-number{font-size:0.7rem;font-weight:700;letter-spacing:0.1em;color:#dc2626;text-transform:uppercase}
blockquote{border-left:4px solid #dc2626;padding:0.5em 1em;background:#fef2f2;border-radius:0 4px 4px 0}
pre{background:#1c1917;color:#fafaf9;padding:1em;border-radius:8px}
code{background:#fef2f2;color:#dc2626;padding:0.15em 0.4em;border-radius:4px}
pre code{background:transparent;color:#fafaf9}
table{font-size:0.85em}
th{background:#dc2626}
hr{border:none;height:4px;background:#dc2626;margin:2em 0;border-radius:2px}
`,
  },
];

export default templates;

export function getTemplate(id: string): EbookTemplate {
  return templates.find((t) => t.id === id) || templates[0];
}
