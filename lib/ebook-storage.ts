"use client";

import { defaultTheme, type EbookTheme } from "./ebook-theme";

export interface EbookChapter {
  id: string;
  title: string;
  content: string;
  order: number;
  part?: string;
  isStandard?: boolean;
  standardType?: string;
  wordCount?: number;
}

export interface EbookCover {
  layout: "centered" | "split" | "minimal" | "bold";
  title: string;
  subtitle: string;
  author: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  titleFontSize: number;
  coverImage: string;
  showCoverPage: boolean;
}

export interface EbookBranding {
  logo: string;
  watermark: string;
  brandColors: string[];
  brandFonts: string;
  brandTemplate: string;
}

export interface EbookMetadata {
  isbn: string;
  doi: string;
  publisher: string;
  language: string;
  keywords: string[];
  categories: string[];
  edition: string;
  series: string;
  printReady: {
    cmyk: boolean;
    bleed: string;
    cropMarks: boolean;
    printerMarks: boolean;
    binding: "perfect" | "saddle-stitch" | "case" | "spiral" | "unknown";
    gutter: string;
  };
  accessibility: {
    screenReader: boolean;
    altText: boolean;
    contrast: boolean;
    keyboardNav: boolean;
    accessiblePdf: boolean;
    wcag: string;
  };
}

export interface EbookProject {
  id: string;
  name: string;
  author: string;
  templateId: string;
  chapters: EbookChapter[];
  cover: EbookCover;
  pageSize: string;
  bgColor: string;
  theme: EbookTheme;
  metadata: EbookMetadata;
  branding: EbookBranding;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "ebook-projects";

function migrateProject(p: any): EbookProject {
  if (!p.theme) p.theme = defaultTheme();
  if (!p.metadata) {
    p.metadata = {
      isbn: "", doi: "", publisher: "", language: "en", keywords: [], categories: [],
      edition: "", series: "",
      printReady: { cmyk: false, bleed: "0.125in", cropMarks: false, printerMarks: false, binding: "perfect" as const, gutter: "0in" },
      accessibility: { screenReader: true, altText: true, contrast: true, keyboardNav: true, accessiblePdf: false, wcag: "WCAG 2.1 AA" },
    };
  }
  if (!p.metadata.printReady) {
    p.metadata.printReady = { cmyk: false, bleed: "0.125in", cropMarks: false, printerMarks: false, binding: "perfect" as const, gutter: "0in" };
  }
  if (!p.metadata.accessibility) {
    p.metadata.accessibility = { screenReader: true, altText: true, contrast: true, keyboardNav: true, accessiblePdf: false, wcag: "WCAG 2.1 AA" };
  }
  if (!p.branding) {
    p.branding = { logo: "", watermark: "", brandColors: [], brandFonts: "", brandTemplate: "" };
  }
  if (!p.cover.coverImage) p.cover.coverImage = "";
  if (p.cover.showCoverPage === undefined) p.cover.showCoverPage = true;
  return p as EbookProject;
}

export function getProjects(): EbookProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const projects: EbookProject[] = raw ? JSON.parse(raw) : [];
    return projects.map(migrateProject);
  } catch {
    return [];
  }
}

