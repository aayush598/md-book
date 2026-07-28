import type { EbookCover } from "./ebook-storage";

const PAGE_SIZE_MAP: Record<string, { width: string; height: string }> = {
  "5x8": { width: "5in", height: "8in" },
  "5.5x8.5": { width: "5.5in", height: "8.5in" },
  "6x9": { width: "6in", height: "9in" },
  "6.14x9.21": { width: "6.14in", height: "9.21in" },
  "7x9": { width: "7in", height: "9in" },
  "8.5x11": { width: "8.5in", height: "11in" },
};

export function getCoverCss(cover: EbookCover, pageSize: string): string {
  const ps = PAGE_SIZE_MAP[pageSize] || PAGE_SIZE_MAP["6x9"];

  return `
@page{size:${ps.width} ${ps.height};margin:0}
.cover-page{page-break-after:always;break-after:page;overflow:hidden;position:relative}
.cover-image-page{width:100vw;height:100vh;overflow:hidden;position:relative;background:#000}
.cover-image-page img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.cover-content-page{width:100vw;height:100vh;overflow:hidden;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center}
.cover-content-page .cover-content{text-align:center;padding:2em;max-width:90%;position:relative;z-index:1}
.cover-content-page .cover-title{font-size:${cover.titleFontSize}px;font-weight:800;line-height:1.1;margin-bottom:0.3em;word-wrap:break-word}
.cover-content-page .cover-subtitle{font-size:${Math.round(cover.titleFontSize * 0.45)}px;font-weight:400;margin-bottom:0.5em;opacity:0.9}
.cover-content-page .cover-author{font-size:${Math.round(cover.titleFontSize * 0.3)}px;font-weight:500;letter-spacing:0.15em;text-transform:uppercase;opacity:0.7}
`;
}

export function renderCoverPage(cover: EbookCover, pageSize: string): string {
  // If cover image is present: full-bleed image page, no text
  if (cover.coverImage) {
    return `<div class="cover-page cover-image-page">
  <img src="${cover.coverImage}" alt="Cover" />
</div>`;
  }

  // No cover image: title/subtitle/author centered on colored page
  const bgStyle = `background:${cover.bgColor};color:${cover.textColor}`;
  const titleHtml = `<h1 class="cover-title" style="color:${cover.textColor}">${cover.title || "Untitled"}</h1>`;
  const subtitleHtml = cover.subtitle ? `<p class="cover-subtitle" style="color:${cover.accentColor}">${cover.subtitle}</p>` : "";
  const authorHtml = `<p class="cover-author" style="color:${cover.textColor}">${cover.author || "Unknown Author"}</p>`;

  return `<div class="cover-page cover-content-page" style="${bgStyle}">
  <div class="cover-content">
    ${titleHtml}
    ${subtitleHtml}
    ${authorHtml}
  </div>
</div>`;
}
