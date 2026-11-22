/** Needs g++. Writes the small test cases (<= 3000 chars) of every problem to src/content/problems/small-tests.json. */
import fs from "node:fs";
import { PROBLEMS } from "../src/content/problems";
import { buildProblem } from "./lib/problem-build";

const out: Record<string, Array<{ input: string; expected: string; isSample: boolean }>> = {};
for (const p of PROBLEMS) {
  // Samples first, then the smallest hidden tests until a ~25 KB budget per problem is used (keeps the repo and free DB small).
  const built = buildProblem(p).tests;
  const samples = built.filter((t) => t.isSample);
  const hidden = built.filter((t) => !t.isSample).sort((a, b) => a.input.length + a.expected.length - (b.input.length + b.expected.length));
  let used = samples.reduce((s, t) => s + t.input.length + t.expected.length, 0);
  const chosen = [...samples];
  for (const t of hidden) {
    const z = t.input.length + t.expected.length;
    if (used + z > 25_000 && chosen.length >= samples.length + 4) continue;
    chosen.push(t);
    used += z;
  }
  out[p.slug] = chosen.map((t) => ({ input: t.input, expected: t.expected, isSample: t.isSample }));
}
fs.writeFileSync("src/content/problems/small-tests.json", JSON.stringify(out));
console.log(`wrote ${Object.values(out).reduce((s, a) => s + a.length, 0)} tests for ${PROBLEMS.length} problems`);
