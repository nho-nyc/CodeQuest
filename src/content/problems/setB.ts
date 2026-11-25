import { rng } from "./rng";
import type { ProblemSeed } from "./types";

type Spec = Omit<ProblemSeed, "timeLimitMs" | "memoryLimitMb" | "estimatedMinutes"> & { timeLimitMs?: number; estimatedMinutes?: number };

const P = (s: Spec): ProblemSeed => ({
  timeLimitMs: 1000,
  memoryLimitMb: 256,
  estimatedMinutes: s.difficulty === "newbie" ? 8 : s.difficulty === "easy" ? 15 : s.difficulty === "medium" ? 30 : s.difficulty === "hard" ? 50 : 75,
  ...s,
  hidden: () => fitTests(s.hidden()),
});

/** Keeps the whole set under the size budget: the two largest tests are always kept, other big ones are dropped first. */
const fitTests = (tests: string[], budget = 1_480_000): string[] => {
  const order = tests.map((t, i) => i).sort((x, y) => tests[y]!.length - tests[x]!.length);
  const drop = new Set<number>();
  let total = tests.reduce((a, t) => a + t.length, 0);
  for (const i of order.slice(2)) {
    if (total <= budget) break;
    drop.add(i);
    total -= tests[i]!.length;
  }
  return tests.filter((_, i) => !drop.has(i));
};

type Rng = ReturnType<typeof rng>;
const arr = (r: Rng, n: number, lo: number, hi: number) => Array.from({ length: n }, () => r.int(lo, hi));
const line = (a: (number | bigint | string)[]) => a.join(" ");
/** n lines of m integers. */
const gridText = (g: number[][]) => g.map((row) => line(row)).join("\n");
const randGrid = (r: Rng, n: number, m: number, lo: number, hi: number) => Array.from({ length: n }, () => arr(r, m, lo, hi));
const bitRows = (r: Rng, n: number, m: number, pOne: number) =>
  Array.from({ length: n }, () => Array.from({ length: m }, () => (r.int(0, 999) < pOne * 1000 ? "1" : "0")).join(""));
const sortedArr = (r: Rng, n: number, lo: number, hi: number) => arr(r, n, lo, hi).sort((a, b) => a - b);

// ---------------------------------------------------------------- newbie

const recordHighs = P({
  slug: "running-record-highs",
  title: "Running Record Highs",
  difficulty: "newbie",
  rating: 800,
  tags: ["arrays", "implementation"],
  statement:
    "A weather station logged n daily temperatures. A day is a record day if its temperature is strictly higher than every temperature logged on earlier days. The very first day is always a record day. Count the record days.",
  inputFormat: "The first line contains n. The second line contains n integers t_1 ... t_n.",
  outputFormat: "Print the number of record days.",
  constraints: "1 <= n <= 50000\n-10^9 <= t_i <= 10^9",
  samples: [
    { input: "6\n3 1 4 1 5 9\n", output: "4\n", explanation: "Days 1 (3), 3 (4), 5 (5) and 6 (9) are records." },
    { input: "4\n7 7 7 7\n", output: "1\n", explanation: "Equal values do not beat the record." },
  ],
  hints: [
    "What single piece of information about the earlier days do you need to decide whether today is a record?",
    "Keep the running maximum while scanning left to right.",
    "Initialise the maximum with a value smaller than any temperature (or with t_1 and start the count at 1), then compare with strict >.",
  ],
  editorial: "Scan the array once, maintaining the maximum seen so far. Each element strictly greater than that maximum increases the counter and replaces the maximum. The first element always counts because the initial maximum is below all values.\n\nComplexity: O(n) time, O(1) extra memory.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    long long best = LLONG_MIN;
    int cnt = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        if (x > best) { cnt++; best = x; }
    }
    printf("%d\\n", cnt);
}`,
  hidden: () => {
    const r = rng(201);
    const mk = (a: number[]) => `${a.length}\n${line(a)}\n`;
    const inc = Array.from({ length: 50000 }, (_, i) => i * 20000 - 500000000);
    return [
      mk([5]),
      mk([-1000000000]),
      mk([2, 2, 2, 2, 2, 2]),
      mk([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      mk([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]),
      mk([-5, -3, -3, -8, -1, -1, 0, 0, 2]),
      mk(arr(r, 30, -20, 20)),
      mk(arr(r, 200, -1000000000, 1000000000)),
      mk(arr(r, 50000, -1000000000, 1000000000)),
      mk(inc),
      mk(inc.slice().reverse()),
      mk(arr(r, 50000, 0, 50)),
    ];
  },
});

const rotateRight = P({
  slug: "rotate-array-right",
  title: "Rotate the Carousel",
  difficulty: "newbie",
  rating: 800,
  tags: ["arrays", "math", "implementation"],
  statement:
    "n children stand on a carousel, child i holds the number a_i. In one step every child passes their number to the next child clockwise: the number of child i moves to position i + 1, and the number of child n moves to position 1. After exactly k steps, print the numbers held by children 1, 2, ..., n.",
  inputFormat: "The first line contains n and k. The second line contains n integers a_1 ... a_n.",
  outputFormat: "Print n integers separated by spaces: the numbers after k steps.",
  constraints: "1 <= n <= 100000\n0 <= k <= 10^18\n0 <= a_i <= 10^4",
  samples: [
    { input: "5 2\n1 2 3 4 5\n", output: "4 5 1 2 3\n" },
    { input: "3 9\n7 8 9\n", output: "7 8 9\n", explanation: "Nine steps is three full turns." },
  ],
  hints: [
    "Simulating k steps is impossible for k up to 10^18. After how many steps does the carousel return to the start?",
    "Only k mod n matters.",
    "With s = k mod n, the number now at position i came from position (i - s) mod n (0-indexed). Add n before taking the remainder.",
  ],
  editorial: "Rotating by n steps is the identity, so reduce k to s = k mod n. The element at 0-indexed position i after the rotation is a[(i - s + n) mod n]. Read k as a 64-bit integer.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    long long k;
    scanf("%d %lld", &n, &k);
    vector<int> a(n);
    for (auto &x : a) scanf("%d", &x);
    int s = (int)(k % n);
    for (int i = 0; i < n; i++) {
        if (i) putchar(' ');
        printf("%d", a[(i - s + n) % n]);
    }
    printf("\\n");
}`,
  hidden: () => {
    const r = rng(202);
    const mk = (n: number, k: number | bigint, a: number[]) => `${n} ${k}\n${line(a)}\n`;
    return [
      mk(1, 0, [5]),
      mk(1, 1000000000000000000n, [0]),
      mk(2, 1, [1, 2]),
      mk(4, 0, [1, 2, 3, 4]),
      mk(4, 4, [1, 2, 3, 4]),
      mk(6, 7, [10, 20, 30, 40, 50, 60]),
      mk(7, 1000000000000000000n, arr(r, 7, 0, 10000)),
      mk(10, 999999999999999999n, arr(r, 10, 0, 10000)),
      mk(1000, 123456789012345678n, arr(r, 1000, 0, 10000)),
      mk(100000, 999999999999999989n, arr(r, 100000, 0, 10000)),
      mk(100000, 99999, arr(r, 100000, 0, 10000)),
      mk(99991, 1000000000000000000n, arr(r, 99991, 0, 9999)),
    ];
  },
});

