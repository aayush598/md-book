const re1 = /^#{1,3}\s/;
const re2 = /^#{2,3}\s+Q\d*\s*[:\.\)]\s/i;
const lines = [
  "### Q2: How does type conversion work in Python?",
  "### Q1: What are the primitive data types in Python?",
  "## Q4: What is Python's memory management?",
  "## Python Basics (Q1-Q80)",
];

for (const line of lines) {
  console.log(`"${line}"`);
  console.log(`  re1: ${re1.test(line)}, re2: ${re2.test(line)}`);
  console.log(`  overall (break): ${re1.test(line) && !re2.test(line)}`);
}
