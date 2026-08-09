export interface ProblemSection {
  id: string;
  title: string;
  content: string;
  hasCode: boolean;
}

export interface Problem {
  id: string;
  number: string;
  title: string;
  lcNumber?: string;
  difficulty: "Easy" | "Medium" | "Hard" | "None";
  hasCode: boolean;
  sections: ProblemSection[];
}

export interface ProblemFile {
  path: string;
  title: string;
  fileName: string;
  intro: string;
  problems: Problem[];
}

function firstNumber(text: string): { num: string; rest: string } {
  const m = /^\s*(\d+)\s*[\.\)]\s*(.*)$/.exec(text);
  if (m) return { num: m[1], rest: m[2] };
  return { num: "", rest: text };
}

const LC_RE = /(?:LC|LeetCode|Leetcode)\s*[#]\s*(\d+)/;

export function parseProblemFile(content: string, path = ""): ProblemFile {
  const lines = content.split("\n");
  const title = content.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() ?? (path.split("/").pop() || "Problems");
  const fileName = path.split("/").pop() || title;

  const problems: Problem[] = [];
  const intro: string[] = [];
  let curProblem: Problem | null = null;
  let curSection: ProblemSection | null = null;
  let curBody: string[] = [];

  const finalizeSection = () => {
    if (!curProblem || !curSection) return;
    curSection.content = curBody.join("\n").trim();
    curSection.hasCode = /^```/m.test(curSection.content);
    if (curSection.content) curProblem.sections.push(curSection);
  };

  const finalizeProblem = () => {
    if (!curProblem) return;
    finalizeSection();
    curProblem.hasCode = curProblem.sections.some((s) => s.hasCode);
    problems.push(curProblem);
  };

  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();

      if (level === 1) {
        continue;
      } else if (level === 2) {
        finalizeProblem();
        const { num, rest } = firstNumber(text);
        const diffMatch = /\b(Easy|Medium|Hard|Elementary)\b/i.exec(rest);
        const difficulty = diffMatch ? (diffMatch[1][0].toUpperCase() + diffMatch[1].slice(1).toLowerCase() as "Easy" | "Medium" | "Hard") : "None";
        const lc = /(?:LC|L|Leetcode|LeetCode)\s*[#:]\s*(\d+)/.exec(rest)?.[1];
        curProblem = {
          id: slug(`${num}-${rest}`) || slug(rest),
          number: num,
          title: rest,
          lcNumber: lc,
          difficulty,
          hasCode: false,
          sections: [],
        };
        curSection = null;
        curBody = [];
      } else {
        finalizeSection();
        curSection = curProblem
          ? { id: slug(text), title: text, content: "", hasCode: false }
          : null;
        curBody = [];
      }
      continue;
    }
    if (curProblem) {
      curBody.push(line);
    } else {
      intro.push(line);
    }
  }
  finalizeProblem();

  return { path, title, fileName, intro: intro.join("\n").trim(), problems };
}