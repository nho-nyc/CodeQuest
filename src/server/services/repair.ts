/**
 * Algorithm Repair Workshop: run and verify a learner's repaired C++ program through the EXISTING judge
 * (getJudge -> Judge0). READ-ONLY with respect to progress: this file has no database access at all, so a run or a
 * submission can never change XP, hearts, mastery, unlocks or solved status, whatever the verdict.
 */
import { REPAIR_BY_ID, type RepairChallenge } from "@/features/repair/challenges";
import { judgeOne, aggregate, type TestVerdict } from "@/server/judge/checker";
import type { Reflection } from "@/features/repair/challenges";
import { SECRETS } from "@/server/repair/secret";
import { ServiceError } from "./lesson-run";
import { requireJudge, validateSource, withJudge } from "./problems";

const MAX_SHOWN = 1000;
const clip = (s: string, n = MAX_SHOWN) => (s.length > n ? `${s.slice(0, n)}\n...[truncated]` : s);

function find(id: unknown): { c: RepairChallenge; secret: (typeof SECRETS)[string] } {
  if (typeof id !== "string" || !Object.prototype.hasOwnProperty.call(REPAIR_BY_ID, id)) throw new ServiceError("Challenge not found", 404);
  return { c: REPAIR_BY_ID[id]!, secret: SECRETS[id]! };
}

/** Same shape as the practice page's RunResult so the existing RunPanel renders it. */
export type RepairRunCase = { label: string; status: TestVerdict; passed: boolean; input: string; expected: string; output: string; stderr: string; timeMs: number | null };
export type RepairRunResult = { compileError: string | null; cases: RepairRunCase[] };

/** "Run": the visible sample tests only, with input, expected and actual output. */
export async function runRepair(userId: string, id: unknown, sourceIn: unknown, languageIn: unknown): Promise<RepairRunResult> {
  void userId;
  const { source, language } = validateSource(sourceIn, languageIn);
  const { c } = find(id);
  const judge = requireJudge();
  const runs = await withJudge(() => judge.run(source, language, c.samples.map((s) => s.input), { timeMs: c.timeLimitMs, memoryMb: c.memoryLimitMb }));
  const compile = runs.find((r) => r.status === "compilation_error");
  if (compile) return { compileError: clip(compile.compileOutput || "Compilation failed", 4000), cases: [] };
  return {
    compileError: null,
    cases: runs.map((r, i) => {
      const s = c.samples[i]!;
      const verdict = judgeOne(s.expected, r);
      return { label: s.label, status: verdict, passed: verdict === "accepted", input: clip(s.input), expected: clip(s.expected), output: clip(r.stdout), stderr: clip(r.stderr), timeMs: r.timeMs };
    }),
  };
}

export type RepairSubmitResult = {
  verdict: TestVerdict;
  passed: number;
  total: number;
  publicPassed: number;
  publicTotal: number;
  hiddenPassed: number;
  hiddenTotal: number;
  /** Verdict of the first failing HIDDEN test (kind only: its input and expected output are never revealed). */
  hiddenFailure: TestVerdict | null;
  /** Visible tests, with input, expected and actual output. */
  publicCases: RepairRunCase[];
  timeMs: number;
  memoryKb: number;
  compileOutput: string | null;
  /** Present only when every test passed. */
  reflection: Reflection | null;
};

/** "Submit": all tests, visible and hidden. Accepted only when the judge says every test passed. */
export async function submitRepair(userId: string, id: unknown, sourceIn: unknown, languageIn: unknown): Promise<RepairSubmitResult> {
  void userId;
  const { source, language } = validateSource(sourceIn, languageIn);
  const { c, secret } = find(id);
  const judge = requireJudge();
  const hidden = secret.hidden();
  const tests = [...c.samples.map((s) => ({ input: s.input, expected: s.expected })), ...hidden];
  const runs = await withJudge(() => judge.run(source, language, tests.map((t) => t.input), { timeMs: c.timeLimitMs, memoryMb: c.memoryLimitMb }));
  const agg = aggregate(tests.map((t) => t.expected), runs);
  const pub = c.samples.length;
  const per = runs.map((r, i) => judgeOne(tests[i]!.expected, r));
  const compile = runs.find((r) => r.status === "compilation_error");
  const publicCases: RepairRunCase[] = compile
    ? []
    : c.samples.map((s, i) => ({ label: s.label, status: per[i]!, passed: per[i] === "accepted", input: clip(s.input), expected: clip(s.expected), output: clip(runs[i]!.stdout), stderr: clip(runs[i]!.stderr), timeMs: runs[i]!.timeMs }));
  const hiddenVerdicts = per.slice(pub);
  const hiddenPassed = compile ? 0 : hiddenVerdicts.filter((v) => v === "accepted").length;
  return {
    verdict: agg.verdict,
    passed: agg.passed,
    total: agg.total,
    publicPassed: compile ? 0 : per.slice(0, pub).filter((v) => v === "accepted").length,
    publicTotal: pub,
    hiddenPassed,
    hiddenTotal: hidden.length,
    hiddenFailure: compile ? null : hiddenVerdicts.find((v) => v !== "accepted") ?? null,
    publicCases,
    timeMs: agg.timeMs,
    memoryKb: agg.memoryKb,
    compileOutput: compile ? clip(compile.compileOutput || "Compilation failed", 4000) : null,
    reflection: agg.verdict === "accepted" ? secret.reflection : null,
  };
}

/** One hint at a time. Hints name the kind of check, the suspicious assumption, and the direction of the repair; never a hidden test. */
export function repairHint(id: unknown, level: unknown): { level: number; text: string } {
  const { secret } = find(id);
  if (typeof level !== "number" || !Number.isInteger(level) || level < 1 || level > 3) throw new ServiceError("Hint level must be 1, 2 or 3", 400);
  return { level, text: secret.hints[level - 1]! };
}

/** The reference solution and the reflection. Sent only on an explicit request from the learner. */
export function repairSolution(id: unknown): { solution: string; reflection: Reflection } {
  const { secret } = find(id);
  return { solution: secret.solution, reflection: secret.reflection };
}
