export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  source: string;
  difficulty: "easy" | "medium" | "hard";
}

function stripMD(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^["\u201c\u201d](.*)["\u201c\u201d]\s*$/gm, "$1")
    .replace(/^#{2,3}\s+Q\d*\s*[:\.\)]\s*/gm, "")
    .trim();
}

function cleanAnswerLine(line: string): string {
  const s = line
    .replace(/^\*\*A:\*\*\s*/, "")
    .replace(/^\*\*(Answer|Walk through|Talk about|Trade-offs|Response|Solution)\*\*:\s*$/i, "")
    .replace(/^\*\*(Answer|Walk through|Talk about|Trade-offs|Response|Solution)\*\*:\s*/i, "")
    .replace(/^\*\*(Answer|Walk through|Talk about|Trade-offs|Response|Solution):\*\*\s*/i, "")
    .replace(/^A:\s*/i, "")
    .trim();
  return s;
}

function extractAnswerBlock(src: string, startIdx: number): string {
  const tail = src.slice(startIdx);
  const lines = tail.split("\n");
  const block: string[] = [];
  let started = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Stop at next question or section header
    if (/^#{1,3}\s/.test(trimmed)) break;
    if (/^\*\*Q\d*:/i.test(trimmed)) break;

    // Stop at horizontal rules that separate sections
    if (/^---$/.test(trimmed)) { block.push(""); continue; }

    // Skip the answer marker line itself (before content starts)
      if (!started) {
        const cleaned = cleanAnswerLine(line);
        if (cleaned) {
          started = true;
          block.push(cleaned);
        } else if (trimmed === "") {
          continue;
        } else if (/^\*\*(Answer|Walk through|Talk about|Trade-offs|Response|Solution)\*\*:\s*$/i.test(line)) {
          continue;
        } else if (/^\*\*(Answer|Walk through|Talk about|Trade-offs|Response|Solution):\*\*\s*$/i.test(line)) {
          continue;
        } else if (/^A:\s*$/i.test(trimmed) || /^\*\*A:\*\*\s*$/.test(line)) {
          continue;
        } else {
          started = true;
          block.push(line);
        }
        continue;
      }

    block.push(line);
  }

  while (block.length > 0 && block[block.length - 1].trim() === "") block.pop();
  return stripMD(block.join("\n"));
}

// Format A: ## Q1: <question>  or  ### Q1: <question>\n**A:** <answer>
const FORMAT_A = /^#{2,3}\s+Q(\d*)\s*[:\.\)]\s+(.+?)$/gm;

// Format B: **Q1: <question>**\nA: <answer>
const FORMAT_B = /^\*\*Q(\d*):\s*(.+?)\*\*$/gm;

// Format C: ### Q: "<question>"\n**<label>:**\n<answer>
const FORMAT_C = /^###\s+Q:\s+"(.+?)"\s*$/gm;

export function parseFlashcards(content: string, source?: string): Flashcard[] {
  const cards: Flashcard[] = [];
  const seen = new Set<string>();

  function add(q: string, a: string) {
    const question = stripMD(q);
    const answer = stripMD(a);
    if (!question || !answer || answer.length < 10) return;
    const key = question.toLowerCase().slice(0, 80);
    if (seen.has(key)) return;
    seen.add(key);
    cards.push({
      id: `fc_${cards.length}_${Date.now()}`,
      question,
      answer,
      source: source || "",
      difficulty: answer.length > 400 ? "hard" : answer.length > 180 ? "medium" : "easy",
    });
  }

  function tryFormatA() {
    FORMAT_A.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = FORMAT_A.exec(content)) !== null) {
      const q = m[2];
      const a = extractAnswerBlock(content, m.index + m[0].length);
      if (a) add(q, a);
    }
  }

  function tryFormatB() {
    FORMAT_B.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = FORMAT_B.exec(content)) !== null) {
      const q = m[2];
      const answerStart = m.index + m[0].length;
      const a = extractAnswerBlock(content, answerStart);
      if (a) add(q, a);
    }
  }

  function tryFormatC() {
    FORMAT_C.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = FORMAT_C.exec(content)) !== null) {
      const q = m[1];
      const answerStart = m.index + m[0].length;
      const a = extractAnswerBlock(content, answerStart);
      if (a) add(q, a);
    }
  }

  const head = content.slice(0, 2000);

  if (/^###\s+Q:\s+"/m.test(head)) {
    tryFormatC();
  } else if (/^#{2,3}\s+Q\d*\s*[:\.\)]/m.test(head)) {
    tryFormatA();
  } else if (/^\*\*Q\d*:/m.test(head)) {
    tryFormatB();
  } else {
    tryFormatA();
    tryFormatB();
    tryFormatC();
  }

  return cards;
}

export function parseFlashcardsFromFiles(
  files: { path: string; content: string }[],
  scope: "current" | "all",
  currentPath?: string
): Flashcard[] {
  const targets = scope === "current" && currentPath
    ? files.filter((f) => f.path === currentPath)
    : files;
  const all: Flashcard[] = [];
  for (const f of targets) {
    const cards = parseFlashcards(f.content, f.path);
    all.push(...cards);
  }
  return all;
}
