import hljs from "highlight.js";

const HTTP_METHOD_COLORS: Record<string, string> = {
  GET: "#16a34a",
  POST: "#2563eb",
  PUT: "#ca8a04",
  PATCH: "#7c3aed",
  DELETE: "#dc2626",
  HEAD: "#6b7280",
  OPTIONS: "#6b7280",
};

const HTTP_METHODS = Object.keys(HTTP_METHOD_COLORS);

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function highlightCode(code: string, lang?: string): string {
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  } catch {
    return escapeHtml(code);
  }
}

function isDirTree(code: string): boolean {
  const lines = code.split("\n").filter(Boolean);
  if (lines.length < 2) return false;
  const treeChars = lines.some((l) => /[├└│]/.test(l));
  const hasNames = lines.some((l) => /[/.]/.test(l.replace(/[├└│─\s]/g, "")));
  return treeChars || (hasNames && lines.every((l) => /^[\s├└│─]*[^\s]/.test(l)));
}

interface TreeNode {
  name: string;
  isDir: boolean;
  children: TreeNode[];
  ext: string;
}

function parseTreeLines(lines: string[]): TreeNode[] {
  const stack: { node: TreeNode; indent: number }[] = [];
  const roots: TreeNode[] = [];

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const name = line.replace(/^[├└│─\s]+/, "").trim();
    if (!name) continue;

    const treePart = line.replace(/[^├└│─\s]/g, "");
    const indent = treePart.length;
    const isDir = name.endsWith("/");
    const cleanName = isDir ? name.slice(0, -1) : name;
    const ext = !isDir && cleanName.includes(".") ? cleanName.split(".").pop()!.toLowerCase() : "";
    const node: TreeNode = { name: cleanName, isDir, children: [], ext };

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    if (stack.length > 0) {
      stack[stack.length - 1].node.children.push(node);
    } else {
      roots.push(node);
    }
    stack.push({ node, indent });
  }
  return roots;
}

const EXT_COLORS: Record<string, string> = {
  py: "#3572A5", js: "#f7df1e", ts: "#3178c6", tsx: "#3178c6", jsx: "#61dafb",
  json: "#292929", md: "#083fa1", yml: "#cb171e", yaml: "#cb171e",
  toml: "#8b5cf6", env: "#f59e0b", gitignore: "#e34c26", txt: "#6b7280",
  css: "#563d7c", html: "#e34c26", lock: "#7c3aed", png: "#c925d1",
  jpg: "#c925d1", svg: "#ffb13b", sh: "#4eaa25", bash: "#4eaa25",
  rs: "#dea584", go: "#00add8", rb: "#cc342d", php: "#777bb4",
  java: "#b07219", kt: "#7f52ff", swift: "#f05138", vue: "#42b883",
  svelte: "#ff3e00", mjs: "#f7df1e", cjs: "#f7df1e", wasm: "#654ff0",
};

function renderTreeUl(nodes: TreeNode[]): string {
  if (nodes.length === 0) return "";
  let html = "<ul class=\"dt-ul\">\n";
  for (const node of nodes) {
    const hasKids = node.children.length > 0;
    html += "<li class=\"dt-li\">\n";
    html += `<span class="dt-label${node.isDir ? " dt-label-dir" : ""}">`;
    html += `<span class="dt-ic">${node.isDir ? "📁" : "📄"}</span>`;
    html += `<span class="dt-n">${node.name}</span>`;
    if (node.ext) {
      const ec = EXT_COLORS[node.ext] || "#6b7280";
      html += `<span class="dt-e" style="--ec:${ec}">${node.ext}</span>`;
    }
    html += "</span>\n";
    if (hasKids) html += renderTreeUl(node.children);
    html += "</li>\n";
  }
  html += "</ul>\n";
  return html;
}

function renderDirTree(code: string): string {
  const lines = code.split("\n").filter((l) => l.trim());
  const roots = parseTreeLines(lines);
  const html = renderTreeUl(roots);
  return `<div class="dir-tree">\n${html}</div>`;
}