const diagonalSums = P({
  slug: "two-diagonal-sums",
  title: "Two Diagonals",
  difficulty: "newbie",
  rating: 800,
  tags: ["matrices", "implementation"],
  statement:
    "You are given an n x n table of integers. The main diagonal runs from the top-left to the bottom-right cell, the anti-diagonal runs from the top-right to the bottom-left cell. If n is odd, the centre cell belongs to both diagonals and is counted in both sums. Compute the sum of each diagonal and the absolute difference of the two sums.",
  inputFormat: "The first line contains n. Each of the next n lines contains n integers: one row of the table.",
  outputFormat: "Print three integers: the main diagonal sum, the anti-diagonal sum and their absolute difference.",
  constraints: "1 <= n <= 300\n-1000 <= table values <= 1000",
  samples: [
    { input: "3\n11 2 4\n4 5 6\n10 8 -12\n", output: "4 19 15\n", explanation: "Main: 11 + 5 - 12 = 4. Anti: 4 + 5 + 10 = 19." },
    { input: "1\n-7\n", output: "-7 -7 0\n" },
  ],
  hints: [
    "Which cells (i, j) lie on the main diagonal? Which lie on the anti-diagonal?",
    "Main diagonal: i = j. Anti-diagonal: i + j = n - 1 (0-indexed). One pass over the rows is enough.",
    "Read the matrix row by row; for row i add a[i][i] and a[i][n-1-i]. The absolute difference is the last output.",
  ],
  editorial: "For 0-indexed row i the main-diagonal cell is column i and the anti-diagonal cell is column n-1-i. Accumulate both sums while reading and print the sums and |difference|.\n\nComplexity: O(n^2) to read the input.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    long long a = 0, b = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) {
            int x;
            scanf("%d", &x);
            if (i == j) a += x;
            if (i + j == n - 1) b += x;
        }
    printf("%lld %lld %lld\\n", a, b, llabs(a - b));
}`,
  hidden: () => {
    const r = rng(203);
    const mk = (g: number[][]) => `${g.length}\n${gridText(g)}\n`;
    const full = (n: number, v: number) => Array.from({ length: n }, () => Array<number>(n).fill(v));
    return [
      mk([[0]]),
      mk([[5, 6], [7, 8]]),
      mk(randGrid(r, 3, 3, -1000, 1000)),
      mk(randGrid(r, 4, 4, -1000, 1000)),
      mk(randGrid(r, 5, 5, -9, 9)),
      mk(full(7, 1000)),
      mk(full(8, -1000)),
      mk(randGrid(r, 50, 50, -1000, 1000)),
      mk(randGrid(r, 299, 299, -1000, 1000)),
      mk(randGrid(r, 300, 300, -1000, 1000)),
      mk(randGrid(r, 300, 300, 0, 1000)),
    ];
  },
});

// ---------------------------------------------------------------- easy

const oneSided = P({
  slug: "one-sided-values",
  title: "One-Sided Values",
  difficulty: "easy",
  rating: 900,
  tags: ["two pointers", "arrays"],
  statement:
    "You are given two non-decreasing arrays A and B. A value is called one-sided if it occurs in exactly one of the two arrays (in A or in B, but not in both). Print every one-sided value exactly once, in increasing order.",
  inputFormat: "The first line contains n and m. The second line contains the n elements of A. The third line contains the m elements of B. Both arrays are sorted in non-decreasing order.",
  outputFormat: "Print the one-sided values in increasing order, separated by spaces, on one line. If there are none, print -1.",
  constraints: "1 <= n, m <= 40000\n0 <= A_i, B_i <= 10^6",
  samples: [
    { input: "4 3\n1 3 3 5\n2 3 6\n", output: "1 2 5 6\n", explanation: "3 occurs in both arrays." },
    { input: "2 2\n4 4\n4 4\n", output: "-1\n" },
  ],
  hints: [
    "Both arrays are already sorted, so you can walk through them simultaneously without a set or a sort.",
    "Classic merge with two pointers: compare A[i] and B[j]; the smaller one is certainly absent from the other array.",
    "Skip duplicates inside each array first (or advance while equal), and when A[i] == B[j] skip both values.",
  ],
  editorial: "Compress each array to its distinct values (consecutive equal elements are merged). Then merge the two sorted lists: if the heads are equal, the value is in both arrays, so drop it from both; otherwise the smaller head cannot appear in the other list, so output it and advance that list. Append the leftover tail.\n\nComplexity: O(n + m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<int> a(n), b(m);
    for (auto &x : a) scanf("%d", &x);
    for (auto &x : b) scanf("%d", &x);
    a.erase(unique(a.begin(), a.end()), a.end());
    b.erase(unique(b.begin(), b.end()), b.end());
    vector<int> out;
    size_t i = 0, j = 0;
    while (i < a.size() || j < b.size()) {
        if (j == b.size() || (i < a.size() && a[i] < b[j])) out.push_back(a[i++]);
        else if (i == a.size() || b[j] < a[i]) out.push_back(b[j++]);
        else { i++; j++; }
    }
    if (out.empty()) { printf("-1\\n"); return 0; }
    for (size_t k = 0; k < out.size(); k++) printf(k ? " %d" : "%d", out[k]);
    printf("\\n");
}`,
  hidden: () => {
    const r = rng(204);
    const mk = (a: number[], b: number[]) => `${a.length} ${b.length}\n${line(a)}\n${line(b)}\n`;
    return [
      mk([1], [1]),
      mk([1], [2]),
      mk([1, 1, 1], [1, 2, 2]),
      mk([5, 6, 7], [5, 6, 7]),
      mk([1, 2, 3], [4, 5, 6]),
      mk(sortedArr(r, 20, 0, 15), sortedArr(r, 15, 0, 15)),
      mk(sortedArr(r, 200, 0, 300), sortedArr(r, 250, 0, 300)),
      mk(sortedArr(r, 40000, 0, 1000000), sortedArr(r, 40000, 0, 1000000)),
      mk(sortedArr(r, 40000, 0, 60000), sortedArr(r, 40000, 0, 60000)),
      mk(Array.from({ length: 40000 }, (_, i) => i * 2), Array.from({ length: 40000 }, (_, i) => i * 2 + 1)),
      mk(Array.from({ length: 40000 }, (_, i) => i * 25), Array.from({ length: 40000 }, (_, i) => i * 25)),
    ];
  },
});

const closestPairSum = P({
  slug: "closest-pair-sum",
  title: "Closest Pair Sum",
  difficulty: "easy",
  rating: 1100,
  tags: ["two pointers", "sorting"],
  statement:
    "Given an array of n integers and a target x, choose two different positions i != j so that a_i + a_j is as close to x as possible, i.e. |a_i + a_j - x| is minimal. Print the sum a_i + a_j. If two different sums are equally close to x, print the smaller one.",
  inputFormat: "The first line contains n and x. The second line contains n integers.",
  outputFormat: "Print one integer: the best sum.",
  constraints: "2 <= n <= 50000\n-10^9 <= a_i <= 10^9\n-2*10^9 <= x <= 2*10^9",
  samples: [
    { input: "5 10\n1 4 7 12 3\n", output: "10\n", explanation: "7 + 3 = 10." },
    { input: "4 10\n1 2 18 19\n", output: "3\n", explanation: "Sums 3 and 19 are at distance 7 and 9; 3 is closer." },
  ],
  hints: [
    "Checking all pairs takes O(n^2), too slow for n = 50000. Sorting makes the structure monotone.",
    "After sorting, place one pointer at each end. If the sum is below x, only moving the left pointer can bring it closer; if above, move the right pointer.",
    "Update the answer on every step using the key (|sum - x|, sum) so that ties pick the smaller sum. Use 64-bit integers.",
  ],
  editorial: "Sort the array and use two pointers l = 0, r = n-1. Let s = a[l] + a[r]. Every pair (l, r') with r' < r has a sum <= s, so if s < x those pairs are no closer than s (and any with equal distance have an equal sum) - move l right. Symmetrically move r left when s > x. Record the best (distance, sum) pair seen; stop early if s == x.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n;
    ll x;
    scanf("%d %lld", &n, &x);
    vector<ll> a(n);
    for (auto &v : a) scanf("%lld", &v);
    sort(a.begin(), a.end());
    int l = 0, r = n - 1;
    ll best = a[0] + a[1], bd = llabs(best - x);
    while (l < r) {
        ll s = a[l] + a[r], d = llabs(s - x);
        if (d < bd || (d == bd && s < best)) { bd = d; best = s; }
        if (s < x) l++;
        else if (s > x) r--;
        else break;
    }
    printf("%lld\\n", best);
}`,
  hidden: () => {
    const r = rng(205);
    const mk = (x: number, a: number[]) => `${a.length} ${x}\n${line(a)}\n`;
    return [
      mk(0, [1, 2]),
      mk(100, [-5, -5]),
      mk(10, [3, 5, 7]),
      mk(10, [4, 4, 6, 6]),
      mk(0, [-1000000000, -1000000000, 1000000000, 1000000000]),
      mk(2000000000, [1000000000, 999999999, -1000000000]),
      mk(-2000000000, [1000000000, 999999999, -1000000000, -999999999]),
      mk(50, arr(r, 15, -40, 60)),
      mk(7, arr(r, 300, -100, 100)),
      mk(123456789, arr(r, 50000, -1000000000, 1000000000)),
      mk(-1500000000, arr(r, 50000, -1000000000, 1000000000)),
      mk(1, arr(r, 50000, -3, 3)),
    ];
  },
});

const bestWindowStart = P({
  slug: "best-window-start",
  title: "Best Window of Days",
  difficulty: "easy",
  rating: 1000,
  tags: ["sliding window", "prefix sums", "arrays"],
  statement:
    "A shop recorded its daily profit (possibly negative) for n days. Choose a block of exactly k consecutive days with the largest total profit. If several blocks share the largest total, choose the one that starts earliest.",
  inputFormat: "The first line contains n and k. The second line contains n integers p_1 ... p_n.",
  outputFormat: "Print two integers: the 1-indexed starting day of the chosen block and its total profit.",
  constraints: "1 <= k <= n <= 80000\n-10^4 <= p_i <= 10^4",
  samples: [
    { input: "7 3\n1 -2 5 4 -1 3 6\n", output: "3 8\n", explanation: "Blocks starting at days 3 and 5 both total 8; day 3 is earlier." },
    { input: "3 3\n-1 -2 -3\n", output: "1 -6\n" },
  ],
  hints: [
    "Recomputing every window sum from scratch costs O(n * k). What changes between two neighbouring windows?",
    "Slide the window: add the new element on the right and subtract the one that leaves on the left (or use prefix sums).",
    "Only replace the best answer when the new total is strictly larger, which automatically keeps the earliest start.",
  ],
  editorial: "Compute the sum of the first k elements, then slide: sum += a[i] - a[i-k]. Track the maximum total and the first start index where it was reached (update only on strictly greater totals). Totals fit comfortably in 32 bits here but 64-bit is safe.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<long long> a(n);
    for (auto &x : a) scanf("%lld", &x);
    long long cur = 0;
    for (int i = 0; i < k; i++) cur += a[i];
    long long best = cur;
    int pos = 1;
    for (int i = k; i < n; i++) {
        cur += a[i] - a[i - k];
        if (cur > best) { best = cur; pos = i - k + 2; }
    }
    printf("%d %lld\\n", pos, best);
}`,
  hidden: () => {
    const r = rng(206);
    const mk = (k: number, a: number[]) => `${a.length} ${k}\n${line(a)}\n`;
    return [
      mk(1, [0]),
      mk(1, [-3, -3, -3]),
      mk(2, [5, 5, 5, 5]),
      mk(3, [1, 2, 3, 4, 5, 6]),
      mk(3, [6, 5, 4, 3, 2, 1]),
      mk(4, arr(r, 12, -10, 10)),
      mk(5, arr(r, 100, -10000, 10000)),
      mk(40000, arr(r, 80000, -10000, 10000)),
      mk(80000, arr(r, 80000, -10000, 10000)),
      mk(1, arr(r, 80000, -10000, 10000)),
      mk(777, arr(r, 80000, -10000, 10000)),
      mk(1000, Array<number>(80000).fill(-10000)),
    ];
  },
});

