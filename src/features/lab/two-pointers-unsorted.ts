import { parseIntField, parseIntList } from "@/features/visualizer/engine";
import type { TwoPointersState } from "@/features/visualizer/two-pointers";
import type { Challenge, Evaluation, LabStep } from "./challenge";

/** Independent reference: try every pair. */
export function findPair(a: number[], target: number): [number, number] | null {
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i]! + a[j]! === target) return [i, j];
  return null;
}

export function evaluateUnsortedPointers(v: Record<string, string>): Evaluation {
  const list = parseIntList(v.array ?? "", { min: 2, max: 8, lo: 0, hi: 20, label: "Array" });
  const tgt = parseIntField(v.target ?? "", { lo: 0, hi: 40, label: "Target" });
  const errors: string[] = [];
  if (!list.ok) errors.push(list.error);
  if (!tgt.ok) errors.push(tgt.error);
  if (!list.ok || !tgt.ok) return { ok: false, errors };
  const arr = list.values;
  const target = tgt.value;
  const truth = findPair(arr, target);
  const steps: LabStep[] = [];
  let l = 0;
  let r = arr.length - 1;
  const discarded: number[] = [];
  const snap = (sum: number | null, verdict: TwoPointersState["verdict"]): TwoPointersState => ({ kind: "two-pointers", arr, target, l, r, sum, verdict, discarded: [...discarded] });
  steps.push({ state: snap(null, "start"), line: 0, tone: "info", what: `Put L on the first value (${arr[0]}) and R on the last (${arr[r]}). Looking for two values that add up to ${target}. The array is NOT sorted.`, why: "Two pointers moves inwards: if the sum is too small, move L right; if too large, move R left. The code never checks that the array is sorted." });
  let found: [number, number] | null = null;
  let flawSeen = false;
  while (l < r) {
    const sum = arr[l]! + arr[r]!;
    if (sum === target) {
      found = [l, r];
      steps.push({ state: snap(sum, "found"), line: 3, tone: "good", what: `${arr[l]} + ${arr[r]} = ${sum}, which equals the target. Pair found at positions ${l} and ${r}.`, why: "A found pair is always a real pair. The danger is the opposite: reporting 'no pair' when one exists." });
      break;
    }
    const small = sum < target;
    steps.push({ state: snap(sum, small ? "too-small" : "too-large"), line: 2, tone: "info", what: `${arr[l]} + ${arr[r]} = ${sum}, which is ${small ? "less" : "more"} than ${target}.`, why: small ? "The sum is too small, so the rule says: move L right to get a bigger value." : "The sum is too large, so the rule says: move R left to get a smaller value." });
    const d = small ? l : r;
    const active = Array.from({ length: r - l + 1 }, (_, k) => l + k).filter((x) => x !== d);
    const partner = active.find((j) => arr[d]! + arr[j]! === target);
    const harmful = !flawSeen && partner !== undefined && truth !== null;
    if (harmful) flawSeen = true;
    discarded.push(d);
    const old = arr[d]!;
    if (small) l++;
    else r--;
    steps.push({
      state: snap(null, small ? "too-small" : "too-large"), line: small ? 4 : 5, tone: harmful ? "warn" : "info", flaw: harmful || undefined,
      what: `Move ${small ? "L right" : "R left"}, dropping ${old} (position ${d}).`,
      why: harmful ? `This is where it goes wrong. The rule assumes ${small ? "values to the right are larger" : "values to the left are smaller"}, which is only true for a sorted array. Here ${old} at position ${d} pairs with ${arr[partner!]} at position ${partner} to make ${target}, but it has just been dropped for good.` : `The rule assumes ${small ? "moving right gives a larger value" : "moving left gives a smaller value"}. That is only guaranteed if the array is sorted.`,
      notice: harmful ? "In a sorted array a dropped value can never be part of an answer. Without sorting, that guarantee is gone." : undefined,
    });
  }
  if (!found) steps.push({ state: snap(null, "none"), line: 7, tone: "warn", what: `The pointers met (L = ${l}, R = ${r}). The code returns false: no pair.`, why: "The loop ended because L reached R, which the code takes to mean every pair was considered." });
  const differs = (found !== null) !== (truth !== null);
  steps.push({ state: snap(null, found ? "found" : "none"), line: null, tone: differs ? "warn" : "good", what: truth ? `Reference (every pair): ${arr[truth[0]]} + ${arr[truth[1]]} = ${target} at positions ${truth[0]} and ${truth[1]}.` : `Reference (every pair): no two values add up to ${target}.`, why: differs ? "The two-pointer code said 'no pair' but a pair exists. The code is wrong for this input." : "Both agree on this input. That does not show the method is valid for unsorted arrays." });
  if (!differs) steps.forEach((s) => delete s.flaw);
  const fs = steps.findIndex((s) => s.flaw);
  return { ok: true, flawed: found ? `pair at positions ${found[0]} and ${found[1]}` : "no pair", correct: truth ? `pair at positions ${truth[0]} and ${truth[1]}` : "no pair", differs, steps, flawStep: differs ? (fs >= 0 ? fs : steps.length - 1) : null };
}