const TERMINAL_REGEX = /^[$>\u276F]\s*(.+)$/m;

function isTerminalBlock(code: string, lang?: string): boolean {
  if (lang && ["bash", "sh", "shell", "terminal", "console", "zsh"].includes(lang)) return true;
  return TERMINAL_REGEX.test(code);
}

function renderTerminalBlock(code: string): string {
  const lines = code.split("\n");
  let html = '<div class="terminal-block">\n';
  html += '<div class="terminal-header"><span class="terminal-dot" style="background:#ff5f57"></span><span class="terminal-dot" style="background:#febc2e"></span><span class="terminal-dot" style="background:#28c840"></span><span class="terminal-title" style="margin-left:0.5em;font-size:0.75em;color:#999">terminal</span></div>\n';
  html += '<div class="terminal-body">\n';
  for (const line of lines) {
    const trimmed = line.trimEnd();
    const match = trimmed.match(/^[$>\u276F]\s*(.*)$/);
    if (match) {
      const cmd = match[1];
      html += `<div class="terminal-line"><span class="terminal-prompt" style="color:#22c55e;font-weight:700;margin-right:0.3em">$</span><span class="terminal-command">${highlightTerminalCommand(cmd)}</span></div>\n`;
    } else {
      html += `<div class="terminal-line terminal-output" style="color:#bbb">${highlightTerminalCommand(trimmed)}</div>\n`;
    }
  }
  html += "</div></div>";
  return html;
}

function highlightTerminalCommand(cmd: string): string {
  return cmd
    .replace(/(--[\w-]+)/g, '<span style="color:#22d3ee">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span style="color:#eab308">$1</span>')
    .replace(/(\'[^\']*\')/g, '<span style="color:#eab308">$1</span>')
    .replace(/(?<=^|\s)(\/[^\s]+)/g, '<span style="color:#818cf8">$1</span>')
    .replace(/(?<=^|\s)(-[a-zA-Z])(?=\s|$)/g, '<span style="color:#22d3ee">$1</span>')
    .replace(/(?<=^|\s)([A-Z_]+)(?=\s|$)/g, '<span style="color:#f472b6">$1</span>');
}

let _marked: typeof import("marked") | null = null;
function getMarked(): typeof import("marked") {
  if (!_marked) _marked = require("marked") as typeof import("marked");
  return _marked;
}

export function renderMarkdown(md: string): string {
  const { marked } = getMarked();
  let html = marked.parse(md, { async: false }) as string;

  // Process code blocks
  html = html.replace(
    /<pre><code(?: class="language-(\w+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_match: string, lang: string | undefined, code: string) => {
      const decoded = code
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"');

      // Check for Mermaid diagram
      if (lang === "mermaid" || lang === "flowchart" || lang === "sequence" || lang === "gantt") {
        return `<div class="mermaid">${decoded.trim()}</div>`;
      }

      // Check for directory tree
      if (isDirTree(decoded)) {
        return renderDirTree(decoded);
      }

      // Check for terminal
      if (isTerminalBlock(decoded, lang)) {
        return renderTerminalBlock(decoded);
      }

      // Default: syntax highlighted code block
      const highlighted = highlightCode(decoded, lang);
      return `<pre><code class="hljs${lang ? ` language-${lang}` : ""}">${highlighted}</code></pre>`;
    }
  );

  return html;
}

function progressBarHtml(pct: number): string {
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : pct >= 30 ? "#f97316" : "#ef4444";
  return `<span class="prog-bar"><span class="prog-track"><span class="prog-fill" style="width:${pct}%;background:${color}"></span></span><span class="prog-pct">${pct}%</span></span>`;
}

export function renderMath(html: string): string {
  const codeBlocks: string[] = [];
  let result = html.replace(
    /<pre><code(?: class="[^"]*")?>[\s\S]*?<\/code><\/pre>/g,
    (match) => {
      codeBlocks.push(match);
      return `\x00MATH_PROTECT_${codeBlocks.length - 1}\x00`;
    }
  );

  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_m: string, c: string) => {
    return `<div class="math-display">$$${escapeHtml(c)}$$</div>`;
  });

  result = result.replace(/\$([^$\n]+?)\$/g, (_m: string, c: string) => {
    return `<span class="math-inline">$${escapeHtml(c)}$</span>`;
  });

  result = result.replace(
    /\x00MATH_PROTECT_(\d+)\x00/g,
    (_m: string, i: string) => codeBlocks[parseInt(i)]
  );

  return result;
}

