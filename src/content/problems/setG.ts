import { fitBudget } from "./budget";
import { rng } from "./rng";
import type { ProblemSeed } from "./types";

type Spec = Omit<ProblemSeed, "timeLimitMs" | "memoryLimitMb" | "estimatedMinutes"> & { timeLimitMs?: number; estimatedMinutes?: number };

const P = (s: Spec): ProblemSeed => ({
  timeLimitMs: 1000,
  memoryLimitMb: 256,
  estimatedMinutes: s.difficulty === "newbie" ? 8 : s.difficulty === "easy" ? 15 : s.difficulty === "medium" ? 30 : s.difficulty === "hard" ? 50 : 70,
  ...s,
});

type Rng = ReturnType<typeof rng>;
const arr = (r: Rng, n: number, lo: number, hi: number) => Array.from({ length: n }, () => r.int(lo, hi));
const str = (r: Rng, n: number, alpha: number) => Array.from({ length: n }, () => String.fromCharCode(97 + r.int(0, alpha - 1))).join("");
const multi = (cases: string[]) => `${cases.length}\n${cases.join("\n")}\n`;

// ---------------------------------------------------------------- newbie

const threeStep = P({
  slug: "three-step-staircase",
  title: "Three-Step Staircase",
  difficulty: "newbie",
  rating: 800,
  tags: ["dp", "math"],
  statement:
    "A staircase has n steps. In one move you may climb 1, 2 or 3 steps. Two ways are different if the sequences of move sizes are different. Count the ways to climb exactly n steps starting from the bottom.",
  inputFormat: "One line with the integer n.",
  outputFormat: "Print the number of ways.",
  constraints: "1 <= n <= 60",
  samples: [
    { input: "4\n", output: "7\n", explanation: "1+1+1+1, 1+1+2, 1+2+1, 2+1+1, 2+2, 1+3, 3+1." },
    { input: "1\n", output: "1\n" },
  ],
  hints: [
    "Think about the very last move: it was a 1-step, 2-step or 3-step move.",
    "ways[i] = ways[i-1] + ways[i-2] + ways[i-3], with ways[0] = 1 and missing terms counted as 0.",
    "Fill an array of 64-bit integers from 0 to n; the answer for n = 60 is about 10^15, so it fits.",
  ],
  editorial: "Let f(i) be the number of ways to reach step i. Every way ends with a move of size 1, 2 or 3, so f(i) = f(i-1) + f(i-2) + f(i-3) with f(0) = 1. f(60) is below 10^16 so long long is enough.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<long long> f(n + 1, 0);
    f[0] = 1;
    for (int i = 1; i <= n; i++)
        for (int s = 1; s <= 3 && s <= i; s++) f[i] += f[i - s];
    cout << f[n] << "\\n";
}`,
  hidden: () => [1, 2, 3, 4, 5, 6, 7, 10, 20, 33, 45, 59, 60].map((n) => `${n}\n`),
});

const pascalEntry = P({
  slug: "pascal-triangle-entry",
  title: "Pascal Triangle Entry",
  difficulty: "newbie",
  rating: 800,
  tags: ["dp", "combinatorics"],
  statement:
    "Pascal's triangle has 1 at the ends of every row and each inner entry equals the sum of the two entries above it. Row n (counting from 0) contains the numbers C(n, 0), C(n, 1), ..., C(n, n). Given n and k, print C(n, k), the k-th entry (from 0) of row n.",
  inputFormat: "One line with two integers n and k.",
  outputFormat: "Print C(n, k) exactly.",
  constraints: "0 <= k <= n <= 60",
  samples: [
    { input: "5 2\n", output: "10\n" },
    { input: "60 30\n", output: "118264581564861424\n" },
  ],
  hints: [
    "Use the rule that an inner entry is the sum of the two entries above it.",
    "Build rows one after another: C[i][j] = C[i-1][j-1] + C[i-1][j], with C[i][0] = C[i][i] = 1.",
    "A 64-bit integer holds every value up to row 60 (the largest is about 1.2 * 10^17).",
  ],
  editorial: "Fill the triangle row by row using Pascal's rule; all values for n <= 60 fit in a signed 64-bit integer (C(60,30) is about 1.18e17).\n\nComplexity: O(n^2).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, k;
    cin >> n >> k;
    vector<vector<long long>> c(n + 1, vector<long long>(n + 1, 0));
    for (int i = 0; i <= n; i++) {
        c[i][0] = 1;
        for (int j = 1; j <= i; j++) c[i][j] = c[i - 1][j - 1] + (j <= i - 1 ? c[i - 1][j] : 0);
    }
    cout << c[n][k] << "\\n";
}`,
  hidden: () => ["0 0", "1 0", "1 1", "2 1", "10 5", "40 20", "60 0", "60 60", "60 30", "59 29", "60 1", "55 27"].map((x) => `${x}\n`),
});

// ---------------------------------------------------------------- easy

const neighborFree = P({
  slug: "neighbor-free-loot",
  title: "Neighbor-Free Loot",
  difficulty: "easy",
  rating: 1000,
  tags: ["dp"],
  statement:
    "A street has n houses in a row, house i holding a[i] coins. A thief may take from any set of houses but never from two adjacent houses (i and i+1). Find the maximum total number of coins the thief can take. Taking from no house is allowed.",
  inputFormat: "The first line contains n. The second line contains n integers a[1..n].",
  outputFormat: "Print the maximum total.",
  constraints: "1 <= n <= 50000\n0 <= a[i] <= 10^9",
  samples: [
    { input: "4\n3 2 7 10\n", output: "13\n", explanation: "Take houses 1 and 4." },
    { input: "1\n5\n", output: "5\n" },
  ],
  hints: [
    "Decide for the last house: either you take it (then you must skip the one before) or you do not.",
    "Let best[i] be the answer for the first i houses: best[i] = max(best[i-1], best[i-2] + a[i]).",
    "Only the previous two values are needed. Use 64-bit integers: the sum reaches 2.5 * 10^13.",
  ],
  editorial: "best[i] = max(best[i-1], best[i-2] + a[i]) with best[0] = 0 and best[-1] = 0. The answer is best[n].\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    long long p2 = 0, p1 = 0;
    for (int i = 0; i < n; i++) {
        long long a;
        scanf("%lld", &a);
        long long c = max(p1, p2 + a);
        p2 = p1;
        p1 = c;
    }
    printf("%lld\\n", p1);
}`,
  hidden: () => {
    const r = rng(7001);
    const mk = (a: number[]) => `${a.length}\n${a.join(" ")}\n`;
    return [
      mk([0]),
      mk([1000000000, 1000000000]),
      mk([5, 4, 9]),
      mk([1, 100, 1, 1, 100, 1]),
      mk(Array(10).fill(0)),
      mk(arr(r, 20, 0, 10)),
      mk(arr(r, 1000, 0, 1e9)),
      mk(Array.from({ length: 50000 }, (_, i) => (i % 2 ? 1 : 1000000000))),
      mk(arr(r, 50000, 0, 1e9)),
      mk(Array.from({ length: 49999 }, (_, i) => i + 1)),
    ];
  },
});

const gridRocks = P({
  slug: "grid-paths-around-rocks",
  title: "Grid Paths Around Rocks",
  difficulty: "easy",
  rating: 1100,
  tags: ["dp", "grids", "counting"],
  statement:
    "A grid has n rows and m columns. Cells marked `#` are rocks and cannot be entered; cells marked `.` are free. Starting from the top-left cell you move only right or down, one cell at a time, to reach the bottom-right cell. Count the distinct paths that visit only free cells, modulo 1000000007. If the start or the end is a rock, the answer is 0.",
  inputFormat: "The first line contains n and m. Each of the next n lines contains a string of m characters, `.` or `#`.",
  outputFormat: "Print the number of paths modulo 1000000007.",
  constraints: "1 <= n, m <= 700",
  samples: [{ input: "3 3\n...\n.#.\n...\n", output: "2\n" }],
  hints: [
    "The number of ways to reach a cell depends only on the cell above and the cell to the left.",
    "ways[i][j] = 0 for a rock, else ways[i-1][j] + ways[i][j-1] (mod p), with ways[0][0] = 1 if it is free.",
    "Process rows in order; a single array reused per row is enough but a full table also fits in memory.",
  ],
  editorial: "Standard grid DP: ways[i][j] = (ways[i-1][j] + ways[i][j-1]) mod p for free cells, 0 for rocks, and ways[0][0] = 1 when free. Print ways[n-1][m-1].\n\nComplexity: O(nm).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<string> g(n);
    for (auto &s : g) cin >> s;
    const long long MOD = 1000000007;
    vector<vector<long long>> w(n, vector<long long>(m, 0));
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) {
            if (g[i][j] == '#') continue;
            if (i == 0 && j == 0) { w[i][j] = 1; continue; }
            long long v = 0;
            if (i > 0) v += w[i - 1][j];
            if (j > 0) v += w[i][j - 1];
            w[i][j] = v % MOD;
        }
    cout << w[n - 1][m - 1] << "\\n";
}`,
  hidden: () => {
    const r = rng(7002);
    const g = (n: number, m: number, p: number, free = true) => {
      const rows = Array.from({ length: n }, () => Array.from({ length: m }, () => (r.int(0, 999) < p * 1000 ? "#" : ".")));
      if (free) {
        rows[0]![0] = ".";
        rows[n - 1]![m - 1] = ".";
      }
      return `${n} ${m}\n${rows.map((x) => x.join("")).join("\n")}\n`;
    };
    return [
      "1 1\n.\n",
      "1 1\n#\n",
      "1 6\n......\n",
      "1 6\n..#...\n",
      "2 2\n.#\n#.\n",
      "3 3\n#..\n...\n..#\n",
      g(6, 6, 0.1),
      g(30, 30, 0.2),
      g(700, 700, 0),
      g(700, 700, 0.01),
      g(700, 700, 0.05),
      g(2, 700, 0.02),
    ];
  },
});

const coinCombos = P({
  slug: "coin-combinations-count",
  title: "Coin Combinations Count",
  difficulty: "easy",
  rating: 1200,
  tags: ["dp", "knapsack", "counting"],
  statement:
    "A shop has coins of n distinct denominations, with an unlimited supply of each. Count the number of distinct multisets of coins whose total value is exactly T. The order of coins does not matter (1+2 and 2+1 are the same combination). Print the count modulo 1000000007.",
  inputFormat: "The first line contains n and T. The second line contains the n distinct denominations.",
  outputFormat: "Print the number of combinations modulo 1000000007.",
  constraints: "1 <= n <= 100\n1 <= T <= 100000\n1 <= denomination <= 100000",
  samples: [{ input: "3 4\n1 2 3\n", output: "4\n", explanation: "1+1+1+1, 1+1+2, 2+2, 1+3." }],
  hints: [
    "If you iterate over targets in the outer loop you count ordered sequences. How can you count each multiset once?",
    "Put the coin loop outside: for each coin c, for t from c to T: dp[t] += dp[t-c].",
    "dp[0] = 1. Reduce modulo 1000000007 after each addition.",
  ],
  editorial: "Unbounded knapsack counting. Processing the coins one at a time in the outer loop and sums in increasing order in the inner loop means each combination is counted once, in a canonical coin order. dp[t] += dp[t - c] (mod p).\n\nComplexity: O(n T).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, T;
    cin >> n >> T;
    const int MOD = 1000000007;
    vector<int> dp(T + 1, 0);
    dp[0] = 1;
    for (int i = 0; i < n; i++) {
        int c;
        cin >> c;
        for (int t = c; t <= T; t++) {
            dp[t] += dp[t - c];
            if (dp[t] >= MOD) dp[t] -= MOD;
        }
    }
    cout << dp[T] << "\\n";
}`,
  hidden: () => {
    const r = rng(7003);
    const dist = (n: number, hi: number) => {
      const s = new Set<number>();
      while (s.size < n) s.add(r.int(1, hi));
      return r.shuffle([...s]);
    };
    const mk = (T: number, c: number[]) => `${c.length} ${T}\n${c.join(" ")}\n`;
    return [
      mk(1, [1]),
      mk(5, [7]),
      mk(6, [3]),
      mk(7, [3]),
      mk(10, [1, 2, 5, 10]),
      mk(100000, [1]),
      mk(100000, [1, 2]),
      mk(100000, [2, 4, 6]),
      mk(100000, dist(100, 100000)),
      mk(100000, dist(100, 300)),
      mk(99999, dist(100, 120)),
      mk(50000, [100000, 1, 99999]),
    ];
  },
});