const rangeAdd = P({
  slug: "range-add-updates",
  title: "Many Range Additions",
  difficulty: "easy",
  rating: 1100,
  tags: ["difference array", "prefix sums"],
  statement:
    "You have an array of n integers. Then q operations are applied one after another; operation (l, r, v) adds v to every element at positions l through r inclusive. Print the array after all operations.",
  inputFormat: "The first line contains n and q. The second line contains the n initial values. Each of the next q lines contains l, r and v.",
  outputFormat: "Print the final n values separated by spaces.",
  constraints: "1 <= n <= 50000\n0 <= q <= 20000\n1 <= l <= r <= n\n-1000 <= v <= 1000, initial values between -1000 and 1000",
  samples: [
    { input: "5 2\n1 1 1 1 1\n1 3 2\n2 5 -1\n", output: "3 2 2 0 0\n" },
    { input: "3 0\n4 5 6\n", output: "4 5 6\n" },
  ],
  hints: [
    "Applying each operation element by element costs O(n * q). Can an operation be recorded in O(1)?",
    "Keep a difference array d: add v at d[l] and subtract v at d[r+1]. A prefix sum of d gives the total added to each position.",
    "Allocate d with n + 2 cells so that d[r+1] is always valid, use 64-bit integers, and add the prefix sum to the initial value at the end.",
  ],
  editorial: "Let d be a difference array. Operation (l, r, v) becomes d[l] += v and d[r+1] -= v. After all operations, the running prefix sum of d at position i equals the total added to a_i. The final value is a_i + prefix(i).\n\nComplexity: O(n + q).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, q;
    scanf("%d %d", &n, &q);
    vector<long long> a(n + 2), d(n + 2, 0);
    for (int i = 1; i <= n; i++) scanf("%lld", &a[i]);
    while (q--) {
        int l, r;
        long long v;
        scanf("%d %d %lld", &l, &r, &v);
        d[l] += v;
        d[r + 1] -= v;
    }
    long long run = 0;
    for (int i = 1; i <= n; i++) {
        run += d[i];
        if (i > 1) putchar(' ');
        printf("%lld", a[i] + run);
    }
    printf("\\n");
}`,
  hidden: () => {
    const r = rng(207);
    const mk = (n: number, a: number[], ops: number[][]) => `${n} ${ops.length}\n${line(a)}\n${ops.map((o) => line(o)).join("\n")}${ops.length ? "\n" : ""}`;
    const ops = (n: number, q: number, big: boolean) =>
      Array.from({ length: q }, () => {
        const l = r.int(1, n);
        const rr = big ? r.int(Math.max(1, n - 100), n) : r.int(l, n);
        return [Math.min(l, rr), Math.max(l, rr), r.int(-1000, 1000)];
      });
    return [
      mk(1, [0], []),
      mk(1, [5], [[1, 1, -7]]),
      mk(5, [0, 0, 0, 0, 0], [[1, 5, 3], [5, 5, 1], [1, 1, 1]]),
      mk(10, arr(r, 10, -5, 5), ops(10, 8, false)),
      mk(200, arr(r, 200, -1000, 1000), ops(200, 300, false)),
      mk(50000, arr(r, 50000, -1000, 1000), ops(50000, 20000, false)),
      mk(50000, arr(r, 50000, -1000, 1000), ops(50000, 20000, true)),
      mk(50000, Array<number>(50000).fill(1000), Array.from({ length: 20000 }, () => [1, 50000, 1000])),
      mk(50000, Array<number>(50000).fill(-1000), Array.from({ length: 20000 }, () => [1, 50000, -1000])),
      mk(50000, arr(r, 50000, 0, 0), []),
    ];
  },
});

const rotateGrid = P({
  slug: "rotate-grid-quarter-turns",
  title: "Quarter Turns of a Grid",
  difficulty: "easy",
  rating: 1000,
  tags: ["matrices", "implementation"],
  statement:
    "A rectangular grid of n rows and m columns of integers is rotated clockwise by 90 degrees, t times in a row. Print the grid you get. Note that the dimensions swap after every odd number of turns.",
  inputFormat: "The first line contains n, m and t. Each of the next n lines contains m integers.",
  outputFormat: "Print the rotated grid: one row per line, numbers separated by single spaces.",
  constraints: "1 <= n, m <= 300\n0 <= t <= 10^9\n0 <= grid values <= 999",
  samples: [
    { input: "2 3 1\n1 2 3\n4 5 6\n", output: "4 1\n5 2\n6 3\n" },
    { input: "2 3 2\n1 2 3\n4 5 6\n", output: "6 5 4\n3 2 1\n" },
  ],
  hints: [
    "A million rotations are pointless: four quarter turns return the original grid.",
    "Reduce t modulo 4, then handle each of the four cases (0, 90, 180, 270 degrees) or rotate once, t mod 4 times.",
    "For one clockwise turn of an n x m grid g, the result has m rows and n columns and res[j][n-1-i] = g[i][j].",
  ],
  editorial: "Take t mod 4 and apply the clockwise rotation that many times. One turn maps the cell (i, j) of the n x m grid to (j, n-1-i) of an m x n grid. At most three turns of O(nm) each are needed.\n\nComplexity: O(nm).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    long long t;
    scanf("%d %d %lld", &n, &m, &t);
    vector<vector<int>> g(n, vector<int>(m));
    for (auto &row : g) for (auto &x : row) scanf("%d", &x);
    t %= 4;
    while (t--) {
        int h = g.size(), w = g[0].size();
        vector<vector<int>> res(w, vector<int>(h));
        for (int i = 0; i < h; i++)
            for (int j = 0; j < w; j++) res[j][h - 1 - i] = g[i][j];
        g = res;
    }
    for (auto &row : g) {
        for (size_t j = 0; j < row.size(); j++) printf(j ? " %d" : "%d", row[j]);
        printf("\\n");
    }
}`,
  hidden: () => {
    const r = rng(208);
    const mk = (n: number, m: number, t: number, lo = 0, hi = 999) => `${n} ${m} ${t}\n${gridText(randGrid(r, n, m, lo, hi))}\n`;
    return [
      mk(1, 1, 0),
      mk(1, 1, 5),
      mk(1, 5, 1),
      mk(5, 1, 1),
      mk(1, 6, 3),
      mk(3, 3, 4),
      mk(4, 7, 2),
      mk(4, 7, 3),
      mk(6, 2, 1000000001),
      mk(50, 80, 999999999),
      mk(300, 300, 1),
      mk(300, 250, 3),
      mk(250, 300, 1000000000, 0, 99),
    ];
  },
});

const equalValuePairs = P({
  slug: "equal-value-pairs",
  title: "Twin Pairs",
  difficulty: "easy",
  rating: 1000,
  tags: ["counting", "arrays"],
  statement:
    "Given an array of n integers, count the pairs of positions (i, j) with i < j such that a_i = a_j. Positions matter, not values: the array 5 5 5 has three such pairs.",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print the number of pairs.",
  constraints: "1 <= n <= 80000\n0 <= a_i <= 10^6",
  samples: [
    { input: "5\n1 2 1 2 1\n", output: "4\n", explanation: "Value 1 gives 3 pairs and value 2 gives 1 pair." },
    { input: "3\n4 5 6\n", output: "0\n" },
  ],
  hints: [
    "Checking every pair is O(n^2). Try grouping equal values.",
    "If a value occurs c times it contributes c * (c - 1) / 2 pairs. Count occurrences with an array or by sorting.",
    "The answer can reach about 3.2 * 10^9, so use a 64-bit integer.",
  ],
  editorial: "Let cnt[v] be the number of occurrences of v. Any two occurrences form a pair, so the answer is the sum over values of cnt[v] * (cnt[v] - 1) / 2. With values up to 10^6 a counting array works.\n\nComplexity: O(n + max a).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<long long> cnt(1000001, 0);
    for (int i = 0; i < n; i++) {
        int x;
        scanf("%d", &x);
        cnt[x]++;
    }
    long long ans = 0;
    for (long long c : cnt) ans += c * (c - 1) / 2;
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(209);
    const mk = (a: number[]) => `${a.length}\n${line(a)}\n`;
    return [
      mk([0]),
      mk([7, 7]),
      mk([1, 2, 3, 4, 5]),
      mk([5, 5, 5]),
      mk(arr(r, 20, 0, 5)),
      mk(arr(r, 1000, 0, 100)),
      mk(arr(r, 80000, 0, 1000000)),
      mk(arr(r, 80000, 0, 1000)),
      mk(arr(r, 80000, 999000, 1000000)),
      mk(Array<number>(80000).fill(1000000)),
      mk(Array<number>(80000).fill(0)),
      mk(arr(r, 80000, 0, 3)),
    ];
  },
});