export function saveProjectMeta(project: EbookProject): void {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  const toSave = { ...project, updatedAt: Date.now() };
  if (idx >= 0) {
    projects[idx] = toSave;
  } else {
    projects.push(toSave);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // localStorage quota exceeded — save metadata only (content lives in IndexedDB)
    const stripped = projects.map((p) => ({
      ...p,
      chapters: p.chapters.map(({ content: _, ...rest }) => ({ ...rest, content: "" })),
    }));
    stripped.find((p) => p.id === project.id)!.chapters = toSave.chapters.map(
      ({ content: _, ...rest }) => ({ ...rest, content: "" })
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
  }
}

export async function saveProjectContent(project: EbookProject): Promise<void> {
  const { saveBatchContent } = await import("./ebook-content-store");
  const entries = project.chapters
    .filter((c) => c.content)
    .map((c) => ({ id: c.id, content: c.content }));
  if (entries.length > 0) {
    await saveBatchContent(project.id, entries);
  }
}

export async function saveProject(project: EbookProject): Promise<void> {
  // Save content to IndexedDB FIRST, then metadata to localStorage
  // This prevents data loss if the tab is closed mid-save
  await saveProjectContent(project);
  saveProjectMeta(project);
}

export async function deleteProject(id: string): Promise<void> {
  const projects = getProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  const { deleteProjectContent } = await import("./ebook-content-store");
  await deleteProjectContent(id);
}

export function getProject(id: string): EbookProject | undefined {
  const p = getProjects().find((p) => p.id === id);
  return p ? migrateProject(p) : undefined;
}

export async function loadAllContent(project: EbookProject): Promise<void> {
  const ids = project.chapters.map((c) => c.id);
  if (ids.length === 0) return;
  const { loadAllContent: loadFromDB } = await import("./ebook-content-store");
  const contentMap = await loadFromDB(project.id, ids);
  for (const ch of project.chapters) {
    ch.content = contentMap.get(ch.id) ?? ch.content ?? "";
  }
}

export async function migrateContentToIndexedDB(project: EbookProject): Promise<void> {
  const hasInlineContent = project.chapters.some((c) => c.content && c.content.length > 0);
  if (!hasInlineContent) return;
  await saveProjectContent(project);
  saveProjectMeta(project);
}

export function createProject(name: string, author: string, content: string): EbookProject {
  const chapters = splitIntoChapters(content);
  return {
    id: crypto.randomUUID(),
    name,
    author,
    templateId: "classic",
    chapters,
    cover: {
      layout: "centered",
      title: name,
      subtitle: "",
      author,
      bgColor: "#1a1a2e",
      textColor: "#ffffff",
      accentColor: "#e94560",
      titleFontSize: 42,
      coverImage: "",
      showCoverPage: true,
    },
    pageSize: "6x9",
    bgColor: "#ffffff",
    theme: defaultTheme(),
    metadata: {
      isbn: "",
      doi: "",
      publisher: "",
      language: "en",
      keywords: [],
      categories: [],
      edition: "First Edition",
      series: "",
      printReady: {
        cmyk: false,
        bleed: "0.125in",
        cropMarks: false,
        printerMarks: false,
        binding: "perfect" as const,
        gutter: "0in",
      },
      accessibility: {
        screenReader: true,
        altText: true,
        contrast: true,
        keyboardNav: true,
        accessiblePdf: false,
        wcag: "WCAG 2.1 AA",
      },
    },
    branding: {
      logo: "",
      watermark: "",
      brandColors: [],
      brandFonts: "",
      brandTemplate: "",
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function splitIntoChapters(markdown: string): EbookChapter[] {
  const parts = markdown.split(/(?=^# |^## )/m).filter(Boolean);
  if (parts.length <= 1) {
    return [
      {
        id: crypto.randomUUID(),
        title: "Chapter 1",
        content: markdown.trim(),
        order: 0,
      },
    ];
  }
  return parts.map((part, i) => {
    const lines = part.trim().split("\n");
    const first = lines[0] || "";
    const title = first.startsWith("#") ? first.replace(/^#+\s*/, "").trim() : `Chapter ${i + 1}`;
    const content = first.startsWith("#") ? lines.slice(1).join("\n").trim() : part.trim();
    return { id: crypto.randomUUID(), title, content, order: i };
  });
}

export function contentToMarkdown(project: EbookProject): string {
  let result = "";
  let currentPart = "";
  const sorted = [...project.chapters].sort((a, b) => a.order - b.order);
  for (const ch of sorted) {
    if (ch.part && ch.part !== currentPart) {
      currentPart = ch.part;
      result += `---\n\n# ${ch.part}\n\n---\n\n`;
    }
    if (ch.isStandard && ch.standardType === "toc") {
      result += `# ${ch.title}\n\n${buildTableOfContents(project, ch.content)}\n\n`;
    } else {
      result += `# ${ch.title}\n\n${ch.content}\n\n`;
    }
  }
  return result.trim();
}

function buildTableOfContents(project: EbookProject, userContent: string): string {
  const contentChapters = project.chapters
    .filter((c) => !c.isStandard)
    .sort((a, b) => a.order - b.order);
  let toc = userContent + "\n\n";
  for (const ch of contentChapters) {
    toc += `- [${ch.title}](#${ch.title.toLowerCase().replace(/[^\w]+/g, "-")})\n`;
  }
  return toc;
}

export function getParts(chapters: EbookChapter[]): string[] {
  const parts = new Set<string>();
  for (const ch of chapters) {
    if (ch.part) parts.add(ch.part);
  }
  return [...parts];
}

export const STANDARD_PAGE_TEMPLATES: Record<string, { title: string; content: string }> = {
  copyright: {
    title: "Copyright",
    content: `**© ${new Date().getFullYear()} [Author Name]. All rights reserved.**

No part of this book may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.

**Publisher:** [Publisher Name]\n**ISBN:** [ISBN Number]\n**Edition:** First Edition\n\n**Contact:**\n[Email Address]\n[Website URL]`,
  },
  quote: {
    title: "Quote",
    content: `> "The only way to do great work is to love what you do."\n> — **Steve Jobs**`,
  },
  foreword: {
    title: "Foreword",
    content: `A foreword is written by someone other than the author, often an expert in the field or a well-known figure. It adds credibility and provides context for the reader.

*If you have someone writing a foreword for your book, replace this text with their contribution.*`,
  },
  preface: {
    title: "Preface",
    content: `Welcome to *${"${BOOK_NAME}"}*. This preface explains the motivation behind this book, what makes it unique, and who it is intended for.

**Why I Wrote This Book**

[Explain your motivation for writing this book. What gap does it fill? What problem does it solve?]

**What Makes This Book Different**

[Describe the unique approach, methodology, or perspective that sets this book apart.]

**How to Use This Book**

[Guide readers on how to approach the material. Should they read sequentially? Jump to specific chapters?]

**Acknowledgments**

[Thank the people who helped make this book possible.]`,
  },
  who: {
    title: "Who This Book Is For",
    content: `This book is designed for:

- **Beginner readers** who are new to this topic and want a comprehensive introduction
- **Intermediate learners** looking to deepen their understanding and fill knowledge gaps
- **Practitioners and professionals** seeking practical insights and best practices

**Prerequisites**

To get the most out of this book, you should have:

- Basic familiarity with the core concepts
- A willingness to learn and practice
- Access to the tools and resources mentioned throughout

**What You Will Learn**

By the end of this book, you will be able to:

1. Understand the fundamental principles
2. Apply practical techniques to real-world scenarios
3. Build upon this knowledge for advanced study`,
  },
  covers: {
    title: "What This Book Covers",
    content: `Here is a chapter-by-chapter overview of what this book covers:

**Chapter 1:** Introduction to the core concepts and foundational knowledge.

**Chapter 2:** Deep dive into advanced topics and practical applications.

**Chapter 3:** Real-world case studies and examples.

**Chapter 4:** Best practices, common pitfalls, and how to avoid them.

**Chapter 5:** Future directions and continuing your learning journey.`,
  },
  contact: {
    title: "Get in Touch",
    content: `We love hearing from our readers! Here are the best ways to reach us:

**Questions and Feedback:** [email@example.com]

**Website:** [https://yourwebsite.com]

**Social Media:**
- Twitter/X: [@yourhandle]
- LinkedIn: [Your Name]
- GitHub: [yourusername]

**Errata and Updates:** If you find any errors or have suggestions for improvement, please visit [https://yourwebsite.com/errata].

**Book Club or Bulk Orders:** For discounts on bulk purchases or book club discussions, contact [publisher@example.com].

*We read every message and strive to respond within 48 hours.*`,
  },
  glossary: {
    title: "Glossary of Terms",
    content: `**Term 1** — Definition of the first important term used in this book.

**Term 2** — Definition of the second important term.

**Term 3** — Definition of the third term with additional context.

**Term 4** — Brief but clear definition.

**Term 5** — Definition with an example for clarity.`,
  },
  references: {
    title: "References & Further Reading",
    content: `**Books**

- Author, A. (Year). *Title of Book*. Publisher.
- Author, B. (Year). *Title of Book*. Publisher.

**Articles and Papers**

- Author, C. et al. (Year). "Title of Article." *Journal Name*, Volume(Issue), Pages.

**Online Resources**

- Title of Resource. Retrieved from https://example.com

**Further Reading**

If you enjoyed this book, you might also find these resources valuable:

- [Related Book Title] by Author Name
- [Online Course or Tutorial]
- [Community Forum or Discussion Group]`,
  },
  author: {
    title: "About the Author",
    content: `**[Author Name]** is a [profession/role] with [number] years of experience in [field]. They have [brief description of background and expertise].

[Author Name] is passionate about [topic] and believes in [core philosophy or mission]. They have previously [previous work, books, or achievements].

When not writing or [work-related activity], [he/she/they] enjoys [personal hobbies or interests].

**Connect with the Author:**
- Website: [https://authorwebsite.com]
- Twitter: [@authorhandle]
- LinkedIn: [author-linkedin]
- Email: [author@email.com]`,
  },
  dedication: {
    title: "Dedication",
    content: `*To [person/people this book is dedicated to],*

*[Optional: brief message or reason for the dedication.]*`,
  },
};

export function addStandardPage(project: EbookProject, type: string): EbookProject {
  const tmpl = STANDARD_PAGE_TEMPLATES[type];
  if (!tmpl) return project;

  const frontMatter = ["copyright", "dedication", "quote", "foreword", "preface", "who", "covers"];
  const existingFront = project.chapters.filter((c) => c.isStandard && frontMatter.includes(c.standardType || ""));
  const existingBack = project.chapters.filter((c) => c.isStandard && !frontMatter.includes(c.standardType || ""));
  const contentChapters = project.chapters.filter((c) => !c.isStandard);
  const isFront = frontMatter.includes(type);
  const isToc = type === "toc";

  let order: number;
  if (isToc) {
    order = existingFront.length + contentChapters.length;
  } else if (isFront) {
    order = existingFront.length;
  } else {
    order = existingFront.length + contentChapters.length + existingBack.length;
  }

  const newChapter: EbookChapter = {
    id: crypto.randomUUID(),
    title: tmpl.title,
    content: tmpl.content.replace(/\$\{BOOK_NAME\}/g, project.name),
    order,
    isStandard: true,
    standardType: type,
  };

  const chapters = [...project.chapters, newChapter].map((c, i) => ({ ...c, order: i }));
  return { ...project, chapters };
}

export const STANDARD_PAGE_ORDER: Record<string, number> = {
  copyright: 0,
  dedication: 1,
  quote: 2,
  foreword: 3,
  preface: 4,
  who: 5,
  covers: 6,
  toc: 7,
  glossary: 8,
  references: 9,
  contact: 10,
  author: 11,
};

export async function createProjectFromGithub(
  name: string,
  author: string,
  owner: string,
  repo: string,
  branch: string,
  path: string
): Promise<EbookProject> {
  const ghUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res = await fetch(ghUrl, { headers: { Accept: "application/vnd.github.v3+json" } });
  if (!res.ok) throw new Error("GitHub repo not found");
  const data = await res.json();

  const allFiles: { path: string }[] = (data.tree || []).filter(
    (item: any) => item.type === "blob" && (item.path.endsWith(".md") || item.path.endsWith(".txt"))
  );
  if (allFiles.length === 0) throw new Error("No markdown files found");

  const relevantFiles = path ? allFiles.filter((f) => f.path.startsWith(path)) : allFiles;
  if (relevantFiles.length === 0) throw new Error("No files under the specified path");

  const prefix = path ? path.split("/").filter(Boolean).length : 0;
  const chapters: EbookChapter[] = [];
  let order = 0;

  for (const file of relevantFiles.slice(0, 50)) {
    try {
      const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`);
      if (!raw.ok) continue;
      const text = await raw.text();
      const segments = file.path.replace(/\.(md|txt)$/i, "").split("/").filter(Boolean);
      const fileName = segments.pop() || "Section";
      const folder = segments.slice(prefix).filter(Boolean).join(" / ");
      const title = fileName.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      chapters.push({
        id: crypto.randomUUID(),
        title,
        content: text.trim(),
        order: order++,
        part: folder || undefined,
      });
    } catch { /* skip failed */ }
  }

  if (chapters.length === 0) throw new Error("Could not fetch any file content");

  return {
    id: crypto.randomUUID(),
    name,
    author: author || "Anonymous",
    templateId: "classic",
    chapters,
    cover: {
      layout: "centered",
      title: name,
      subtitle: "",
      author: author || "Anonymous",
      bgColor: "#1a1a2e",
      textColor: "#ffffff",
      accentColor: "#e94560",
      titleFontSize: 42,
      coverImage: "",
      showCoverPage: true,
    },
    pageSize: "6x9",
    bgColor: "#ffffff",
    theme: defaultTheme(),
    metadata: {
      isbn: "", doi: "", publisher: "", language: "en", keywords: [], categories: [],
      edition: "First Edition", series: "",
      printReady: { cmyk: false, bleed: "0.125in", cropMarks: false, printerMarks: false, binding: "perfect", gutter: "0in" },
      accessibility: { screenReader: true, altText: true, contrast: true, keyboardNav: true, accessiblePdf: false, wcag: "WCAG 2.1 AA" },
    },
    branding: { logo: "", watermark: "", brandColors: [], brandFonts: "", brandTemplate: "" },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
