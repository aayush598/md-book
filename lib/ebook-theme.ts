export interface EbookTheme {
  typography: {
    bodyFont: string;
    headingFont: string;
    bodySize: string;
    bodyLineHeight: string;
    headingWeight: string;
    headingLineHeight: string;
  };
  colors: {
    bodyColor: string;
    bgColor: string;
    accentColor: string;
    headingColor: string;
    linkColor: string;
    codeBg: string;
    blockquoteBorder: string;
    tableHeaderBg: string;
  };
  layout: {
    pageWidth: string;
    pageHeight: string;
    marginTop: string;
    marginBottom: string;
    marginLeft: string;
    marginRight: string;
    paragraphSpacing: string;
    sectionSpacing: string;
  };
  headers: {
    style: "fancy" | "simple" | "minimal" | "ornate" | "modern";
    showNumbers: boolean;
    underline: boolean;
  };
  footers: {
    style: "simple" | "minimal" | "fancy";
    showPageNumbers: boolean;
    showChapterTitle: boolean;
  };
  chapterPages: {
    layout: "standard" | "centered" | "ornate" | "minimal" | "modern";
    showNumber: boolean;
    decorativeLine: boolean;
    dropCaps: boolean;
  };
  toc: {
    style: "standard" | "minimal" | "fancy";
    showPageNumbers: boolean;
    showDots: boolean;
  };
  images: {
    style: "shadow" | "border" | "rounded" | "flat";
    maxWidth: string;
    showCaptions: boolean;
    captionStyle: "italic" | "bold" | "underlined" | "minimal";
  };
  tables: {
    style: "striped" | "bordered" | "minimal" | "fancy";
    headerStyle: "colored" | "light" | "dark" | "gradient";
    striped: boolean;
    hover: boolean;
  };
  callouts: {
    style: "border-left" | "filled" | "minimal" | "modern";
    rounded: boolean;
    showIcons: boolean;
  };
  dividers: {
    style: "line" | "dots" | "ornament" | "gradient" | "space";
    symbol: string;
  };
  footnotes: {
    style: "superscript" | "bracketed" | "linked";
    separator: boolean;
  };
  captions: {
    style: "italic" | "bold" | "underlined" | "minimal";
    position: "below" | "above";
  };
  icons: {
    set: "emoji" | "symbol" | "minimal";
    bulletChar: string;
  };
  grids: {
    gap: string;
    padding: string;
  };
}

const FONT_STACKS: Record<string, string> = {
  garamond: "'EB Garamond', 'Garamond', 'Georgia', serif",
  lora: "'Lora', 'Georgia', serif",
  merriweather: "'Merriweather', 'Georgia', serif",
  playfair: "'Playfair Display', 'Georgia', serif",
  inter: "'Inter', -apple-system, 'Helvetica Neue', sans-serif",
  dm_sans: "'DM Sans', 'Inter', sans-serif",
  source_sans: "'Source Sans 3', 'Helvetica Neue', sans-serif",
  cabin: "'Cabin', 'Inter', sans-serif",
  system: "-apple-system, 'Segoe UI', 'Helvetica Neue', sans-serif",
  georgia: "'Georgia', serif",
  times: "'Times New Roman', serif",
};

export function getFontStack(id: string): string {
  return FONT_STACKS[id] || id || FONT_STACKS.inter;
}

export const FONT_OPTIONS = Object.entries(FONT_STACKS).map(([id, stack]) => ({
  id,
  name: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  stack,
}));

export function defaultTheme(): EbookTheme {
  return {
    typography: {
      bodyFont: "lora",
      headingFont: "playfair",
      bodySize: "1rem",
      bodyLineHeight: "1.7",
      headingWeight: "700",
      headingLineHeight: "1.3",
    },
    colors: {
      bodyColor: "#2c2416",
      bgColor: "#fefcf7",
      accentColor: "#8b4513",
      headingColor: "#1a1208",
      linkColor: "#8b4513",
      codeBg: "#f5f0eb",
      blockquoteBorder: "#8b4513",
      tableHeaderBg: "#8b4513",
    },
    layout: {
      pageWidth: "6in",
      pageHeight: "9in",
      marginTop: "1.8em",
      marginBottom: "1.8em",
      marginLeft: "2.2em",
      marginRight: "2.2em",
      paragraphSpacing: "0.6em",
      sectionSpacing: "2em",
    },
    headers: { style: "fancy", showNumbers: false, underline: false },
    footers: { style: "simple", showPageNumbers: true, showChapterTitle: false },
    chapterPages: { layout: "standard", showNumber: true, decorativeLine: true, dropCaps: true },
    toc: { style: "standard", showPageNumbers: true, showDots: true },
    images: { style: "shadow", maxWidth: "100%", showCaptions: true, captionStyle: "italic" },
    tables: { style: "striped", headerStyle: "colored", striped: true, hover: true },
    callouts: { style: "border-left", rounded: true, showIcons: true },
    dividers: { style: "ornament", symbol: "\u2727" },
    footnotes: { style: "superscript", separator: true },
    captions: { style: "italic", position: "below" },
    icons: { set: "emoji", bulletChar: "\u2022" },
    grids: { gap: "1.5em", padding: "1em" },
  };
}

