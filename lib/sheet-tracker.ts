// Per-sheet progress tracking for the book reader. Progress is scoped to a single
// markdown file (book id + file path) so a reader can work through a sheet in any
// order, tick individual questions off, or mark ones to revisit. Persisted in
// localStorage; nothing is uploaded.

export type SheetItemStatus = "todo" | "done" | "skipped";

export type SheetItemKind = "question" | "heading" | "checklist";

export interface SheetItem {
  id: string;
  label: string;
  section: string;
  kind: SheetItemKind;
  num?: number;
}

export interface SheetRecord {
  statuses: Record<string, SheetItemStatus>;
  updatedAt: number;
}

const STORAGE_KEY = "md-book:sheet-progress";

type BookShape = Record<string, Record<string, SheetRecord>>;

function emptyBookShape(): BookShape {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as BookShape;
  } catch {
    return {};
  }
}

export function readSheetProgress(bookId: string, filePath: string): SheetRecord {
  if (typeof window === "undefined") return { statuses: {}, updatedAt: 0 };
  const rec = emptyBookShape()[bookId]?.[filePath];
  if (!rec || typeof rec !== "object" || !rec.statuses) return { statuses: {}, updatedAt: 0 };
  const statuses: Record<string, SheetItemStatus> = {};
  for (const [k, v] of Object.entries(rec.statuses)) {
    if (v === "done" || v === "skipped") statuses[k] = v;
  }
  return { statuses, updatedAt: rec.updatedAt || 0 };
}

function writeSheetProgress(bookId: string, filePath: string, rec: SheetRecord): void {
  try {
    const shape = emptyBookShape();
    const book = { ...(shape[bookId] || {}) };
    book[filePath] = rec;
    shape[bookId] = book;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shape));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function setItemStatus(
  bookId: string,
  filePath: string,
  itemId: string,
  status: SheetItemStatus
): SheetRecord {
  const current = readSheetProgress(bookId, filePath);
  const statuses = { ...current.statuses };
  if (status === "todo") delete statuses[itemId];
  else statuses[itemId] = status;
  const next: SheetRecord = { statuses, updatedAt: Date.now() };
  writeSheetProgress(bookId, filePath, next);
  return next;
}

export function setManyStatuses(
  bookId: string,
  filePath: string,
  ids: string[],
  status: SheetItemStatus
): SheetRecord {
  const current = readSheetProgress(bookId, filePath);
  const statuses = { ...current.statuses };
  for (const id of ids) {
    if (status === "todo") delete statuses[id];
    else statuses[id] = status;
  }
  const next: SheetRecord = { statuses, updatedAt: Date.now() };
  writeSheetProgress(bookId, filePath, next);
  return next;
}

export function resetSheetProgress(bookId: string, filePath: string): SheetRecord {
  const next: SheetRecord = { statuses: {}, updatedAt: Date.now() };
  writeSheetProgress(bookId, filePath, next);
  return next;
}

/** Aggregate progress across every sheet of a book. */
export function readBookSummary(
  bookId: string
): { sheets: number; done: number; skipped: number } {
  const book = emptyBookShape()[bookId] || {};
  let sheets = 0;
  let done = 0;
  let skipped = 0;
  for (const rec of Object.values(book)) {
    if (!rec || !rec.statuses) continue;
    sheets++;
    for (const v of Object.values(rec.statuses)) {
      if (v === "done") done++;
      else if (v === "skipped") skipped++;
    }
  }
  return { sheets, done, skipped };
}

const IGNORED_SECTIONS =
  /^(table of contents|contents|index|how to use|blueprint|overview|format|style guide|notes?)\b/i;

function cleanLabel(text: string, max = 120): string {
  const t = text
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "x"
  );
}

/**
 * Pulls trackable items out of a sheet's raw markdown. Recognises the
 * `### Q12. …` and `**Q12.** …` question forms, `- [ ] …` checklists and, for
 * sheets with neither, plain headings as topics. Items are grouped by the nearest
 * preceding `##` section.
 */
