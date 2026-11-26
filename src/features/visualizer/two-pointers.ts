import { finishTrace, parseIntField, parseIntList, type RunResult, type Step } from "./engine";

export type TwoPointersState = {
  kind: "two-pointers";
  arr: number[];
  target: number;
  l: number;
  r: number;
  /** Sum of the two values under the pointers, once it has been computed. */
  sum: number | null;
  verdict: "start" | "too-small" | "too-large" | "found" | "none";
  /** Indices that are ruled out for good. */
  discarded: number[];
};

export const TWO_POINTERS_CODE = [
  "int l = 0, r = n - 1;",
  "while (l < r) {",
  "    int sum = a[l] + a[r];",
  "    if (sum == target) { /* found */ break; }",
  "    if (sum < target) l++;",
  "    else r--;",
  "}",
];

export const TWO_POINTERS_DEFAULT = { array: "1, 2, 4, 6, 8, 9", target: "12" };

export function runTwoPointers(input: { array: string; target: string }): RunResult<TwoPointersState> {
  const list = parseIntList(input.array, { min: 2, max: 12, lo: -99, hi: 99, label: "Array" });
  const tgt = parseIntField(input.target, { lo: -198, hi: 198, label: "Target" });
  const errors: string[] = [];
  if (!list.ok) errors.push(list.error);
  if (!tgt.ok) errors.push(tgt.error);
  if (!list.ok || !tgt.ok) return { ok: false, errors };
  const arr = list.values;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i]! < arr[i - 1]!) return { ok: false, errors: [`Array: two pointers needs a sorted array (smallest first). ${arr[i - 1]} is followed by ${arr[i]}. Sorted: ${[...arr].sort((a, b) => a - b).join(", ")}.`] };
  }
  const target = tgt.value;
  const steps: Step<TwoPointersState>[] = [];
  let l = 0;
  let r = arr.length - 1;
  const discarded: number[] = [];
  const snap = (sum: number | null, verdict: TwoPointersState["verdict"]): TwoPointersState => ({ kind: "two-pointers", arr, target, l, r, sum, verdict, discarded: [...discarded] });

  steps.push({ state: snap(null, "start"), line: 0, tone: "info", what: `Put the left pointer on the first value (${arr[0]}) and the right pointer on the last (${arr[r]}). Looking for two values that add up to ${target}.`, why: "The array is sorted, so the left end holds the smallest value and the right end the largest. That ordering is what lets us decide which pointer to move.", notice: "Sorted order is the whole trick: it tells us which direction changes the sum." });
  while (l < r) {
    const sum = arr[l]! + arr[r]!;
    if (sum === target) {
      steps.push({ state: snap(sum, "found"), line: 3, tone: "good", what: `${arr[l]} + ${arr[r]} = ${sum}, which equals the target ${target}. Found the pair at positions ${l} and ${r}.`, why: "The sum matches, so these two values are the answer and the loop can stop.", notice: "We looked at far fewer pairs than checking every pair would need." });
      return finishTrace(steps);
    }
    const small = sum < target;
    steps.push({ state: snap(sum, small ? "too-small" : "too-large"), line: 2, tone: "info", what: `${arr[l]} + ${arr[r]} = ${sum}. That is ${small ? "less" : "more"} than the target ${target}, so the sum is too ${small ? "small" : "large"}.`, why: small ? "The sum is too small and we need it bigger." : "The sum is too large and we need it smaller." });
    if (small) {
      discarded.push(l);
      const old = arr[l]!;
      l++;
      steps.push({ state: snap(null, "too-small"), line: 4, tone: "info", what: `Move the left pointer right, from ${old} to ${arr[l]}.`, why: `Even paired with the largest remaining value (${arr[r]}), ${old} only reaches ${sum}, which is too small. So ${old} cannot be part of any answer and can be dropped. Moving left to the next larger value is the only way to raise the sum.`, notice: "Each move rules out one value forever. That is why the loop takes at most n steps." });
    } else {
      discarded.push(r);
      const old = arr[r]!;
      r--;
      steps.push({ state: snap(null, "too-large"), line: 5, tone: "info", what: `Move the right pointer left, from ${old} to ${arr[r]}.`, why: `Even paired with the smallest remaining value (${arr[l]}), ${old} already gives ${sum}, which is too large. So ${old} cannot be part of any answer and can be dropped. Moving right to the next smaller value is the only way to lower the sum.`, notice: "Each move rules out one value forever. That is why the loop takes at most n steps." });
    }
  }
  steps.push({ state: snap(null, "none"), line: 1, tone: "warn", what: `The pointers met (l = ${l}, r = ${r}), so there is no pair left to try. No two values add up to ${target}.`, why: "The loop condition l < r is false. Every value was ruled out, so the answer is 'no pair'.", notice: "Reporting 'not found' is also a correct result." });
  return finishTrace(steps);
}