const spiralWalk = P({
  slug: "spiral-walk-matrix",
  title: "Spiral Walk",
  difficulty: "easy",
  rating: 1200,
  tags: ["matrices", "implementation", "simulation"],
  statement:
    "Start at the top-left cell of an n x m grid and walk clockwise in a spiral: right along the top row, down the right column, left along the bottom row, up the left column, then continue inside the remaining inner rectangle in the same way until every cell has been visited exactly once. Print the values in the order they are visited.",
  inputFormat: "The first line contains n and m. Each of the next n lines contains m integers.",
  outputFormat: "Print the n * m visited values on one line separated by spaces.",
  constraints: "1 <= n, m <= 300\n0 <= grid values <= 999",
  samples: [
    { input: "3 3\n1 2 3\n4 5 6\n7 8 9\n", output: "1 2 3 6 9 8 7 4 5\n" },
    { input: "2 4\n1 2 3 4\n5 6 7 8\n", output: "1 2 3 4 8 7 6 5\n" },
  ],
  hints: [
    "Think of four boundaries (top, bottom, left, right) that shrink after each side has been walked.",
    "Loop while top <= bottom and left <= right: walk the top row, right column, bottom row, left column, shrinking the boundary after each.",
    "Guard the bottom-row and left-column passes with a check, otherwise a single remaining row or column is printed twice.",
  ],
  editorial: "Maintain top, bottom, left, right. Walk the top row left to right and increment top; the right column top to bottom and decrement right; if top <= bottom walk the bottom row right to left and decrement bottom; if left <= right walk the left column bottom to top and increment left. Repeat while the rectangle is non-empty. The guards prevent double-visiting when one dimension collapses to a single line.\n\nComplexity: O(nm).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<vector<int>> g(n, vector<int>(m));
    for (auto &row : g) for (auto &x : row) scanf("%d", &x);
    int top = 0, bot = n - 1, lef = 0, rig = m - 1;
    vector<int> out;
    while (top <= bot && lef <= rig) {
        for (int j = lef; j <= rig; j++) out.push_back(g[top][j]);
        top++;
        for (int i = top; i <= bot; i++) out.push_back(g[i][rig]);
        rig--;
        if (top <= bot) { for (int j = rig; j >= lef; j--) out.push_back(g[bot][j]); bot--; }
        if (lef <= rig) { for (int i = bot; i >= top; i--) out.push_back(g[i][lef]); lef++; }
    }
    for (size_t k = 0; k < out.size(); k++) printf(k ? " %d" : "%d", out[k]);
    printf("\\n");
}`,
  hidden: () => {
    const r = rng(210);
    const mk = (n: number, m: number) => `${n} ${m}\n${gridText(randGrid(r, n, m, 0, 999))}\n`;
    return [mk(1, 1), mk(1, 7), mk(7, 1), mk(2, 2), mk(3, 5), mk(5, 3), mk(4, 4), mk(5, 5), mk(1, 300), mk(300, 1), mk(300, 300), mk(299, 300), mk(300, 297), mk(60, 41)];
  },
});

// ---------------------------------------------------------------- medium

const limitedSpread = P({
  slug: "limited-spread-segment",
  title: "Limited Spread Segment",
  difficulty: "medium",
  rating: 1400,
  tags: ["sliding window", "monotonic deque", "two pointers"],
  statement:
    "The spread of a segment of an array is its maximum minus its minimum. Given an array of n integers and a limit k, find the length of the longest contiguous segment whose spread is at most k.",
  inputFormat: "The first line contains n and k. The second line contains n integers.",
  outputFormat: "Print the maximum length of a segment with spread <= k.",
  constraints: "1 <= n <= 100000\n0 <= k <= 10^9\n0 <= a_i <= 10^5",
  samples: [
    { input: "7 2\n3 4 4 5 9 8 8\n", output: "4\n", explanation: "The segment 3 4 4 5 has spread 2." },
    { input: "3 0\n1 2 3\n", output: "1\n" },
  ],
  hints: [
    "If a segment is valid then every sub-segment is valid. That monotonicity lets the left end only move right.",
    "Use two pointers; for the window you need its current maximum and minimum while elements enter on the right and leave on the left.",
    "Maintain two monotonic deques of indices (one decreasing for the max, one increasing for the min); pop front entries with index < left.",
  ],
  editorial: "Sweep r from left to right and keep the smallest l such that the window [l, r] has spread <= k. Two monotonic deques store candidate maxima and minima of the window. After pushing r, while max - min > k, increase l and drop deque fronts that fall outside. The answer is the largest r - l + 1.\n\nComplexity: O(n) amortised.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    long long k;
    scanf("%d %lld", &n, &k);
    vector<int> a(n);
    for (auto &x : a) scanf("%d", &x);
    deque<int> mx, mn;
    int l = 0, best = 0;
    for (int r = 0; r < n; r++) {
        while (!mx.empty() && a[mx.back()] <= a[r]) mx.pop_back();
        mx.push_back(r);
        while (!mn.empty() && a[mn.back()] >= a[r]) mn.pop_back();
        mn.push_back(r);
        while (a[mx.front()] - a[mn.front()] > k) {
            l++;
            if (mx.front() < l) mx.pop_front();
            if (mn.front() < l) mn.pop_front();
        }
        best = max(best, r - l + 1);
    }
    printf("%d\\n", best);
}`,
  hidden: () => {
    const r = rng(211);
    const mk = (k: number, a: number[]) => `${a.length} ${k}\n${line(a)}\n`;
    const walk = (n: number, step: number) => {
      let v = 50000;
      return Array.from({ length: n }, () => (v = Math.min(100000, Math.max(0, v + r.int(-step, step)))));
    };
    return [
      mk(0, [5]),
      mk(0, [1, 2, 3]),
      mk(1000000000, [0, 100000, 0, 100000]),
      mk(2, [3, 4, 4, 5, 9, 8, 8]),
      mk(3, arr(r, 25, 0, 20)),
      mk(10, arr(r, 300, 0, 100)),
      mk(5000, arr(r, 100000, 0, 100000)),
      mk(0, arr(r, 100000, 0, 2)),
      mk(500, walk(100000, 20)),
      mk(100, walk(100000, 3)),
      mk(99999, Array.from({ length: 100000 }, (_, i) => i)),
      mk(1000, Array.from({ length: 100000 }, (_, i) => i)),
    ];
  },
});

const cheapSubarrays = P({
  slug: "cheap-subarrays",
  title: "Cheap Subarrays",
  difficulty: "medium",
  rating: 1300,
  tags: ["two pointers", "counting"],
  statement:
    "Given n positive integers and a budget S, count the contiguous non-empty subarrays whose sum is at most S. Subarrays at different positions are counted separately even if their contents coincide.",
  inputFormat: "The first line contains n and S. The second line contains n integers.",
  outputFormat: "Print the number of subarrays with sum <= S.",
  constraints: "1 <= n <= 100000\n1 <= a_i <= 10^4\n1 <= S <= 10^9",
  samples: [{ input: "5 7\n2 3 1 4 2\n", output: "11\n" }],
  hints: [
    "All numbers are positive, so extending a subarray never decreases its sum. What does that say about valid left ends for a fixed right end?",
    "Two pointers: for each right end r, the valid left ends form a suffix range [l, r], and l never moves left as r grows.",
    "Add r - l + 1 to the answer for each r after shrinking the window until its sum is <= S; the total needs 64 bits.",
  ],
  editorial: "For each right end r let l(r) be the smallest left end with sum(l..r) <= S. Because values are positive, l(r) is non-decreasing. Maintain the window sum, advance l while the sum exceeds S, and add r - l + 1 (zero when the single element a[r] exceeds S, where l = r + 1).\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    long long S;
    scanf("%d %lld", &n, &S);
    vector<long long> a(n);
    for (auto &x : a) scanf("%lld", &x);
    long long sum = 0, ans = 0;
    int l = 0;
    for (int r = 0; r < n; r++) {
        sum += a[r];
        while (sum > S) sum -= a[l++];
        ans += r - l + 1;
    }
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(212);
    const mk = (S: number, a: number[]) => `${a.length} ${S}\n${line(a)}\n`;
    return [
      mk(1, [1]),
      mk(1, [2]),
      mk(10, [11, 12, 13]),
      mk(1000000000, [1, 2, 3, 4]),
      mk(7, [2, 3, 1, 4, 2]),
      mk(30, arr(r, 40, 1, 20)),
      mk(1000, arr(r, 500, 1, 100)),
      mk(1000000000, Array<number>(100000).fill(10000)),
      mk(500000, arr(r, 100000, 1, 10000)),
      mk(50000, arr(r, 100000, 1, 10000)),
      mk(20000, arr(r, 100000, 5000, 10000)),
      mk(1, Array<number>(100000).fill(1)),
    ];
  },
});