const totientBig = P({
  slug: "totient-of-big-numbers",
  title: "Totient of Big Numbers",
  difficulty: "easy",
  rating: 1200,
  tags: ["number-theory", "factorization"],
  statement:
    "Euler's totient phi(n) is the number of integers x with 1 <= x <= n and gcd(x, n) = 1. For each of T given numbers, print phi(n).",
  inputFormat: "The first line contains T. Each of the next T lines contains one integer n.",
  outputFormat: "Print T lines with phi(n) for each query, in order.",
  constraints: "1 <= T <= 100\n1 <= n <= 10^12",
  samples: [{ input: "3\n10\n7\n1\n", output: "4\n6\n1\n" }],
  hints: [
    "Looping over all x up to n is far too slow. phi depends only on the prime factors of n.",
    "phi(n) = n * product over distinct primes p | n of (1 - 1/p), computed as n / p * (p - 1) step by step.",
    "Trial-divide by i up to sqrt(n) (10^6); whatever is left above 1 is one more prime factor.",
  ],
  editorial: "Factor n by trial division up to sqrt(n) = 10^6. For every distinct prime p, do result = result / p * (p - 1) (exact, since p divides the current result). If a remainder > 1 stays, it is a prime and is handled the same way.\n\nComplexity: O(T sqrt(n)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int T;
    cin >> T;
    while (T--) {
        long long n;
        cin >> n;
        long long res = n, m = n;
        for (long long p = 2; p * p <= m; p++) {
            if (m % p == 0) {
                while (m % p == 0) m /= p;
                res = res / p * (p - 1);
            }
        }
        if (m > 1) res = res / m * (m - 1);
        cout << res << "\\n";
    }
}`,
  hidden: () => {
    const r = rng(7004);
    const cs: string[][] = [
      ["1", "2", "3", "4", "6", "30", "97", "100", "1000000"],
      ["999999999989", "549755813888", "963761198400", "999966000289", "1000000000000", String(999983 * 999979)],
      ["999999999989", "999999999989", "999999999989", "999999999989", "999999999989"],
    ];
    for (let k = 0; k < 6; k++) cs.push(Array.from({ length: 100 }, () => `${r.int(1, k < 3 ? 1000000 : 1000000000000)}`));
    cs.push(Array.from({ length: 100 }, (_, i) => `${999999999989 - i * 2}`));
    return cs.map((c) => `${c.length}\n${c.join("\n")}\n`);
  },
});

// ---------------------------------------------------------------- medium

const backpack = P({
  slug: "packing-the-backpack",
  title: "Packing the Backpack",
  difficulty: "medium",
  rating: 1300,
  tags: ["dp", "knapsack"],
  statement:
    "There are n items; item i has weight w[i] and value v[i]. A backpack can carry total weight at most W. Each item may be taken at most once. Find the maximum total value that fits.",
  inputFormat: "The first line contains n and W. Each of the next n lines contains w[i] and v[i].",
  outputFormat: "Print the maximum total value.",
  constraints: "1 <= n <= 2000\n1 <= W <= 10000\n1 <= w[i] <= 10000\n1 <= v[i] <= 10^9",
  samples: [{ input: "3 5\n2 3\n3 4\n4 5\n", output: "7\n", explanation: "Take items 1 and 2: weight 5, value 7." }],
  hints: [
    "Trying all subsets is 2^n. Instead think about the best value achievable with a given weight budget.",
    "dp[c] = best value with capacity c. For each item, update dp[c] = max(dp[c], dp[c - w] + v).",
    "Iterate c downwards from W to w so each item is used at most once. Use 64-bit values (sum up to 2 * 10^12).",
  ],
  editorial: "Classic 0/1 knapsack with a one-dimensional array: for each item iterate capacities from W down to w[i] and relax dp[c] = max(dp[c], dp[c-w] + v). Answer dp[W].\n\nComplexity: O(nW).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, W;
    scanf("%d %d", &n, &W);
    vector<long long> dp(W + 1, 0);
    for (int i = 0; i < n; i++) {
        int w;
        long long v;
        scanf("%d %lld", &w, &v);
        for (int c = W; c >= w; c--) dp[c] = max(dp[c], dp[c - w] + v);
    }
    printf("%lld\\n", dp[W]);
}`,
  hidden: () => {
    const r = rng(7005);
    const mk = (W: number, items: number[][]) => `${items.length} ${W}\n${items.map((x) => x.join(" ")).join("\n")}\n`;
    const rnd = (n: number, W: number, wlo: number, whi: number, vhi: number) =>
      mk(W, Array.from({ length: n }, () => [r.int(wlo, whi), r.int(1, vhi)]));
    return [
      mk(1, [[1, 5]]),
      mk(1, [[2, 5]]),
      mk(10, [[5, 5], [5, 5], [6, 100]]),
      rnd(10, 20, 1, 10, 20),
      rnd(50, 100, 1, 50, 1000),
      rnd(2000, 10000, 1, 10000, 1000000000),
      rnd(2000, 10000, 1, 200, 1000000000),
      rnd(2000, 10000, 5000, 10000, 1000000000),
      mk(10000, Array.from({ length: 2000 }, () => [5, 1000000000])),
      rnd(1500, 7777, 1, 3000, 1000),
      mk(10000, Array.from({ length: 2000 }, (_, i) => [i + 1, 10000 - (i % 7)])),
    ];
  },
});

