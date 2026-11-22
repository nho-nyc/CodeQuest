/**
 * Verifies the competitive programming content:
 *  - the reference solution compiles and runs on EVERY test, quickly
 *  - the sample outputs written in the statement equal what the reference prints (independent cross-check)
 *  - structure: 3 hints, unique slugs, tags, limits, input size, no duplicate tests
 */
import path from "node:path";
import { PROBLEMS as ALL } from "../src/content/problems";
import type { ProblemSeed } from "../src/content/problems/types";
import { outputsMatch } from "../src/server/judge/checker";
import { buildProblem, hasGpp } from "./lib/problem-build";

if (!hasGpp()) {
  console.error("g++ is required to verify problems.");
  process.exit(1);
}
// Optional: `tsx scripts/verify-problems.ts src/content/problems/setA.ts` verifies only the `problems` array exported by that file.
const only = process.argv[2];
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PROBLEMS: ProblemSeed[] = only ? (require(path.resolve(only)) as { problems: ProblemSeed[] }).problems : ALL;
let errors = 0;
const fail = (slug: string, msg: string) => {
  errors++;
  console.error(`✘ ${slug}: ${msg}`);
};

const slugs = new Set<string>();
let totalTests = 0;
for (const p of PROBLEMS) {
  if (slugs.has(p.slug)) fail(p.slug, "duplicate slug");
  slugs.add(p.slug);
  if (p.hints.length !== 3 || p.hints.some((h) => h.trim().length < 20)) fail(p.slug, "needs exactly 3 meaningful hints");
  if (p.tags.length === 0) fail(p.slug, "no tags");
  if (p.samples.length === 0) fail(p.slug, "no samples");
  if (p.editorial.length < 80) fail(p.slug, "editorial too short");

  let built;
  try {
    built = buildProblem(p);
  } catch (e) {
    fail(p.slug, (e as Error).message);
    continue;
  }
  totalTests += built.tests.length;
  p.samples.forEach((s, i) => {
    if (!outputsMatch(s.output, built.tests[i]!.expected)) fail(p.slug, `sample ${i + 1}: statement says "${s.output.trim()}" but the reference prints "${built.tests[i]!.expected.trim().slice(0, 60)}"`);
  });
  const hidden = built.tests.filter((t) => !t.isSample);
  if (hidden.length < 6) fail(p.slug, `only ${hidden.length} hidden tests`);
  const seen = new Set<string>();
  for (const t of built.tests) {
    if (seen.has(t.input)) fail(p.slug, "duplicate test input");
    seen.add(t.input);
    if (t.input.length > 8_000_000) fail(p.slug, "test input is larger than 8 MB");
  }
  const distinctOutputs = new Set(hidden.map((t) => t.expected.trim())).size;
  if (hidden.length >= 6 && distinctOutputs < 2) fail(p.slug, "all hidden tests have the same answer (weak tests)");
  const maxIn = Math.max(...built.tests.map((t) => t.input.length));
  const totIn = built.tests.reduce((a, t) => a + t.input.length, 0);
  if (only && (maxIn > 700_000 || totIn > 1_600_000)) fail(p.slug, `tests too large for the free database tier (max ${maxIn} B, total ${totIn} B; limits 700 KB / 1.6 MB)`);
  if (built.maxRefMs > p.timeLimitMs / 2) fail(p.slug, `reference needs ${built.maxRefMs} ms, more than half the ${p.timeLimitMs} ms limit`);
  console.log(`  ok ${p.slug.padEnd(34)} ${String(built.tests.length).padStart(2)} tests, reference max ${built.maxRefMs} ms`);
}
console.log(`\nChecked ${PROBLEMS.length} problems, ${totalTests} tests.`);
if (errors) {
  console.error(`${errors} problem(s) found.`);
  process.exit(1);
}
console.log("✔ all problems verified");