const heaviestRectangle = P({
  slug: "heaviest-rectangle-window",
  title: "Heaviest Rectangle Window",
  difficulty: "medium",
  rating: 1500,
  tags: ["2D prefix sums", "matrices"],
  statement:
    "In an n x m grid of non-negative integers, consider every sub-rectangle with exactly a rows and b columns. Find the largest sum of such a rectangle and the number of positions of the rectangle (top-left corners) whose sum equals that maximum.",
  inputFormat: "The first line contains n, m, a and b. Each of the next n lines contains m integers.",
  outputFormat: "Print two integers: the maximum rectangle sum and how many rectangles reach it.",
  constraints: "1 <= a <= n <= 300\n1 <= b <= m <= 300\n0 <= grid values <= 99",
  samples: [{ input: "3 4 2 2\n1 2 3 4\n5 6 7 8\n9 1 2 3\n", output: "22 1\n", explanation: "The block with rows 1-2 and columns 3-4 sums to 3+4+7+8 = 22." }],
  hints: [
    "Summing each rectangle cell by cell costs O(n m a b), up to about 8 * 10^9 operations.",
    "Precompute a 2D prefix-sum table so that the sum of any rectangle is obtained in O(1).",
    "With P[i][j] = sum of the top-left i x j block, the rectangle ending at (i, j) has sum P[i][j] - P[i-a][j] - P[i][j-b] + P[i-a][j-b].",
  ],
  editorial: "Build P with (n+1) x (m+1) cells where P[i][j] = g[i-1][j-1] + P[i-1][j] + P[i][j-1] - P[i-1][j-1]. For every bottom-right corner (i, j) with i >= a and j >= b compute the rectangle sum by inclusion-exclusion, track the maximum and how many times it appears.\n\nComplexity: O(nm).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m, a, b;
    scanf("%d %d %d %d", &n, &m, &a, &b);
    vector<vector<long long>> P(n + 1, vector<long long>(m + 1, 0));
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            long long x;
            scanf("%lld", &x);
            P[i][j] = x + P[i - 1][j] + P[i][j - 1] - P[i - 1][j - 1];
        }
    long long best = -1, cnt = 0;
    for (int i = a; i <= n; i++)
        for (int j = b; j <= m; j++) {
            long long s = P[i][j] - P[i - a][j] - P[i][j - b] + P[i - a][j - b];
            if (s > best) { best = s; cnt = 1; }
            else if (s == best) cnt++;
        }
    printf("%lld %lld\\n", best, cnt);
}`,
  hidden: () => {
    const r = rng(213);
    const mk = (n: number, m: number, a: number, b: number, lo: number, hi: number) => `${n} ${m} ${a} ${b}\n${gridText(randGrid(r, n, m, lo, hi))}\n`;
    return [
      mk(1, 1, 1, 1, 0, 99),
      mk(3, 3, 3, 3, 0, 99),
      mk(4, 6, 2, 3, 0, 5),
      mk(5, 5, 1, 1, 0, 3),
      mk(10, 12, 4, 5, 0, 99),
      mk(1, 50, 1, 20, 0, 99),
      mk(50, 1, 20, 1, 0, 99),
      mk(300, 300, 150, 150, 0, 99),
      mk(300, 300, 100, 200, 0, 99),
      mk(300, 300, 1, 1, 0, 99),
      mk(300, 300, 7, 9, 0, 1),
      mk(300, 300, 300, 300, 0, 99),
      mk(200, 300, 100, 150, 0, 0),
    ];
  },
});

const pairsWithinDistance = P({
  slug: "pairs-within-distance",
  title: "Pairs Within Distance",
  difficulty: "medium",
  rating: 1300,
  tags: ["sorting", "two pointers", "counting"],
  statement:
    "Given n integers and a distance d, count the pairs of positions i < j such that |a_i - a_j| <= d.",
  inputFormat: "The first line contains n and d. The second line contains n integers.",
  outputFormat: "Print the number of such pairs.",
  constraints: "1 <= n <= 50000\n0 <= d <= 10^9\n-10^9 <= a_i <= 10^9",
  samples: [{ input: "5 2\n1 5 3 4 2\n", output: "7\n" }],
  hints: [
    "The order of the elements does not matter for the condition - only the values do. Can you sort?",
    "After sorting, for each i the partners j > i with a_j - a_i <= d form a contiguous block starting at i + 1.",
    "Use a monotone pointer j: while j + 1 < n and a[j+1] - a[i] <= d, extend j, then add j - i. Use 64-bit for differences and the answer.",
  ],
  editorial: "Sort the array. For a fixed i, the elements a[i+1..j(i)] are exactly those with a_j - a_i <= d, and j(i) is non-decreasing in i, so a second pointer sweeps the array once. Sum j(i) - i. Differences can reach 2*10^9, so use 64-bit arithmetic.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    long long d;
    scanf("%d %lld", &n, &d);
    vector<long long> a(n);
    for (auto &x : a) scanf("%lld", &x);
    sort(a.begin(), a.end());
    long long ans = 0;
    int j = 0;
    for (int i = 0; i < n; i++) {
        if (j < i) j = i;
        while (j + 1 < n && a[j + 1] - a[i] <= d) j++;
        ans += j - i;
    }
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(214);
    const mk = (d: number, a: number[]) => `${a.length} ${d}\n${line(a)}\n`;
    return [
      mk(0, [4]),
      mk(0, [4, 4, 4]),
      mk(1, [-1, 0, 1]),
      mk(2000000000, [-1000000000, 1000000000]),
      mk(1999999999, [-1000000000, 1000000000]),
      mk(7, arr(r, 30, -20, 20)),
      mk(100, arr(r, 1000, -1000, 1000)),
      mk(1000000, arr(r, 50000, -1000000000, 1000000000)),
      mk(100000000, arr(r, 50000, -1000000000, 1000000000)),
      mk(1000000000, arr(r, 50000, -1000000000, 1000000000)),
      mk(0, arr(r, 50000, -5, 5)),
      mk(1, Array<number>(50000).fill(-1000000000)),
    ];
  },
});

const balancedBinary = P({
  slug: "balanced-binary-subarrays",
  title: "Balanced Binary Subarrays",
  difficulty: "medium",
  rating: 1400,
  tags: ["prefix sums", "hashing", "counting"],
  statement:
    "You are given a sequence of n values, each 0 or 1. A contiguous subarray is balanced if it contains the same number of zeros as ones. Count the balanced subarrays (different positions count separately).",
  inputFormat: "The first line contains n. The second line contains n values, each 0 or 1.",
  outputFormat: "Print the number of balanced subarrays.",
  constraints: "1 <= n <= 200000",
  samples: [
    { input: "6\n1 0 0 1 1 0\n", output: "7\n" },
    { input: "3\n1 1 1\n", output: "0\n" },
  ],
  hints: [
    "Replace every 0 by -1. A subarray is balanced exactly when its sum is 0.",
    "With prefix sums P, subarray (i, j] has sum P[j] - P[i], so you need pairs of equal prefix sums.",
    "Prefix values lie in [-n, n]: use an array of counts with an offset of n, and for each prefix add the number of earlier equal prefixes. Use 64-bit counters.",
  ],
  editorial: "Map 1 -> +1 and 0 -> -1 and let P[0] = 0, P[i] the running sum. Subarray (i, j] is balanced iff P[i] = P[j]. For every value v occurring c times among P[0..n] the pairs contribute c(c-1)/2. Counting with an offset array avoids hashing.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<long long> cnt(2 * n + 1, 0);
    int p = n;
    cnt[p] = 1;
    long long ans = 0;
    for (int i = 0; i < n; i++) {
        int x;
        scanf("%d", &x);
        p += x ? 1 : -1;
        ans += cnt[p]++;
    }
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(215);
    const mk = (a: number[]) => `${a.length}\n${line(a)}\n`;
    return [
      mk([0]),
      mk([1, 0]),
      mk([1, 1, 1]),
      mk([0, 1, 0, 1, 0, 1]),
      mk(arr(r, 20, 0, 1)),
      mk(arr(r, 1000, 0, 1)),
      mk(arr(r, 200000, 0, 1)),
      mk(Array.from({ length: 200000 }, (_, i) => i % 2)),
      mk(Array.from({ length: 200000 }, (_, i) => (i < 100000 ? 1 : 0))),
      mk(Array<number>(200000).fill(1)),
      mk(Array.from({ length: 200000 }, () => (r.int(0, 9) === 0 ? 0 : 1))),
    ];
  },
});

const coveringWindow = P({
  slug: "shortest-covering-window",
  title: "Shortest Covering Window",
  difficulty: "medium",
  rating: 1700,
  tags: ["sliding window", "strings", "two pointers"],
  statement:
    "Given a string s and a pattern t of lowercase letters, find the shortest substring of s that contains every letter of t at least as many times as it occurs in t (a letter that occurs twice in t must occur at least twice in the substring; the order does not matter). If several shortest substrings exist, take the one that starts first.",
  inputFormat: "The first line contains s. The second line contains t.",
  outputFormat: "Print the length of the substring and its 1-indexed start position separated by a space, or -1 if no substring qualifies.",
  constraints: "1 <= |t| <= |s| <= 200000\nBoth strings consist of lowercase English letters.",
  samples: [
    { input: "aabcbcab\nabc\n", output: "3 2\n", explanation: "Substring abc at positions 2-4." },
    { input: "abc\naa\n", output: "-1\n" },
  ],
  hints: [
    "If a window covers t, enlarging it still covers t. If it does not cover t, shrinking it will not help.",
    "Variable-size sliding window: extend the right end until the window covers t, then shrink from the left as far as possible, recording the best.",
    "Keep need[c] = required - current count for each letter and a counter of letters still missing; it makes each cover check O(1).",
  ],
  editorial: "Let need[c] be the count of c in t. Sweep the right end r, decrementing need[s[r]]; a counter `missing` of total outstanding letters drops when need[s[r]] was positive. Once missing = 0 the window covers t; move l right while the window still covers (i.e. while removing s[l] does not push need above 0), updating the best (length, start). Update only when strictly shorter so the earliest start wins among equal lengths.\n\nComplexity: O(|s| + |t|).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s, t;
    cin >> s >> t;
    int need[26] = {0};
    for (char c : t) need[c - 'a']++;
    int missing = t.size(), l = 0, bestLen = INT_MAX, bestStart = -1;
    for (int r = 0; r < (int)s.size(); r++) {
        if (need[s[r] - 'a']-- > 0) missing--;
        while (missing == 0) {
            if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestStart = l; }
            if (++need[s[l] - 'a'] > 0) missing++;
            l++;
        }
    }
    if (bestStart < 0) printf("-1\\n");
    else printf("%d %d\\n", bestLen, bestStart + 1);
}`,
  hidden: () => {
    const r = rng(216);
    const rs = (n: number, k: number) => Array.from({ length: n }, () => String.fromCharCode(97 + r.int(0, k - 1))).join("");
    const mk = (s: string, t: string) => `${s}\n${t}\n`;
    const big = rs(200000, 4);
    return [
      mk("a", "a"),
      mk("a", "b"),
      mk("ab", "ba"),
      mk("aaaa", "aa"),
      mk("aaaa", "aaaaa".slice(0, 4)),
      mk("xyzzyxzyx", "zzx"),
      mk(rs(30, 3), "abc"),
      mk(rs(200, 5), "aabbc"),
      mk(rs(1000, 26), "abcdefghijklmnopqrstuvwxyz"),
      mk(big, "aabbccdd"),
      mk(big, "a".repeat(30000) + "b"),
      mk(rs(200000, 26), "zyxwvutsrqponmlkjihgfedcba"),
      mk("a".repeat(100000) + "b".repeat(100000), "ab"),
      mk("ab".repeat(100000), "a".repeat(99999) + "b".repeat(100)),
    ];
  },
});