const sharedSubseq = P({
  slug: "shared-subsequence-length",
  title: "Shared Subsequence Length",
  difficulty: "medium",
  rating: 1300,
  tags: ["dp", "strings"],
  statement:
    "A subsequence of a string is obtained by deleting zero or more characters without changing the order of the rest. Given strings A and B, print the length of the longest string that is a subsequence of both.",
  inputFormat: "Two lines: string A and string B, both of lowercase letters.",
  outputFormat: "Print the length of the longest common subsequence.",
  constraints: "1 <= |A|, |B| <= 5000",
  samples: [
    { input: "abcde\nace\n", output: "3\n" },
    { input: "abc\ndef\n", output: "0\n" },
  ],
  hints: [
    "Compare the last characters of the two prefixes: they either match or they do not.",
    "dp[i][j] = dp[i-1][j-1] + 1 if A[i] == B[j], otherwise max(dp[i-1][j], dp[i][j-1]).",
    "Only the previous row is needed, so two rolling arrays of size |B|+1 keep memory small.",
  ],
  editorial: "Let dp[i][j] be the LCS length of the first i characters of A and first j of B. If the characters match, extend the diagonal; otherwise skip one character from either string. Rolling rows give O(|B|) memory.\n\nComplexity: O(|A||B|).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string a, b;
    cin >> a >> b;
    int n = a.size(), m = b.size();
    vector<int> prev(m + 1, 0), cur(m + 1, 0);
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) cur[j] = prev[j - 1] + 1;
            else cur[j] = max(prev[j], cur[j - 1]);
        }
        swap(prev, cur);
    }
    cout << prev[m] << "\\n";
}`,
  hidden: () => {
    const r = rng(7006);
    const same = str(r, 5000, 3);
    return [
      "a\na\n",
      "a\nb\n",
      "abab\nbaba\n",
      "aaaa\naa\n",
      `${str(r, 30, 2)}\n${str(r, 40, 2)}\n`,
      `${str(r, 200, 26)}\n${str(r, 300, 26)}\n`,
      `${same}\n${same}\n`,
      `${"a".repeat(5000)}\n${"b".repeat(5000)}\n`,
      `${str(r, 5000, 2)}\n${str(r, 5000, 2)}\n`,
      `${str(r, 5000, 26)}\n${str(r, 5000, 26)}\n`,
      `${str(r, 5000, 4)}\n${str(r, 3000, 4)}\n`,
      `${"ab".repeat(2500)}\n${"ba".repeat(2500)}\n`,
    ];
  },
});

const weightedEdit = P({
  slug: "weighted-edit-cost",
  title: "Weighted Edit Cost",
  difficulty: "medium",
  rating: 1500,
  tags: ["dp", "strings"],
  statement:
    "You can transform string A into string B using three operations: insert any one character (cost ci), delete any one character (cost cd), or replace one character by a different character (cost cr). Replacing a character by the same character is pointless and not counted as an operation. Find the minimum total cost to turn A into B. Note that a replacement may be more expensive than a deletion plus an insertion.",
  inputFormat: "The first line contains ci, cd and cr. The second line contains A and the third line B (lowercase letters).",
  outputFormat: "Print the minimum total cost.",
  constraints: "1 <= |A|, |B| <= 2000\n0 <= ci, cd, cr <= 1000",
  samples: [
    { input: "1 1 1\nkitten\nsitting\n", output: "3\n" },
    { input: "1 1 5\nab\nba\n", output: "2\n", explanation: "Delete 'a' and insert 'a' at the end." },
  ],
  hints: [
    "Define the state by how many characters of A and of B have been handled.",
    "dp[i][j] = min(dp[i-1][j] + cd, dp[i][j-1] + ci, dp[i-1][j-1] + (A[i]==B[j] ? 0 : cr)).",
    "Initialize dp[i][0] = i * cd and dp[0][j] = j * ci. Costs fit in 32 bits but 64-bit is safest.",
  ],
  editorial: "The classic edit-distance DP with per-operation costs. dp[i][j] is the cheapest way to turn the first i characters of A into the first j characters of B; the three transitions are delete, insert and match/replace. Because the recurrence takes the min over all three, a cheap delete+insert beats an expensive replace automatically.\n\nComplexity: O(|A||B|).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    long long ci, cd, cr;
    string a, b;
    cin >> ci >> cd >> cr >> a >> b;
    int n = a.size(), m = b.size();
    vector<vector<long long>> dp(n + 1, vector<long long>(m + 1, 0));
    for (int i = 1; i <= n; i++) dp[i][0] = dp[i - 1][0] + cd;
    for (int j = 1; j <= m; j++) dp[0][j] = dp[0][j - 1] + ci;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            long long v = min(dp[i - 1][j] + cd, dp[i][j - 1] + ci);
            v = min(v, dp[i - 1][j - 1] + (a[i - 1] == b[j - 1] ? 0 : cr));
            dp[i][j] = v;
        }
    cout << dp[n][m] << "\\n";
}`,
  hidden: () => {
    const r = rng(7007);
    const mk = (c: number[], a: string, b: string) => `${c.join(" ")}\n${a}\n${b}\n`;
    const a2 = str(r, 2000, 2);
    return [
      mk([1, 1, 1], "a", "b"),
      mk([0, 0, 0], "abc", "xyz"),
      mk([5, 7, 1], "abcdef", "abcdef"),
      mk([1000, 1000, 1000], "a", "aaaaaaaa"),
      mk([3, 4, 100], "intention", "execution"),
      mk([1, 2, 3], str(r, 50, 3), str(r, 60, 3)),
      mk([1, 1, 1], str(r, 2000, 26), str(r, 2000, 26)),
      mk([1, 1, 1000], str(r, 2000, 2), str(r, 2000, 2)),
      mk([7, 3, 5], a2, a2),
      mk([100, 1, 50], "b".repeat(2000), "a".repeat(2000)),
      mk([1000, 999, 1], str(r, 1500, 4), str(r, 2000, 4)),
      mk([2, 3, 4], "a".repeat(2000), "a".repeat(1)),
    ];
  },
});

const subsetsTarget = P({
  slug: "subsets-hitting-target",
  title: "Subsets Hitting Target",
  difficulty: "medium",
  rating: 1400,
  tags: ["dp", "knapsack", "counting"],
  statement:
    "Given n positive integers (equal values at different positions count as different elements), count the subsets of positions whose values sum to exactly S. Two subsets are different if they differ in at least one position. Print the count modulo 1000000007.",
  inputFormat: "The first line contains n and S. The second line contains the n integers.",
  outputFormat: "Print the number of subsets modulo 1000000007.",
  constraints: "1 <= n <= 200\n1 <= S <= 10000\n1 <= a[i] <= 10000",
  samples: [{ input: "4 5\n1 2 3 4\n", output: "2\n", explanation: "{1,4} and {2,3}." }],
  hints: [
    "Listing the subsets is hopeless, but you only need how many reach the target. Add the elements one at a time: what could you count after each element that lets you extend the count to the next one?",
    "Let dp[s] be the number of subsets so far with sum s. A new element x lets every subset with sum s - x grow into one with sum s: dp[s] += dp[s - x].",
    "Iterate s downwards from S to x so the element is used at most once; start with dp[0] = 1 (the empty subset).",
  ],
  editorial: "0/1 knapsack counting: dp[0] = 1, and for each element x iterate s from S down to x doing dp[s] = (dp[s] + dp[s-x]) mod p. Equal values at different positions are processed separately, so they are counted as different subsets.\n\nComplexity: O(nS).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, S;
    cin >> n >> S;
    const int MOD = 1000000007;
    vector<int> dp(S + 1, 0);
    dp[0] = 1;
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        for (int s = S; s >= x; s--) {
            dp[s] += dp[s - x];
            if (dp[s] >= MOD) dp[s] -= MOD;
        }
    }
    cout << dp[S] << "\\n";
}`,
  hidden: () => {
    const r = rng(7008);
    const mk = (S: number, a: number[]) => `${a.length} ${S}\n${a.join(" ")}\n`;
    return [
      mk(1, [1]),
      mk(1, [2]),
      mk(3, [1, 1, 1]),
      mk(10, [5, 5, 5, 5]),
      mk(100, Array(200).fill(1)),
      mk(10000, Array(200).fill(100)),
      mk(10000, arr(r, 200, 1, 10000)),
      mk(5000, arr(r, 200, 1, 100)),
      mk(9999, arr(r, 200, 1, 60)),
      mk(10000, arr(r, 200, 1, 2)),
      mk(777, arr(r, 100, 1, 1000)),
      mk(10000, Array.from({ length: 200 }, (_, i) => 50 + i)),
    ];
  },
});

const bitonic = P({
  slug: "longest-mountain-subsequence",
  title: "Longest Mountain Subsequence",
  difficulty: "medium",
  rating: 1600,
  tags: ["dp", "binary-search", "lis"],
  statement:
    "A sequence is a mountain if it strictly increases up to some element (the peak) and then strictly decreases. Either side may be empty, so a strictly monotone sequence and a single element are mountains. Given an array, find the length of its longest subsequence (not necessarily contiguous) that is a mountain.",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print the maximum mountain subsequence length.",
  constraints: "1 <= n <= 50000\n1 <= a[i] <= 10^9",
  samples: [{ input: "6\n1 5 3 4 2 1\n", output: "5\n", explanation: "1 3 4 2 1." }],
  hints: [
    "Fix the peak. The left part is an increasing subsequence ending at the peak, the right part a decreasing one starting there.",
    "Compute inc[i] = longest strictly increasing subsequence ending at i, and dec[i] = longest strictly decreasing starting at i (an LIS on the reversed array).",
    "Use the O(n log n) tails-array LIS with lower_bound for strictness. The answer is max over i of inc[i] + dec[i] - 1.",
  ],
  editorial: "Compute inc[i] with the patience/tails technique using lower_bound (strict increase): the position where a[i] lands plus one is inc[i]. Run the same on the reversed array to get dec[i]. Each i can be the peak, giving inc[i] + dec[i] - 1.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
vector<int> lisEnd(const vector<int> &a) {
    vector<int> t, res(a.size());
    for (size_t i = 0; i < a.size(); i++) {
        auto it = lower_bound(t.begin(), t.end(), a[i]);
        res[i] = it - t.begin() + 1;
        if (it == t.end()) t.push_back(a[i]);
        else *it = a[i];
    }
    return res;
}
int main() {
    int n;
    scanf("%d", &n);
    vector<int> a(n);
    for (auto &x : a) scanf("%d", &x);
    vector<int> inc = lisEnd(a);
    vector<int> b(a.rbegin(), a.rend());
    vector<int> d = lisEnd(b);
    int best = 0;
    for (int i = 0; i < n; i++) best = max(best, inc[i] + d[n - 1 - i] - 1);
    printf("%d\\n", best);
}`,
  hidden: () => {
    const r = rng(7009);
    const mk = (a: number[]) => `${a.length}\n${a.join(" ")}\n`;
    const n = 50000;
    return [
      mk([7]),
      mk([3, 3, 3, 3]),
      mk([1, 2, 3, 4, 5]),
      mk([5, 4, 3, 2, 1]),
      mk([1, 3, 2, 3, 1]),
      mk(arr(r, 30, 1, 20)),
      mk(arr(r, 1000, 1, 1e9)),
      mk(Array.from({ length: n }, (_, i) => i + 1)),
      mk(Array.from({ length: n }, (_, i) => n - i)),
      mk(arr(r, n, 1, 1e9)),
      mk(arr(r, n, 1, 100)),
      mk(Array.from({ length: n }, (_, i) => (i < n / 2 ? 2 * i + 1 : 2 * (n - i)))),
    ];
  },
});