export function processHtml(html: string): string {
  // Grid system: ::: grid → <div class="grid">, ::: col → <div class="grid-col">
  html = html.replace(
    /<p>:::\s*grid\s*<\/p>([\s\S]*?)<p>:::\s*<\/p>/g,
    (_match: string, inner: string) => {
      const cols = inner.replace(/<p>:::\s*col\s*<\/p>/g, '<div class="grid-col">')
        .replace(/<p>:::\s*<\/p><\/div>/g, '</div>');
      return `<div class="grid">${cols}</div>`;
    }
  );

  // Enhanced tables: wrap in responsive container, add sort data attributes, sticky headers
  html = html.replace(
    /<table>/g,
    () => `<div class="table-responsive"><table class="table-enhanced" data-sortable="true">`
  );
  html = html.replace(
    /<\/table>/g,
    () => `</table></div>`
  );
  // Add sticky header class to thead
  html = html.replace(
    /<thead>/g,
    () => `<thead class="table-thead-sticky">`
  );
  // Add data-label attributes to td cells for responsive
  html = html.replace(
    /<table[^>]*class="table-enhanced"[^>]*>[\s\S]*?<\/table>/g,
    (table: string) => {
      // Get headers from thead
      const headers: string[] = [];
      const headerMatch = table.match(/<thead>[\s\S]*?<\/thead>/);
      if (headerMatch) {
        const ths = headerMatch[0].match(/<th[^>]*>([\s\S]*?)<\/th>/g);
        if (ths) ths.forEach((th, i) => { headers[i] = th.replace(/<th[^>]*>([\s\S]*?)<\/th>/, "$1").replace(/<[^>]*>/g, "").trim(); });
      }
      if (headers.length === 0) return table;
      // Add data-label to td cells
      return table.replace(/<td[^>]*>([\s\S]*?)<\/td>/g, (td, content, idx) => {
        const colIdx = countPrecedingTds(td, table);
        const label = headers[colIdx] || "";
        return `<td data-label="${label.replace(/"/g, "&quot;")}">${content}</td>`;
      });
    }
  );

  // Image with caption from title attribute: ![alt](src "caption")
  html = html.replace(
    /<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*title="([^"]*)"[^>]*\/?>/g,
    (_match: string, src: string, alt: string, caption: string) => {
      return `<figure class="image-figure"><img src="${src}" alt="${alt}" /><figcaption class="figcaption">${caption}</figcaption></figure>`;
    }
  );

  // Image with caption from separate italic paragraph: ![](src) followed by *caption*
  html = html.replace(
    /<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>\s*<p><em>([^<]+)<\/em><\/p>/g,
    (_match: string, src: string, alt: string, caption: string) => {
      return `<figure class="image-figure"><img src="${src}" alt="${alt}" /><figcaption class="figcaption">${caption}</figcaption></figure>`;
    }
  );

  // Images without caption → wrapped anyway
  html = html.replace(
    /<img[^>]+>/g,
    (imgTag: string) => {
      if (imgTag.includes('class="image-figure"')) return imgTag;
      return `<span class="image-wrapper">${imgTag}</span>`;
    }
  );

  // Inline progress bars: [====>      ] 50% or [###......] 30%
  html = html.replace(
    /\[([=#>\-\.\s]+)\]\s*(\d+)%/g,
    (_match: string, bar: string, pct: string) => {
      const filled = (bar.match(/[=#]/g) || []).length;
      const total = bar.replace(/[^=#>\-\.\s]/g, "").length || 10;
      const pctVal = Math.min(100, Math.max(0, parseInt(pct) || Math.round((filled / Math.max(total, 1)) * 100)));
      return progressBarHtml(pctVal);
    }
  );

  // Unicode block progress bars: ████████░░ 80%
  html = html.replace(
    /((?:[█▉▊▋▌▍▎▏░]+))\s*(\d+)%/g,
    (_match: string, blocks: string, pct: string) => {
      const pctVal = Math.min(100, Math.max(0, parseInt(pct)));
      return progressBarHtml(pctVal);
    }
  );

  // Block chart bars in paragraphs: "Label ████████ 80" or "Label ████████████████ 50"
  html = html.replace(
    /<p>([^<]+?)\s{2,}((?:[█▉▊▋▌▍▎▏░]+))\s*(\d{1,3})\s*<\/p>/g,
    (_match: string, label: string, blocks: string, val: string) => {
      const num = Math.min(100, Math.max(0, parseInt(val)));
      return `<div class="chart-bar"><span class="chart-label">${label.trim()}</span><span class="chart-track"><span class="chart-fill" style="width:${num}%"></span></span><span class="chart-val">${num}</span></div>`;
    }
  );

  // GitHub-style alerts: > [!NOTE], > [!TIP], > [!WARNING], > [!DANGER]
  html = html.replace(
    /<blockquote>\s*<p>\[!(NOTE|TIP|WARNING|DANGER|INFO|CAUTION)\]\s*([\s\S]*?)<\/p>\s*<\/blockquote>/g,
    (_match: string, type: string, content: string) => {
      const icons: Record<string, string> = {
        NOTE: "ℹ️", TIP: "💡", WARNING: "⚠️", DANGER: "🚨", INFO: "ℹ️", CAUTION: "⚠️",
      };
      const icon = icons[type] || "ℹ️";
      return `<div class="callout callout-${type.toLowerCase()}"><p class="callout-header">${icon} ${type}</p><div class="callout-body">${content}</div></div>`;
    }
  );

  // Checklists: [ ] and [x] in list items
  html = html.replace(
    /<li>(\[ \]|\[x\])\s*([\s\S]*?)<\/li>/g,
    (_match: string, checkbox: string, text: string) => {
      const checked = checkbox === "[x]";
      const chk = checked
        ? `<input type="checkbox" checked disabled class="chk-list" />`
        : `<input type="checkbox" disabled class="chk-list" />`;
      return `<li class="chk-item">${chk} ${text}</li>`;
    }
  );

  // Timeline: :::timeline … :::
  html = html.replace(
    /<p>:::\s*timeline\s*<\/p>([\s\S]*?)<p>:::\s*<\/p>/g,
    (_match: string, inner: string) => {
      const items = inner.split(/<p>:::\s*item\s*<\/p>/g).filter(Boolean);
      let body = "";
      for (let i = 0; i < items.length; i++) {
        const side = i % 2 === 0 ? "left" : "right";
        body += `<div class="tl-item tl-${side}"><div class="tl-marker"></div><div class="tl-content">${items[i]}</div></div>`;
      }
      return `<div class="timeline">${body}</div>`;
    }
  );

  // Pros & Cons: :::pros … ::: and :::cons … :::
  html = html.replace(
    /<p>:::\s*(pros|cons)\s*<\/p>([\s\S]*?)<p>:::\s*<\/p>/g,
    (_match: string, type: string, content: string) => {
      const label = type === "pros" ? "✅ Pros" : "❌ Cons";
      const cls = type === "pros" ? "pros-box" : "cons-box";
      return `<div class="${cls}"><p class="pc-header">${label}</p><div class="pc-body">${content}</div></div>`;
    }
  );

  // Key Takeaways: :::takeaway … :::
  html = html.replace(
    /<p>:::\s*takeaway\s*<\/p>([\s\S]*?)<p>:::\s*<\/p>/g,
    (_match: string, content: string) => {
      return `<div class="takeaway-box"><p class="takeaway-header">⭐ Key Takeaways</p><div class="takeaway-body">${content}</div></div>`;
    }
  );

  // FAQ: :::faq … :::
  html = html.replace(
    /<p>:::\s*faq\s*<\/p>([\s\S]*?)<p>:::\s*<\/p>/g,
    (_match: string, inner: string) => {
      const faqItems = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g);
      if (!faqItems) return `<div class="faq-box">${inner}</div>`;
      let acc = `<div class="faq-box">`;
      for (const item of faqItems) {
        const qMatch = item.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
        const aMatch = item.match(/<p>([\s\S]*?)<\/p>/);
        if (qMatch && aMatch) {
          acc += `<details class="faq-item"><summary class="faq-q">${qMatch[1]}</summary><div class="faq-a">${aMatch[1]}</div></details>`;
        }
      }
      acc += `</div>`;
      return acc;
    }
  );

  // Terminal-style inline commands (not in code blocks)
  html = html.replace(
    /(?<=^|\s)([$>\u276F])\s+([^\n<]+)/gm,
    (_match: string, prompt: string, cmd: string) => {
      return `<span class="inline-terminal" style="display:inline-flex;align-items:center;gap:0.3em;background:#1a1a2e;color:#fff;padding:0.1em 0.5em;border-radius:4px;font-family:monospace;font-size:0.85em"><span style="color:#22c55e;font-weight:700">${prompt}</span><span>${highlightTerminalCommand(cmd)}</span></span>`;
    }
  );

  // HTTP METHOD /path routes
  html = html.replace(
    new RegExp(`\\b(${HTTP_METHODS.join("|")})\\s+(\\/[^\\s<"'\\)]+)`, "g"),
    (_match: string, method: string, path: string) => {
      const color = HTTP_METHOD_COLORS[method] || "#6b7280";
      return badge(method, color) + pathSpan(path);
    }
  );

  // Standalone HTTP method mentions
  html = html.replace(
    new RegExp(`\\b(${HTTP_METHODS.join("|")})\\b(?!\\s*\\/)`, "g"),
    (method: string) => {
      const color = HTTP_METHOD_COLORS[method] || "#6b7280";
      return badge(method, color);
    }
  );

  // File paths
  html = html.replace(
    /(?<=^|[\s(,;])(\/[a-zA-Z0-9_@.\-~]+(?:\/[a-zA-Z0-9_@.\-~]+)+(?:\.[a-zA-Z0-9]+)?)(?=[\s,;:.!?)]|$)/gm,
    (_match: string, path: string) => {
      return filePathSpan(path);
    }
  );

  html = renderMath(html);
  return html;
}

function badge(method: string, color: string): string {
  return `<span class="http-badge" style="display:inline-flex;align-items:center;gap:4px;background:${color}1a;color:${color};font-weight:700;font-size:.78em;padding:.12em .5em;border-radius:4px;font-family:ui-monospace,monospace;letter-spacing:.03em;line-height:1.4;vertical-align:middle">${method}</span>`;
}

function pathSpan(path: string): string {
  return `<span class="http-path" style="font-family:ui-monospace,monospace;font-size:.88em;color:inherit;margin-left:.2em">${path}</span>`;
}

function filePathSpan(path: string): string {
  return `<span class="file-path" style="font-family:ui-monospace,monospace;font-size:.85em;padding:.08em .35em;border-radius:3px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.15);color:#6366f1;white-space:nowrap;vertical-align:middle">${path}</span>`;
}

function countPrecedingTds(td: string, table: string): number {
  const before = table.slice(0, table.indexOf(td));
  const matches = before.match(/<td[^>]*>[\s\S]*?<\/td>/g);
  return matches ? matches.length : 0;
}

const contentCache = new Map<string, string>();
export function processContentHtml(chapterContent: string): string {
  const cached = contentCache.get(chapterContent);
  if (cached) return cached;
  const html = renderMarkdown(chapterContent);
  const result = processHtml(html);
  if (chapterContent.length > 50) {
    contentCache.set(chapterContent, result);
    if (contentCache.size > 200) {
      const first = contentCache.keys().next().value;
      if (first) contentCache.delete(first);
    }
  }
  return result;
}

export function clearContentCache(): void {
  contentCache.clear();
}
