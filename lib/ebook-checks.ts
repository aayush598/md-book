import type { EbookProject } from "./ebook-storage";
import type { BookAnalytics } from "./ebook-analytics";

export interface CheckResult {
  id: string;
  category: "typography" | "contrast" | "spacing" | "margins" | "links" | "images" | "accessibility" | "print" | "metadata" | "content";
  label: string;
  status: "pass" | "warn" | "fail" | "info";
  message: string;
  fix?: string;
}

export function runChecks(project: EbookProject, analytics: BookAnalytics): CheckResult[] {
  const results: CheckResult[] = [];
  const theme = project.theme;
  const meta = project.metadata;

  // Typography
  const bodySize = parseFloat(theme.typography.bodySize) || 1;
  if (bodySize < 0.8) results.push({ id: "body-too-small", category: "typography", label: "Body text size", status: "fail", message: `Body text (${bodySize}rem) is too small. Minimum 0.875rem recommended.`, fix: "Increase body size to at least 0.875rem (14px)" });
  else if (bodySize > 1.2) results.push({ id: "body-too-large", category: "typography", label: "Body text size", status: "warn", message: `Body text (${bodySize}rem) is large.`, fix: "Consider 1rem (16px) for comfortable reading" });
  else results.push({ id: "body-size-ok", category: "typography", label: "Body text size", status: "pass", message: `Body text is ${bodySize}rem — good.` });

  const lineH = parseFloat(theme.typography.bodyLineHeight) || 1.7;
  if (lineH < 1.4) results.push({ id: "line-height-low", category: "typography", label: "Line height", status: "warn", message: `Line height ${lineH} is low. Minimum 1.5 recommended.`, fix: "Increase line height to 1.5-1.8 for readability" });
  else results.push({ id: "line-height-ok", category: "typography", label: "Line height", status: "pass", message: `Line height ${lineH} is good.` });

  // Contrast - check body vs background
  try {
    const contrast = getContrastRatio(theme.colors.bodyColor, theme.colors.bgColor);
    if (contrast < 4.5) results.push({ id: "contrast-body", category: "contrast", label: "Body contrast", status: "fail", message: `Body/bg contrast ratio ${contrast.toFixed(1)}:1 — below 4.5:1 WCAG AA.`, fix: "Darken body text or lighten background" });
    else if (contrast < 7) results.push({ id: "contrast-body-warn", category: "contrast", label: "Body contrast", status: "warn", message: `Body/bg contrast ratio ${contrast.toFixed(1)}:1 — meets AA but not AAA.` });
    else results.push({ id: "contrast-body-ok", category: "contrast", label: "Body contrast", status: "pass", message: `Body/bg contrast ratio ${contrast.toFixed(1)}:1 — excellent.` });
  } catch { results.push({ id: "contrast-skip", category: "contrast", label: "Body contrast", status: "info", message: "Could not compute contrast." }); }

  // Spacing
  const paraGap = parseFloat(theme.layout.paragraphSpacing) || 0.6;
  if (paraGap < 0.3) results.push({ id: "para-gap-low", category: "spacing", label: "Paragraph spacing", status: "warn", message: `Paragraph gap ${paraGap}em is very tight.`, fix: "Increase to at least 0.5em" });
  else results.push({ id: "para-gap-ok", category: "spacing", label: "Paragraph spacing", status: "pass", message: `Paragraph gap ${paraGap}em is adequate.` });

  // Margins
  const mTop = parseFloat(theme.layout.marginTop) || 1.8;
  const mBot = parseFloat(theme.layout.marginBottom) || 1.8;
  const mLeft = parseFloat(theme.layout.marginLeft) || 2.2;
  const mRight = parseFloat(theme.layout.marginRight) || 2.2;
  results.push({ id: "margins", category: "margins", label: "Page margins", status: "info", message: `T:${mTop}em B:${mBot}em L:${mLeft}em R:${mRight}em` });

  // Links
  const allContent = project.chapters.map((c) => c.content).join("\n");
  const linkMatches = allContent.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  const broken = linkMatches.filter((l) => {
    const url = l.match(/\]\(([^)]+)\)/)?.[1] || "";
    return url.startsWith("http") && !url.includes("://");
  });
  if (broken.length > 0) results.push({ id: "broken-links", category: "links", label: "Broken links", status: "warn", message: `${broken.length} link(s) may be invalid.`, fix: "Check URLs in your content" });
  else results.push({ id: "links-ok", category: "links", label: "Links", status: "pass", message: `${linkMatches.length} link(s) found.` });

  // Images
  const imgMatches = allContent.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
  const noAlt = imgMatches.filter((img) => {
    const alt = img.match(/!\[([^\]]*)\]/)?.[1] || "";
    return !alt.trim();
  });
  if (noAlt.length > 0) results.push({ id: "images-alt", category: "images", label: "Image alt text", status: "warn", message: `${noAlt.length} image(s) missing alt text.`, fix: "Add descriptive alt text to all images" });
  else if (imgMatches.length > 0) results.push({ id: "images-alt-ok", category: "images", label: "Image alt text", status: "pass", message: `All ${imgMatches.length} image(s) have alt text.` });
  else results.push({ id: "images-none", category: "images", label: "Images", status: "info", message: "No images found." });

  // Accessibility
  if (meta.accessibility.altText) results.push({ id: "acc-alttext", category: "accessibility", label: "Alt text", status: "pass", message: "Alt text support enabled." });
  if (meta.accessibility.contrast) results.push({ id: "acc-contrast", category: "accessibility", label: "Color contrast", status: "pass", message: "Contrast checking enabled." });
  results.push({ id: "acc-wcag", category: "accessibility", label: "WCAG standard", status: "info", message: `Target: ${meta.accessibility.wcag || "None set"}` });

  // Print readiness
  if (meta.isbn) results.push({ id: "print-isbn", category: "print", label: "ISBN", status: "pass", message: `ISBN: ${meta.isbn}` });
  else results.push({ id: "print-isbn-missing", category: "print", label: "ISBN", status: "warn", message: "No ISBN set.", fix: "Add ISBN for print publishing" });

  if (meta.printReady.bleed) results.push({ id: "print-bleed", category: "print", label: "Bleed", status: "info", message: `Bleed: ${meta.printReady.bleed}` });
  if (meta.publisher) results.push({ id: "print-publisher", category: "print", label: "Publisher", status: "pass", message: `Publisher: ${meta.publisher}` });
  else results.push({ id: "print-publisher-missing", category: "print", label: "Publisher", status: "warn", message: "No publisher set.", fix: "Add publisher name for print publishing" });

  // Metadata
  if (meta.language) results.push({ id: "meta-lang", category: "metadata", label: "Language", status: "pass", message: `Language: ${meta.language}` });
  else results.push({ id: "meta-lang-missing", category: "metadata", label: "Language", status: "warn", message: "No language set." });

  // Content checks
  if (analytics.totalWords === 0) results.push({ id: "content-empty", category: "content", label: "Content", status: "fail", message: "No content found.", fix: "Add chapters with content" });
  else if (analytics.totalWords < 500) results.push({ id: "content-short", category: "content", label: "Content length", status: "warn", message: `Only ${analytics.totalWords} words — very short.`, fix: "Aim for at least 1000 words" });
  else results.push({ id: "content-ok", category: "content", label: "Content length", status: "pass", message: `${analytics.totalWords.toLocaleString()} words across ${analytics.chapterCount} chapters.` });

  return results;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = relativeLuminance(hexToRgb(hex1));
  const lum2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
