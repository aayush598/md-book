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
  return `Act as a world-class tech interview coach and deep-learning tutor. I am preparing for interviews at top-tier companies — FAANG/MAANG, NVIDIA, Tesla, Samsung, and elite YC startups — and I want to extract the maximum learning from a single question-answer pair.

📖 Book: ${bookName || "Unknown"}
${topic ? `📂 Topic: ${topic}` : ""}
${source ? `📄 Source: ${source}` : ""}

Question: ${question}
Answer: ${answer}

---
Give me a comprehensive, multi-topic deep dive structured EXACTLY as follows:

1. PLAIN-LANGUAGE CORE
   Explain the answer as if to a smart non-expert. Capture the ONE core idea in a single sentence, then expand.

2. UNDERLYING THEORY & FUNDAMENTALS
   List the foundational concepts, data structures, algorithms, math, or systems principles this topic rests on. Explain each briefly.

3. RELATED & ADJACENT TOPICS (breadth)
   Cover as many connected topics as possible: variations, special cases, neighboring problems/concepts, and when each is used. Connect them to the core.

4. NUANCES, EDGE CASES & TRADE-OFFS
   Edge cases, failure modes, off-by-one traps, memory/time trade-offs, and subtle details most people miss.

5. REAL-WORLD APPLICATIONS & ANALOGIES
   2–3 concrete real-world examples (products, systems, everyday analogies) that make the concept stick.

6. TOP-COMPANY INTERVIEW ANGLE
   How this is actually tested at FAANG/MAANG, NVIDIA, Tesla, Samsung, and YC startups. Include: how it typically appears, follow-up chains interviewers use, and what signals they look for (clean reasoning, complexity analysis, test cases, optimization).

7. SAMPLE INTERVIEW CONVERSATION
   A realistic interviewer–candidate exchange: interviewer asks, candidate thinks aloud, interviewer pushes back, candidate refines. 4–6 exchanges.

8. COMPLEXITY & OPTIMIZATION DEEP-DIVE
   Rigorous time/space analysis, best/average/worst cases, possible optimizations, and how to arrive at them during an interview.

9. CODE & WORKED EXAMPLE (if applicable)
   Provide clear, correct code with a step-by-step dry run, and a small test case with expected output.

10. PRACTICE & FOLLOW-UP QUESTIONS
    5–8 follow-up interview questions (increasing difficulty) plus 2–3 related problems to practice.

11. "TOP-NOTCH ANSWER" YOU COULD RECITE
    A concise, confident 1–2 minute spoken answer covering: intuition → approach → complexity → edge cases → real-world relevance.

12. CONNECTIONS ACROSS THE CURRICULUM
    Mention how this ties to DSA, system design, concurrency, distributed systems, ML, hardware, or OS — whichever apply — and what to study next.

Be thorough, accurate, and rigorous. Where the provided answer is incomplete or debatable, point it out politely and give the corrected/expanded version. Use clear headings and keep code syntax-highlighted with \`\`\` fences.`;
}