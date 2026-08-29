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