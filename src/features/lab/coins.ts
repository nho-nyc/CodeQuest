import { parseIntField, parseIntList } from "@/features/visualizer/engine";
import type { Challenge, CoinState, Evaluation, LabStep } from "./challenge";

/** Independent reference: dynamic programming over every amount, so no greedy choice is ever assumed. */
export function optimalCoins(coins: number[], amount: number): { count: number; combo: number[] | null } {
  const INF = Number.POSITIVE_INFINITY;
  const best = Array<number>(amount + 1).fill(INF);
  const via = Array<number>(amount + 1).fill(0);
  best[0] = 0;
  const order = [...coins].sort((a, b) => b - a);
  for (let a = 1; a <= amount; a++) for (const c of order) if (c <= a && best[a - c]! + 1 < best[a]!) { best[a] = best[a - c]! + 1; via[a] = c; }
  if (best[amount] === INF) return { count: -1, combo: null };
  const combo: number[] = [];
  for (let a = amount; a > 0; a -= via[a]!) combo.push(via[a]!);
  return { count: best[amount]!, combo };
}
/** Fewest coins for every amount 0..amount (-1 when impossible), used to locate the first harmful greedy choice. */
function table(coins: number[], amount: number): number[] {
  return Array.from({ length: amount + 1 }, (_, a) => optimalCoins(coins, a).count);
}

export function evaluateCoins(v: Record<string, string>): Evaluation {
  const list = parseIntList(v.coins ?? "", { min: 1, max: 5, lo: 1, hi: 20, label: "Coins" });
  const amt = parseIntField(v.amount ?? "", { lo: 1, hi: 30, label: "Amount" });
  const errors: string[] = [];
  if (!list.ok) errors.push(list.error);
  else if (new Set(list.values).size !== list.values.length) errors.push("Coins: each coin value should appear once.");
  if (!amt.ok) errors.push(amt.error);
  if (errors.length || !list.ok || !amt.ok) return { ok: false, errors };
  const coins = [...new Set(list.values)].sort((a, b) => b - a);
  const amount = amt.value;
  const ref = optimalCoins(coins, amount);
  const opt = table(coins, amount);
  const steps: LabStep[] = [];
  const st = (phase: CoinState["phase"], taken: number[], remaining: number, optimal: number[] | null = null): CoinState => ({ kind: "coins", coins, amount, taken: [...taken], remaining, optimal, phase });
  steps.push({ state: st("start", [], amount), line: 0, tone: "info", what: `Pay ${amount} using as few coins as possible. Coins (largest first): ${coins.join(", ")}.`, why: "The greedy rule: always take the largest coin that still fits. It is quick, and it feels obviously right: big coins cover more value per coin." });
  const taken: number[] = [];
  let rem = amount;
  let flawed = false;
  for (const c of coins) {
    while (rem >= c) {
      rem -= c;
      taken.push(c);
      const k = taken.length;
      const harmful = !flawed && ref.count >= 0 && (opt[rem]! < 0 || k + opt[rem]! > ref.count);
      if (harmful) flawed = true;
      steps.push({
        state: st("take", taken, rem), line: 4, tone: harmful ? "warn" : "info", flaw: harmful || undefined,
        what: `Take a ${c} (the largest coin that fits). Remaining: ${rem + c} - ${c} = ${rem}.`,
        why: harmful ? `This is where it goes wrong. Taking ${c} looks best right now, but ${rem === 0 ? "it does not lead to the fewest coins" : `the ${rem} left over ${opt[rem]! < 0 ? "cannot be paid at all" : `needs ${opt[rem]} more coin${opt[rem] === 1 ? "" : "s"}, so this path uses ${k + opt[rem]!} in total`}`}. The best answer (${ref.combo!.join(" + ")}, ${ref.count} coins) does not start from this choice.` : `${c} is the largest coin that is not more than ${rem + c}, so the greedy rule takes it.`,
        notice: harmful ? "A choice that is best for this one step can block a better answer later. Greedy never looks back." : undefined,
      });
    }
  }
  const done = rem === 0;
  steps.push({ state: st(done ? "done" : "stuck", taken, rem), line: 7, tone: done ? "info" : "warn", what: done ? `Greedy pays ${amount} with ${taken.length} coin${taken.length === 1 ? "" : "s"}: ${taken.join(" + ")}.` : `Stuck: ${rem} is left but no coin fits. Greedy returns -1 ("impossible").`, why: done ? "Every coin that fit was taken, and nothing remains." : "Greedy cannot undo a choice, so once it is stuck it gives up, even if another combination exists." });
  const differs = (done ? taken.length : -1) !== ref.count;
  steps.push({ state: st("compare", taken, rem, ref.combo), line: null, tone: differs ? "warn" : "good", what: ref.count < 0 ? "Reference (dynamic programming): no combination of these coins makes the amount, so greedy is right here." : `Reference (dynamic programming tries every combination): ${ref.combo!.join(" + ")} = ${ref.count} coin${ref.count === 1 ? "" : "s"}.`, why: differs ? `Greedy gave ${done ? taken.length : "impossible"} but the true minimum is ${ref.count}. The greedy answer is wrong for this input.` : "Greedy and the reference agree on this input. One agreeing example proves nothing about other inputs." });
  const flawStep = steps.findIndex((s) => s.flaw);
  if (!differs) steps.forEach((s) => delete s.flaw);
  return { ok: true, flawed: done ? `${taken.length} coin${taken.length === 1 ? "" : "s"}` : "impossible", correct: ref.count < 0 ? "impossible" : `${ref.count} coin${ref.count === 1 ? "" : "s"}`, differs, steps, flawStep: differs && flawStep >= 0 ? flawStep : differs ? steps.length - 2 : null };
}

