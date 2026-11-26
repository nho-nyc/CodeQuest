import { parseIntList } from "@/features/visualizer/engine";
import type { Challenge, Evaluation, KadaneState, LabStep } from "./challenge";

/** Independent reference: examine every non-empty subarray. */
export function bestNonEmptySubarray(a: number[]): number {
  let best = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < a.length; i++) {
    let s = 0;
    for (let j = i; j < a.length; j++) {
      s += a[j]!;
      if (s > best) best = s;
    }
  }
  return best;
}

export function evaluateKadane(v: Record<string, string>): Evaluation {
  const list = parseIntList(v.array ?? "", { min: 1, max: 10, lo: -20, hi: 20, label: "Array" });
  if (!list.ok) return { ok: false, errors: [list.error] };
  const arr = list.values;
  const truth = bestNonEmptySubarray(arr);
  const steps: LabStep[] = [];
  const st = (phase: KadaneState["phase"], i: number, cur: number, best: number, correct: number | null = null): KadaneState => ({ kind: "kadane", arr, i, cur, best, correct, phase });
  steps.push({ state: st("start", -1, 0, 0), line: 0, tone: "info", what: "Find the largest sum of a non-empty block of neighbouring values. Start with best = 0 and cur = 0.", why: "cur is the best sum of a block that ends at the current position. best is the largest value cur has had. Starting both at 0 feels natural: nothing has been added yet." });
  let cur = 0;
  let best = 0;
  let flawSeen = false;
  arr.forEach((x, i) => {
    const raw = cur + x;
    const clamp = raw < 0;
    cur = Math.max(0, raw);
    const harmful = clamp && !flawSeen && truth < 0;
    if (harmful) flawSeen = true;
    steps.push({
      state: st("extend", i, cur, best), line: 2, tone: harmful ? "warn" : "info", flaw: harmful || undefined,
      what: clamp ? `cur + a[${i}] = ${raw} is below 0, so cur is reset to 0.` : `cur = max(0, ${cur - x} + ${x}) = ${cur}.`,
      why: harmful ? `This is where it goes wrong. Resetting to 0 pretends an EMPTY block (sum 0) is allowed. The problem needs at least one value, and every block here is negative.` : clamp ? "A negative running sum can only hurt the next block, so starting fresh is right when a positive value could follow." : "Keep extending the block while its sum is not negative.",
      notice: harmful ? "The 0 at the start (best = 0) and the 0 in max(0, ...) both quietly allow the empty block." : undefined,
    });
    best = Math.max(best, cur);
    steps.push({ state: st("best", i, cur, best), line: 3, tone: "info", what: `best = max(best, ${cur}) = ${best}.`, why: "Remember the largest block sum seen so far." });
  });
  const differs = best !== truth;
  steps.push({ state: st("done", arr.length - 1, cur, best, truth), line: 5, tone: differs ? "warn" : "good", what: differs ? `Returns ${best}. Checking every non-empty block gives ${truth}.` : `Returns ${best}, and checking every non-empty block also gives ${truth}.`, why: differs ? `The returned ${best} is the sum of an empty block, which the problem does not allow.` : "It agrees here, because some block has a positive sum. That is exactly what hides the bug." });
  if (!differs) steps.forEach((s) => delete s.flaw);
  const fs = steps.findIndex((s) => s.flaw);
  return { ok: true, flawed: String(best), correct: String(truth), differs, steps, flawStep: differs ? (fs >= 0 ? fs : steps.length - 1) : null };
}

function* space(): Iterable<Record<string, string>> {
  const all: number[][] = [];
  const vals = [-2, -1, 0, 1, 2];
  const build = (pre: number[], len: number) => {
    if (pre.length === len) return void all.push(pre);
    for (const v of vals) build([...pre, v], len);
  };
  for (let len = 1; len <= 3; len++) build([], len);
  const abs = (a: number[]) => a.reduce((s, x) => s + Math.abs(x), 0);
  all.sort((a, b) => a.length - b.length || abs(a) - abs(b) || a.join(",").localeCompare(b.join(","), undefined, { numeric: true }));
  for (const a of all) yield { array: a.join(", ") };
}

