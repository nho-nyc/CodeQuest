/**
 * SERVER ONLY. Hidden verification tests, independent reference solutions, hints, reflections and the reference C++
 * programs of the Repair Workshop. Nothing in this file may be imported by client code or by src/features
 * (tests/repair.test.ts enforces that). Hidden tests are generated deterministically from fixed seeds, and their expected
 * outputs come from the TypeScript references below, which are written differently from the flawed programs.
 */
import type { Reflection } from "@/features/repair/challenges";

export type Case = { input: string; expected: string };

export type Secret = {
  hints: [string, string, string];
  reflection: Reflection;
  /** A complete correct C++17 program. Sent only when the learner explicitly asks for it (or never, for hidden tests). */
  solution: string;
  /** Verification tests that are not shown to the learner. */
  hidden: () => Case[];
  /** Independent reference: input text to expected output text. */
  reference: (input: string) => string;
};

function rng(seed: number) {
  let s = seed >>> 0;
  return (lo: number, hi: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return lo + Math.floor((s / 2 ** 32) * (hi - lo + 1));
  };
}
const nums = (line: string) => line.trim().split(/\s+/).filter(Boolean).map(Number);

// ───────────────────────── A: fewest coins ─────────────────────────
function coinsRef(input: string): string {
  const [head, second] = input.trim().split("\n");
  const [, m] = nums(head!);
  const coins = nums(second!);
  const INF = Number.MAX_SAFE_INTEGER;
  const dp = new Array<number>(m! + 1).fill(INF);
  dp[0] = 0;
  for (const c of new Set(coins)) for (let s = c; s <= m!; s++) if (dp[s - c]! < INF && dp[s - c]! + 1 < dp[s]!) dp[s] = dp[s - c]! + 1;
  return String(dp[m!]! >= INF ? -1 : dp[m!]);
}
const coinsCase = (coins: number[], m: number): Case => {
  const input = `${coins.length} ${m}\n${coins.join(" ")}\n`;
  return { input, expected: coinsRef(input) };
};
function coinsHidden(): Case[] {
  const r = rng(7001);
  const cases = [
    coinsCase([1], 1),
    coinsCase([5], 3),
    coinsCase([1, 3, 4], 10),
    coinsCase([1, 10, 25], 30),
    coinsCase([1, 5, 12], 15),
    coinsCase([3, 7], 5),
    coinsCase([2, 5, 3, 6], 10),
    coinsCase([1], 10000),
    coinsCase([6, 9, 20], 43),
  ];
  for (let t = 0; t < 4; t++) {
    const n = r(2, 6);
    cases.push(coinsCase(Array.from({ length: n }, () => r(1, 60)), r(20, 400)));
  }
  cases.push(coinsCase(Array.from({ length: 50 }, () => r(2, 1000)), 10000));
  cases.push(coinsCase([999, 1000, 997, 991], 9999));
  return cases;
}

// ───────────────────────── B: best stretch ─────────────────────────
/** Prefix-sum formulation: the best block ending at r is P[r] minus the smallest earlier prefix. */
function stretchRef(input: string): string {
  const a = nums(input.trim().split("\n")[1]!);
  // best block ending at r = P[r] - min(P[l]) over l < r, where P[-1] = 0 is a valid "empty prefix".
  let prefix = 0;
  let smallest = 0;
  let best = -Infinity;
  for (const x of a) {
    prefix += x;
    best = Math.max(best, prefix - smallest);
    smallest = Math.min(smallest, prefix);
  }
  return String(best);
}
const stretchCase = (a: number[]): Case => {
  const input = `${a.length}\n${a.join(" ")}\n`;
  return { input, expected: stretchRef(input) };
};
function stretchHidden(): Case[] {
  const r = rng(7002);
  const cases = [
    stretchCase([-5]),
    stretchCase([0]),
    stretchCase([-1, -2, -3]),
    stretchCase([-7, -7, -7, -7]),
    stretchCase([0, 0, 0]),
    stretchCase([-2, 1, -3, 4, -1, 2, 1, -5, 4]),
    stretchCase([-1000000000, -1000000000, -1000000000]),
    stretchCase([5, -9, 6, -2, 3]),
    stretchCase([-3, 0, -4]),
  ];
  for (let t = 0; t < 3; t++) cases.push(stretchCase(Array.from({ length: r(5, 12) }, () => r(-9, 9))));
  cases.push(stretchCase(Array.from({ length: 100000 }, () => r(-1000000000, -1))));
  cases.push(stretchCase(Array.from({ length: 100000 }, () => r(-1000000000, 1000000000))));
  cases.push(stretchCase(new Array(100000).fill(1000000000)));
  return cases;
}

