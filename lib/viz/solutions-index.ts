// Builds a lightweight per-sheet index of every runnable Python block so the
// /analyse page can offer "previous / next question" navigation and show the
// question statement of whatever block is currently being traced.
//
// Used by both the problems browser (whole file) and the reader (one block),
// wired to the AnalyseButton through the AnalyseCtx context below.

import type { AnalyseQuestion } from "./analyse-session";
import { looksLikePython } from "./pyodide";

const PYTHON_LANGS = new Set(["python", "py", "python3", "python2"]);

export function indexPythonBlocks(fileContent: string): AnalyseQuestion[] {
  const out: AnalyseQuestion[] = [];
  let title = "Exercises";
  let sectionText: string[] = [];
  let inCode = false;
  let langOk = false;
  let code = "";

  const flush = () => {
    if (code && (langOk || looksLikePython(code))) {
      const source = code.replace(/\n+$/, "");
      const question = sectionText.join("\n").trim().replace(/\n{3,}/g, "\n\n");
      const item: AnalyseQuestion = { title, source };
      if (question && question.length > 0) item.question = question.slice(0, 2400);
      out.push(item);
    }
    code = "";
    langOk = false;
  };

  for (const raw of fileContent.split("\n")) {
    if (!inCode) {
      const heading = /^(#{1,6})\s+(.*)$/.exec(raw);
      if (heading) {
        const text = heading[2].trim();
        if (heading[1].length <= 2) {
          flush();
          title = text
            .replace(/^\d+[\.\)]\s*/, "")
            .replace(/[#]\s*\d+.*$/, "")
            .replace(/\s*\b(Easy|Medium|Hard|Elementary)\b.*$/i, "")
            .trim();
          sectionText = [];
        }
        continue;
      }
      const fence = /^```([\w+-]*)\s*$/.exec(raw);
      if (fence) {
        flush();
        inCode = true;
        langOk = PYTHON_LANGS.has(fence[1].toLowerCase());
        code = "";
        continue;
      }
      sectionText.push(raw);
      continue;
    }

    if (/^```\s*$/.test(raw)) {
      inCode = false;
      flush();
      continue;
    }
    code += raw + "\n";
  }
  flush();

  return out;
}

export interface SheetMatch {
  questions: AnalyseQuestion[];
  active: number;
}

/** Lookup from a runnable block's exact source text to its sibling questions. */
export type SheetLookup = (code: string) => SheetMatch | null;

/**
 * Index every runnable Python block across a set of sheet files, so an
 * "Analyse this solution" button anywhere in those files can hand the /analyse
 * page the full prev/next list plus the active question's index.
 */
export function buildSheetLookup(fileContents: string[]): SheetLookup {
  const m = new Map<string, SheetMatch>();
  for (const content of fileContents) {
    const list = indexPythonBlocks(content);
    for (let i = 0; i < list.length; i++) {
      const src = list[i].source;
      if (!m.has(src)) m.set(src, { questions: list, active: i });
    }
  }
  return (code: string) => m.get(code) ?? null;
}