export function themeToCss(theme: EbookTheme): string {
  const t = theme;
  return `
:root {
  --body-font: ${getFontStack(t.typography.bodyFont)};
  --heading-font: ${getFontStack(t.typography.headingFont)};
  --body-size: ${t.typography.bodySize};
  --body-line-height: ${t.typography.bodyLineHeight};
  --heading-weight: ${t.typography.headingWeight};
  --heading-line-height: ${t.typography.headingLineHeight};

  --body-color: ${t.colors.bodyColor};
  --bg-color: ${t.colors.bgColor};
  --accent-color: ${t.colors.accentColor};
  --heading-color: ${t.colors.headingColor};
  --link-color: ${t.colors.linkColor};
  --code-bg: ${t.colors.codeBg};
  --blockquote-border: ${t.colors.blockquoteBorder};
  --table-header-bg: ${t.colors.tableHeaderBg};

  --page-margin-top: ${t.layout.marginTop};
  --page-margin-bottom: ${t.layout.marginBottom};
  --page-margin-left: ${t.layout.marginLeft};
  --page-margin-right: ${t.layout.marginRight};
  --p-mb: ${t.layout.paragraphSpacing};
  --section-spacing: ${t.layout.sectionSpacing};

  --header-style: ${t.headers.style};
  --header-show-numbers: ${t.headers.showNumbers ? "1" : "0"};
  --header-underline: ${t.headers.underline ? "1" : "0"};

  /* Footer */
  --footer-show-page-numbers: ${t.footers.showPageNumbers ? "1" : "0"};
  --footer-show-chapter: ${t.footers.showChapterTitle ? "1" : "0"};

  /* Chapter pages */
  --chapter-layout: ${t.chapterPages.layout};
  --chapter-show-number: ${t.chapterPages.showNumber ? "1" : "0"};
  --chapter-decorative-line: ${t.chapterPages.decorativeLine ? "1" : "0"};
  --chapter-drop-caps: ${t.chapterPages.dropCaps ? "1" : "0"};

  /* Images */
  --image-style: ${t.images.style};
  --image-max-width: ${t.images.maxWidth};
  --caption-style: ${t.captions.style};

  /* Tables */
  --table-style: ${t.tables.style};
  --table-header-style: ${t.tables.headerStyle};
  --table-striped: ${t.tables.striped ? "1" : "0"};
  --table-hover: ${t.tables.hover ? "1" : "0"};

  /* Callouts */
  --callout-style: ${t.callouts.style};
  --callout-rounded: ${t.callouts.rounded ? "1" : "0"};
  --callout-icons: ${t.callouts.showIcons ? "1" : "0"};

  /* Dividers */
  --divider-style: ${t.dividers.style};
  --divider-symbol: "${t.dividers.symbol}";

  /* Footnotes */
  --footnote-style: ${t.footnotes.style};
  --footnote-separator: ${t.footnotes.separator ? "1" : "0"};

  /* Grids */
  --grid-gap: ${t.grids.gap};
  --grid-padding: ${t.grids.padding};
}
`;
}

export function pageSizes(): { id: string; label: string; width: string; height: string; desc: string }[] {
  return [
    { id: "5x8", label: '5" \u00d7 8"', width: "5in", height: "8in", desc: "Pocket book" },
    { id: "5.5x8.5", label: '5.5" \u00d7 8.5"', width: "5.5in", height: "8.5in", desc: "Fiction / Novel" },
    { id: "6x9", label: '6" \u00d7 9"', width: "6in", height: "9in", desc: "Standard non-fiction" },
    { id: "6.14x9.21", label: '6.14" \u00d7 9.21"', width: "6.14in", height: "9.21in", desc: "Academic" },
    { id: "7x9", label: '7" \u00d7 9"', width: "7in", height: "9in", desc: "Technical / Large" },
    { id: "8.5x11", label: '8.5" \u00d7 11"', width: "8.5in", height: "11in", desc: "Workbook / Textbook" },
  ];
}