// ───────────────────────── C: two numbers that add up ─────────────────────────
function pairRef(input: string): string {
  const [head, second] = input.trim().split("\n");
  const [, t] = nums(head!);
  const a = nums(second!);
  const seen = new Map<number, number>();
  for (const x of a) {
    if ((seen.get(t! - x) ?? 0) > 0) return "YES";
    seen.set(x, (seen.get(x) ?? 0) + 1);
  }
  return "NO";
}
const pairCase = (a: number[], t: number): Case => {
  const input = `${a.length} ${t}\n${a.join(" ")}\n`;
  return { input, expected: pairRef(input) };
};
function pairHidden(): Case[] {
  const r = rng(7003);
  const cases = [
    pairCase([1, 2, 4, 6, 8], 10),
    pairCase([1, 2, 4, 6, 8], 20),
    pairCase([5, 1, 2], 10),
    pairCase([0, 0], 0),
    pairCase([1000000000, 1000000000, 1, 2], 2000000000),
    pairCase([-2, -3], -5),
    pairCase([3, 1, 5], 6),
    pairCase([9, 1, 8, 2, 7, 3], 10),
    pairCase([4, 4, 1], 8),
    pairCase([7, 1], 100),
    pairCase([10, -4, 3, 20, -15], 5),
  ];
  const big = Array.from({ length: 100000 }, () => r(-1000000000, 1000000000));
  cases.push(pairCase(big, 2000000000));
  const big2 = Array.from({ length: 100000 }, () => r(-1000000000, 1000000000));
  cases.push(pairCase(big2, big2[3]! + big2[99990]!));
  return cases;
}

// ───────────────────────── D: longest cheap stretch ─────────────────────────
/** Every start, extending to the right without stopping early (negative numbers can lower the sum again). */
function cheapRef(input: string): string {
  const [head, second] = input.trim().split("\n");
  const [, k] = nums(head!);
  const a = nums(second!);
  let best = 0;
  for (let l = 0; l < a.length; l++) {
    let sum = 0;
    for (let r = l; r < a.length; r++) {
      sum += a[r]!;
      if (sum <= k! && r - l + 1 > best) best = r - l + 1;
    }
  }
  return String(best);
}
const cheapCase = (a: number[], k: number): Case => {
  const input = `${a.length} ${k}\n${a.join(" ")}\n`;
  return { input, expected: cheapRef(input) };
};
function cheapHidden(): Case[] {
  const r = rng(7004);
  const cases = [
    cheapCase([0, 2, -2], 0),
    cheapCase([-1], -1),
    cheapCase([-1], -2),
    cheapCase([4], 3),
    cheapCase([1, 2, 3, 4], 5),
    cheapCase([3, -2, 4, -5, 1], 1),
    cheapCase([-4, -3, -2, -1], -5),
    cheapCase([5, -10, 5, 5, -10, 5], 0),
    cheapCase([2, -3, 2, -3, 2], 0),
    cheapCase([7, 7, 7], 20),
  ];
  for (let t = 0; t < 3; t++) cases.push(cheapCase(Array.from({ length: r(6, 14) }, () => r(-9, 9)), r(-5, 8)));
  cases.push(cheapCase(Array.from({ length: 2000 }, () => r(-1000000, 1000000)), r(-1000000, 1000000)));
  cases.push(cheapCase(Array.from({ length: 2000 }, () => r(-1000000, 0)), -5000000));
  cases.push(cheapCase(new Array(2000).fill(1000000), 1000000000));
  return cases;
}