const binomQueries = P({
  slug: "binomial-queries-mod-prime",
  title: "Binomial Queries Modulo a Prime",
  difficulty: "medium",
  rating: 1400,
  tags: ["combinatorics", "modular-arithmetic", "number-theory"],
  statement:
    "For each query (n, k) print the binomial coefficient C(n, k) = n! / (k! (n-k)!) modulo p = 1000000007.",
  inputFormat: "The first line contains Q. Each of the next Q lines contains n and k.",
  outputFormat: "Print Q lines, the answer to each query.",
  constraints: "1 <= Q <= 40000\n0 <= k <= n <= 10^6",
  samples: [{ input: "3\n5 2\n10 0\n6 3\n", output: "10\n1\n20\n" }],
  hints: [
    "Computing each coefficient with a loop costs O(k) per query, which is far too slow for many queries.",
    "Precompute factorials once. Division modulo a prime p is multiplication by a modular inverse (Fermat: x^(p-2)).",
    "Compute fact[N], then invFact[N] = fact[N]^(p-2), and walk down invFact[i-1] = invFact[i] * i. Answer = fact[n] * invFact[k] * invFact[n-k].",
  ],
  editorial: "Precompute fact[0..10^6] and inverse factorials (one modular exponentiation, then a downward recurrence). Each query is then three multiplications.\n\nComplexity: O(N + Q) after one O(log p) exponentiation.",
  reference: `#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1000000007;
long long pw(long long b, long long e) {
    long long r = 1;
    b %= MOD;
    while (e) {
        if (e & 1) r = r * b % MOD;
        b = b * b % MOD;
        e >>= 1;
    }
    return r;
}
int main() {
    const int N = 1000000;
    vector<long long> f(N + 1), inv(N + 1);
    f[0] = 1;
    for (int i = 1; i <= N; i++) f[i] = f[i - 1] * i % MOD;
    inv[N] = pw(f[N], MOD - 2);
    for (int i = N; i > 0; i--) inv[i - 1] = inv[i] * i % MOD;
    int q;
    scanf("%d", &q);
    while (q--) {
        int n, k;
        scanf("%d %d", &n, &k);
        printf("%lld\\n", f[n] * inv[k] % MOD * inv[n - k] % MOD);
    }
}`,
  hidden: () => {
    const r = rng(7010);
    const mkq = (cnt: number, nHi: number, mode: number) =>
      multi(
        Array.from({ length: cnt }, () => {
          const n = r.int(0, nHi);
          const k = mode === 0 ? r.int(0, n) : mode === 1 ? Math.floor(n / 2) : r.int(0, Math.min(n, 3));
          return `${n} ${k}`;
        }),
      );
    return [
      "1\n0 0\n",
      "2\n1 0\n1 1\n",
      "4\n1000000 500000\n1000000 0\n1000000 1000000\n1000000 1\n",
      mkq(20, 20, 0),
      mkq(1000, 1000, 0),
      mkq(40000, 1000000, 0),
      mkq(40000, 1000000, 1),
      mkq(40000, 1000000, 2),
      mkq(40000, 100, 0),
      mkq(5000, 1000000, 1),
    ];
  },
});