const longestLine = P({
  slug: "longest-line-of-ones",
  title: "Longest Line of Ones",
  difficulty: "medium",
  rating: 1500,
  tags: ["matrices", "dynamic programming", "grids"],
  statement:
    "A grid of n rows and m columns contains only 0 and 1. A line is a sequence of consecutive cells that all hold 1 and go in one of four directions: horizontal, vertical, diagonal (down-right) or anti-diagonal (down-left). Find the length of the longest line. If the grid has no 1 at all, the answer is 0.",
  inputFormat: "The first line contains n and m. Each of the next n lines contains a string of m characters, each 0 or 1 (no spaces).",
  outputFormat: "Print the length of the longest line.",
  constraints: "1 <= n, m <= 700",
  samples: [
    { input: "3 4\n0110\n0110\n0001\n", output: "3\n", explanation: "Cells (1,2), (2,3), (3,4) form a diagonal line of length 3." },
    { input: "1 1\n0\n", output: "0\n" },
  ],
  hints: [
    "Scanning every cell in every direction until the line breaks is O(nm * min(n,m)), too slow in the worst case.",
    "For each cell, the longest line ending there in a given direction extends the line ending at the previous cell in that direction.",
    "Keep four tables (or four rolling rows): h[i][j] = h[i][j-1] + 1, v = v[i-1][j] + 1, d = d[i-1][j-1] + 1, ad = ad[i-1][j+1] + 1, all reset to 0 when the cell is 0.",
  ],
  editorial: "Process the grid row by row. For a cell holding 1 set h, v, d, a to one more than the corresponding value at the left, upper, upper-left and upper-right neighbour (0 if outside the grid); for a 0 cell set all four to 0. The answer is the maximum value ever assigned.\n\nComplexity: O(nm).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<string> g(n);
    for (auto &s : g) cin >> s;
    vector<array<int, 4>> prev(m + 2, {0, 0, 0, 0}), cur(m + 2, {0, 0, 0, 0});
    int best = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 1; j <= m; j++) {
            if (g[i][j - 1] == '1') {
                cur[j][0] = cur[j - 1][0] + 1;
                cur[j][1] = prev[j][1] + 1;
                cur[j][2] = prev[j - 1][2] + 1;
                cur[j][3] = prev[j + 1][3] + 1;
                for (int d = 0; d < 4; d++) best = max(best, cur[j][d]);
            } else {
                cur[j] = {0, 0, 0, 0};
            }
        }
        swap(prev, cur);
        for (auto &c : cur) c = {0, 0, 0, 0};
    }
    printf("%d\\n", best);
}`,
  hidden: () => {
    const r = rng(217);
    const mk = (rows: string[]) => `${rows.length} ${rows[0]!.length}\n${rows.join("\n")}\n`;
    const full = (n: number, m: number, ch: string) => Array.from({ length: n }, () => ch.repeat(m));
    const diag = (n: number) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? "1" : "0")).join(""));
    return [
      mk(["1"]),
      mk(["0"]),
      mk(["11111"]),
      mk(["1", "1", "0", "1"]),
      mk(["0110", "0110", "0001"]),
      mk(["0011", "0110", "1100"]),
      mk(bitRows(r, 8, 9, 0.6)),
      mk(bitRows(r, 30, 20, 0.5)),
      mk(full(700, 700, "1")),
      mk(full(700, 700, "0")),
      mk(diag(700)),
      mk(bitRows(r, 700, 700, 0.5)),
      mk(bitRows(r, 700, 700, 0.9)),
      mk(bitRows(r, 700, 350, 0.99)),
    ];
  },
});

const circularSegment = P({
  slug: "circular-best-segment",
  title: "Best Segment on a Ring",
  difficulty: "medium",
  rating: 1500,
  tags: ["arrays", "kadane", "prefix sums"],
  statement:
    "n numbers are arranged on a ring: after the last number comes the first again. Choose a non-empty block of consecutive numbers on the ring (it may wrap around the end, and it may contain at most all n numbers, each once) with the largest possible sum. Print that sum.",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print the maximum block sum.",
  constraints: "1 <= n <= 99000\n-10^4 <= a_i <= 10^4",
  samples: [
    { input: "5\n5 -3 5 -2 4\n", output: "12\n", explanation: "Block 5, -2, 4, 5 wraps around the end." },
    { input: "3\n-4 -2 -9\n", output: "-2\n" },
  ],
  hints: [
    "A block either does not wrap (an ordinary maximum subarray) or it wraps around the end.",
    "A wrapping block is the whole ring minus a non-wrapping block in the middle; to maximise it, minimise the removed block.",
    "Answer = max(maxSubarray, total - minSubarray), except when every element is negative: then total - minSubarray would be an empty block, so use maxSubarray alone.",
  ],
  editorial: "Run Kadane twice: once for the maximum non-empty subarray M and once for the minimum non-empty subarray m. A wrapping block has the form total - (a non-wrapping block that is excluded), so the best wrapping block is total - m, but only if the excluded block is not the entire array (otherwise nothing remains). That happens exactly when M < 0 (all elements negative), in which case the answer is M. Otherwise the answer is max(M, total - m).\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<long long> a(n);
    long long total = 0;
    for (auto &x : a) { scanf("%lld", &x); total += x; }
    long long curMax = a[0], M = a[0], curMin = a[0], m = a[0];
    for (int i = 1; i < n; i++) {
        curMax = max(a[i], curMax + a[i]);
        M = max(M, curMax);
        curMin = min(a[i], curMin + a[i]);
        m = min(m, curMin);
    }
    long long ans = M < 0 ? M : max(M, total - m);
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(218);
    const mk = (a: number[]) => `${a.length}\n${line(a)}\n`;
    return [
      mk([7]),
      mk([-7]),
      mk([-4, -2, -9]),
      mk([5, -3, 5, -2, 4]),
      mk([8, -8, 8]),
      mk([-1, 5, -1, 5, -1]),
      mk([3, -1, 2, -1]),
      mk([1, -2, 3, -2, 5, -1, 2]),
      mk(arr(r, 15, -10, 10)),
      mk(arr(r, 1000, -10000, 10000)),
      mk(arr(r, 99000, -10000, 10000)),
      mk(arr(r, 99000, -10000, 2000)),
      mk(arr(r, 99000, -2000, 10000)),
      mk(Array<number>(99000).fill(10000)),
      mk(Array<number>(99000).fill(-10000)),
    ];
  },
});

const windowMinSum = P({
  slug: "window-minimum-sum",
  title: "Sum of Window Minimums",
  difficulty: "medium",
  rating: 1400,
  tags: ["sliding window", "monotonic deque"],
  statement:
    "Given an array of n integers and a window length k, consider every block of k consecutive elements. Print the sum of the minimum element of every block.",
  inputFormat: "The first line contains n and k. The second line contains n integers.",
  outputFormat: "Print the sum of the n - k + 1 window minimums.",
  constraints: "1 <= k <= n <= 99000\n0 <= a_i <= 10^5",
  samples: [{ input: "6 3\n4 2 6 1 5 3\n", output: "5\n", explanation: "Window minimums are 2, 1, 1, 1." }],
  hints: [
    "Looking at all k elements of each window costs O(n * k).",
    "When a new element arrives, any earlier element that is larger can never be the minimum of a window containing the new one.",
    "Keep a deque of indices whose values increase from front to back: pop from the back while the new value is <= them, pop from the front when the index leaves the window; the front is the current minimum.",
  ],
  editorial: "Maintain a deque of indices with strictly increasing values. For each new index i, pop back entries with value >= a[i], push i, pop the front if its index is <= i - k. Once i >= k - 1 the front holds the window minimum; add it to the answer (64-bit).\n\nComplexity: O(n) amortised.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<int> a(n);
    for (auto &x : a) scanf("%d", &x);
    deque<int> dq;
    long long ans = 0;
    for (int i = 0; i < n; i++) {
        while (!dq.empty() && a[dq.back()] >= a[i]) dq.pop_back();
        dq.push_back(i);
        if (dq.front() <= i - k) dq.pop_front();
        if (i >= k - 1) ans += a[dq.front()];
    }
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(219);
    const mk = (k: number, a: number[]) => `${a.length} ${k}\n${line(a)}\n`;
    return [
      mk(1, [0]),
      mk(1, [5, 4, 3]),
      mk(3, [1, 1, 1, 1]),
      mk(2, [3, 1, 2]),
      mk(4, arr(r, 20, 0, 9)),
      mk(7, arr(r, 300, 0, 99000)),
      mk(50000, arr(r, 99000, 0, 99000)),
      mk(99000, arr(r, 99000, 0, 99000)),
      mk(1000, arr(r, 99000, 0, 99000)),
      mk(500, Array.from({ length: 99000 }, (_, i) => i)),
      mk(500, Array.from({ length: 99000 }, (_, i) => 99000 - i)),
      mk(3, Array<number>(99000).fill(99000)),
    ];
  },
});

// ---------------------------------------------------------------- hard

const fourSumCount = P({
  slug: "four-sum-count",
  title: "Count the Quadruples",
  difficulty: "hard",
  rating: 2000,
  tags: ["hashing", "counting", "arrays"],
  timeLimitMs: 2000,
  statement:
    "Given n integers and a target X, count the quadruples of positions i < j < k < l with a_i + a_j + a_k + a_l = X. Quadruples are distinguished by their positions, so equal values at different positions count separately.",
  inputFormat: "The first line contains n and X. The second line contains n integers.",
  outputFormat: "Print the number of quadruples.",
  constraints: "4 <= n <= 2000\n-10^9 <= a_i <= 10^9\n-4*10^9 <= X <= 4*10^9",
  samples: [
    { input: "5 4\n1 1 1 1 1\n", output: "5\n", explanation: "Any 4 of the 5 positions work." },
    { input: "6 0\n1 -1 2 -2 0 0\n", output: "3\n", explanation: "Values {1,-1,2,-2}, {1,-1,0,0} and {2,-2,0,0}." },
  ],
  hints: [
    "n^3 triple loops with a lookup, or n^4, are far too slow for n = 2000. What do you get by splitting the quadruple into two pairs?",
    "Count pairs by their sum in a hash map. The only difficulty is enforcing i < j < k < l, i.e. that the two pairs do not interleave or overlap.",
    "Iterate k upwards. Before treating k as the left member of the second pair, insert into the map every pair (i, j) with j = k - 1 (so the map holds exactly the pairs with j < k). Then for each l > k add map[X - a_k - a_l].",
  ],
  editorial: "Split the quadruple into a left pair (i, j) and a right pair (k, l) with j < k. Sweep k from 0 to n-1. Just before handling k, add the pairs (i, k-1) for all i < k-1 to a hash map keyed by sum; now the map contains every pair whose right index is < k. For each l > k add the count of left pairs with sum X - a_k - a_l. Each valid quadruple is counted exactly once. Pair sums need 64-bit keys, the answer can be about C(2000,4) = 6.6 * 10^11.\n\nComplexity: O(n^2) expected with hashing.",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const int SZ = 1 << 22;
static long long keys[SZ];
static int cnts[SZ];
static bool used[SZ];
static inline unsigned hs(long long x) {
    unsigned long long z = (unsigned long long)x + 0x9e3779b97f4a7c15ULL;
    z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
    z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
    return (unsigned)((z ^ (z >> 31)) & (SZ - 1));
}
int main() {
    int n;
    ll X;
    scanf("%d %lld", &n, &X);
    vector<ll> a(n);
    for (auto &x : a) scanf("%lld", &x);
    ll ans = 0;
    for (int k = 0; k < n; k++) {
        if (k >= 2) for (int i = 0; i < k - 1; i++) {
            ll key = a[i] + a[k - 1];
            unsigned h = hs(key);
            while (used[h] && keys[h] != key) h = (h + 1) & (SZ - 1);
            used[h] = true; keys[h] = key; cnts[h]++;
        }
        for (int l = k + 1; l < n; l++) {
            ll key = X - a[k] - a[l];
            unsigned h = hs(key);
            while (used[h] && keys[h] != key) h = (h + 1) & (SZ - 1);
            if (used[h]) ans += cnts[h];
        }
    }
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(220);
    const mk = (X: number, a: number[]) => `${a.length} ${X}\n${line(a)}\n`;
    return [
      mk(10, [1, 2, 3, 4]),
      mk(11, [1, 2, 3, 4]),
      mk(4, Array<number>(7).fill(1)),
      mk(0, arr(r, 12, -3, 3)),
      mk(0, arr(r, 60, -10, 10)),
      mk(100, arr(r, 100, 0, 50)),
      mk(20, Array<number>(2000).fill(5)),
      mk(4000000000, Array<number>(2000).fill(1000000000)),
      mk(0, arr(r, 2000, -3, 3)),
      mk(50, arr(r, 2000, 0, 25)),
      mk(0, arr(r, 2000, -1000000000, 1000000000)),
      mk(6, arr(r, 2000, 0, 2)),
      mk(-1000, arr(r, 2000, -1000, 1000)),
    ];
  },
});

const exactlyKDistinct = P({
  slug: "exactly-k-distinct-subarrays",
  title: "Exactly K Distinct",
  difficulty: "hard",
  rating: 1800,
  tags: ["sliding window", "two pointers", "counting"],
  statement:
    "Given an array of n integers and a number k, count the contiguous subarrays that contain exactly k distinct values. Subarrays at different positions are counted separately.",
  inputFormat: "The first line contains n and k. The second line contains n integers.",
  outputFormat: "Print the number of subarrays with exactly k distinct values.",
  constraints: "1 <= k <= n <= 99000\n1 <= a_i <= 100000",
  samples: [{ input: "5 2\n1 2 1 2 3\n", output: "7\n" }],
  hints: [
    "Counting subarrays with exactly k distinct values directly is awkward, because shrinking a window can skip valid ones. Is there a closely related quantity that a moving window counts easily?",
    "Let atMost(K) count subarrays with at most K distinct values, a standard sliding window. Then exactly(k) = atMost(k) - atMost(k - 1), because every subarray with at most k distinct values has either exactly k or at most k - 1.",
    "Implement atMost(K) with two pointers and a frequency array: for each right end add r - l + 1 after shrinking until the distinct count is <= K. Use 64-bit totals.",
  ],
  editorial: "Define f(K) as the number of subarrays with at most K distinct values. For each right end r, the valid left ends form the range [l, r] where l is the smallest index keeping the window at <= K distinct values, and l is non-decreasing in r. So f(K) is computed with a frequency array and two pointers in O(n). The answer is f(k) - f(k-1).\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int n;
vector<int> a;
ll atMost(int K) {
    if (K <= 0) return 0;
    vector<int> freq(100001, 0);
    int distinct = 0, l = 0;
    ll res = 0;
    for (int r = 0; r < n; r++) {
        if (freq[a[r]]++ == 0) distinct++;
        while (distinct > K) {
            if (--freq[a[l]] == 0) distinct--;
            l++;
        }
        res += r - l + 1;
    }
    return res;
}
int main() {
    int k;
    scanf("%d %d", &n, &k);
    a.resize(n);
    for (auto &x : a) scanf("%d", &x);
    printf("%lld\\n", atMost(k) - atMost(k - 1));
}`,
  hidden: () => {
    const r = rng(221);
    const mk = (k: number, a: number[]) => `${a.length} ${k}\n${line(a)}\n`;
    return [
      mk(1, [1]),
      mk(1, [3, 3, 3]),
      mk(2, [1, 2, 3, 4]),
      mk(3, [1, 2, 1, 3, 1, 2]),
      mk(4, arr(r, 40, 1, 6)),
      mk(10, arr(r, 500, 1, 20)),
      mk(3, arr(r, 99000, 1, 5)),
      mk(1000, arr(r, 99000, 1, 99000)),
      mk(100, arr(r, 99000, 1, 300)),
      mk(1, Array<number>(99000).fill(99000)),
      mk(99000, Array.from({ length: 99000 }, (_, i) => i + 1)),
      mk(2, Array.from({ length: 99000 }, (_, i) => (i % 2) + 1)),
      mk(50000, Array.from({ length: 99000 }, (_, i) => (i % 70000) + 1)),
    ];
  },
});