const COINS_SOLUTION = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<int> coins(n);
    for (int &c : coins) cin >> c;

    const int INF = 1e9;
    vector<int> dp(m + 1, INF);        // dp[s] = fewest coins that make exactly s
    dp[0] = 0;
    for (int s = 1; s <= m; s++)
        for (int c : coins)
            if (c <= s && dp[s - c] + 1 < dp[s]) dp[s] = dp[s - c] + 1;
    cout << (dp[m] >= INF ? -1 : dp[m]) << "\\n";
    return 0;
}
`;
const KADANE_SOLUTION = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;

    long long best = a[0], cur = a[0];   // start from a real block, not from 0
    for (int i = 1; i < n; i++) {
        cur = max(a[i], cur + a[i]);     // start fresh at a[i], or extend the block
        best = max(best, cur);
    }
    cout << best << "\\n";
    return 0;
}
`;
const POINTERS_SOLUTION = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long target;
    cin >> n >> target;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;

    sort(a.begin(), a.end());            // two pointers is only justified on sorted data
    int l = 0, r = n - 1;
    while (l < r) {
        long long s = a[l] + a[r];
        if (s == target) { cout << "YES\\n"; return 0; }
        if (s < target) l++;
        else r--;
    }
    cout << "NO\\n";
    return 0;
}
`;
const WINDOW_SOLUTION = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long k;
    cin >> n >> k;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;

    int best = 0;
    for (int l = 0; l < n; l++) {         // try every start
        long long sum = 0;
        for (int r = l; r < n; r++) {     // never stop early: a later negative can lower the sum again
            sum += a[r];
            if (sum <= k) best = max(best, r - l + 1);
        }
    }
    cout << best << "\\n";
    return 0;
}
`;