const bracketCompletions = P({
  slug: "bracket-completions-count",
  title: "Bracket Completions Count",
  difficulty: "medium",
  rating: 1700,
  tags: ["combinatorics", "catalan", "modular-arithmetic"],
  statement:
    "A balanced bracket sequence is a string of ( and ) in which every prefix has at least as many ( as ) and the whole string has equally many of both. You are given n and a string P of length m <= 2n made of ( and ). Count the balanced sequences of length exactly 2n whose first m characters are P. Print the count modulo 1000000007.",
  inputFormat: "The first line contains n. The second line contains the prefix P (length at least 1).",
  outputFormat: "Print the number of completions modulo 1000000007 (it is 0 if none exist).",
  constraints: "1 <= n <= 300000\n1 <= |P| <= 2n",
  samples: [
    { input: "3\n(\n", output: "5\n" },
    { input: "2\n)(\n", output: "0\n" },
  ],
  hints: [
    "First check whether P itself ever goes below zero balance. After P you are at some height b with r characters left.",
    "Completions are lattice paths from height b to 0 in r steps that never go below 0. Count all paths and subtract those touching -1 using the reflection principle.",
    "With d = (r + b) / 2 down-steps: answer = C(r, d) - C(r, d + 1), where C(x, y) = 0 for y > x. Precompute factorials up to 2n.",
  ],
  editorial: "Let b be the final balance of P (invalid if it ever dips below 0) and r = 2n - m the remaining length. If b > r the answer is 0. The remaining part needs d = (r+b)/2 closing brackets. Total paths: C(r, d). Paths that touch height -1 correspond (reflect the start across -1) to unrestricted paths from -2-b to 0, of which there are C(r, d+1). The answer is C(r,d) - C(r,d+1) mod p.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1000000007;
long long pw(long long b, long long e) {
    long long r = 1;
    b %= MOD;
    while (e) {
        if (e & 1) r = r * b % MOD;
        b = b * b % MOD;
        e >>= 1;
    }
    return r;
}
vector<long long> f, inv;
long long C(long long n, long long k) {
    if (k < 0 || k > n) return 0;
    return f[n] * inv[k] % MOD * inv[n - k] % MOD;
}
int main() {
    long long n;
    string s;
    cin >> n >> s;
    int N = 2 * n + 5;
    f.assign(N + 1, 1);
    inv.assign(N + 1, 1);
    for (int i = 1; i <= N; i++) f[i] = f[i - 1] * i % MOD;
    inv[N] = pw(f[N], MOD - 2);
    for (int i = N; i > 0; i--) inv[i - 1] = inv[i] * i % MOD;
    long long b = 0;
    bool ok = true;
    for (char c : s) {
        b += c == '(' ? 1 : -1;
        if (b < 0) ok = false;
    }
    long long r = 2 * n - (long long)s.size();
    if (!ok || b > r) {
        cout << 0 << "\\n";
        return 0;
    }
    long long d = (r + b) / 2;
    cout << ((C(r, d) - C(r, d + 1)) % MOD + MOD) % MOD << "\\n";
}`,
  hidden: () => {
    const r = rng(7011);
    const walk = (len: number, up: number) => {
      let b = 0;
      let s = "";
      for (let i = 0; i < len; i++) {
        if (b > 0 && r.int(0, 99) >= up) {
          s += ")";
          b--;
        } else {
          s += "(";
          b++;
        }
      }
      return s;
    };
    return [
      "1\n(\n",
      "1\n()\n",
      "1\n)\n",
      "2\n(((\n",
      "3\n((()))\n",
      "5\n(\n",
      `10\n${walk(9, 50)}\n`,
      `300000\n(\n`,
      `300000\n${walk(400000, 50)}\n`,
      `300000\n${walk(100000, 60)}\n`,
      `300000\n${"(".repeat(300000)}${")".repeat(1000)}\n`,
      `300000\n${"()".repeat(299999)}\n`,
      `300000\n${"(".repeat(300001)}\n`,
    ];
  },
});

const divisorSum = P({
  slug: "divisor-count-range-sum",
  title: "Divisor Count Range Sum",
  difficulty: "medium",
  rating: 1500,
  tags: ["number-theory", "math", "divisors"],
  timeLimitMs: 2000,
  statement:
    "Let d(i) be the number of positive divisors of i. For each query (L, R) print d(L) + d(L+1) + ... + d(R).",
  inputFormat: "The first line contains Q. Each of the next Q lines contains L and R.",
  outputFormat: "Print Q lines, one answer per query.",
  constraints: "1 <= Q <= 100\n1 <= L <= R <= 10^11",
  samples: [{ input: "2\n1 10\n5 5\n", output: "27\n2\n" }],
  hints: [
    "Define F(N) = d(1) + ... + d(N) so the answer is F(R) - F(L-1). Counting divisors of each number is hopeless for N up to 10^11.",
    "Count pairs (i, j) with i * j <= N instead: F(N) = sum over i of floor(N / i).",
    "floor(N/i) takes only about 2 sqrt(N) distinct values; or use the symmetry F(N) = 2 * sum_{i<=s} floor(N/i) - s^2 with s = floor(sqrt(N)).",
  ],
  editorial: "Each divisor pair (i, j) with i*j = m <= N is counted in d(m), so F(N) = #{(i,j): i*j <= N} = sum_{i=1}^N floor(N/i). Pairs with min(i,j) <= s = floor(sqrt N) are enough: F(N) = 2 * sum_{i=1}^s floor(N/i) - s^2. Each query takes O(sqrt N).\n\nComplexity: O(Q sqrt(max R)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
long long F(long long N) {
    if (N <= 0) return 0;
    long long s = (long long)sqrtl((long double)N);
    while (s * s > N) s--;
    while ((s + 1) * (s + 1) <= N) s++;
    long long sum = 0;
    for (long long i = 1; i <= s; i++) sum += N / i;
    return 2 * sum - s * s;
}
int main() {
    int q;
    cin >> q;
    while (q--) {
        long long l, r;
        cin >> l >> r;
        cout << F(r) - F(l - 1) << "\\n";
    }
}`,
  hidden: () => {
    const r = rng(7012);
    const hi = 100000000000;
    return [
      multi(["1 1", "1 2", "2 2", "1 100", "36 36", "99 101"]),
      multi(Array.from({ length: 100 }, () => `${r.int(1, 1000)} ${r.int(1000, 100000)}`)),
      multi(Array.from({ length: 100 }, () => `1 ${r.int(1, 10000000)}`)),
      multi([`1 ${hi}`]),
      multi([`${hi} ${hi}`, `${hi - 1} ${hi}`, "1 1"]),
      multi(Array.from({ length: 100 }, () => `${hi - r.int(0, 1000000)} ${hi}`)),
      multi(Array.from({ length: 100 }, () => { const a = r.int(1, hi); return `${a} ${r.int(a, hi)}`; })),
      multi(Array.from({ length: 100 }, (_, i) => `${i + 1} ${hi - i}`)),
      multi(["1 99999999999", "123456789 987654321"]),
      multi(Array.from({ length: 60 }, () => { const a = r.int(1, 1e9); return `${a} ${a + r.int(0, 100)}`; })),
    ];
  },
});

const rangeRatio = P({
  slug: "range-product-ratio-queries",
  title: "Range Product Ratio Queries",
  difficulty: "medium",
  rating: 1400,
  tags: ["number-theory", "modular-arithmetic", "prefix-products"],
  statement:
    "Given an array a of positive integers and p = 1000000007 (a prime), answer queries. Each query gives two ranges [l1, r1] and [l2, r2]. Let X be the product of a[l1..r1] and Y the product of a[l2..r2] (as exact integers). Because Y is not divisible by p, print the unique value z in [0, p-1] with z * Y = X modulo p, i.e. X / Y in modular arithmetic.",
  inputFormat: "The first line contains n and Q. The second line contains the n array values. Each of the next Q lines contains l1 r1 l2 r2.",
  outputFormat: "Print Q lines, one result per query.",
  constraints: "1 <= n <= 40000\n1 <= Q <= 12000\n1 <= a[i] <= 10^6\n1 <= l <= r <= n for both ranges",
  samples: [{ input: "4 2\n2 3 4 6\n3 4 1 2\n1 1 2 2\n", output: "4\n666666672\n", explanation: "24/6 = 4 and 2/3 = 2 * 333333336 mod p." }],
  hints: [
    "Multiplying a range directly costs O(n) per query. Precompute prefix products, so a range product is a ratio of two prefix products.",
    "That ratio itself needs a modular inverse. Since p is prime and no value is divisible by p, x^(p-2) is the inverse of x.",
    "X = P[r1] * inv(P[l1-1]) and Y = P[r2] * inv(P[l2-1]); simplify to X / Y = P[r1] * P[l2-1] * inv(P[l1-1] * P[r2]) with one inverse per query.",
  ],
  editorial: "Let P[i] be the product of the first i elements mod p. No element is divisible by p, so every P[i] is invertible. Then X/Y = P[r1] * P[l2-1] * (P[l1-1] * P[r2])^(-1). One fast exponentiation per query gives O(log p).\n\nComplexity: O(n + Q log p).",
  reference: `#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1000000007;
long long pw(long long b, long long e) {
    long long r = 1;
    b %= MOD;
    while (e) {
        if (e & 1) r = r * b % MOD;
        b = b * b % MOD;
        e >>= 1;
    }
    return r;
}
int main() {
    int n, q;
    scanf("%d %d", &n, &q);
    vector<long long> P(n + 1, 1);
    for (int i = 1; i <= n; i++) {
        long long x;
        scanf("%lld", &x);
        P[i] = P[i - 1] * x % MOD;
    }
    while (q--) {
        int l1, r1, l2, r2;
        scanf("%d %d %d %d", &l1, &r1, &l2, &r2);
        long long num = P[r1] * P[l2 - 1] % MOD;
        long long den = P[l1 - 1] * P[r2] % MOD;
        printf("%lld\\n", num * pw(den, MOD - 2) % MOD);
    }
}`,
  hidden: () => {
    const r = rng(7013);
    const mk = (n: number, q: number, hi: number) => {
      const a = arr(r, n, 1, hi);
      const qs = Array.from({ length: q }, () => {
        const x = r.int(1, n), y = r.int(1, n), u = r.int(1, n), v = r.int(1, n);
        return `${Math.min(x, y)} ${Math.max(x, y)} ${Math.min(u, v)} ${Math.max(u, v)}`;
      });
      return `${n} ${q}\n${a.join(" ")}\n${qs.join("\n")}\n`;
    };
    return [
      "1 1\n1\n1 1 1 1\n",
      "1 1\n1000000\n1 1 1 1\n",
      "3 3\n1000000 999999 7\n1 3 1 1\n1 1 1 3\n2 3 2 3\n",
      mk(10, 20, 10),
      mk(100, 100, 1000000),
      mk(40000, 12000, 1000000),
      mk(40000, 12000, 1000000),
      mk(40000, 12000, 2),
      mk(5000, 5000, 1000000),
      `40000 3\n${Array(40000).fill(1000000).join(" ")}\n1 40000 1 1\n1 20000 20001 40000\n5 5 5 5\n`,
    ];
  },
});

// ---------------------------------------------------------------- hard

const partitions = P({
  slug: "integer-partition-count",
  title: "Integer Partition Count",
  difficulty: "hard",
  rating: 1900,
  tags: ["dp", "combinatorics", "partitions"],
  timeLimitMs: 2000,
  statement:
    "A partition of n is a way to write n as a sum of positive integers where the order of the summands does not matter (3+1 and 1+3 are the same). Let p(n) be the number of partitions of n; for example p(4) = 5 (4, 3+1, 2+2, 2+1+1, 1+1+1+1). For each query n print p(n) modulo 1000000007.",
  inputFormat: "The first line contains Q. Each of the next Q lines contains one integer n.",
  outputFormat: "Print Q lines with p(n) mod 1000000007.",
  constraints: "1 <= Q <= 20\n1 <= n <= 100000",
  samples: [{ input: "3\n1\n5\n10\n", output: "1\n7\n42\n" }],
  hints: [
    "The usual coin-style DP over parts 1..n costs O(n^2), about 10^10 for n = 10^5. You need roughly O(n sqrt n).",
    "Euler's pentagonal number theorem: p(n) = sum over k >= 1 of (-1)^(k+1) * (p(n - k(3k-1)/2) + p(n - k(3k+1)/2)).",
    "Only about sqrt(2n/3) generalized pentagonal numbers are <= n. Precompute p up to the largest query, answer each query by lookup, and keep signs correct under the modulus.",
  ],
  editorial: "Euler's pentagonal number theorem gives the recurrence p(n) = p(n-1) + p(n-2) - p(n-5) - p(n-7) + p(n-12) + p(n-15) - ..., with offsets k(3k-1)/2 and k(3k+1)/2 and signs alternating in pairs. There are O(sqrt n) terms per n, so computing p(0..N) costs O(N sqrt N), roughly 4 * 10^7 operations for N = 10^5.\n\nComplexity: O(N sqrt N).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    const long long MOD = 1000000007;
    int q;
    cin >> q;
    vector<int> qs(q);
    int mx = 1;
    for (auto &x : qs) { cin >> x; mx = max(mx, x); }
    vector<long long> p(mx + 1, 0);
    p[0] = 1;
    for (int n = 1; n <= mx; n++) {
        long long s = 0;
        for (long long k = 1;; k++) {
            long long g1 = k * (3 * k - 1) / 2;
            if (g1 > n) break;
            long long sign = (k % 2) ? 1 : -1;
            s += sign * p[n - g1];
            long long g2 = k * (3 * k + 1) / 2;
            if (g2 <= n) s += sign * p[n - g2];
        }
        p[n] = ((s % MOD) + MOD) % MOD;
    }
    for (int x : qs) cout << p[x] << "\\n";
}`,
  hidden: () => {
    const r = rng(7014);
    return [
      multi(["1", "2", "3", "4", "5", "6", "7", "100"]),
      multi(["100000"]),
      multi(["99999", "100000", "50000", "1"]),
      multi(Array.from({ length: 20 }, () => `${r.int(1, 100000)}`)),
      multi(Array.from({ length: 20 }, () => `${r.int(1, 1000)}`)),
      multi(Array.from({ length: 20 }, () => `${r.int(90000, 100000)}`)),
      multi(["12345", "54321", "77777"]),
      multi(["1000", "5000", "10000", "20000", "40000", "80000"]),
      multi(["65536", "65535", "99991"]),
      multi(["12", "15", "26", "35", "51"]),
    ];
  },
});

const farTerm = P({
  slug: "far-term-of-recurrence",
  title: "Far Term of a Recurrence",
  difficulty: "hard",
  rating: 1800,
  tags: ["matrix-exponentiation", "linear-recurrence", "modular-arithmetic"],
  statement:
    "A sequence satisfies a[n] = c1*a[n-1] + c2*a[n-2] + ... + cd*a[n-d] + e (mod 1000000007) for all n >= d, with given initial values a[0], ..., a[d-1]. For each query index n print a[n] modulo 1000000007.",
  inputFormat:
    "Line 1: d. Line 2: c1 ... cd. Line 3: e. Line 4: a[0] ... a[d-1]. Line 5: Q. Then Q lines, each with one index n.",
  outputFormat: "Print Q lines with a[n] mod 1000000007.",
  constraints: "1 <= d <= 10\n0 <= ci, e, a[i] < 1000000007\n1 <= Q <= 20\n0 <= n <= 10^18",
  samples: [{ input: "2\n1 1\n0\n0 1\n2\n10\n50\n", output: "55\n586268941\n" }],
  hints: [
    "Iterating n steps is impossible for n = 10^18, but each step applies the same linear map to a small state vector.",
    "Write the state as (a[n], ..., a[n-d+1], 1); the constant e is handled by an extra coordinate fixed at 1. The update is a (d+1) x (d+1) matrix T.",
    "Compute T^(n-d+1) by repeated squaring with all products modulo p, apply it to the initial state (a[d-1], ..., a[0], 1), and read the first coordinate. If n < d answer directly.",
  ],
  editorial: "State vector v = (a[n], a[n-1], ..., a[n-d+1], 1). The first row of the transition matrix is (c1, ..., cd, e); rows 2..d shift the window; the last row keeps the constant 1. Then v_n = T^(n-d+1) v_{d-1}. Binary exponentiation costs O(d^3 log n) per query.\n\nComplexity: O(Q d^3 log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef unsigned long long ull;
typedef vector<vector<long long>> Mat;
const long long MOD = 1000000007;
Mat mul(const Mat &a, const Mat &b) {
    int n = a.size();
    Mat c(n, vector<long long>(n, 0));
    for (int i = 0; i < n; i++)
        for (int k = 0; k < n; k++) {
            if (!a[i][k]) continue;
            for (int j = 0; j < n; j++) c[i][j] = (c[i][j] + a[i][k] * b[k][j]) % MOD;
        }
    return c;
}
int main() {
    int d;
    cin >> d;
    vector<long long> c(d), a(d);
    long long e;
    for (auto &x : c) cin >> x;
    cin >> e;
    for (auto &x : a) cin >> x;
    int q;
    cin >> q;
    int sz = d + 1;
    Mat T(sz, vector<long long>(sz, 0));
    for (int j = 0; j < d; j++) T[0][j] = c[j];
    T[0][d] = e;
    for (int i = 1; i < d; i++) T[i][i - 1] = 1;
    T[d][d] = 1;
    while (q--) {
        ull n;
        cin >> n;
        if (n < (ull)d) { cout << a[n] << "\\n"; continue; }
        ull ex = n - (d - 1);
        Mat R(sz, vector<long long>(sz, 0));
        for (int i = 0; i < sz; i++) R[i][i] = 1;
        Mat B = T;
        while (ex) {
            if (ex & 1) R = mul(R, B);
            B = mul(B, B);
            ex >>= 1;
        }
        vector<long long> v(sz);
        for (int i = 0; i < d; i++) v[i] = a[d - 1 - i];
        v[d] = 1;
        long long res = 0;
        for (int j = 0; j < sz; j++) res = (res + R[0][j] * v[j]) % MOD;
        cout << res << "\\n";
    }
}`,
  hidden: () => {
    const r = rng(7015);
    const M = 1000000006;
    const mk = (d: number, qs: (number | bigint | string)[], small = false) => {
      const hi = small ? 3 : M;
      const c = arr(r, d, 0, hi);
      return `${d}\n${c.join(" ")}\n${r.int(0, hi)}\n${arr(r, d, 0, hi).join(" ")}\n${qs.length}\n${qs.join("\n")}\n`;
    };
    const big = (n: number) => Array.from({ length: n }, () => r.big(0n, 1000000000000000000n));
    return [
      "2\n1 1\n0\n0 1\n6\n0\n1\n2\n3\n10\n50\n",
      mk(1, [0, 1, 5, 1000000000000000000n]),
      "1\n2\n0\n1\n3\n0\n10\n1000000000000000000\n",
      "1\n1\n1\n0\n3\n0\n1\n1000000000000000000\n",
      mk(3, [0, 1, 2, 3, 4, 5, 100], true),
      mk(5, big(20)),
      mk(10, big(20)),
      mk(10, ["1000000000000000000", "999999999999999999", "9", "10", "11"]),
      mk(7, big(20), true),
      mk(10, big(20)),
      mk(4, [1000000000000000000n, 123456789012345678n]),
    ];
  },
});