function* space(): Iterable<Record<string, string>> {
  for (let len = 3; len <= 4; len++) {
    const arrays: number[][] = [];
    const build = (pre: number[]) => {
      if (pre.length === len) return void arrays.push(pre);
      for (let v = 1; v <= 4; v++) build([...pre, v]);
    };
    build([]);
    // prefer arrays that are close to sorted (fewer inversions), so the first counterexample is as readable as possible
    const inv = (a: number[]) => a.reduce((n, x, i) => n + a.slice(i + 1).filter((y) => y < x).length, 0);
    arrays.sort((a, b) => inv(a) - inv(b) || a.join().localeCompare(b.join()));
    for (const a of arrays) for (let t = 2; t <= 8; t++) yield { array: a.join(", "), target: String(t) };
  }
}

export const UNSORTED_POINTERS: Challenge = {
  id: "two-pointers-unsorted",
  title: "Two pointers without sorting",
  kind: "Missing precondition",
  objective: "Learn that pointer moves are only valid because of an invariant, and that the invariant comes from a precondition on the input.",
  statement: "Given an array of whole numbers and a target, decide whether two different positions hold values that add up to the target.",
  approach: "Put one pointer at each end. If the sum is too small move the left pointer right; if too large move the right pointer left. Stop when they meet.",
  seems: "This is exactly the two-pointers technique you may have just learned, it is fast (O(n)), and it works on every example in the lesson.",
  assumptions: ["Moving a pointer never discards a value that could be part of an answer.", "The array is sorted."],
  constraints: "2 to 8 whole numbers from 0 to 20, and a target from 0 to 40.",
  fields: [
    { key: "array", label: "Array", hint: "2 to 8 whole numbers from 0 to 20, like 1, 3, 4, 8" },
    { key: "target", label: "Target sum", hint: "A whole number from 0 to 40" },
  ],
  defaults: { array: "1, 3, 4, 8, 9", target: "12" },
  flawedCode: ["int l = 0, r = n - 1;", "while (l < r) {", "    int sum = a[l] + a[r];", "    if (sum == target) return true;", "    if (sum < target) l++;", "    else r--;", "}", "return false;"],
  correctCode: ["sort(a.begin(), a.end());   // establish the invariant first", "int l = 0, r = n - 1;", "while (l < r) {", "    int sum = a[l] + a[r];", "    if (sum == target) return true;", "    if (sum < target) l++;", "    else r--;", "}", "return false;"],
  suggestions: [
    { label: "A sorted array", values: { array: "1, 2, 4, 6, 8", target: "10" } },
    { label: "A shuffled array", values: { array: "5, 1, 9, 3, 6", target: "10" } },
    { label: "A target with no pair at all", values: { array: "5, 1, 9, 3", target: "40" } },
  ],
  evaluate: evaluateUnsortedPointers,
  space: { description: "arrays of 3 or 4 values from 1 to 4 with targets 2 to 8", inputs: space, order: "length 3 before length 4, then fewer out-of-order pairs first, then dictionary order, then smaller target" },
  question: { prompt: "Why is it safe to drop a value when the sum is too small, in the correct two-pointers method?", options: ["Because the array is sorted, so everything to the left of the other pointer is no larger and cannot help.", "Because the sum is an even number.", "Because the target is always the largest value.", "Because pointers are faster than loops."], correct: 0, feedbackWrong: "Speed and parity do not justify a move. A pointer may only move when we can prove no answer is lost, and that proof uses sorted order." },
  explanation: {
    assumption: "The array is sorted, so a pointer move never loses an answer.",
    whySeems: "The code is the same as the correct two-pointers loop, and it passes any example that happens to be sorted.",
    whyFails: "The rule 'sum too small, move L right' only helps if the values to the right are larger. In an unsorted array they might not be, so the value that was dropped can be exactly the one needed.",
    needs: "A precondition (sorted order) that makes the invariant 'no answer lies outside L..R' true. Establish it by sorting first, or use a different method such as a hash set.",
  },
  hints: [
    "Compare a sorted array with a shuffled array that has the same values. Does the order of the input change the result?",
    "The pointer moves are only justified if something is known about the order of the values. What does the code assume, and does it ever check it?",
    "Make the pointer rule true before you use it: sort a copy of the values first. Then 'too small, move right' really does mean 'try a bigger value' and no answer is dropped.",
  ],
  repair: {
    direction: "Sort first (O(n log n)), then run the same loop. After sorting, every dropped value really is useless: for the left pointer, even with the largest remaining partner the sum is too small. Or, if positions must stay unchanged, store seen values in a hash set and check for target - x.",
    complexity: "The flawed loop is O(n). Sorting makes the whole method O(n log n) time (the loop itself is still O(n)); a hash set gives O(n) expected time and O(n) memory.",
    correctNote: "The reference used here checks all pairs in O(n²). It is slow but cannot be fooled by the input order.",
  },
};