const largestOnesRectangle = P({
  slug: "largest-ones-rectangle",
  title: "Largest Block of Ones",
  difficulty: "hard",
  rating: 2000,
  tags: ["matrices", "monotonic stack", "grids"],
  timeLimitMs: 2000,
  statement:
    "A grid with n rows and m columns contains only 0 and 1. Find the largest area (rows times columns) of a sub-rectangle all of whose cells are 1. If the grid contains no 1, the answer is 0.",
  inputFormat: "The first line contains n and m. Each of the next n lines contains a string of m characters, each 0 or 1.",
  outputFormat: "Print the largest area.",
  constraints: "1 <= n, m <= 700",
  samples: [{ input: "3 4\n1011\n1111\n1110\n", output: "6\n", explanation: "Rows 2-3, columns 1-3." }],
  hints: [
    "Checking every rectangle with prefix sums is about n^2 m^2 / 4 rectangles - far too many. Reduce the problem to one dimension.",
    "For each row compute h[j] = number of consecutive ones ending at this row in column j. The best rectangle whose bottom edge is this row is the largest rectangle in the histogram h.",
    "Solve the histogram in O(m) with a monotonic stack of increasing heights; when a bar is popped its width extends from the new stack top to the current index. Append a 0 sentinel to flush the stack.",
  ],
  editorial: "Treat each row as the base of a histogram whose bar heights are the numbers of consecutive ones directly above and including that row. Any all-ones rectangle has a bottom row, and in that row it is a rectangle in the histogram. The largest rectangle in a histogram is found with a stack of indices with increasing heights: when a lower bar arrives, pop bars and compute height * width where width spans back to the new stack top.\n\nComplexity: O(nm).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<int> h(m + 1, 0);
    long long best = 0;
    for (int i = 0; i < n; i++) {
        string s;
        cin >> s;
        for (int j = 0; j < m; j++) h[j] = s[j] == '1' ? h[j] + 1 : 0;
        h[m] = 0;
        vector<int> st;
        for (int j = 0; j <= m; j++) {
            while (!st.empty() && h[st.back()] >= h[j]) {
                long long ht = h[st.back()];
                st.pop_back();
                long long left = st.empty() ? -1 : st.back();
                best = max(best, ht * (j - left - 1));
            }
            st.push_back(j);
        }
    }
    printf("%lld\\n", best);
}`,
  hidden: () => {
    const r = rng(222);
    const mk = (rows: string[]) => `${rows.length} ${rows[0]!.length}\n${rows.join("\n")}\n`;
    const full = (n: number, m: number, ch: string) => Array.from({ length: n }, () => ch.repeat(m));
    const checker = (n: number) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => ((i + j) % 2 ? "1" : "0")).join(""));
    const fullWithHoles = (n: number, m: number, holes: number) => {
      const g = full(n, m, "1").map((s) => s.split(""));
      for (let t = 0; t < holes; t++) g[r.int(0, n - 1)]![r.int(0, m - 1)] = "0";
      return g.map((x) => x.join(""));
    };
    return [
      mk(["1"]),
      mk(["0"]),
      mk(["1011", "1111", "1110"]),
      mk(["11111"]),
      mk(["1", "1", "0", "1", "1", "1"]),
      mk(bitRows(r, 10, 12, 0.8)),
      mk(bitRows(r, 40, 30, 0.9)),
      mk(full(700, 700, "1")),
      mk(full(700, 700, "0")),
      mk(checker(700)),
      mk(fullWithHoles(700, 700, 40)),
      mk(bitRows(r, 700, 700, 0.5)),
      mk(bitRows(r, 700, 700, 0.98)),
      mk(fullWithHoles(500, 700, 5)),
    ];
  },
});

const rectSumBounded = P({
  slug: "widest-rectangle-under-budget",
  title: "Largest Rectangle Under Budget",
  difficulty: "hard",
  rating: 2100,
  tags: ["two pointers", "2D prefix sums", "matrices"],
  timeLimitMs: 2000,
  statement:
    "Every cell of an n x m grid has a positive cost. Choose a sub-rectangle (a block of consecutive rows and consecutive columns) whose total cost is at most K and whose area (number of cells) is as large as possible. Print that area, or 0 if even a single cell is too expensive.",
  inputFormat: "The first line contains n, m and K. Each of the next n lines contains m integers: the costs.",
  outputFormat: "Print the maximum area of a sub-rectangle with total cost <= K.",
  constraints: "1 <= n, m <= 300\n1 <= cost <= 99\n0 <= K <= 10^9",
  samples: [{ input: "3 3 12\n1 2 3\n4 5 6\n7 8 9\n", output: "4\n", explanation: "The top-left 2 x 2 block costs 1+2+4+5 = 12." }],
  hints: [
    "Trying all O(n^2 m^2) rectangles is about 2 * 10^9 even with O(1) sums per rectangle at n = m = 300, and the number of operations is higher in practice. Fix a part of the rectangle to reduce the dimension.",
    "Fix the top and bottom rows; collapse the strip into a 1D array of column sums. All values are positive, so a window of columns has a monotone cost.",
    "For each pair of rows, run a two-pointer sweep over the columns: extend right, shrink left while the sum exceeds K, and take (rows) * (window width). Maintain the column sums incrementally while the bottom row moves down.",
  ],
  editorial: "For each top row t, keep an array col[j] = sum of g[t..b][j] and extend b one row at a time (so updating col is O(m)). Costs are positive so for each right end r the set of feasible left ends is a suffix of columns; the smallest feasible left end never decreases, giving a two-pointer pass over the columns in O(m). The candidate area is (b - t + 1) * (r - l + 1). Over all (t, b) this is O(n^2 m) ~ 2.7 * 10^7 for n = m = 300.\n\nComplexity: O(n^2 m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    long long K;
    scanf("%d %d %lld", &n, &m, &K);
    vector<vector<int>> g(n, vector<int>(m));
    for (auto &row : g) for (auto &x : row) scanf("%d", &x);
    long long best = 0;
    vector<long long> col(m);
    for (int t = 0; t < n; t++) {
        fill(col.begin(), col.end(), 0);
        for (int b = t; b < n; b++) {
            for (int j = 0; j < m; j++) col[j] += g[b][j];
            long long sum = 0;
            int l = 0;
            for (int r = 0; r < m; r++) {
                sum += col[r];
                while (sum > K && l <= r) sum -= col[l++];
                best = max(best, (long long)(b - t + 1) * (r - l + 1));
            }
        }
    }
    printf("%lld\\n", best);
}`,
  hidden: () => {
    const r = rng(223);
    const mk = (n: number, m: number, K: number, lo: number, hi: number) => `${n} ${m} ${K}\n${gridText(randGrid(r, n, m, lo, hi))}\n`;
    return [
      mk(1, 1, 5, 1, 5),
      mk(1, 1, 0, 1, 5),
      mk(3, 3, 12, 1, 9),
      mk(1, 10, 25, 1, 9),
      mk(10, 1, 25, 1, 9),
      mk(6, 7, 60, 1, 20),
      mk(30, 30, 1000, 1, 99),
      mk(100, 120, 20000, 1, 99),
      mk(300, 300, 1000000000, 1, 99),
      mk(300, 300, 5000000, 1, 99),
      mk(300, 300, 500000, 1, 99),
      mk(300, 300, 20000, 1, 99),
      mk(300, 300, 150, 1, 99),
      mk(300, 300, 3000000, 1, 1),
    ];
  },
});