const assignmentCensus = P({
  slug: "optimal-assignment-census",
  title: "Optimal Assignment Census",
  difficulty: "hard",
  rating: 1800,
  tags: ["dp", "bitmask", "counting"],
  statement:
    "There are n workers and n jobs. Assigning worker i to job j costs c[i][j]. An assignment gives every worker a different job (a permutation). Find the minimum possible total cost, and the number of different assignments (permutations) that reach that minimum cost. Two assignments differ if some worker gets a different job.",
  inputFormat: "The first line contains n. Each of the next n lines contains n integers: row i of the cost matrix.",
  outputFormat: "Print two integers on one line: the minimum total cost and the number of optimal assignments (exact, no modulo).",
  constraints: "1 <= n <= 20\n0 <= c[i][j] <= 10^6",
  samples: [
    { input: "2\n1 2\n2 1\n", output: "2 1\n" },
    { input: "3\n5 5 5\n5 5 5\n5 5 5\n", output: "15 6\n" },
  ],
  hints: [
    "With n up to 20, trying all n! permutations is impossible, but 2^n subsets of jobs is fine.",
    "Assign workers in order 0, 1, 2, ...: a bitmask of used jobs also tells you which worker is next (popcount of the mask).",
    "Keep for each mask the pair (min cost, number of ways). When a transition gives a smaller cost, replace the pair; when it ties, add the counts. n! for n = 20 fits in unsigned 64-bit.",
  ],
  editorial: "dp[mask] = (best cost, ways) for assigning workers 0..popcount(mask)-1 to the jobs in mask. For each unused job j, worker i = popcount(mask) can take it: compare dp[mask].cost + c[i][j] with the target mask's current best and either replace or add ways. The answer is dp[full]. The count never exceeds 20! < 2^63.\n\nComplexity: O(2^n n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<vector<int>> c(n, vector<int>(n));
    for (auto &row : c)
        for (auto &x : row) scanf("%d", &x);
    const int INF = INT_MAX;
    vector<int> dc(1 << n, INF);
    vector<unsigned long long> dw(1 << n, 0);
    dc[0] = 0;
    dw[0] = 1;
    for (int mask = 0; mask < (1 << n); mask++) {
        if (dc[mask] == INF) continue;
        int i = __builtin_popcount(mask);
        if (i == n) continue;
        for (int j = 0; j < n; j++) {
            if (mask >> j & 1) continue;
            int nm = mask | (1 << j);
            int v = dc[mask] + c[i][j];
            if (v < dc[nm]) { dc[nm] = v; dw[nm] = dw[mask]; }
            else if (v == dc[nm]) dw[nm] += dw[mask];
        }
    }
    printf("%d %llu\\n", dc[(1 << n) - 1], dw[(1 << n) - 1]);
}`,
  hidden: () => {
    const r = rng(7016);
    const mk = (n: number, f: (i: number, j: number) => number) =>
      `${n}\n${Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => f(i, j)).join(" ")).join("\n")}\n`;
    return [
      "1\n0\n",
      "1\n1000000\n",
      mk(2, () => 0),
      mk(4, (i, j) => (i + j) % 3),
      mk(8, () => r.int(0, 2)),
      mk(20, () => 7),
      mk(20, () => 0),
      mk(20, () => r.int(0, 1000000)),
      mk(20, () => r.int(0, 2)),
      mk(20, () => r.int(0, 1)),
      mk(20, (i, j) => (i === j ? 0 : 1000000)),
      mk(20, (i, j) => (i * j) % 5),
      mk(18, () => r.int(0, 3)),
    ];
  },
});

const lanterns = P({
  slug: "lantern-popping-score",
  title: "Lantern Popping Score",
  difficulty: "hard",
  rating: 2000,
  tags: ["dp", "interval-dp"],
  statement:
    "n lanterns hang in a row, lantern i showing the number a[i]. You pop all of them one at a time in any order you like. Popping a lantern scores (number of its current left neighbour) * (its own number) * (number of its current right neighbour), where neighbours are among the lanterns not yet popped; a missing neighbour (at either end) counts as the number 1. Find the maximum total score over all popping orders.",
  inputFormat: "The first line contains n. The second line contains n integers a[1..n].",
  outputFormat: "Print the maximum total score.",
  constraints: "1 <= n <= 400\n1 <= a[i] <= 1000",
  samples: [
    { input: "4\n3 1 5 8\n", output: "167\n" },
    { input: "1\n9\n", output: "9\n" },
  ],
  hints: [
    "Thinking about which lantern is popped first makes the neighbours messy. Think about which one is popped LAST in a segment instead.",
    "Let dp[i][j] be the best score for popping everything strictly between positions i and j, with i and j still present. If k is popped last in between, its neighbours are i and j.",
    "dp[i][j] = max over k in (i, j) of dp[i][k] + dp[k][j] + a[i] * a[k] * a[j]. Pad the array with 1 at both ends and iterate by increasing interval length.",
  ],
  editorial: "Pad a[0] = a[n+1] = 1. dp[i][j] (i < j) is the maximum score for popping all lanterns strictly between i and j. If k is the last one popped, its neighbours at that moment are i and j, and the two sides are independent subproblems, so dp[i][j] = max_k dp[i][k] + dp[k][j] + a[i]a[k]a[j]. The answer is dp[0][n+1]. Values reach about 4 * 10^11, so use 64-bit.\n\nComplexity: O(n^3).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<long long> a(n + 2, 1);
    for (int i = 1; i <= n; i++) scanf("%lld", &a[i]);
    vector<vector<long long>> dp(n + 2, vector<long long>(n + 2, 0));
    for (int len = 2; len <= n + 1; len++)
        for (int i = 0; i + len <= n + 1; i++) {
            int j = i + len;
            long long best = 0;
            for (int k = i + 1; k < j; k++) best = max(best, dp[i][k] + dp[k][j] + a[i] * a[k] * a[j]);
            dp[i][j] = best;
        }
    printf("%lld\\n", dp[0][n + 1]);
}`,
  hidden: () => {
    const r = rng(7017);
    const mk = (a: number[]) => `${a.length}\n${a.join(" ")}\n`;
    return [
      mk([1]),
      mk([1000]),
      mk([1, 5]),
      mk([2, 3, 4]),
      mk([7, 9, 8, 6, 2, 3]),
      mk(arr(r, 12, 1, 10)),
      mk(arr(r, 100, 1, 1000)),
      mk(Array(400).fill(1)),
      mk(Array(400).fill(1000)),
      mk(arr(r, 400, 1, 1000)),
      mk(arr(r, 400, 1, 3)),
      mk(Array.from({ length: 400 }, (_, i) => (i % 2 ? 1 : 1000))),
    ];
  },
});

