export interface StudyPromptOptions {
  question: string;
  answer: string;
  source?: string;
  bookName?: string;
}

export function topicFromSource(source?: string): string {
  return source?.replace(/^book\//, "")?.split("/")?.slice(0, -1)?.join(" › ") || "";
}

export function buildStudyPrompt({ question, answer, source, bookName }: StudyPromptOptions): string {
  const topic = topicFromSource(source);
  return `Act as a principal-level engineer and technical interviewer (ex-FAANG/MAANG, NVIDIA, Tesla, Samsung, elite YC startups). I am using this flashcard for serious technical interview preparation and I need MAXIMUM technical depth and density — not a beginner-friendly explanation.

CONTEXT
- Book: ${bookName || "Unknown"}
${topic ? `- Topic: ${topic}\n` : ""}${source ? `- Source: ${source}\n` : ""}
- QUESTION: ${question}
- PROVIDED ANSWER: ${answer}

RESPONSE REQUIREMENTS (non-negotiable)
1. Audience = senior engineers. Use precise, industry-standard terminology; define a term only if it is genuinely obscure.
2. Go UNDER THE HOOD: explain the actual mechanics — memory layout, CPU/cache behavior, compiler/runtime/OS/network/database/ML internals — whichever apply to this topic.
3. Be specific: exact data structures and algorithm names, complexity WITH derivation (never just "O(n log n)" — explain why), protocol/spec/standard names where relevant, version- or language-specific behaviors when they matter.
4. Use numbers wherever possible: time/space bounds, latency/throughput figures, memory footprints, typical real-world magnitudes.
5. Zero fluff: no encouragement, no restating the question, no filler sentences. Every sentence must carry technical information.
6. Correct me: if the provided answer is wrong, incomplete, or imprecise, say so explicitly at the top under "CORRECTIONS" and give the corrected version.
7. Format: markdown headings matching the section names below; code in \`\`\` fences with language tags; ASCII diagrams for architecture/data-flow/memory layout; comparison tables when contrasting approaches.

STRUCTURE YOUR ENTIRE RESPONSE EXACTLY AS FOLLOWS:

## 1. ONE-SHOT TECHNICAL SUMMARY
3–5 dense sentences: what it is, how it works internally, why it matters in practice, and its single biggest trade-off.

## 2. INTERNALS & UNDER-THE-HOOD MECHANICS
Step-by-step of what ACTUALLY happens at the system level when this runs (memory allocation, cache lines, stack/heap, syscalls, network round-trips, GPU kernels, tensor ops — whatever applies). Include an ASCII diagram of the flow / architecture / data layout.

## 3. THEORETICAL FOUNDATIONS
The CS/math foundations this rests on — data structures, algorithm paradigms, complexity theory, OS scheduling/virtual memory, concurrency theory, distributed-systems guarantees (CAP/consistency models), linear algebra/probability for ML — whichever apply. Explain each precisely and how it connects.

## 4. COMPLEXITY & PERFORMANCE ANALYSIS
Rigorous time/space analysis with derivation: best/average/worst cases, constant factors, cache locality effects, amortized costs where relevant. Identify real-world bottlenecks and give benchmark-style numbers where reasonable.

## 5. EDGE CASES, FAILURE MODES & PITFALLS
Exhaustive list: boundary conditions, off-by-one traps, integer overflow/underflow, null/empty/single-element inputs, race conditions and memory hazards, security implications, numerical instability, and the subtle bugs engineers actually hit in production.

## 6. IMPLEMENTATION (PRODUCTION QUALITY)
Pick the most appropriate language (state which and why). Provide:
a) The optimal solution, fully commented, complexity annotated inline.
b) At least one alternative approach with different trade-offs.
c) A dry run on a non-trivial input showing intermediate state.
d) Test cases INCLUDING edge cases with expected outputs.

## 7. VARIANTS & ADJACENT PROBLEMS
Every notable variation, special case, and neighboring problem. For each: when to use it, what changes, and the trade-off. Include a comparison table across variants.

## 8. SYSTEM & REAL-WORLD CONTEXT
Where this appears in real production systems and products (name concrete systems/companies), scaling considerations (what breaks at 10x/1000x), and how it interacts with surrounding infrastructure.

## 9. INTERVIEW EXECUTION PLAYBOOK
How top companies actually test this: how the question is introduced, a chain of 4–6 realistic follow-up probes (each with a strong answer), what signals interviewers grade (complexity reasoning, testing discipline, communication, optimization instinct), and the common mistakes that fail candidates.

## 10. MOCK INTERVIEW TRANSCRIPT
A 5–7 turn interviewer–candidate dialogue at senior/L5 level: think-aloud reasoning, interviewer pushback, candidate refinement, ending in a clean optimal solution.

## 11. SENIOR-LEVEL RECITABLE ANSWER
A 90-second spoken answer I can memorize: intuition → mechanism → complexity → edge cases → production relevance. Dense, confident, zero filler.

## 12. LEARNING PATH & PRACTICE SET
Related topics across DSA, system design, concurrency, distributed systems, ML, OS, and hardware that connect here — ranked by importance with one-line reasons. Then 6–10 practice problems with difficulty labels, and 5 advanced follow-up questions an interviewer could ask next.

If a section genuinely does not apply to this topic, state "N/A — <one-line reason>" instead of padding. Maximize information density everywhere else.`;
}
