export interface BookAnalytics {
  totalWords: number;
  totalChars: number;
  readingTimeMin: number;
  readingTimeSec: number;
  complexity: "beginner" | "intermediate" | "advanced";
  readingLevel: string;
  sentenceCount: number;
  avgWordsPerSentence: number;
  avgCharsPerWord: number;
  chapterCount: number;
  pageEstimate: number;
  fleschScore: number;
}

const WORDS_PER_PAGE: Record<string, number> = {
  "5x8": 200, "5.5x8.5": 220, "6x9": 250, "6.14x9.21": 280, "7x9": 300, "8.5x11": 380,
};

export function computeAnalytics(content: string, pageSize?: string, chapterCount: number = 1): BookAnalytics {
  const clean = content.replace(/<[^>]*>/g, "").replace(/```[\s\S]*?```/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  const sentences = clean.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const totalWords = words.length;
  const totalChars = clean.replace(/\s/g, "").length;
  const syllables = countSyllables(clean);
  const avgWps = sentences.length > 0 ? totalWords / sentences.length : 0;
  const avgCpw = totalWords > 0 ? totalChars / totalWords : 0;
  const wpm = 200;
  const readingSec = (totalWords / wpm) * 60;
  const flesch = computeFlesch(totalWords, sentences.length, syllables);

  let complexity: "beginner" | "intermediate" | "advanced";
  if (flesch >= 60) complexity = "beginner";
  else if (flesch >= 30) complexity = "intermediate";
  else complexity = "advanced";

  let readingLevel: string;
  if (flesch >= 90) readingLevel = "Very Easy (5th grade)";
  else if (flesch >= 80) readingLevel = "Easy (6th grade)";
  else if (flesch >= 70) readingLevel = "Fairly Easy (7th grade)";
  else if (flesch >= 60) readingLevel = "Standard (8th-9th grade)";
  else if (flesch >= 50) readingLevel = "Fairly Difficult (10th-12th grade)";
  else if (flesch >= 30) readingLevel = "Difficult (College)";
  else readingLevel = "Very Difficult (College Graduate)";

  const wpp = (pageSize && WORDS_PER_PAGE[pageSize]) || 250;
  const pageEstimate = Math.max(1, Math.ceil(totalWords / wpp));

  return {
    totalWords,
    totalChars,
    readingTimeMin: Math.floor(readingSec / 60),
    readingTimeSec: Math.round(readingSec % 60),
    complexity,
    readingLevel,
    sentenceCount: sentences.length,
    avgWordsPerSentence: Math.round(avgWps * 10) / 10,
    avgCharsPerWord: Math.round(avgCpw * 10) / 10,
    chapterCount,
    pageEstimate,
    fleschScore: Math.round(flesch),
  };
}

function countSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const word of words) {
    const w = word.replace(/[^a-z]/g, "");
    if (w.length <= 3) { count += 1; continue; }
    const vowels = w.match(/[aeiouy]+/g);
    const vc = vowels ? vowels.length : 1;
    if (w.endsWith("e")) count += Math.max(1, vc - 1);
    else if (w.endsWith("le") && w.length > 2 && !"aeiouy".includes(w[w.length - 3])) count += Math.max(1, vc);
    else count += vc;
  }
  return count;
}

function computeFlesch(words: number, sentences: number, syllables: number): number {
  if (words === 0 || sentences === 0) return 100;
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
}