const FENCE_RE = /^([ \t]*)(`{3,}|~{3,})/;

/**
 * Blanks out fenced code blocks so templates and examples inside them are not
 * mistaken for real questions or checklist items.
 */
function stripFencedCode(markdown: string): string {
  const out: string[] = [];
  let fenceChar: string | null = null;
  for (const line of markdown.split("\n")) {
    const m = FENCE_RE.exec(line);
    if (fenceChar === null) {
      if (m) {
        fenceChar = m[2][0];
        out.push("");
        continue;
      }
      out.push(line);
    } else if (m && m[2][0] === fenceChar) {
      fenceChar = null;
      out.push("");
    } else {
      out.push("");
    }
  }
  return out.join("\n");
}

export function extractSheetItems(markdown: string): SheetItem[] {
  const items: SheetItem[] = [];
  const seen = new Set<string>();
  let section = "";
  let docTitle = "";
  let checklistIdx = 0;
  const headingIdx: { id: string; label: string; section: string }[] = [];

  const push = (item: SheetItem) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    items.push(item);
  };

  for (const rawLine of stripFencedCode(markdown).split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim()) continue;

    const title = /^#\s+(.+?)\s*#*$/.exec(line);
    if (title) {
      docTitle = cleanLabel(title[1], 90);
      continue;
    }

    const hq = /^#{1,6}\s+Q(\d+)\s*[.)]\s*(.+)$/.exec(line);
    if (hq) {
      const num = parseInt(hq[1], 10);
      push({ id: `q${num}`, label: cleanLabel(hq[2]), section, kind: "question", num });
      continue;
    }

    const heading = /^(#{2,6})\s+(.+?)\s*#*$/.exec(line);
    if (heading) {
      const text = cleanLabel(heading[2], 90);
      if (heading[1].length === 2 && !IGNORED_SECTIONS.test(text)) {
        section = text;
      } else if (heading[1].length >= 3 && !IGNORED_SECTIONS.test(text)) {
        headingIdx.push({ id: `h:${slug(text)}:${headingIdx.length}`, label: text, section });
      }
      continue;
    }

    const bq = /^\*\*Q(\d+)\s*[.)]?\s*\*\*\s*(.+)$/.exec(line);
    if (bq) {
      const num = parseInt(bq[1], 10);
      push({ id: `q${num}`, label: cleanLabel(bq[2]), section, kind: "question", num });
      continue;
    }

    const cb = /^\s*[-*+]\s+\[([ xX~>-])\]\s*(.+)$/.exec(line);
    if (cb) {
      checklistIdx++;
      push({
        id: `c${checklistIdx}`,
        label: cleanLabel(cb[2]),
        section,
        kind: "checklist",
      });
      continue;
    }

    const iq = /^\s*(?:[-*+]|\d+[.)])\s+Q(\d+)\s*[.)]?\s+(.+)$/.exec(line);
    if (iq) {
      const num = parseInt(iq[1], 10);
      push({ id: `q${num}`, label: cleanLabel(iq[2]), section, kind: "question", num });
    }
  }

  const fallbackSection = docTitle || "General";
  for (const item of items) {
    if (!item.section) item.section = fallbackSection;
  }
  for (const h of headingIdx) {
    if (!h.section) h.section = fallbackSection;
  }

  if (items.length === 0 && headingIdx.length > 0) {
    for (const h of headingIdx) push({ ...h, kind: "heading" });
  }

  return items;
}

export interface SheetStats {
  total: number;
  done: number;
  skipped: number;
  pct: number;
}

export function sheetStats(items: SheetItem[], statuses: Record<string, SheetItemStatus>): SheetStats {
  let done = 0;
  let skipped = 0;
  for (const item of items) {
    const s = statuses[item.id];
    if (s === "done") done++;
    else if (s === "skipped") skipped++;
  }
  const total = items.length;
  return { total, done, skipped, pct: total ? Math.round((done / total) * 100) : 0 };
}