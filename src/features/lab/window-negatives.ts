import { parseIntField, parseIntList } from "@/features/visualizer/engine";
import type { Challenge, Evaluation, LabStep, WindowState } from "./challenge";

/** Independent reference: longest non-empty block with sum <= limit, found by trying every block. Also returns the leftmost start for blocks ending at each r. */
export function longestBlock(a: number[], limit: number): { length: number; range: [number, number] | null; startFor: number[] } {
  let length = 0;
  let range: [number, number] | null = null;
  const startFor: number[] = [];
  for (let r = 0; r < a.length; r++) {
    startFor[r] = r + 1;
    let s = 0;
    for (let l = r; l >= 0; l--) {
      s += a[l]!;
      if (s <= limit) startFor[r] = l;
    }
  }
  for (let l = 0; l < a.length; l++) {
    let s = 0;
    for (let r = l; r < a.length; r++) {
      s += a[r]!;
      if (s <= limit && r - l + 1 > length) {
        length = r - l + 1;
        range = [l, r];
      }
    }
  }
  return { length, range, startFor };
}

export function evaluateWindow(v: Record<string, string>): Evaluation {
  const list = parseIntList(v.array ?? "", { min: 1, max: 8, lo: -9, hi: 9, label: "Array" });
  const lim = parseIntField(v.limit ?? "", { lo: -10, hi: 30, label: "Limit K" });
  const errors: string[] = [];
  if (!list.ok) errors.push(list.error);
  if (!lim.ok) errors.push(lim.error);
  if (!list.ok || !lim.ok) return { ok: false, errors };
  const arr = list.values;
  const limit = lim.value;
  const truth = longestBlock(arr, limit);
  const steps: LabStep[] = [];
  const st = (phase: WindowState["phase"], l: number, r: number, sum: number, best: number, bestL: number, bestR: number, done = false): WindowState => ({ kind: "window", arr, limit, l, r, sum, best, bestL, bestR, truth: done ? truth.range : null, phase });
  steps.push({ state: st("start", 0, -1, 0, 0, 0, -1), line: 0, tone: "info", what: `Find the longest block of neighbouring values whose sum is at most K = ${limit}.`, why: "Sliding window idea: grow the window on the right. If its sum becomes too big, shrink it from the left until the sum fits again." });
  let l = 0;
  let sum = 0;
  let best = 0;
  let bestL = 0;
  let bestR = -1;
  let flawSeen = false;
  for (let r = 0; r < arr.length; r++) {
    sum += arr[r]!;
    steps.push({ state: st("add", l, r, sum, best, bestL, bestR), line: 2, tone: "info", what: `Add a[${r}] = ${arr[r]} on the right. Sum = ${sum}.`, why: "The window grows to include the new value." });
    while (sum > limit && l <= r) {
      const out = arr[l]!;
      sum -= out;
      l++;
      const idx = l - 1;
      // Harmful when it throws away a start that a valid block ending here needs, or the start of the longest true block before that block is complete.
      const early = truth.range !== null && idx === truth.range[0] && r < truth.range[1];
      const harmful = !flawSeen && (l > truth.startFor[r]! || early);
      if (harmful) flawSeen = true;
      steps.push({
        state: st("shrink", l, r, sum, best, bestL, bestR), line: 3, tone: harmful ? "warn" : "info", flaw: harmful || undefined,
        what: `Sum is more than K = ${limit}. Drop ${out} from the left. Sum = ${sum}.`,
        why: harmful ? (early ? `This is where it goes wrong. Dropping ${out} (position ${idx}) assumes it can never help again. But the longest valid block, positions ${truth.range![0]}..${truth.range![1]}, starts exactly here: later negative numbers bring its sum back down to at most K. The rule 'too big, so drop from the left' only works when every number is positive.` : `This is where it goes wrong. Dropping ${out} assumes a shorter window is the only way to lower the sum. But a longer block ending here, starting at position ${truth.startFor[r]}, already fits within K. The rule 'too big, so drop from the left' only works when every number is positive.`) : "Too big, so drop the oldest value. With only positive numbers this always lowers the sum.",
        notice: harmful ? "A later negative number can bring the sum back down, so dropping early values is not always necessary and loses longer answers." : undefined,
      });
    }
    if (r - l + 1 > best) {
      best = r - l + 1;
      bestL = l;
      bestR = r;
    }
    steps.push({ state: st("record", l, r, sum, best, bestL, bestR), line: 4, tone: "info", what: `Window ${l <= r ? `[${l}..${r}]` : "is empty"} has length ${r - l + 1}. Longest so far: ${best}.`, why: "Keep the longest window found." });
  }
  const differs = best !== truth.length;
  steps.push({ state: st("done", l, arr.length - 1, sum, best, bestL, bestR, true), line: 6, tone: differs ? "warn" : "good", what: truth.range ? `Returns ${best}. Checking every block, the longest with sum at most ${limit} is positions ${truth.range[0]}..${truth.range[1]} (length ${truth.length}).` : `Returns ${best}. Checking every block, none has a sum of at most ${limit}.`, why: differs ? "The window method missed a longer valid block. It is wrong for this input." : "They agree here, for example because there are no negative numbers or because it did not matter. That proves nothing in general." });
  if (!differs) steps.forEach((s) => delete s.flaw);
  const fs = steps.findIndex((s) => s.flaw);
  return { ok: true, flawed: `length ${best}`, correct: `length ${truth.length}`, differs, steps, flawStep: differs ? (fs >= 0 ? fs : steps.length - 1) : null };
}

