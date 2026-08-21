// Shared TTS text utilities: markdown -> speakable text, and block splitting
// for highlight-tracking during playback.

export function ttsText(md: string): string {
  return md
    .replace(/```[a-zA-Z0-9+\-_.]*\n?([\s\S]*?)```/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{00A0}\u2013\u2014\u2022\u2026\u00D7\u2248\u00B1\u00F7]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isHeadingBlock(block: string): boolean {
  return /^#{1,6}\s/.test(block.trim());
}

// Split markdown into speakable blocks: paragraphs, list groups, headings,
// blockquotes and code fences (each fence stays a single block).
export function splitBlocks(md: string): string[] {
  const blocks: string[] = [];
  const lines = md.split("\n");
  let cur: string[] = [];
  let inCode = false;

  const flush = () => {
    if (cur.length) {
      const b = cur.join("\n").trim();
      if (b) blocks.push(b);
      cur = [];
    }
  };

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      if (!inCode) {
        flush();
        inCode = true;
        cur.push(line);
      } else {
        cur.push(line);
        flush();
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      cur.push(line);
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    cur.push(line);
  }
  flush();
  return blocks;
}