const countLis = P({
  slug: "count-longest-increasing-runs",
  title: "Count Longest Increasing Subsequences",
  difficulty: "hard",
  rating: 2000,
  tags: ["dp", "data-structures", "fenwick-tree", "counting"],
  statement:
    "Given an array, consider its strictly increasing subsequences (chosen by positions, so equal values at different positions give different subsequences). Let L be the maximum length of such a subsequence. Print L and the number of increasing subsequences of length L, modulo 1000000007.",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print two integers: L, then the count modulo 1000000007.",
  constraints: "1 <= n <= 50000\n1 <= a[i] <= 10^9",
  samples: [
    { input: "5\n1 3 2 4 5\n", output: "4 2\n", explanation: "1 3 4 5 and 1 2 4 5." },
    { input: "3\n2 2 2\n", output: "1 3\n" },
  ],
  hints: [
    "For every position i keep a pair (length of the longest increasing subsequence ending at i, how many such subsequences). The O(n^2) pair DP is too slow for n = 50000.",
    "For position i you need, among earlier positions with a smaller value, the maximum length and the sum of counts attaining it. That is a prefix query over values.",
    "Compress values and use a Fenwick tree whose nodes store (max length, count) pairs merged by: larger length wins, equal lengths add counts. Initialize with (0, 0) and treat a (0, 0) result as the start of a new subsequence with count 1.",
  ],
  editorial: "Process positions left to right. For value rank r, query the Fenwick tree over ranks < r to get (len, cnt) merged as above; the new pair is (len+1, max(cnt,1)) (if len = 0 the count is 1). Update the tree at r with the merge. After all elements, query the whole tree: its length is L and its count is the answer. The merge is associative with identity (0, 0), so a Fenwick prefix structure works.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef pair<int, long long> PI;
const long long MOD = 1000000007;
PI mergeP(PI a, PI b) {
    if (a.first > b.first) return a;
    if (a.first < b.first) return b;
    return PI(a.first, (a.second + b.second) % MOD);
}
int main() {
    int n;
    scanf("%d", &n);
    vector<int> a(n);
    for (auto &x : a) scanf("%d", &x);
    vector<int> s = a;
    sort(s.begin(), s.end());
    s.erase(unique(s.begin(), s.end()), s.end());
    int m = s.size();
    vector<PI> bit(m + 1, PI(0, 0));
    auto query = [&](int i) {
        PI r(0, 0);
        for (; i > 0; i -= i & -i) r = mergeP(r, bit[i]);
        return r;
    };
    auto update = [&](int i, PI v) {
        for (; i <= m; i += i & -i) bit[i] = mergeP(bit[i], v);
    };
    for (int i = 0; i < n; i++) {
        int r = lower_bound(s.begin(), s.end(), a[i]) - s.begin() + 1;
        PI q = query(r - 1);
        PI cur(q.first + 1, q.first == 0 ? 1 : q.second);
        update(r, cur);
    }
    PI res = query(m);
    printf("%d %lld\\n", res.first, res.second % MOD);
}`,
  hidden: () => {
    const r = rng(7018);
    const mk = (a: number[]) => `${a.length}\n${a.join(" ")}\n`;
    const n = 50000;
    return [
      mk([5]),
      mk([2, 2, 2, 2]),
      mk([5, 4, 3, 2, 1]),
      mk([1, 2, 3, 4, 5]),
      mk([1, 3, 2, 4, 3, 5]),
      mk(arr(r, 20, 1, 5)),
      mk(arr(r, 1000, 1, 100)),
      mk(arr(r, n, 1, 1e9)),
      mk(arr(r, n, 1, 5)),
      mk(arr(r, n, 1, 300)),
      mk(Array.from({ length: n }, (_, i) => Math.floor(i / 2) + 1)),
      mk(Array.from({ length: n }, (_, i) => (i % 2 === 0 ? i + 1 : i))),
    ];
  },
});

const gcdSum = P({
  slug: "gcd-sum-with-n",
  title: "GCD Sum With N",
  difficulty: "hard",
  rating: 1800,
  tags: ["number-theory", "factorization", "totient"],
  statement:
    "For a positive integer n let G(n) = gcd(1, n) + gcd(2, n) + ... + gcd(n, n). For each query n print G(n) modulo 1000000007.",
  inputFormat: "The first line contains T. Each of the next T lines contains one integer n.",
  outputFormat: "Print T lines with G(n) mod 1000000007.",
  constraints: "1 <= T <= 100\n1 <= n <= 10^12",
  samples: [{ input: "3\n6\n1\n12\n", output: "15\n1\n40\n" }],
  hints: [
    "Summing n gcd values is impossible for n = 10^12. Group the terms by the value g = gcd(i, n): which g occur and how often?",
    "For a divisor g of n, exactly phi(n/g) values of i have gcd(i, n) = g. So G(n) = sum over g | n of g * phi(n/g), which is multiplicative in n.",
    "For a prime power p^k the factor is p^(k-1) * ((k+1) * p - k). Factor n by trial division to 10^6, multiply the factors modulo 1000000007 (reduce p^(k-1) mod M before multiplying).",
  ],
  editorial: "Grouping by g = gcd(i,n) gives G(n) = sum_{g|n} g * phi(n/g) (Pillai's function), a Dirichlet convolution of multiplicative functions and thus multiplicative. For p^k: sum_{j=0}^{k} p^j phi(p^{k-j}) = p^(k-1) ((k+1)p - k). Factor n by trial division up to 10^6 using the primes (or all integers) and multiply the contributions mod 10^9+7.\n\nComplexity: O(T sqrt(n)) or O(T * pi(sqrt n)) with a sieve.",
  reference: `#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1000000007;
int main() {
    const int L = 1000001;
    vector<bool> comp(L + 1, false);
    vector<int> pr;
    for (int i = 2; i <= L; i++) {
        if (!comp[i]) {
            pr.push_back(i);
            for (long long j = (long long)i * i; j <= L; j += i) comp[j] = true;
        }
    }
    int T;
    cin >> T;
    while (T--) {
        long long n;
        cin >> n;
        long long res = 1;
        auto apply = [&](long long p, int k) {
            long long pk1 = 1;
            for (int t = 0; t < k - 1; t++) pk1 = pk1 * (p % MOD) % MOD;
            long long f = (((long long)(k + 1) * (p % MOD) - k) % MOD + MOD) % MOD;
            res = res * pk1 % MOD * f % MOD;
        };
        for (int p : pr) {
            if ((long long)p * p > n) break;
            if (n % p == 0) {
                int k = 0;
                while (n % p == 0) { n /= p; k++; }
                apply(p, k);
            }
        }
        if (n > 1) apply(n, 1);
        cout << res << "\\n";
    }
}`,
  hidden: () => {
    const r = rng(7019);
    const rnd = (k: number, hi: number) => Array.from({ length: k }, () => `${r.int(1, hi)}`);
    return [
      multi(["1", "2", "3", "4", "6", "12", "30", "36", "97", "100"]),
      multi(["999999999989", "549755813888", "963761198400", "999966000289", "1000000000000", String(999983 * 999979)]),
      multi(rnd(100, 1000)),
      multi(rnd(100, 1000000000000)),
      multi(rnd(100, 1000000000000)),
      multi(Array.from({ length: 100 }, (_, i) => `${999999999989 - i * 2}`)),
      multi(["999999999989"]),
      multi(["1000000000000", "735134400", "866421317361600".slice(0, 12)]),
      multi(Array.from({ length: 60 }, (_, i) => `${2 ** (i % 40)}`)),
      multi(Array.from({ length: 30 }, (_, i) => `${3 ** (i % 25)}`)),
    ];
  },
});

const latticeBlocks = P({
  slug: "lattice-paths-around-blocks",
  title: "Lattice Paths Around Blocks",
  difficulty: "hard",
  rating: 1900,
  tags: ["combinatorics", "dp", "modular-arithmetic"],
  statement:
    "A grid has H rows and W columns. Walk from cell (1, 1) to cell (H, W) moving one step right or one step down each time. K distinct cells are blocked and may not be visited (if (1, 1) or (H, W) is blocked the answer is 0). Count the valid paths modulo 1000000007.",
  inputFormat: "The first line contains H, W and K. Each of the next K lines contains the row r and column c of a blocked cell.",
  outputFormat: "Print the number of paths modulo 1000000007.",
  constraints: "1 <= H, W <= 10^6\n0 <= K <= 2000\n1 <= r <= H, 1 <= c <= W, all blocked cells distinct",
  samples: [{ input: "3 3 1\n2 2\n", output: "2\n" }],
  hints: [
    "The grid is huge, so a cell-by-cell DP is impossible; but there are only K blocked cells. Consider paths by the FIRST blocked cell they hit.",
    "Sort blocked cells by (row, column) and let f[i] be the number of paths from the start to block i that avoid all other blocks before it: f[i] = paths(start, i) - sum of f[j] * paths(j, i) over blocks j that can reach i.",
    "paths from (r1,c1) to (r2,c2) is C((r2-r1)+(c2-c1), r2-r1) when r2 >= r1 and c2 >= c1, else 0. Treat the target as a final pseudo-block (sorted last at equal position) and output f for it; precompute factorials up to H+W.",
  ],
  editorial: "Sort the blocks by (r, c) and append the target. For each point i define f[i] = C(r_i + c_i - 2, r_i - 1) - sum over earlier points j with r_j <= r_i and c_j <= c_i of f[j] * C(dr + dc, dr). This subtracts, for each path, its first visit to a block. f[target] is the number of block-free paths. If a real block coincides with the target (or start) the formula naturally yields 0.\n\nComplexity: O(H + W + K^2).",
  reference: `#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1000000007;
long long pw(long long b, long long e) {
    long long r = 1;
    b %= MOD;
    while (e) {
        if (e & 1) r = r * b % MOD;
        b = b * b % MOD;
        e >>= 1;
    }
    return r;
}
vector<long long> f, inv;
long long C(long long n, long long k) {
    if (k < 0 || k > n) return 0;
    return f[n] * inv[k] % MOD * inv[n - k] % MOD;
}
int main() {
    int H, W, K;
    scanf("%d %d %d", &H, &W, &K);
    int N = H + W + 2;
    f.assign(N + 1, 1);
    inv.assign(N + 1, 1);
    for (int i = 1; i <= N; i++) f[i] = f[i - 1] * i % MOD;
    inv[N] = pw(f[N], MOD - 2);
    for (int i = N; i > 0; i--) inv[i - 1] = inv[i] * i % MOD;
    vector<array<int, 3>> pts(K);
    for (auto &p : pts) { scanf("%d %d", &p[0], &p[1]); p[2] = 0; }
    pts.push_back({H, W, 1});
    sort(pts.begin(), pts.end());
    int m = pts.size();
    vector<long long> g(m);
    for (int i = 0; i < m; i++) {
        long long v = C(pts[i][0] + pts[i][1] - 2, pts[i][0] - 1);
        for (int j = 0; j < i; j++) {
            if (pts[j][0] <= pts[i][0] && pts[j][1] <= pts[i][1]) {
                int dr = pts[i][0] - pts[j][0], dc = pts[i][1] - pts[j][1];
                v = (v - g[j] * C(dr + dc, dr)) % MOD;
            }
        }
        g[i] = (v % MOD + MOD) % MOD;
    }
    for (int i = 0; i < m; i++)
        if (pts[i][2] == 1) printf("%lld\\n", g[i]);
}`,
  hidden: () => {
    const r = rng(7020);
    const blocks = (H: number, W: number, K: number) => {
      const s = new Set<string>();
      while (s.size < K) s.add(`${r.int(1, H)} ${r.int(1, W)}`);
      return [...s];
    };
    const mk = (H: number, W: number, b: string[]) => `${H} ${W} ${b.length}\n${b.join("\n")}${b.length ? "\n" : ""}`;
    const diag = Array.from({ length: 1000 }, (_, i) => `${i + 1} ${1000 - i}`);
    return [
      mk(1, 1, []),
      mk(1, 1, ["1 1"]),
      mk(1, 5, ["1 3"]),
      mk(3, 3, ["2 2"]),
      mk(3, 3, ["3 3"]),
      mk(3, 3, ["1 1", "2 2"]),
      mk(5, 5, blocks(5, 5, 6)),
      mk(1000000, 1000000, []),
      mk(1000000, 1000000, blocks(1000000, 1000000, 2000)),
      mk(1000, 1000, blocks(1000, 1000, 2000)),
      mk(2000, 2000, diag),
      mk(100000, 1000000, blocks(100000, 1000000, 1500)),
      mk(50, 50, blocks(50, 50, 700)),
    ];
  },
});

// ---------------------------------------------------------------- expert

const totientPrefix = P({
  slug: "totient-prefix-sum",
  title: "Totient Prefix Sum",
  difficulty: "expert",
  rating: 2400,
  tags: ["number-theory", "totient", "dirichlet", "sieve"],
  timeLimitMs: 2000,
  estimatedMinutes: 80,
  statement:
    "Euler's totient phi(m) counts the integers in [1, m] coprime to m. For each query n compute Phi(n) = phi(1) + phi(2) + ... + phi(n) modulo 1000000007.",
  inputFormat: "The first line contains Q. Each of the next Q lines contains one integer n.",
  outputFormat: "Print Q lines with Phi(n) mod 1000000007.",
  constraints: "1 <= Q <= 4\n1 <= n <= 10^10",
  samples: [{ input: "3\n1\n10\n100\n", output: "1\n32\n3044\n" }],
  hints: [
    "A linear sieve handles n up to about 10^7 but not 10^10. Use an identity that expresses Phi(n) through Phi at smaller arguments.",
    "Since the sum of phi(d) over d | m equals m, summing over m <= n gives n(n+1)/2 = sum over k of Phi(floor(n/k)), so Phi(n) = n(n+1)/2 - sum_{k=2}^{n} Phi(floor(n/k)).",
    "floor(n/k) has O(sqrt n) distinct values: group equal quotients. Sieve phi up to about n^(2/3) (5 * 10^6) and compute the larger Phi(floor(n/k)) values from k = n/M downward, storing them by k.",
  ],
  editorial: "From sum_{d|m} phi(d) = m we get sum_{k=1}^{n} Phi(floor(n/k)) = n(n+1)/2, hence Phi(n) = n(n+1)/2 - sum_{k=2}^n Phi(floor(n/k)). Grouping equal quotients gives O(sqrt n) terms per evaluation, and memoizing the O(sqrt n) distinct arguments gives O(n^(3/4)). Precomputing Phi up to M ~ n^(2/3) by a linear sieve and only recursing on arguments above M brings the cost to O(n^(2/3)). Store the large values indexed by k = floor(n / argument) and fill them from the largest k down to 1, because the sub-arguments of floor(n/k) are floor(n/(k*l)).\n\nComplexity: O(M + Q n^(2/3)) with M about 5 * 10^6.",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const ll MOD = 1000000007;
int main() {
    const int M = 5000000;
    vector<int> phi(M + 1, 0), pr;
    vector<unsigned> pre(M + 1, 0);
    phi[1] = 1;
    for (int i = 2; i <= M; i++) {
        if (!phi[i]) { phi[i] = i - 1; pr.push_back(i); }
        for (int p : pr) {
            ll x = (ll)i * p;
            if (x > M) break;
            if (i % p == 0) { phi[x] = phi[i] * p; break; }
            phi[x] = phi[i] * (p - 1);
        }
    }
    for (int i = 1; i <= M; i++) pre[i] = (pre[i - 1] + phi[i]) % MOD;
    int q;
    cin >> q;
    while (q--) {
        ll n;
        cin >> n;
        if (n <= M) { cout << pre[n] << "\\n"; continue; }
        ll kmax = n / (M + 1);
        vector<ll> big(kmax + 2, 0);
        for (ll k = kmax; k >= 1; k--) {
            ll v = n / k;
            ll s = (ll)((__int128)v * (v + 1) / 2 % MOD);
            for (ll l = 2; l <= v;) {
                ll qq = v / l;
                ll r = v / qq;
                ll val = qq <= M ? (ll)pre[qq] : big[k * l];
                s = (s - (r - l + 1) % MOD * val) % MOD;
                l = r + 1;
            }
            big[k] = (s % MOD + MOD) % MOD;
        }
        cout << big[1] << "\\n";
    }
}`,
  hidden: () => {
    const r = rng(7021);
    return [
      multi(["1", "2", "3", "4", "10", "100"]),
      multi(["1000", "123456", "5000000", "5000001"]),
      multi(["10000000000"]),
      multi(["9999999999", "10000000000", "10000000000", "9999999967"]),
      multi(["100000000", "1000000000", "7000000000", "1"]),
      multi(Array.from({ length: 4 }, () => `${r.int(5000001, 10000000000)}`)),
      multi(Array.from({ length: 4 }, () => `${r.int(1, 10000000)}`)),
      multi(["6000000", "20000000", "300000000", "10000000000"]),
      multi(["8589934592", "9876543210"]),
      multi(["5000000", "5000001", "5000002"]),
    ];
  },
});