function* space(): Iterable<Record<string, string>> {
  const all: number[][] = [];
  const vals = [-1, 0, 1, 2];
  const build = (pre: number[], len: number) => {
    if (pre.length === len) return void all.push(pre);
    for (const v of vals) build([...pre, v], len);
  };
  for (let len = 3; len <= 4; len++) build([], len);
  const abs = (a: number[]) => a.reduce((s, x) => s + Math.abs(x), 0);
  all.sort((a, b) => a.length - b.length || abs(a) - abs(b) || a.join().localeCompare(b.join(), undefined, { numeric: true }));
  for (const a of all) for (let k = 0; k <= 3; k++) yield { array: a.join(", "), limit: String(k) };
}

export const WINDOW_NEGATIVES: Challenge = {
  id: "window-negatives",
  title: "Sliding window with negatives",
  kind: "Broken monotonicity",
  objective: "Learn that shrinking a window is only valid when adding values can never lower the sum, and what happens when negative numbers break that.",
  statement: "Given an array of whole numbers and a limit K, find the length of the longest block of neighbouring values whose sum is at most K (0 if there is none).",
  approach: "Grow a window on the right. Whenever its sum exceeds K, drop values from the left until it fits again. Record the longest window.",
  seems: "It is the standard sliding-window pattern, it runs in O(n), and it is correct for 'longest block with sum at most K' when every number is positive.",
  assumptions: ["A bigger window always has a bigger sum, so once it is too large only shrinking helps.", "All numbers are positive."],
  constraints: "1 to 8 whole numbers from -9 to 9, and K from -10 to 30.",
  fields: [
    { key: "array", label: "Array", hint: "1 to 8 whole numbers from -9 to 9, like 2, 1, 3" },
    { key: "limit", label: "Limit K", hint: "A whole number from -10 to 30" },
  ],
  defaults: { array: "2, 1, 3, 1, 2", limit: "5" },
  flawedCode: ["int l = 0, sum = 0, best = 0;", "for (int r = 0; r < n; r++) {", "    sum += a[r];", "    while (sum > K && l <= r) { sum -= a[l]; l++; }", "    best = max(best, r - l + 1);", "}", "return best;"],
  correctCode: ["int best = 0;", "for (int l = 0; l < n; l++) {", "    int sum = 0;", "    for (int r = l; r < n; r++) {", "        sum += a[r];", "        if (sum <= K) best = max(best, r - l + 1);", "    }", "}", "return best;"],
  suggestions: [
    { label: "Only positive numbers", values: { array: "3, 1, 2, 4", limit: "6" } },
    { label: "A negative number inside", values: { array: "4, -3, 2, 1", limit: "2" } },
    { label: "Zeros and negatives only", values: { array: "0, -2, 0", limit: "-1" } },
  ],
  evaluate: evaluateWindow,
  space: { description: "arrays of 3 or 4 values from -1 to 2 with limits K from 0 to 3", inputs: space, order: "shorter arrays first, then smaller total of absolute values, then dictionary order, then smaller K" },
  question: { prompt: "What must be true for 'sum too big, so drop from the left' to be safe?", options: ["Adding more values never lowers the sum (all values are non-negative), so a larger window is never better once it is too big.", "The array must have an even length.", "K must be zero.", "The window must be at least 3 long."], correct: 0, feedbackWrong: "Length and K do not matter. The shrink rule needs monotonicity: more values must never mean a smaller sum. Negative numbers break exactly that." },
  explanation: {
    assumption: "Adding values never lowers the sum (monotonicity).",
    whySeems: "For positive numbers a window that is too heavy can only get heavier when extended, so dropping from the left is the only way forward.",
    whyFails: "With a negative number later in the array, extending the window can make the sum smaller. The code has already thrown away early values to fix a sum that a later negative number would have fixed for free, so it misses a longer valid block.",
    needs: "A monotonic property: moving the right end right never decreases the sum. With negatives you need another approach, such as checking blocks directly or using prefix sums with a data structure.",
  },
  hints: [
    "Try the same pattern with arrays that contain a negative number. Which value, positive or negative, would change how the sum behaves when the window grows?",
    "The code drops values only because the sum is too big. What assumption about adding a value makes that the only possible fix?",
    "Sliding windows need a property that gets only worse (or only better) as the window grows. With negatives it is not monotonic, so check every block (or use prefix sums) instead of shrinking greedily.",
  ],
  repair: {
    direction: "For beginners: test every start l and extend r, keeping the longest block whose sum is at most K (O(n²)). To go faster you would use prefix sums with extra structure; the sliding window is correct only when all numbers are non-negative.",
    complexity: "The window method is O(n) but only valid for non-negative numbers. The safe fix is O(n²) time and O(1) memory. Faster methods exist but need ideas beyond this lesson.",
    correctNote: "The reference used here checks every block. It is slow but does not rely on any property of the numbers.",
  },
};