function* coinSpace(): Iterable<Record<string, string>> {
  const sets: number[][] = [];
  for (let a = 2; a <= 6; a++) sets.push([1, a]);
  for (let a = 2; a <= 6; a++) for (let b = a + 1; b <= 6; b++) sets.push([1, a, b]);
  sets.sort((x, y) => x.length - y.length || x.join().localeCompare(y.join(), undefined, { numeric: true }));
  for (let amount = 1; amount <= 12; amount++) for (const s of sets) yield { coins: s.join(", "), amount: String(amount) };
}

export const COINS: Challenge = {
  id: "greedy-coins",
  title: "Greedy coin change",
  kind: "Greedy failure",
  objective: "See that a locally best choice can block the globally best answer, and learn to test a greedy idea against a reference.",
  statement: "You have coins of several values, as many of each as you want. Pay an exact amount using the fewest coins possible.",
  approach: "Always take the largest coin that still fits, until the amount is paid.",
  seems: "It is how we pay with real money: take the biggest note first. It is fast, and it is correct for the coins you use every day.",
  assumptions: ["Taking the largest coin never makes the rest of the payment harder.", "The coin values behave like everyday coins."],
  constraints: "1 to 5 different coin values (1 to 20) and an amount from 1 to 30.",
  fields: [
    { key: "coins", label: "Coin values", hint: "1 to 5 different whole numbers from 1 to 20, like 1, 5, 10" },
    { key: "amount", label: "Amount to pay", hint: "A whole number from 1 to 30" },
  ],
  defaults: { coins: "1, 5, 10", amount: "13" },
  flawedCode: ["sort(coins.rbegin(), coins.rend());", "int count = 0;", "for (int c : coins) {", "    while (amount >= c) {", "        amount -= c; count++;", "    }", "}", "return amount == 0 ? count : -1;"],
  correctCode: ["vector<int> best(amount + 1, INT_MAX);", "best[0] = 0;", "for (int a = 1; a <= amount; a++)", "    for (int c : coins)", "        if (c <= a && best[a - c] != INT_MAX)", "            best[a] = min(best[a], best[a - c] + 1);", "return best[amount] == INT_MAX ? -1 : best[amount];"],
  suggestions: [
    { label: "Everyday-style coins", values: { coins: "1, 2, 5", amount: "9" } },
    { label: "Coins that do not fit together neatly", values: { coins: "1, 4, 5", amount: "8" } },
    { label: "No 1-coin at all", values: { coins: "2, 5", amount: "7" } },
  ],
  evaluate: evaluateCoins,
  space: { description: "coin sets of 2 or 3 different coins from 1 to 6 that include a 1-coin (so every amount can be paid), with amounts 1 to 12", inputs: coinSpace, order: "smallest amount first, then fewer coins, then coin values in dictionary order" },
  question: { prompt: "Which assumption does \"take the largest coin that fits\" rely on?", options: ["That taking the largest coin never blocks a better combination of the remaining coins.", "That the coins are sorted in the input.", "That the amount is always even.", "That there are enough coins of each value."], correct: 0, feedbackWrong: "Sorting is done by the code itself, the amount can be any whole number, and coins are unlimited. The real assumption is about the choice: the biggest coin is not always part of the best answer." },
  explanation: {
    assumption: "Taking the largest coin never blocks a better combination.",
    whySeems: "Bigger coins pay more per coin, and for everyday coins like 1, 2, 5, 10 this is true, so the habit feels like a law.",
    whyFails: "With coins such as 1, 3 and 4, paying 6 by taking the 4 leaves 2, which needs two 1-coins (3 coins). The better answer 3 + 3 uses no 4 at all. The early greedy choice removed it from consideration.",
    needs: "A greedy rule needs a proof that the local choice can always be extended to an optimal answer. Coin systems like 1, 2, 5, 10 have that property; 1, 3, 4 does not.",
  },
  hints: [
    "Try coin sets that do not look like everyday money. What happens when no coin is a neat multiple of another?",
    "Ask: when the algorithm takes the biggest coin, what does it give up? Compare its answer with a hand-made answer that skips the largest coin.",
    "A correct method must consider using a smaller coin even when a bigger one fits. Remember the best answer for every smaller amount, and build up from them.",
  ],
  repair: {
    direction: "Do not decide coin by coin. For each amount from 1 up to the target, remember the fewest coins needed, using the answers for smaller amounts: best[a] = 1 + min(best[a - c]) over coins c that fit. This tries every coin at every step, so no choice is ever locked in.",
    complexity: "Greedy is O(k) after sorting. The dynamic programming fix costs O(amount × k) time and O(amount) memory: slower, but correct for every coin set.",
    correctNote: "Greedy is still the right tool for coin systems where it can be proved correct. The lesson is to prove it, or test it against a slower reference, before trusting it.",
  },
};