const bracelets = P({
  slug: "bracelet-colorings-count",
  title: "Bracelet Colorings Count",
  difficulty: "expert",
  rating: 2300,
  tags: ["combinatorics", "burnside", "number-theory", "modular-arithmetic"],
  statement:
    "A bracelet has n beads arranged in a circle, each painted with one of k colors. Two colorings are considered the same if one can be turned into the other by rotating the bracelet or by flipping it over (reflection), or by a combination. Count the distinct bracelets modulo 1000000007. Equivalently, count the orbits of the dihedral group of size 2n acting on colorings of an n-cycle.",
  inputFormat: "The first line contains T. Each of the next T lines contains n and k.",
  outputFormat: "Print T lines with the number of distinct bracelets mod 1000000007.",
  constraints: "1 <= T <= 20\n1 <= n <= 10^9\n1 <= k <= 10^9",
  samples: [{ input: "3\n1 5\n3 2\n4 2\n", output: "5\n4\n6\n" }],
  hints: [
    "Counting orbits of a group is what Burnside's lemma is for: the number of orbits is the average, over all group elements, of the number of colorings each element leaves unchanged.",
    "A rotation by s positions has gcd(s, n) cycles, so it fixes k^gcd(s,n) colorings; group rotations by d = n / gcd, giving sum over d | n of phi(d) * k^(n/d). Reflections: for odd n, each of n reflections has (n+1)/2 cycles; for even n, n/2 of them have n/2 cycles and n/2 have n/2 + 1.",
    "Enumerate divisors of n from its factorization (trial division to 31623), generate phi(d) alongside, use fast exponentiation, and finally multiply by the modular inverse of 2n (n < p so it exists).",
  ],
  editorial: "By Burnside the answer is (R + F) / (2n) where R = sum_{d|n} phi(d) k^(n/d) covers the n rotations and F covers the n reflections: F = n * k^((n+1)/2) for odd n and F = (n/2) * k^(n/2) + (n/2) * k^(n/2 + 1) for even n. Factor n, enumerate the divisors with their totients, evaluate with modular exponentiation, and divide by 2n modulo p. Since n <= 10^9 < p, 2n is invertible.\n\nComplexity: O(T (sqrt n + d(n) log n)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const ll MOD = 1000000007;
ll pw(ll b, ll e) {
    ll r = 1;
    b %= MOD;
    while (e) {
        if (e & 1) r = r * b % MOD;
        b = b * b % MOD;
        e >>= 1;
    }
    return r;
}
int main() {
    int T;
    cin >> T;
    while (T--) {
        ll n, k;
        cin >> n >> k;
        vector<pair<ll, int>> fs;
        ll m = n;
        for (ll p = 2; p * p <= m; p++) {
            if (m % p == 0) {
                int c = 0;
                while (m % p == 0) { m /= p; c++; }
                fs.push_back({p, c});
            }
        }
        if (m > 1) fs.push_back({m, 1});
        vector<pair<ll, ll>> divs = {{1, 1}};
        for (auto &f : fs) {
            vector<pair<ll, ll>> nd;
            for (auto &d : divs) {
                ll pp = 1;
                for (int e = 0; e <= f.second; e++) {
                    ll ph = e == 0 ? 1 : pp / f.first * (f.first - 1);
                    nd.push_back({d.first * pp, d.second * ph});
                    pp *= f.first;
                }
            }
            divs = nd;
        }
        ll tot = 0;
        for (auto &d : divs) tot = (tot + d.second % MOD * pw(k, n / d.first)) % MOD;
        if (n % 2) tot = (tot + n % MOD * pw(k, (n + 1) / 2)) % MOD;
        else {
            ll h = (n / 2) % MOD;
            tot = (tot + h * pw(k, n / 2) + h * pw(k, n / 2 + 1)) % MOD;
        }
        cout << tot * pw(2 * n % MOD, MOD - 2) % MOD << "\\n";
    }
}`,
  hidden: () => {
    const r = rng(7022);
    const rows = (xs: number[][]) => multi(xs.map((x) => `${x[0]} ${x[1]}`));
    return [
      rows([[1, 1], [1, 2], [2, 2], [2, 3], [3, 2], [4, 2], [5, 3], [6, 2], [6, 3], [8, 2]]),
      rows([[1000000000, 1000000000], [999999999, 999999999], [1000000000, 1], [1000000000, 2]]),
      rows([[735134400, 7], [536870912, 3], [999999937, 1000000000], [999999999, 2]]),
      rows(Array.from({ length: 20 }, () => [r.int(1, 1000000000), r.int(1, 1000000000)])),
      rows(Array.from({ length: 20 }, () => [r.int(1, 100), r.int(1, 10)])),
      rows(Array.from({ length: 20 }, () => [r.int(1, 1000000), r.int(1, 1000000000)])),
      rows([[1000000, 26], [720720, 5], [3, 1], [4, 1], [100, 1]]),
      rows(Array.from({ length: 20 }, () => [2 * r.int(1, 500000000), r.int(1, 1000000000)])),
      rows(Array.from({ length: 20 }, () => [2 * r.int(1, 500000000) - 1, r.int(1, 1000000000)])),
      rows([[1000000007 - 8, 1000000000], [997920000 , 999999999], [900900900, 13]]),
    ];
  },
});

const raw: ProblemSeed[] = [
  threeStep,
  pascalEntry,
  neighborFree,
  gridRocks,
  coinCombos,
  totientBig,
  backpack,
  sharedSubseq,
  weightedEdit,
  subsetsTarget,
  bitonic,
  binomQueries,
  bracketCompletions,
  divisorSum,
  rangeRatio,
  partitions,
  farTerm,
  assignmentCensus,
  lanterns,
  countLis,
  gcdSum,
  latticeBlocks,
  totientPrefix,
  bracelets,
];

export const problems: ProblemSeed[] = raw.map((p) => fitBudget(p));
