import hljs from "highlight.js";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { contentToMarkdown, type EbookProject } from "./ebook-storage";
import { getTemplate } from "@/components/ebook/templates";
import { processContentHtml } from "./markdown-extensions";
import { themeToCss } from "./ebook-theme";
import { renderCoverPage } from "./cover-page";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "chapter";
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function hljsCss(): string {
  return `
.hljs{display:block;overflow-x:auto;padding:1em;color:#24292e;background:#f6f8fa;border-radius:6px}
.hljs-comment,.hljs-quote{color:#6a737d;font-style:italic}
.hljs-keyword,.hljs-selector-tag,.hljs-subst{color:#d73a49}
.hljs-number,.hljs-literal,.hljs-variable,.hljs-template-variable,.hljs-tag .hljs-attr{color:#005cc5}
.hljs-string,.hljs-doctag{color:#032f62}
.hljs-title,.hljs-section,.hljs-selector-id{color:#6f42c1}
.hljs-type,.hljs-class .hljs-title{color:#6f42c1}
.hljs-tag,.hljs-name,.hljs-attribute{color:#22863a}
.hljs-regexp,.hljs-link{color:#032f62}
.hljs-symbol,.hljs-bullet{color:#005cc5}
.hljs-built_in,.hljs-builtin-name{color:#6f42c1}
.hljs-meta{color:#6a737d}
.hljs-deletion{background:#ffeef0}
.hljs-addition{background:#f0fff4}
.hljs-emphasis{font-style:italic}
.hljs-strong{font-weight:bold}
pre{overflow-x:auto;white-space:pre-wrap;word-wrap:break-word;border-radius:6px;margin:1em 0}
pre code.hljs{padding:1em;border-radius:6px;font-size:0.85em;line-height:1.5}
code:not(.hljs){font-family:monospace;font-size:0.85em;padding:0.15em 0.3em;border-radius:3px;background:#f5f5f5}
.http-badge{display:inline-flex;align-items:center;gap:4px;font-weight:700;font-size:.78em;padding:.12em .5em;border-radius:4px;font-family:monospace;letter-spacing:.03em;line-height:1.4;vertical-align:middle}
.http-path{font-family:monospace;font-size:.88em;margin-left:.2em}
.file-path{font-family:monospace;font-size:.85em;padding:.08em .35em;border-radius:3px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.15);color:#6366f1;white-space:nowrap;vertical-align:middle}
.mermaid *::first-letter,.mermaid *::first-line{all:unset!important;font-size:inherit!important;float:none!important;color:inherit!important}
.cover-page *::first-letter,.cover-page *::first-line{all:unset!important;font-size:inherit!important;float:none!important;color:inherit!important}
`;
}

export async function generateEpub(project: EbookProject): Promise<void> {
  const template = getTemplate(project.templateId);
  const zip = new JSZip();

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  zip.file("META-INF/container.xml", `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const sorted = [...project.chapters].sort((a, b) => a.order - b.order);

  const chapterFiles: { id: string; xhtml: string }[] = [];
  let tocItems = "";

  // Add cover page as first item if enabled
  let coverIndex = 0;
  if (project.cover.showCoverPage) {
    const coverHtml = renderCoverPage(project.cover, project.pageSize);
    const coverXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Cover</title>
<link rel="stylesheet" type="text/css" href="styles.css"/></head>
<body>
${coverHtml}
</body>
</html>`;
    zip.file("OEBPS/cover.xhtml", coverXhtml);
    chapterFiles.push({ id: "cover", xhtml: "cover.xhtml" });
    tocItems += `<navPoint id="nav-cover" playOrder="1">
  <navLabel><text>Cover</text></navLabel>
  <content src="cover.xhtml"/>
</navPoint>`;
    coverIndex = 1;
  }

  sorted.forEach((ch, i) => {
    const num = String(i + 1).padStart(3, "0");
    const slug = slugify(ch.title) || `chapter-${num}`;
    const html = processContentHtml(ch.content);

    const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(ch.title)}</title>
<link rel="stylesheet" type="text/css" href="styles.css"/></head>
<body>
<div class="chapter">
<h1 class="chapter-title">${escapeXml(ch.title)}</h1>
${html}
</div>
</body>
</html>`;

    const filename = `chapter-${num}.xhtml`;
    zip.file(`OEBPS/${filename}`, xhtml);

    chapterFiles.push({ id: `chapter-${num}`, xhtml: filename });

    const playOrder = i + coverIndex + 1;
    tocItems += `<navPoint id="nav-${num}" playOrder="${playOrder}">
  <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
  <content src="${filename}"/>
</navPoint>`;
  });

  // Nav XHTML
  const navItems = sorted.map((ch, i) => {
    const num = String(i + 1).padStart(3, "0");
    return `<li><a href="chapter-${num}.xhtml">${escapeXml(ch.title)}</a></li>`;
  }).join("\n");

  const coverNavItem = project.cover.showCoverPage
    ? `<li><a href="cover.xhtml">Cover</a></li>`
    : "";

  const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body>
<nav epub:type="toc">
<h1>Table of Contents</h1>
<ol>${coverNavItem}${navItems}</ol>
</nav>
</body>
</html>`;
  zip.file("OEBPS/nav.xhtml", navXhtml);

  // NCX
  const ncx = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.dtd.org/2005/ndtd/ncx.dtd">
<ncx version="2005-1" xmlns="http://www.dtd.org/2005/ncx/">
<head>
<meta name="dtb:uid" content="${escapeXml(project.id)}"/>
<meta name="dtb:depth" content="1"/>
<meta name="dtb:totalPageCount" content="0"/>
<meta name="dtb:maxPageNumber" content="0"/>
</head>
<docTitle><text>${escapeXml(project.name)}</text></docTitle>
<docAuthor><text>${escapeXml(project.author)}</text></docAuthor>
<navMap>
${tocItems}
</navMap>
</ncx>`;
  zip.file("OEBPS/toc.ncx", ncx);

  // Content OPF
  const manifest = chapterFiles.map((cf) =>
    `<item id="${cf.id}" href="${cf.xhtml}" media-type="application/xhtml+xml"/>`
  ).join("\n");

  const spine = chapterFiles.map((cf) =>
    `<itemref idref="${cf.id}"/>`
  ).join("\n");

  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="2.0">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
<dc:identifier id="book-id">${escapeXml(project.id)}</dc:identifier>
<dc:title>${escapeXml(project.name)}</dc:title>
<dc:creator opf:role="aut">${escapeXml(project.author)}</dc:creator>
<dc:language>en</dc:language>
<dc:publisher>md book</dc:publisher>
<dc:date>${new Date().toISOString().split("T")[0]}</dc:date>
${project.cover.showCoverPage ? '<meta name="cover" content="cover"/>' : ""}
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml"/>
<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
<item id="styles" href="styles.css" media-type="text/css"/>
${manifest}
</manifest>
<spine toc="ncx">
${spine}
</spine>
<guide>
<reference type="toc" title="Table of Contents" href="nav.xhtml"/>
${project.cover.showCoverPage ? '<reference type="cover" title="Cover" href="cover.xhtml"/>' : ""}
</guide>
</package>`;
  zip.file("OEBPS/content.opf", opf);

  // Styles — merge all CSS
  const mergedCss = `${themeToCss(project.theme)}\n${template.css}\n\n${hljsCss()}
${project.cover.showCoverPage ? `@page{size:${project.cover.showCoverPage ? "6in 9in" : "auto"};margin:0}` : ""}
`;
  zip.file("OEBPS/styles.css", mergedCss);

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${slugify(project.name)}.epub`);
}
