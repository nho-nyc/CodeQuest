import { finishTrace, parseIntField, parseIntList, type RunResult, type Step } from "./engine";

export type SlidingWindowState = {
  kind: "sliding-window";
  arr: number[];
  k: number;
  /** Window is arr[start .. start + size - 1]; size is 0 before the window exists and while it is being built. */
  start: number;
  size: number;
  sum: number | null;
  best: number | null;
  bestStart: number | null;
  entering: number | null;
  leaving: number | null;
  phase: "start" | "built" | "slide" | "compare" | "done";
};

export const SLIDING_WINDOW_CODE = [
  "int sum = 0;",
  "for (int i = 0; i < k; i++) sum += a[i];",
  "int best = sum;",
  "for (int i = k; i < n; i++) {",
  "    sum += a[i] - a[i - k];",
  "    best = max(best, sum);",
  "}",
];

export const SLIDING_WINDOW_DEFAULT = { array: "2, 1, 5, 1, 3, 2, 8, 1", k: "3" };

export function runSlidingWindow(input: { array: string; k: string }): RunResult<SlidingWindowState> {
  const list = parseIntList(input.array, { min: 2, max: 14, lo: -99, hi: 99, label: "Array" });
  const errors: string[] = [];
  if (!list.ok) errors.push(list.error);
  const n = list.ok ? list.values.length : 0;
  const kf = parseIntField(input.k, { lo: 1, hi: Math.max(1, n || 14), label: "Window size k" });
  if (!kf.ok) errors.push(kf.error);
  if (!list.ok || !kf.ok) return { ok: false, errors };
  const arr = list.values;
  const k = kf.value;
  const steps: Step<SlidingWindowState>[] = [];
  const st = (o: Partial<SlidingWindowState> & Pick<SlidingWindowState, "phase">): SlidingWindowState => ({ kind: "sliding-window", arr, k, start: 0, size: 0, sum: null, best: null, bestStart: null, entering: null, leaving: null, ...o });

  steps.push({ state: st({ phase: "start" }), line: null, tone: "info", what: `Find the largest sum of ${k} neighbouring values in this array of ${arr.length}.`, why: "A window is a block of k neighbouring values. We want the block whose values add up to the most.", notice: "There are only n - k + 1 windows to look at." });
  let sum = 0;
  for (let i = 0; i < k; i++) sum += arr[i]!;
  steps.push({ state: st({ phase: "built", start: 0, size: k, sum, best: null }), line: 1, tone: "info", what: `Add up the first ${k} values: ${arr.slice(0, k).join(" + ")} = ${sum}. This is the first window.`, why: `We have no earlier window to reuse, so the first one must be added from scratch. That costs k = ${k} additions, once.`, notice: "Paying k additions once is fine. Paying it for every window is what we want to avoid." });
  let best = sum;
  let bestStart = 0;
  steps.push({ state: st({ phase: "built", start: 0, size: k, sum, best, bestStart }), line: 2, tone: "good", what: `Best sum so far is ${best} (window starting at position 0).`, why: "With only one window seen, it is the best one so far.", notice: "'best' remembers the largest window sum, not the sum right now." });
  for (let i = k; i < arr.length; i++) {
    const leave = arr[i - k]!;
    const enter = arr[i]!;
    const old = sum;
    sum = sum + enter - leave;
    steps.push({ state: st({ phase: "slide", start: i - k + 1, size: k, sum, best, bestStart, entering: i, leaving: i - k }), line: 4, tone: "info", what: `Slide right: ${enter} enters, ${leave} leaves. New sum = ${old} + ${enter} - ${leave} = ${sum}.`, why: `The new window shares ${k - 1} values with the old one. Instead of adding all ${k} values again, we add the one new value and subtract the one that left: 2 operations instead of ${k}.`, notice: `Recomputing every window would cost about k per window; sliding costs 2. For n = 10^5 and k = 5·10^4 that is the difference between too slow and instant.` });
    const improved = sum > best;
    if (improved) {
      best = sum;
      bestStart = i - k + 1;
    }
    steps.push({ state: st({ phase: "compare", start: i - k + 1, size: k, sum, best, bestStart }), line: 5, tone: improved ? "good" : "info", what: improved ? `${sum} beats the old best, so best becomes ${best}.` : `${sum} does not beat the best (${best}), so best stays ${best}.`, why: "After every slide we compare the new window sum with the best seen so far and keep the larger one." });
  }
  steps.push({ state: st({ phase: "done", start: bestStart, size: k, sum: best, best, bestStart }), line: null, tone: "good", what: `Done. The maximum sum of ${k} neighbouring values is ${best}, from positions ${bestStart} to ${bestStart + k - 1}.`, why: "Every window was visited exactly once, so no window was missed.", notice: "One pass, O(n) in total." });
  return finishTrace(steps);
}