export const SECRETS: Record<string, Secret> = {
  "greedy-coins": {
    hints: [
      "Run the samples and look at the one that fails. Then work a few small coin sets out by hand: is the biggest coin that fits always the best first choice?",
      "The code assumes that taking the largest coin that fits is always part of a best answer. Is that true for the coins 1, 3 and 4 and the amount 6?",
      "Stop deciding by one coin at a time. Define dp[s] as the fewest coins that make exactly s, and build it from smaller amounts: dp[s] is the best of dp[s - c] + 1 over every coin c that fits.",
    ],
    reflection: {
      wasWrong: "The program always took the largest coin that fit, then moved on.",
      whyFailed: "A locally attractive choice (the biggest coin) can leave a remainder that needs many small coins. For 1, 3, 4 and amount 6, greedy takes 4+1+1 (3 coins) but 3+3 needs only 2. Greedy is only correct for special coin systems.",
      whatChanged: "Instead of committing to one coin, the repair computes the best answer for every amount from 0 to m, each from smaller amounts: dp[s] = min over coins c of dp[s - c] + 1.",
      edgeCase: "Coin sets where the largest coin is not part of the best answer, such as 1, 3, 4 with amount 6, and amounts that cannot be made at all.",
      complexity: "O(n · m) time and O(m) memory. With n ≤ 50 and m ≤ 10 000 that is at most half a million steps.",
      reinforce: "The lesson 'The Greedy Choice (and When It Fails)' shows when a greedy choice is safe. 'Tabulation: Fill a Table Bottom-Up' shows how to build answers from smaller amounts.",
    },
    solution: COINS_SOLUTION,
    hidden: coinsHidden,
    reference: coinsRef,
  },
  "max-subarray-boundary": {
    hints: [
      "Run the samples and find the one that fails. Which kind of array is it? Think about the smallest arrays, and arrays made of one kind of value.",
      "Look at the two places the code uses 0. Is 0 always the sum of a block the problem allows? The problem says the block must be non-empty.",
      "Start best and cur from the first element instead of 0, then for each next element let cur choose between starting fresh at a[i] and extending the block: cur = max(a[i], cur + a[i]).",
    ],
    reflection: {
      wasWrong: "The answer started at 0 and the running sum was never allowed below 0.",
      whyFailed: "0 is the sum of an empty block, which the problem does not allow. When every number is negative the true answer is the largest (least negative) element, but the program can never report anything below 0.",
      whatChanged: "The answer and running sum now start from the first element, and each step chooses between starting a new block at a[i] and extending the current one.",
      edgeCase: "An array of only negative numbers, and an array with a single negative element.",
      complexity: "O(n) time and O(1) extra memory beyond the input. Sums reach 10^14, so long long is required.",
      reinforce: "'Prefix Sums: Range Sums in O(1)' covers sums of blocks. 'Tabulation: Fill a Table Bottom-Up' covers building each answer from the previous one, which is what the repaired loop does.",
    },
    solution: KADANE_SOLUTION,
    hidden: stretchHidden,
    reference: stretchRef,
  },
  "two-pointers-unsorted": {
    hints: [
      "Run the samples and see which one fails. Look at the order of the numbers in that input compared with the ones that pass.",
      "When a[l] + a[r] is too small, the code throws a[l] away for good. That is only safe if every other number still in range is at most a[r]. What does that need from the order of the array?",
      "Make the assumption true before using the pointers: sort the array first. (Another correct approach remembers the numbers seen so far in a set.) Check what that does to the running time.",
    ],
    reflection: {
      wasWrong: "Two pointers was applied to an array in arbitrary order.",
      whyFailed: "When a[l] + a[r] is too small, the code drops a[l] for good. In a sorted array that is safe: every number still in range is at most a[r], so a[l] plus any of them is also too small. In an unsorted array a bigger partner for a[l] can sit anywhere in the range, so the move can throw away a number that belongs to the answer.",
      whatChanged: "The repair sorts the array first, which makes each pointer move provably safe. Only whether a pair exists is asked, so losing the original positions does not matter.",
      edgeCase: "An unsorted array with a valid pair that the pointers skip over (such as 1, 3, 2 with target 4), two equal numbers at different positions (5 and 5), and one number that would need to be used twice (a single 5 with target 10, which is NO).",
      complexity: "Sorting is O(n log n) and the scan is O(n), so O(n log n) overall. A hash set is O(n) on average. The sum of two values is at most 2·10^9, which still fits in a 32-bit int, but long long is the safe choice.",
      reinforce: "'Two Pointers on a Sorted Array' (notice the word sorted). The Algorithm Visualizer shows the pointer moves step by step.",
    },
    solution: POINTERS_SOLUTION,
    hidden: pairHidden,
    reference: pairRef,
  },
  "window-negatives": {
    hints: [
      "Run the samples and see which one fails. What is different about the numbers in it compared with the others?",
      "Shrinking the window is only guaranteed to lower the sum when every number is positive. What can happen to the sum if the next numbers are negative?",
      "A window that is too big now might become valid later, and a window you dropped might have been part of a longer answer. Since n is at most 2 000, try every starting position and extend to the right without stopping early.",
    ],
    reflection: {
      wasWrong: "A sliding window assumed that adding numbers makes the sum bigger and removing numbers makes it smaller.",
      whyFailed: "That is only true for non-negative numbers. With negatives, a window that exceeds K can become valid again after more numbers are added, and dropping a number from the left can raise the sum. So moving the left pointer when the sum is too big can discard the start of the longest block.",
      whatChanged: "The repair no longer depends on the sum always rising when the window grows and falling when it shrinks. It tries every start and checks every end, keeping the longest block whose sum is at most K.",
      edgeCase: "A zero followed by a positive and a negative number (0, 1, −1 with K = 0), and arrays of only negative numbers.",
      complexity: "O(n²) time and O(1) extra memory. With n ≤ 2 000 that is at most about 2 million additions, well inside the time limit.",
      reinforce: "The lesson 'Sliding Window' (look for what it assumes about the numbers) and the Algorithm Visualizer, which shows the window moving.",
    },
    solution: WINDOW_SOLUTION,
    hidden: cheapHidden,
    reference: cheapRef,
  },
};