export const MAX_SUBARRAY: Challenge = {
  id: "max-subarray-boundary",
  title: "Best block sum",
  kind: "Boundary failure",
  objective: "Learn to test minimum-size and extreme inputs, and to question the starting values of a loop.",
  statement: "Given an array of whole numbers (positive, zero or negative), find the largest sum of a non-empty block of neighbouring values.",
  approach: "Keep a running sum. If it ever drops below 0, reset it to 0, because a negative start can only hurt. Remember the largest running sum seen.",
  seems: "Dropping a negative running sum is a real idea behind the correct algorithm, and best = 0 looks like the harmless way to start a maximum.",
  assumptions: ["Starting best at 0 is safe.", "The answer is never negative."],
  constraints: "1 to 10 whole numbers, each from -20 to 20.",
  fields: [{ key: "array", label: "Array", hint: "1 to 10 whole numbers from -20 to 20, like 2, -1, 3" }],
  defaults: { array: "2, -1, 3, -4, 5" },
  flawedCode: ["int best = 0, cur = 0;", "for (int i = 0; i < n; i++) {", "    cur = max(0, cur + a[i]);", "    best = max(best, cur);", "}", "return best;"],
  correctCode: ["int best = a[0], cur = a[0];", "for (int i = 1; i < n; i++) {", "    cur = max(a[i], cur + a[i]);", "    best = max(best, cur);", "}", "return best;"],
  suggestions: [
    { label: "Mostly positive", values: { array: "4, -1, 2, 1" } },
    { label: "A single value", values: { array: "7" } },
    { label: "Only negative values", values: { array: "-4, -2, -7" } },
    { label: "A single negative value", values: { array: "-5" } },
  ],
  evaluate: evaluateKadane,
  space: { description: "arrays of 1 to 3 values, each from -2 to 2", inputs: space, order: "shorter arrays first, then smaller total of absolute values, then dictionary order" },
  question: { prompt: "What does starting with best = 0 quietly assume?", options: ["That an empty block (sum 0) is a valid answer, or that some block has a sum of at least 0.", "That the array is sorted.", "That all values are positive.", "That the array has at least 10 values."], correct: 0, feedbackWrong: "Sorting and size play no part. The problem is the starting value: 0 means the algorithm can never answer below 0, even when every block is negative." },
  explanation: {
    assumption: "The best block sum is at least 0.",
    whySeems: "Maximum-style loops often start at 0 and it works for the examples we usually think of, which contain positive numbers.",
    whyFails: "When every value is negative, every real block has a negative sum, yet the code reports 0, the sum of a block with no values. For the array [-1] the right answer is -1.",
    needs: "The initial value of a maximum must be a real candidate (the first element), not a convenient constant. Always test arrays that are all negative and arrays with a single element.",
  },
  hints: [
    "Test the smallest possible arrays, and arrays made of one kind of value only. Which kind of values have you not tried yet?",
    "Look at the two places the code uses 0. What does 0 mean as an answer here, and is it always a block the problem allows?",
    "Start best and cur from the first element instead of 0, and let cur choose between starting fresh at a[i] and extending: cur = max(a[i], cur + a[i]). Then an all-negative array returns its largest element.",
  ],
  repair: {
    direction: "Initialise from a real block: best = cur = a[0], then for each next value choose the larger of 'start a new block here' (a[i]) and 'extend the block' (cur + a[i]). The answer can now be negative.",
    complexity: "Both versions are O(n) time and O(1) memory. The fix costs nothing; only the starting reasoning changes.",
    correctNote: "The reference used here checks every non-empty block in O(n²). It is slower but obviously correct, which is what makes it a good judge.",
  },
};