// ---------------------------------------------------------------- expert

const boundedRangeSum = P({
  slug: "bounded-length-range-sum-count",
  title: "Counting Constrained Segments",
  difficulty: "expert",
  rating: 2300,
  tags: ["prefix sums", "fenwick tree", "sliding window", "counting"],
  timeLimitMs: 2000,
  statement:
    "Given an array of n integers (possibly negative), count the contiguous subarrays whose length is between lo and hi inclusive and whose sum is between L and R inclusive. Subarrays at different positions are counted separately.",
  inputFormat: "The first line contains n, lo, hi, L and R. The second line contains n integers.",
  outputFormat: "Print the number of subarrays satisfying both conditions.",
  constraints: "1 <= lo <= hi <= n <= 80000\n-10^5 <= a_i <= 10^5\n-10^10 <= L <= R <= 10^10",
  samples: [{ input: "5 1 2 1 3\n1 2 -1 2 3\n", output: "7\n", explanation: "Length 1: 1, 2, 2, 3 qualify. Length 2: sums 3, 1, 1 qualify (5 does not)." }],
  hints: [
    "With prefix sums P, subarray (i, j] has length j - i and sum P[j] - P[i]. You now count pairs i < j with two conditions: one on the index difference and one on the value difference.",
    "For a fixed j the allowed indices i form a contiguous index window [j - hi, j - lo], and as j increases this window slides to the right. The value condition is P[i] in [P[j] - R, P[j] - L].",
    "Compress the prefix values and keep a Fenwick tree (BIT) of the P[i] currently inside the index window: add index j - lo, remove index j - hi - 1 as j advances, then answer a range-count query per j.",
  ],
  editorial: "Let P[0..n] be prefix sums. We count pairs (i, j) with j - i in [lo, hi] and P[j] - P[i] in [L, R]. Sweep j from 1 to n. The indices i allowed for j are [max(0, j - hi), j - lo]; moving from j to j+1 inserts one new index (j + 1 - lo) and removes one old index (j - hi). Keep the multiset of P[i] over the current window in a Fenwick tree indexed by the rank of the prefix value (coordinate compression). For each j query the number of stored values in [P[j] - R, P[j] - L] using two binary searches on the sorted distinct values and a BIT range sum. Totals reach about 3.2 * 10^9, so use 64-bit.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n, lo, hi;
    ll L, R;
    scanf("%d %d %d %lld %lld", &n, &lo, &hi, &L, &R);
    vector<ll> P(n + 1, 0);
    for (int i = 1; i <= n; i++) {
        ll x;
        scanf("%lld", &x);
        P[i] = P[i - 1] + x;
    }
    vector<ll> vals(P.begin(), P.end());
    sort(vals.begin(), vals.end());
    vals.erase(unique(vals.begin(), vals.end()), vals.end());
    int V = vals.size();
    vector<int> bit(V + 1, 0);
    auto upd = [&](int p, int d) { for (p++; p <= V; p += p & -p) bit[p] += d; };
    auto qry = [&](int p) { int s = 0; for (; p > 0; p -= p & -p) s += bit[p]; return s; };  // sum of first p ranks
    vector<int> rk(n + 1);
    for (int i = 0; i <= n; i++) rk[i] = lower_bound(vals.begin(), vals.end(), P[i]) - vals.begin();
    ll ans = 0;
    for (int j = 1; j <= n; j++) {
        if (j - lo >= 0) upd(rk[j - lo], 1);
        if (j - hi - 1 >= 0) upd(rk[j - hi - 1], -1);
        int a = lower_bound(vals.begin(), vals.end(), P[j] - R) - vals.begin();
        int b = upper_bound(vals.begin(), vals.end(), P[j] - L) - vals.begin();
        if (b > a) ans += qry(b) - qry(a);
    }
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(224);
    const mk = (lo: number, hi: number, L: number, R: number, a: number[]) => `${a.length} ${lo} ${hi} ${L} ${R}\n${line(a)}\n`;
    return [
      mk(1, 1, 0, 0, [0]),
      mk(1, 1, 5, 5, [5]),
      mk(1, 3, -2, 2, [1, -1, 1, -1]),
      mk(2, 2, 0, 0, [0, 0, 0, 0, 0]),
      mk(1, 6, -10, 10, arr(r, 6, -5, 5)),
      mk(2, 9, -3, 7, arr(r, 20, -5, 5)),
      mk(5, 40, -50, 50, arr(r, 100, -20, 20)),
      mk(1, 80000, -10000000000, 10000000000, arr(r, 80000, -100000, 100000)),
      mk(1, 80000, 0, 1000000, arr(r, 80000, -100000, 100000)),
      mk(1000, 30000, -2000000, 5000000, arr(r, 80000, -100000, 100000)),
      mk(20000, 60000, 100000000, 3000000000, arr(r, 80000, -100000, 100000)),
      mk(1, 40000, 0, 0, arr(r, 80000, -2, 2)),
      mk(100, 79999, -5000000, 5000000, arr(r, 80000, -100000, 100000)),
      mk(500, 500, 1000000000, 10000000000, Array<number>(80000).fill(100000)),
    ];
  },
});

export const problems: ProblemSeed[] = [
  recordHighs,
  rotateRight,
  diagonalSums,
  oneSided,
  closestPairSum,
  bestWindowStart,
  rangeAdd,
  rotateGrid,
  equalValuePairs,
  spiralWalk,
  limitedSpread,
  cheapSubarrays,
  heaviestRectangle,
  pairsWithinDistance,
  balancedBinary,
  coveringWindow,
  longestLine,
  circularSegment,
  windowMinSum,
  fourSumCount,
  exactlyKDistinct,
  largestOnesRectangle,
  rectSumBounded,
  boundedRangeSum,
];
