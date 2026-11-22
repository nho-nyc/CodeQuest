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
const nl = (xs: string[]) => `${xs.join("\n")}\n`;
const arr = (r: Rng, n: number, lo: number, hi: number) => Array.from({ length: n }, () => r.int(lo, hi));
/** Half-open or closed intervals [s, e] with s < e inside [0, maxC]. */
const ivs = (r: Rng, n: number, maxC: number, maxLen: number) =>
  Array.from({ length: n }, () => {
    const s = r.int(0, maxC - 1);
    return [s, Math.min(maxC, s + r.int(1, maxLen))];
  });
const rows = (ps: number[][]) => ps.map((p) => p.join(" "));
const distinct = (r: Rng, n: number, lo: number, hi: number) => {
  const s = new Set<number>();
  while (s.size < n) s.add(r.int(lo, hi));
  return r.shuffle([...s]);
};

// ---------------------------------------------------------------- newbie

const digitSumSort = P({
  slug: "sort-by-digit-sum",
  title: "Sort by Digit Sum",
  difficulty: "newbie",
  rating: 800,
  tags: ["sorting", "implementation"],
  statement:
    "You are given n positive integers. Sort them so that numbers with a smaller digit sum come first. Numbers with the same digit sum are ordered by value, smaller first. Print the sorted sequence.",
  inputFormat: "The first line contains n. The second line contains n integers a_1 ... a_n.",
  outputFormat: "Print the n numbers in the required order, separated by spaces, on one line.",
  constraints: "1 <= n <= 50000\n1 <= a_i <= 10^9",
  samples: [{ input: "5\n21 12 3 100 30\n", output: "100 3 12 21 30\n", explanation: "Digit sums: 21 -> 3, 12 -> 3, 3 -> 3, 100 -> 1, 30 -> 3. Number 100 comes first, then the sum-3 numbers by value." }],
  hints: [
    "Each number gets a sorting key made of two parts. Which part is compared first?",
    "Use a custom comparator: compare digit sums first and break ties by the number itself.",
    "Write a small function that computes the digit sum with % 10 and / 10, then pass a lambda to std::sort.",
  ],
  editorial:
    "Define key(x) = (digitSum(x), x) and sort by this pair lexicographically. Computing the digit sum takes O(10) operations, and the comparator is a strict weak ordering because ties on the pair mean equal values.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int ds(long long x) { int s = 0; while (x) { s += x % 10; x /= 10; } return s; }
int main() {
    int n;
    scanf("%d", &n);
    vector<long long> a(n);
    for (auto &x : a) scanf("%lld", &x);
    sort(a.begin(), a.end(), [](long long x, long long y) {
        int p = ds(x), q = ds(y);
        return p != q ? p < q : x < y;
    });
    for (int i = 0; i < n; i++) printf("%lld%c", a[i], i + 1 < n ? ' ' : '\\n');
}`,
  hidden: () => {
    const r = rng(4101);
    const f = (a: number[]) => `${a.length}\n${a.join(" ")}\n`;
    return [
      f([7]),
      f([1, 10, 100, 1000, 10000]),
      f([54, 45, 36, 27, 18, 9]),
      f([5, 5, 5, 5]),
      f([1000000000, 999999999, 1]),
      f(arr(r, 8, 1, 100)),
      f(arr(r, 300, 1, 1e9)),
      f(arr(r, 5000, 1, 99999)),
      f(arr(r, 50000, 1, 1e9)),
      f(arr(r, 50000, 1, 1000)),
      f(Array.from({ length: 20000 }, (_, i) => 100000 - i)),
    ];
  },
});

const mergeSortedLists = P({
  slug: "merge-two-sorted-lists",
  title: "Merge Two Sorted Lists",
  difficulty: "newbie",
  rating: 800,
  tags: ["sorting", "two pointers"],
  statement:
    "You are given two lists of integers, each already sorted in non-decreasing order. Merge them into one list that is sorted in non-decreasing order and contains all n + m numbers (duplicates are kept).",
  inputFormat: "The first line contains n and m. The second line contains the n numbers of the first list. The third line contains the m numbers of the second list.",
  outputFormat: "Print the merged list on one line, separated by spaces.",
  constraints: "1 <= n, m <= 30000\n-10^6 <= value <= 10^6\nBoth lists are sorted in non-decreasing order.",
  samples: [{ input: "3 4\n1 4 9\n2 4 5 10\n", output: "1 2 4 4 5 9 10\n" }],
  hints: [
    "Both lists are already sorted, so the smallest remaining element is always at the front of one of them.",
    "Keep one pointer per list and repeatedly take the smaller front element (the classic merge step of merge sort).",
    "When one list runs out, copy the rest of the other. Use a while loop with i < n or j < m conditions.",
  ],
  editorial:
    "Two pointers i and j. At each step append the smaller of a[i] and b[j] and advance that pointer; when a list is exhausted append the remainder of the other. Sorting the concatenation would also pass, but the linear merge is the intended solution.\n\nComplexity: O(n + m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<int> a(n), b(m), c(n + m);
    for (auto &x : a) scanf("%d", &x);
    for (auto &x : b) scanf("%d", &x);
    merge(a.begin(), a.end(), b.begin(), b.end(), c.begin());
    for (int i = 0; i < n + m; i++) printf("%d%c", c[i], i + 1 < n + m ? ' ' : '\\n');
}`,
  hidden: () => {
    const r = rng(4102);
    const f = (a: number[], b: number[]) => `${a.length} ${b.length}\n${a.join(" ")}\n${b.join(" ")}\n`;
    const s = (n: number, lo: number, hi: number) => arr(r, n, lo, hi).sort((x, y) => x - y);
    return [
      f([1], [1]),
      f([1, 2, 3], [4, 5, 6]),
      f([4, 5, 6], [1, 2, 3]),
      f([-1000000, 0, 1000000], [-1000000, 1000000]),
      f([5, 5, 5], [5, 5]),
      f(s(10, -20, 20), s(7, -20, 20)),
      f(s(1000, -1e6, 1e6), s(2000, -1e6, 1e6)),
      f(s(30000, -1e6, 1e6), s(30000, -1e6, 1e6)),
      f(s(30000, 0, 50), s(30000, 25, 75)),
      f(s(1, 0, 10), s(30000, -1e6, 1e6)),
    ];
  },
});

const medianRank = P({
  slug: "median-and-rank",
  title: "Median and Rank",
  difficulty: "newbie",
  rating: 800,
  tags: ["sorting", "implementation"],
  statement:
    "Given n integers, sort them in non-decreasing order and take the element at 0-indexed position (n - 1) / 2 (integer division). Call it the lower median. Print the lower median and the number of elements in the whole list that are strictly smaller than it.",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print two integers separated by a space: the lower median and the count of elements strictly smaller than it.",
  constraints: "1 <= n <= 50000\n-10^9 <= a_i <= 10^9",
  samples: [
    { input: "5\n3 1 4 1 5\n", output: "3 2\n", explanation: "Sorted: 1 1 3 4 5. The middle element is 3; two elements are smaller." },
    { input: "4\n10 20 30 40\n", output: "20 1\n", explanation: "For even n the lower of the two middle elements is used." },
    { input: "5\n7 7 7 7 7\n", output: "7 0\n" },
  ],
  hints: [
    "The median is defined through the sorted order, so start by sorting.",
    "After sorting, read the element at index (n - 1) / 2. Counting smaller elements must be strict, because of duplicates.",
    "Count elements with value < median in a loop (or lower_bound on the sorted array).",
  ],
  editorial:
    "Sort the array and read m = a[(n-1)/2]. The number of strictly smaller elements is the index of the first occurrence of m, which can be found by a linear scan or lower_bound. With duplicates this can be smaller than (n-1)/2.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<long long> a(n);
    for (auto &x : a) scanf("%lld", &x);
    sort(a.begin(), a.end());
    long long m = a[(n - 1) / 2];
    long long cnt = lower_bound(a.begin(), a.end(), m) - a.begin();
    printf("%lld %lld\\n", m, cnt);
}`,
  hidden: () => {
    const r = rng(4103);
    const f = (a: number[]) => `${a.length}\n${a.join(" ")}\n`;
    return [
      f([5]),
      f([2, 1]),
      f([-5, -5, 0, 5, 5, 5]),
      f([1, 1, 1, 2]),
      f([9, 9, 1, 1, 9]),
      f(arr(r, 11, -10, 10)),
      f(arr(r, 100, -1e9, 1e9)),
      f(arr(r, 1001, -3, 3)),
      f(arr(r, 50000, -1e9, 1e9)),
      f(arr(r, 50000, 0, 5)),
    ];
  },
});

// ---------------------------------------------------------------- easy

const mergeIntervals = P({
  slug: "merge-overlapping-intervals",
  title: "Merge Overlapping Intervals",
  difficulty: "easy",
  rating: 1000,
  tags: ["sorting", "intervals"],
  statement:
    "You are given n closed intervals [l_i, r_i] on the number line. Two intervals are merged into one if they share at least one point (so [1, 3] and [3, 5] merge into [1, 5], but [1, 3] and [4, 5] stay separate). Repeat until no more merges are possible and print the resulting disjoint intervals in increasing order.",
  inputFormat: "The first line contains n. Each of the next n lines contains l_i and r_i.",
  outputFormat: "Print m, the number of resulting intervals, then m lines with the intervals as 'l r' in increasing order.",
  constraints: "1 <= n <= 30000\n0 <= l_i <= r_i <= 10^9",
  samples: [{ input: "4\n1 3\n2 6\n8 10\n10 12\n", output: "2\n1 6\n8 12\n", explanation: "[1,3] and [2,6] overlap; [8,10] and [10,12] share the point 10." }],
  hints: [
    "After sorting by left endpoint, intervals that merge become neighbours.",
    "Sweep through the sorted list keeping the current merged interval [curL, curR]. The next interval merges if its l <= curR.",
    "On merge update curR = max(curR, r). Otherwise output the current interval and start a new one.",
  ],
  editorial:
    "Sort by left endpoint. Maintain the current merged block; an interval with l <= curR touches or overlaps the block, so extend curR to max(curR, r); otherwise the block is final. Because of sorting no later interval can reach back to an earlier final block.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<pair<long long, long long>> v(n);
    for (auto &p : v) scanf("%lld %lld", &p.first, &p.second);
    sort(v.begin(), v.end());
    vector<pair<long long, long long>> out;
    for (auto &p : v) {
        if (!out.empty() && p.first <= out.back().second) out.back().second = max(out.back().second, p.second);
        else out.push_back(p);
    }
    printf("%d\\n", (int)out.size());
    for (auto &p : out) printf("%lld %lld\\n", p.first, p.second);
}`,
  hidden: () => {
    const r = rng(4104);
    const f = (ps: number[][]) => `${ps.length}\n${nl(rows(ps))}`;
    const pts = (n: number, maxC: number, maxLen: number) =>
      Array.from({ length: n }, () => {
        const l = r.int(0, maxC);
        return [l, Math.min(maxC, l + r.int(0, maxLen))];
      });
    return [
      f([[5, 5]]),
      f([[1, 3], [3, 5]]),
      f([[1, 3], [4, 5]]),
      f([[0, 1000000000], [5, 6], [7, 8]]),
      f([[10, 20], [1, 5], [6, 9], [2, 3]]),
      f(pts(10, 30, 4)),
      f(pts(500, 2000, 6)),
      f(pts(5000, 1e9, 1e5)),
      f(pts(28000, 1e9, 20000)),
      f(pts(30000, 100000, 3)),
    ];
  },
});

const cheapestItems = P({
  slug: "cheapest-items-budget",
  title: "Most Items for the Budget",
  difficulty: "easy",
  rating: 900,
  tags: ["greedy", "sorting"],
  statement:
    "A shop sells n different items, item i costs c_i coins. You have a budget of B coins and can buy each item at most once. First, you want to buy as many items as possible. Among all ways to buy that maximum number of items, you want to spend as little as possible. Print the maximum number of items and the minimal total cost for that number.",
  inputFormat: "The first line contains n and B. The second line contains n integers c_1 ... c_n.",
  outputFormat: "Print two integers: the maximum number of items and the minimum total price paid for them. If nothing can be bought, print '0 0'.",
  constraints: "1 <= n <= 50000\n1 <= c_i <= 10^9\n1 <= B <= 10^15",
  samples: [
    { input: "5 10\n4 1 7 3 2\n", output: "4 10\n", explanation: "Items 1, 2, 3, 4 cost exactly 10." },
    { input: "3 2\n5 6 7\n", output: "0 0\n" },
  ],
  hints: [
    "To buy the largest possible number of items, which items should you prefer?",
    "Sort prices ascending and take items greedily from the cheapest while the running sum stays within B.",
    "The prefix of the sorted array is simultaneously the most items and the cheapest such selection. Use 64-bit sums.",
  ],
  editorial:
    "If k items are affordable, then the k cheapest are affordable too, so the best strategy is to buy the cheapest items in increasing order until the next one no longer fits. The chosen prefix also has the minimum cost among all selections of that size. Sums reach 5*10^13, so use long long.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    long long B;
    scanf("%d %lld", &n, &B);
    vector<long long> c(n);
    for (auto &x : c) scanf("%lld", &x);
    sort(c.begin(), c.end());
    long long s = 0;
    int k = 0;
    while (k < n && s + c[k] <= B) s += c[k++];
    printf("%d %lld\\n", k, s);
}`,
  hidden: () => {
    const r = rng(4105);
    const f = (b: number, a: number[]) => `${a.length} ${b}\n${a.join(" ")}\n`;
    return [
      f(1, [1]),
      f(1, [2]),
      f(10, [4, 1, 7, 3, 2]),
      f(100, [30, 30, 30, 30]),
      f(5, [1, 1, 1, 1, 1, 1, 1]),
      f(1e15, arr(r, 20, 1, 1e9)),
      f(500, arr(r, 100, 1, 100)),
      f(1e9, arr(r, 5000, 1, 1e6)),
      f(2e13, arr(r, 50000, 1, 1e9)),
      f(1e15, arr(r, 50000, 1, 1e9)),
      f(300000, arr(r, 50000, 1, 1000)),
    ];
  },
});

const integerRoot = P({
  slug: "integer-root-floor",
  title: "Floor of the k-th Root",
  difficulty: "easy",
  rating: 1100,
  tags: ["binary search", "math"],
  statement:
    "For each query you are given integers n and k. Find the largest integer x such that x^k <= n. Floating point functions are not reliable for numbers this large, so compute the answer exactly.",
  inputFormat: "The first line contains T, the number of queries. Each of the next T lines contains n and k.",
  outputFormat: "For each query print x on its own line.",
  constraints: "1 <= T <= 20000\n1 <= n <= 10^18\n1 <= k <= 60",
  samples: [{ input: "3\n27 3\n1000 2\n1 5\n", output: "3\n31\n1\n" }],
  hints: [
    "The function x -> x^k is increasing, so the set of valid x is a prefix of 1, 2, 3, ...",
    "Binary search on x in [1, n]. For the check, compute x^k but stop as soon as the product exceeds n.",
    "Use __int128 (or divide n by x each step) to avoid overflow while testing x^k <= n.",
  ],
  editorial:
    "Binary search on the answer: predicate 'x^k <= n' is monotone. Evaluating it by repeated multiplication with early exit as soon as the product exceeds n keeps the product within 10^18 * 10^18 < 2^127 when using __int128. Each query needs about 60 iterations of at most 60 multiplications.\n\nComplexity: O(T * log n * k).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
bool ok(ll x, int k, ll n) {
    __int128 p = 1;
    for (int i = 0; i < k; i++) {
        p *= x;
        if (p > n) return false;
    }
    return true;
}
int main() {
    int T;
    scanf("%d", &T);
    while (T--) {
        ll n;
        int k;
        scanf("%lld %d", &n, &k);
        ll lo = 1, hi = n;
        while (lo < hi) {
            ll mid = lo + (hi - lo + 1) / 2;
            if (ok(mid, k, n)) lo = mid; else hi = mid - 1;
        }
        printf("%lld\\n", lo);
    }
}`,
  hidden: () => {
    const r = rng(4106);
    const f = (qs: string[]) => `${qs.length}\n${nl(qs)}`;
    const rnd = (cnt: number, maxN: bigint, maxK: number) => Array.from({ length: cnt }, () => `${r.big(1n, maxN)} ${r.int(1, maxK)}`);
    const exact = Array.from({ length: 59 }, (_, i) => `${2n ** BigInt(i + 1)} ${i + 1}`);
    const edge = ["1000000000000000000 1", "1000000000000000000 2", "1000000000000000000 3", "999999999999999999 2", "1000000000000000000 18", "1000000000000000000 60", "1 1", "1 60", "2 60", "576460752303423488 59"];
    return [
      f(["27 3", "1000 2", "1 5"]),
      f(edge),
      f(exact),
      f(rnd(300, 1000n, 6)),
      f(rnd(5000, 10n ** 18n, 60)),
      f(rnd(20000, 10n ** 18n, 2)),
      f(rnd(20000, 10n ** 18n, 5)),
      f(Array.from({ length: 20000 }, () => `${r.big(10n ** 17n, 10n ** 18n)} 3`)),
      f(Array.from({ length: 20000 }, () => `${r.big(1n, 10n ** 18n)} ${r.int(1, 60)}`)),
    ];
  },
});

const boatsToCross = P({
  slug: "boats-to-cross",
  title: "Boats to Cross",
  difficulty: "easy",
  rating: 1200,
  tags: ["greedy", "two pointers", "sorting"],
  statement:
    "n people want to cross a river. The i-th person weighs w_i. Every boat holds at most two people and its total load must not exceed C. Every person weighs at most C, so everybody can cross. Find the minimum number of boats needed to carry everybody once.",
  inputFormat: "The first line contains n and C. The second line contains n integers w_1 ... w_n.",
  outputFormat: "Print the minimum number of boats.",
  constraints: "1 <= n <= 50000\n1 <= w_i <= C <= 10^9",
  samples: [{ input: "5 100\n50 50 90 10 40\n", output: "3\n", explanation: "Boats: {10, 90}, {40, 50}, {50}." }],
  hints: [
    "Think about the heaviest person. Whom could they possibly share a boat with?",
    "If the heaviest can pair with anyone, pairing them with the lightest person is always safe (exchange argument). Otherwise they travel alone.",
    "Sort, keep pointers lo and hi. Always use boat for hi; if w[lo] + w[hi] <= C also move lo.",
  ],
  editorial:
    "Sort weights. Consider the heaviest remaining person. If the lightest remaining person fits with them, pair them; if even the lightest does not fit, nobody does and the heavy person goes alone. Pairing with the lightest is optimal because any other partner of the heavy person could be swapped with the lightest without breaking feasibility. Two pointers implement this.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    long long C;
    scanf("%d %lld", &n, &C);
    vector<long long> w(n);
    for (auto &x : w) scanf("%lld", &x);
    sort(w.begin(), w.end());
    int lo = 0, hi = n - 1, boats = 0;
    while (lo <= hi) {
        if (lo < hi && w[lo] + w[hi] <= C) lo++;
        hi--;
        boats++;
    }
    printf("%d\\n", boats);
}`,
  hidden: () => {
    const r = rng(4107);
    const f = (c: number, a: number[]) => `${a.length} ${c}\n${a.join(" ")}\n`;
    return [
      f(5, [5]),
      f(10, [5, 5]),
      f(10, [6, 5]),
      f(100, [50, 50, 90, 10, 40]),
      f(10, [1, 1, 1, 1, 1, 1, 1]),
      f(10, [10, 10, 10, 10]),
      f(100, arr(r, 15, 1, 100)),
      f(1000, arr(r, 1000, 1, 1000)),
      f(1e9, arr(r, 50000, 1, 1e9)),
      f(1e9, arr(r, 50000, 1, 5e8)),
      f(1e6, arr(r, 50000, 1, 1e6)),
    ];
  },
});

const rangeCountQueries = P({
  slug: "count-values-in-range",
  title: "Count Values in Range",
  difficulty: "easy",
  rating: 1100,
  tags: ["binary search", "sorting"],
  statement:
    "You are given an array of n integers and q queries. Each query gives two integers l and r (l <= r). Report how many array elements x satisfy l <= x <= r. The array does not change between queries.",
  inputFormat: "The first line contains n and q. The second line contains n integers. Each of the next q lines contains l and r.",
  outputFormat: "For every query print the answer on its own line.",
  constraints: "1 <= n <= 35000\n1 <= q <= 20000\n-10^6 <= a_i, l, r <= 10^6",
  samples: [{ input: "6 3\n5 1 9 3 3 7\n3 5\n1 1\n10 20\n", output: "3\n1\n0\n" }],
  hints: [
    "The order of elements is irrelevant for a count, so you may reorder the array once.",
    "Sort the array. The answer is (number of elements <= r) minus (number of elements < l), found by binary search.",
    "Use upper_bound(r) - lower_bound(l) on the sorted array.",
  ],
  editorial:
    "Sort once. For a query, the elements in [l, r] form a contiguous block of the sorted array; its bounds are lower_bound(l) and upper_bound(r), so the answer is their difference. Scanning the array per query would take O(nq).\n\nComplexity: O(n log n + q log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, q;
    scanf("%d %d", &n, &q);
    vector<int> a(n);
    for (auto &x : a) scanf("%d", &x);
    sort(a.begin(), a.end());
    while (q--) {
        int l, r;
        scanf("%d %d", &l, &r);
        printf("%d\\n", (int)(upper_bound(a.begin(), a.end(), r) - lower_bound(a.begin(), a.end(), l)));
    }
}`,
  hidden: () => {
    const r = rng(4108);
    const f = (a: number[], qs: number[][]) => `${a.length} ${qs.length}\n${a.join(" ")}\n${nl(rows(qs))}`;
    const qs = (cnt: number, lo: number, hi: number, wide: number) =>
      Array.from({ length: cnt }, () => {
        const l = r.int(lo, hi);
        return [l, Math.min(hi, l + r.int(0, wide))];
      });
    return [
      f([5], [[5, 5]]),
      f([5], [[6, 9], [1, 4], [-3, 5]]),
      f([-1000000, 1000000, 0], [[-1000000, 1000000], [0, 0], [1, 999999]]),
      f([2, 2, 2, 2], [[2, 2], [1, 2], [3, 4], [2, 3]]),
      f(arr(r, 30, -10, 10), qs(30, -12, 12, 6)),
      f(arr(r, 1000, -1000, 1000), qs(500, -1000, 1000, 300)),
      f(arr(r, 35000, -1e6, 1e6), qs(20000, -1e6, 1e6, 1e6)),
      f(arr(r, 35000, -1e6, 1e6), qs(20000, -1e6, 1e6, 1000)),
      f(arr(r, 35000, -20, 20), qs(20000, -25, 25, 10)),
    ];
  },
});

const coinChain = P({
  slug: "fewest-notes-chain",
  title: "Fewest Notes with Divisible Values",
  difficulty: "easy",
  rating: 1200,
  tags: ["greedy", "math"],
  statement:
    "A currency has k denominations d_1 < d_2 < ... < d_k with d_1 = 1, and every denomination divides the next one (d_i divides d_{i+1}). You have an unlimited supply of each. Pay exactly X using the minimum possible number of notes and print that number.",
  inputFormat: "The first line contains k and X. The second line contains d_1 ... d_k.",
  outputFormat: "Print the minimum number of notes.",
  constraints: "1 <= k <= 60\n1 <= X <= 10^18\nd_1 = 1, d_i < d_{i+1}, d_i divides d_{i+1}, d_k <= 10^18",
  samples: [
    { input: "4 289\n1 5 10 50\n", output: "13\n", explanation: "5 x 50 + 3 x 10 + 1 x 5 + 4 x 1 = 289 with 13 notes." },
    { input: "1 7\n1\n", output: "7\n" },
  ],
  hints: [
    "For arbitrary denominations a greedy strategy can fail, but here the divisibility chain is a strong structure. Try the largest note first.",
    "Greedy is correct: if you use d_i-valued notes in a number that is >= d_{i+1}/d_i, they can be replaced by one bigger note and fewer notes in total.",
    "Go from the largest denomination to the smallest, add X / d to the count, and set X to X % d.",
  ],
  editorial:
    "Take the largest denomination d_k as often as possible. In an optimal solution the notes of values below d_k add up to less than d_k: otherwise a subset of them sums to exactly d_k (because each smaller denomination divides the next, subset sums of the smaller notes reach every multiple of the biggest smaller denomination, and by induction one can build exactly d_k), and replacing that subset with one big note lowers the count. So the greedy choice floor(X / d_k) is forced; recurse on the remainder. The count is at most 10^18 and fits in 64 bits.\n\nComplexity: O(k).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int k;
    long long X;
    scanf("%d %lld", &k, &X);
    vector<long long> d(k);
    for (auto &x : d) scanf("%lld", &x);
    long long cnt = 0;
    for (int i = k - 1; i >= 0; i--) {
        cnt += X / d[i];
        X %= d[i];
    }
    printf("%lld\\n", cnt);
}`,
  hidden: () => {
    const r = rng(4109);
    const f = (x: bigint, d: bigint[]) => `${d.length} ${x}\n${d.join(" ")}\n`;
    const chain = (maxK: number, maxF: number) => {
      const d = [1n];
      while (d.length < maxK) {
        const nx = d[d.length - 1]! * BigInt(r.int(2, maxF));
        if (nx > 10n ** 18n) break;
        d.push(nx);
      }
      return d;
    };
    const pow2 = Array.from({ length: 60 }, (_, i) => 2n ** BigInt(i));
    const c1 = chain(60, 3);
    const c2 = chain(60, 10);
    const c3 = chain(60, 1000);
    return [
      f(1n, [1n]),
      f(10n ** 18n, [1n]),
      f(10n ** 18n, pow2),
      f(10n ** 18n - 1n, pow2),
      f(289n, [1n, 5n, 10n, 50n]),
      f(r.big(1n, 10n ** 18n), c1),
      f(r.big(1n, 10n ** 18n), c2),
      f(r.big(1n, 10n ** 18n), c3),
      f(r.big(1n, 10n ** 6n), c2),
      f(10n ** 18n, [1n, 10n ** 9n, 10n ** 18n]),
    ];
  },
});

// ---------------------------------------------------------------- medium

const largestConcat = P({
  slug: "largest-concatenation",
  title: "Largest Concatenation",
  difficulty: "medium",
  rating: 1400,
  tags: ["sorting", "greedy", "strings"],
  statement:
    "You are given n non-negative integers written in decimal without leading zeros (the number zero is written as 0). Arrange them in some order and concatenate their decimal representations into one long number. Print the largest number that can be obtained. If the result consists only of zeros, print a single 0.",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print the largest concatenation as a string of digits.",
  constraints: "1 <= n <= 50000\n0 <= a_i <= 10^9",
  samples: [
    { input: "5\n3 30 34 5 9\n", output: "9534330\n" },
    { input: "3\n0 0 0\n", output: "0\n" },
  ],
  hints: [
    "Comparing the numbers by value (or by length) does not work: 30 should come after 3 although 30 is larger.",
    "Two numbers a and b should be ordered by comparing the strings a+b and b+a. This relation is transitive, so it works as a sort key.",
    "Read numbers as strings, sort with the comparator (a + b > b + a), concatenate. If the first string is '0', print '0'.",
  ],
  editorial:
    "Exchange argument: for adjacent a, b in an arrangement, putting a first gives the digit string a+b and b first gives b+a, both of the same length, so the larger is simply the lexicographically larger. Hence an optimal order has a+b >= b+a for all neighbours. The relation 'a+b > b+a' is a strict weak ordering (it corresponds to comparing the infinite repetitions a a a... and b b b...), so sorting with it yields the global optimum. If the largest element is 0, all are zeros.\n\nComplexity: O(n log n * L) with L <= 10.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<string> s(n);
    char buf[32];
    for (auto &x : s) { scanf("%s", buf); x = buf; }
    sort(s.begin(), s.end(), [](const string &a, const string &b) { return a + b > b + a; });
    if (s[0] == "0") { puts("0"); return 0; }
    string res;
    for (auto &x : s) res += x;
    puts(res.c_str());
}`,
  hidden: () => {
    const r = rng(4110);
    const f = (a: (number | string)[]) => `${a.length}\n${a.join(" ")}\n`;
    const digs = (cnt: number, alphabet: string, maxLen: number) =>
      Array.from({ length: cnt }, () => {
        const len = r.int(1, maxLen);
        let s = String(r.pick(alphabet.replace("0", "").split("")));
        for (let i = 1; i < len; i++) s += r.pick(alphabet.split(""));
        return s;
      });
    return [
      f([0]),
      f([10, 2]),
      f([121, 12]),
      f([0, 0, 0, 0]),
      f([0, 5, 0]),
      f([1000000000, 999999999, 100000000]),
      f(digs(10, "12", 4)),
      f(digs(200, "123", 9)),
      f(digs(5000, "1209", 9)),
      f(arr(r, 50000, 0, 1e9)),
      f(digs(50000, "12", 5)),
      f(arr(r, 50000, 0, 1)),
    ];
  },
});

const activitySelection = P({
  slug: "most-bookings",
  title: "Most Non-Overlapping Bookings",
  difficulty: "medium",
  rating: 1300,
  tags: ["greedy", "sorting", "intervals"],
  statement:
    "A hall receives n booking requests. Request i occupies the hall during the half-open time span [s_i, e_i), so one booking may start at the very moment another one ends. Choose as many requests as possible such that no two chosen requests overlap and print how many you can accept.",
  inputFormat: "The first line contains n. Each of the next n lines contains s_i and e_i.",
  outputFormat: "Print the maximum number of pairwise non-overlapping requests.",
  constraints: "1 <= n <= 30000\n0 <= s_i < e_i <= 10^9",
  samples: [{ input: "5\n1 3\n2 4\n3 6\n5 8\n7 9\n", output: "3\n", explanation: "Choose [1,3), [3,6), [7,9)." }],
  hints: [
    "Think about which request you should accept first so that the most time is left for the rest.",
    "Among the remaining compatible requests, always pick the one that ends earliest. Prove it with an exchange argument.",
    "Sort by end time. Keep lastEnd; accept an interval if its start >= lastEnd and then set lastEnd to its end.",
  ],
  editorial:
    "Greedy by earliest finishing time. Suppose an optimal solution does not contain the request with the globally smallest end e*. Replace its first request by that one; it ends no later, so it still does not overlap the rest. Hence some optimal solution contains it, and the argument repeats on the requests starting at or after e*.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<pair<long long, long long>> v(n);
    for (auto &p : v) scanf("%lld %lld", &p.second, &p.first);
    sort(v.begin(), v.end());
    long long last = -1;
    int cnt = 0;
    for (auto &p : v) {
        if (p.second >= last) { cnt++; last = p.first; }
    }
    printf("%d\\n", cnt);
}`,
  hidden: () => {
    const r = rng(4111);
    const f = (ps: number[][]) => `${ps.length}\n${nl(rows(ps))}`;
    return [
      f([[0, 1]]),
      f([[0, 5], [1, 4], [2, 3]]),
      f([[0, 1], [1, 2], [2, 3], [3, 4]]),
      f([[0, 1000000000], [0, 500000000], [500000000, 1000000000]]),
      f([[1, 3], [2, 4], [3, 6], [5, 8], [7, 9]]),
      f(ivs(r, 12, 30, 6)),
      f(ivs(r, 1000, 5000, 40)),
      f(ivs(r, 28000, 1e9, 100000)),
      f(ivs(r, 30000, 1e5, 50)),
      f(ivs(r, 30000, 1e6, 1e6)),
      f(Array.from({ length: 30000 }, (_, i) => [i, i + 1 + (i % 3)])),
    ];
  },
});

const shippingCapacity = P({
  slug: "minimum-shipping-capacity",
  title: "Minimum Shipping Capacity",
  difficulty: "medium",
  rating: 1500,
  tags: ["binary search", "binary search on answer", "greedy"],
  statement:
    "n packages must be shipped in the given order. Each day the ship carries a consecutive group of packages (possibly empty is not allowed to help: groups are taken from the front of the remaining line) whose total weight must not exceed the ship capacity S. All packages have to be shipped within at most D days. Find the smallest integer capacity S for which this is possible.",
  inputFormat: "The first line contains n and D. The second line contains the weights w_1 ... w_n in shipping order.",
  outputFormat: "Print the minimal capacity S.",
  constraints: "1 <= D <= n <= 50000\n1 <= w_i <= 10^9",
  samples: [{ input: "5 2\n7 2 5 10 8\n", output: "18\n", explanation: "Day 1: 7 2 5 (14), day 2: 10 8 (18)." }],
  hints: [
    "Capacity S works if the packages can be packed in at most D days; larger capacity never hurts. What does that say about the search?",
    "Binary search S between max(w) and sum(w). To test a given S, pack greedily: put as many packages as fit into the current day.",
    "The check is a single pass counting days; run it about 50 times for the binary search (use 64-bit integers).",
  ],
  editorial:
    "Feasibility is monotone in S. For a fixed S, filling each day greedily with as many consecutive packages as fit minimises the number of days (exchange argument). Search S in [max w, sum w] with the O(n) check.\n\nComplexity: O(n log(sum w)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n, d;
    scanf("%d %d", &n, &d);
    vector<ll> w(n);
    ll lo = 0, hi = 0;
    for (auto &x : w) { scanf("%lld", &x); lo = max(lo, x); hi += x; }
    auto days = [&](ll S) {
        int c = 1;
        ll cur = 0;
        for (ll x : w) {
            if (cur + x > S) { c++; cur = 0; }
            cur += x;
        }
        return c;
    };
    while (lo < hi) {
        ll mid = (lo + hi) / 2;
        if (days(mid) <= d) hi = mid; else lo = mid + 1;
    }
    printf("%lld\\n", lo);
}`,
  hidden: () => {
    const r = rng(4112);
    const f = (d: number, a: number[]) => `${a.length} ${d}\n${a.join(" ")}\n`;
    return [
      f(1, [5]),
      f(1, [1, 2, 3, 4]),
      f(4, [1, 2, 3, 4]),
      f(2, [7, 2, 5, 10, 8]),
      f(3, [1, 1, 1, 1000000000, 1, 1, 1]),
      f(5, arr(r, 12, 1, 20)),
      f(10, arr(r, 300, 1, 1000)),
      f(7, arr(r, 50000, 1, 1e9)),
      f(25000, arr(r, 50000, 1, 1e9)),
      f(300, arr(r, 50000, 1, 1000)),
      f(49999, arr(r, 50000, 1, 1e9)),
    ];
  },
});

const worstDelay = P({
  slug: "smallest-worst-delay",
  title: "Smallest Worst Delay",
  difficulty: "medium",
  rating: 1400,
  tags: ["greedy", "sorting", "scheduling"],
  statement:
    "One machine processes n jobs one after another without pauses, starting at time 0 (no preemption, any order you like). Job i takes p_i time units and has a due time d_i. If job i finishes at time C_i, its delay is max(0, C_i - d_i). Choose the order of jobs to minimise the largest delay over all jobs, and print that minimum.",
  inputFormat: "The first line contains n. Each of the next n lines contains p_i and d_i.",
  outputFormat: "Print the minimal possible value of the maximum delay.",
  constraints: "1 <= n <= 30000\n1 <= p_i, d_i <= 10^9",
  samples: [{ input: "3\n4 5\n3 6\n2 7\n", output: "2\n", explanation: "Order by due time: finishes 4, 7, 9 against due 5, 6, 7 gives delays 0, 1, 2." }],
  hints: [
    "If two adjacent jobs are in the wrong order with respect to their due dates, what happens to the delays when you swap them?",
    "Earliest due date first is optimal: an exchange argument shows swapping an inverted adjacent pair never increases the maximum delay.",
    "Sort by d, keep a running time t, and maintain max(0, t - d) after every job. Use 64-bit integers for t.",
  ],
  editorial:
    "Take an optimal order with two adjacent jobs a, b where d_a > d_b but a is first. After swapping, b finishes earlier than before and a finishes at the old finish time of b; the delay of a becomes max(0, T - d_a) <= max(0, T - d_b), which was the old delay of b. So the maximum cannot grow. Repeating the swap sorts by due date (EDD rule). Finish times reach 3*10^13.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n;
    scanf("%d", &n);
    vector<pair<ll, ll>> v(n);
    for (auto &x : v) scanf("%lld %lld", &x.second, &x.first);
    sort(v.begin(), v.end());
    ll t = 0, best = 0;
    for (auto &x : v) {
        t += x.second;
        best = max(best, t - x.first);
    }
    printf("%lld\\n", best);
}`,
  hidden: () => {
    const r = rng(4113);
    const f = (ps: number[][]) => `${ps.length}\n${nl(rows(ps))}`;
    const jobs = (n: number, maxP: number, dMul: number) => {
      const ps = arr(r, n, 1, maxP);
      const tot = ps.reduce((a, b) => a + b, 0);
      return ps.map((p) => [p, r.int(1, Math.max(1, Math.min(1e9, Math.floor(tot * dMul))))]);
    };
    return [
      f([[5, 100]]),
      f([[5, 3]]),
      f([[4, 5], [3, 6], [2, 7]]),
      f([[1000000000, 1], [1000000000, 1], [1000000000, 1]]),
      f([[2, 10], [2, 10], [2, 10]]),
      f(jobs(10, 10, 1)),
      f(jobs(200, 50, 0.5)),
      f(jobs(30000, 1e4, 0.5)),
      f(jobs(30000, 1e4, 3)),
      f(jobs(30000, 3e4, 0.9)),
      f(Array.from({ length: 30000 }, () => [r.int(1, 1e9), r.int(1, 1e9)])),
    ];
  },
});

const weightedFinish = P({
  slug: "weighted-finishing-times",
  title: "Weighted Finishing Times",
  difficulty: "medium",
  rating: 1500,
  tags: ["greedy", "sorting", "scheduling"],
  statement:
    "A single machine must process n jobs one after another without gaps, starting at time 0. Job i needs t_i time units and has an importance weight w_i. If job i finishes at time C_i, it contributes w_i * C_i to the cost. Choose the processing order that minimises the total cost sum(w_i * C_i) and print this minimum cost.",
  inputFormat: "The first line contains n. Each of the next n lines contains t_i and w_i.",
  outputFormat: "Print the minimum total cost.",
  constraints: "1 <= n <= 50000\n1 <= t_i, w_i <= 10^4",
  samples: [{ input: "3\n3 1\n2 2\n1 3\n", output: "15\n", explanation: "Best order: job 3, job 2, job 1 with finish times 1, 3, 6: 3*1 + 2*3 + 1*6 = 15." }],
  hints: [
    "Compare two adjacent jobs a and b in either order. How does the cost of just these two change, assuming the rest stays the same?",
    "Job a should precede b exactly when t_a / w_a < t_b / w_b (Smith's rule). Avoid division by comparing t_a * w_b < t_b * w_a.",
    "Sort with that cross-multiplied comparator, then accumulate time and cost in 64-bit integers.",
  ],
  editorial:
    "Swap argument: if a precedes b starting at time T the two jobs cost w_a(T+t_a) + w_b(T+t_a+t_b); in the opposite order w_b(T+t_b) + w_a(T+t_a+t_b). The first is smaller iff w_b*t_a < w_a*t_b, i.e. t_a/w_a < t_b/w_b. Sorting by this ratio therefore removes every improving adjacent swap and is optimal. The total reaches about 2.5*10^17, which fits in a signed 64-bit integer.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n;
    scanf("%d", &n);
    vector<pair<ll, ll>> v(n);
    for (auto &x : v) scanf("%lld %lld", &x.first, &x.second);
    sort(v.begin(), v.end(), [](const pair<ll, ll> &a, const pair<ll, ll> &b) { return a.first * b.second < b.first * a.second; });
    ll t = 0, cost = 0;
    for (auto &x : v) {
        t += x.first;
        cost += x.second * t;
    }
    printf("%lld\\n", cost);
}`,
  hidden: () => {
    const r = rng(4114);
    const f = (ps: number[][]) => `${ps.length}\n${nl(rows(ps))}`;
    const jobs = (n: number, lo: number, hi: number) => Array.from({ length: n }, () => [r.int(lo, hi), r.int(lo, hi)]);
    return [
      f([[7, 3]]),
      f([[3, 1], [2, 2], [1, 3]]),
      f([[1, 1], [1, 1], [1, 1]]),
      f([[2, 4], [1, 2], [3, 6]]),
      f([[10000, 1], [1, 10000]]),
      f(jobs(10, 1, 10)),
      f(jobs(500, 1, 100)),
      f(jobs(50000, 1, 10000)),
      f(jobs(50000, 1, 3)),
      f(Array.from({ length: 50000 }, () => [10000, 10000])),
      f(jobs(50000, 5000, 10000)),
    ];
  },
});

const matchWithin = P({
  slug: "pair-up-within-tolerance",
  title: "Pair Up Within Tolerance",
  difficulty: "medium",
  rating: 1400,
  tags: ["greedy", "two pointers", "sorting"],
  statement:
    "There are n applicants with skill levels a_1 ... a_n and m positions with required levels b_1 ... b_m. An applicant i can take a position j if |a_i - b_j| <= d. Every applicant takes at most one position and every position is filled at most once. Print the maximum number of applicant-position pairs.",
  inputFormat: "The first line contains n, m and d. The second line contains a_1 ... a_n. The third line contains b_1 ... b_m.",
  outputFormat: "Print the maximum number of pairs.",
  constraints: "1 <= n, m <= 25000\n0 <= d <= 10^9\n0 <= a_i, b_j <= 10^9",
  samples: [{ input: "4 4 1\n1 4 7 10\n2 5 8 20\n", output: "3\n", explanation: "1-2, 4-5, 7-8; 10 has nobody within distance 1." }],
  hints: [
    "Look at the weakest applicant and the lowest position. What if they cannot be matched to each other?",
    "Sort both arrays. If the smaller of the two current elements is too far below the other, it can never be matched later, so drop it; if they fit, match them.",
    "Two pointers i, j: if |a[i]-b[j]| <= d count a pair and advance both; else advance the pointer pointing at the smaller value.",
  ],
  editorial:
    "After sorting, consider a[i] and b[j] (the smallest unused values). If a[i] < b[j] - d, a[i] is below the reach of every remaining position, so it cannot be matched and is skipped; symmetrically for b[j]. Otherwise they are compatible and matching them is safe: by an exchange argument any optimal matching can be rearranged to contain this pair because both are the smallest unused elements.\n\nComplexity: O(n log n + m log m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n, m;
    ll d;
    scanf("%d %d %lld", &n, &m, &d);
    vector<ll> a(n), b(m);
    for (auto &x : a) scanf("%lld", &x);
    for (auto &x : b) scanf("%lld", &x);
    sort(a.begin(), a.end());
    sort(b.begin(), b.end());
    int i = 0, j = 0, cnt = 0;
    while (i < n && j < m) {
        if (llabs(a[i] - b[j]) <= d) { cnt++; i++; j++; }
        else if (a[i] < b[j]) i++;
        else j++;
    }
    printf("%d\\n", cnt);
}`,
  hidden: () => {
    const r = rng(4115);
    const f = (d: number, a: number[], b: number[]) => `${a.length} ${b.length} ${d}\n${a.join(" ")}\n${b.join(" ")}\n`;
    return [
      f(0, [5], [5]),
      f(0, [5], [6]),
      f(1, [1, 4, 7, 10], [2, 5, 8, 20]),
      f(1000000000, [0, 1000000000], [1000000000, 0]),
      f(2, [1, 1, 1, 1], [2, 3, 10]),
      f(3, arr(r, 12, 0, 40), arr(r, 10, 0, 40)),
      f(10, arr(r, 1000, 0, 5000), arr(r, 700, 0, 5000)),
      f(5000, arr(r, 25000, 0, 1e9), arr(r, 25000, 0, 1e9)),
      f(100, arr(r, 25000, 0, 1e6), arr(r, 20000, 0, 1e6)),
      f(0, arr(r, 25000, 0, 20000), arr(r, 25000, 0, 20000)),
      f(7, arr(r, 25000, 0, 1e9), arr(r, 3, 0, 1e9)),
    ];
  },
});

const aggressiveSpacing = P({
  slug: "widest-minimum-spacing",
  title: "Widest Minimum Spacing",
  difficulty: "medium",
  rating: 1400,
  tags: ["binary search", "binary search on answer", "greedy"],
  statement:
    "There are n possible positions on a line (all distinct). You must place k stations on k different positions. Maximise the smallest distance between any two of the placed stations and print this largest possible smallest distance.",
  inputFormat: "The first line contains n and k. The second line contains the n positions.",
  outputFormat: "Print the maximum possible value of the minimum pairwise distance.",
  constraints: "2 <= k <= n <= 50000\n1 <= position <= 10^9, positions are distinct",
  samples: [{ input: "5 3\n1 2 8 4 9\n", output: "3\n", explanation: "Place at 1, 4 and 8 (or 9): the closest pair is 3 apart." }],
  hints: [
    "Ask the reverse question: given a distance D, can you place k stations with every two at least D apart?",
    "That check is greedy: sort the positions, place the first, then always take the next position that is at least D beyond the last chosen one. The answer to the check is monotone in D, so binary search D.",
    "Binary search D in [1, (max - min) / (k - 1)] and count how many stations the greedy placement gets; feasible if count >= k.",
  ],
  editorial:
    "If distance D is achievable then any smaller D is as well, so binary search the answer. For a fixed D, the leftmost position can always be used, and taking the first position that is at least D away from the previous station is optimal (exchange argument). The check is O(n) after sorting, and the answer is at most (max-min)/(k-1).\n\nComplexity: O(n log n + n log(max)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<ll> p(n);
    for (auto &x : p) scanf("%lld", &x);
    sort(p.begin(), p.end());
    auto ok = [&](ll D) {
        int c = 1;
        ll last = p[0];
        for (int i = 1; i < n; i++)
            if (p[i] - last >= D) { c++; last = p[i]; }
        return c >= k;
    };
    ll lo = 1, hi = (p[n - 1] - p[0]) / (k - 1);
    while (lo < hi) {
        ll mid = (lo + hi + 1) / 2;
        if (ok(mid)) lo = mid; else hi = mid - 1;
    }
    printf("%lld\\n", lo);
}`,
  hidden: () => {
    const r = rng(4116);
    const f = (k: number, a: number[]) => `${a.length} ${k}\n${a.join(" ")}\n`;
    return [
      f(2, [1, 2]),
      f(2, [1, 1000000000]),
      f(3, [1, 2, 3]),
      f(3, [1, 2, 8, 4, 9]),
      f(5, [10, 20, 30, 40, 50]),
      f(4, distinct(r, 10, 1, 50)),
      f(10, distinct(r, 300, 1, 100000)),
      f(100, distinct(r, 50000, 1, 1e9)),
      f(25000, distinct(r, 50000, 1, 1e9)),
      f(2, distinct(r, 50000, 1, 1e9)),
      f(49999, distinct(r, 50000, 1, 1e6)),
      f(50000, Array.from({ length: 50000 }, (_, i) => i + 1)),
    ];
  },
});

const coverSegments = P({
  slug: "fewest-segments-to-cover",
  title: "Fewest Segments to Cover",
  difficulty: "medium",
  rating: 1500,
  tags: ["greedy", "sorting", "intervals"],
  statement:
    "You are given n closed segments [l_i, r_i] on the number line and a target segment [0, L]. Choose the fewest segments whose union contains every real point of [0, L]. Segments that merely touch at an endpoint (for example [0, 4] and [4, 9]) join without a gap. Print the minimum number of segments, or -1 if it is impossible.",
  inputFormat: "The first line contains n and L. Each of the next n lines contains l_i and r_i.",
  outputFormat: "Print the minimum number of segments, or -1.",
  constraints: "1 <= n <= 30000\n1 <= L <= 10^9\n0 <= l_i < r_i <= 10^9",
  samples: [
    { input: "5 10\n0 4\n3 6\n5 10\n2 3\n6 9\n", output: "3\n", explanation: "[0,4], [3,6], [5,10]." },
    { input: "2 10\n0 4\n5 10\n", output: "-1\n", explanation: "The points strictly between 4 and 5 are not covered." },
  ],
  hints: [
    "Imagine you have already covered [0, cur]. Which segments can extend the covered part?",
    "Among all segments with l <= cur choose the one with the largest r (a classic greedy; any other choice reaches no further).",
    "Sort by l. Loop while cur < L: scan all segments with l <= cur keeping the max r. If the max r is not greater than cur, answer -1; else count++ and cur = max r.",
  ],
  editorial:
    "Let cur be the right end of the covered prefix. Any useful next segment must start at or before cur; picking the one reaching furthest dominates all others, because they can only cover points that this one covers too (beyond cur). With sorted left ends a single pointer sweeps all segments once, as segments skipped in a round have r <= the chosen r and are useless later. If no available segment extends past cur there is a gap.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n;
    ll L;
    scanf("%d %lld", &n, &L);
    vector<pair<ll, ll>> v(n);
    for (auto &p : v) scanf("%lld %lld", &p.first, &p.second);
    sort(v.begin(), v.end());
    ll cur = 0;
    int i = 0, cnt = 0;
    while (cur < L) {
        ll best = -1;
        while (i < n && v[i].first <= cur) { best = max(best, v[i].second); i++; }
        if (best <= cur) { puts("-1"); return 0; }
        cur = best;
        cnt++;
    }
    printf("%d\\n", cnt);
}`,
  hidden: () => {
    const r = rng(4117);
    const f = (L: number, ps: number[][]) => `${ps.length} ${L}\n${nl(rows(ps))}`;
    const dense = (n: number, L: number, maxLen: number) =>
      Array.from({ length: n }, () => {
        const l = r.int(0, L - 1);
        return [l, Math.min(1e9, l + r.int(1, maxLen))];
      });
    return [
      f(1, [[0, 1]]),
      f(5, [[1, 6]]),
      f(10, [[0, 4], [3, 6], [5, 10], [2, 3], [6, 9]]),
      f(10, [[0, 4], [5, 10]]),
      f(10, [[0, 4], [4, 7], [7, 10], [0, 3]]),
      f(10, [[0, 100], [3, 4]]),
      f(100, dense(20, 100, 30)),
      f(1000, dense(300, 1000, 40)),
      f(1e9, dense(28000, 1e9, 200000)),
      f(1e9, dense(30000, 1e9, 1e5).concat([[0, 5], [999990000, 1e9]])),
      f(1e6, dense(30000, 1e6, 100)),
      f(30000, Array.from({ length: 30000 }, (_, i) => [i, i + 1])),
    ];
  },
});

const roomsNeeded = P({
  slug: "meeting-rooms-needed",
  title: "Meeting Rooms Needed",
  difficulty: "medium",
  rating: 1300,
  tags: ["sorting", "greedy", "sweep line"],
  statement:
    "A company has n meetings, meeting i lasts during the half-open time span [s_i, e_i). A room can host only one meeting at a time, but a meeting may start at the same moment the previous one in that room ends. Print the minimum number of rooms needed to hold all meetings.",
  inputFormat: "The first line contains n. Each of the next n lines contains s_i and e_i.",
  outputFormat: "Print the minimum number of rooms.",
  constraints: "1 <= n <= 30000\n0 <= s_i < e_i <= 10^9",
  samples: [{ input: "4\n0 30\n5 10\n15 20\n30 40\n", output: "2\n", explanation: "[0,30) overlaps both [5,10) and [15,20), but those two do not overlap each other." }],
  hints: [
    "The answer is the largest number of meetings that are simultaneously in progress at some moment.",
    "Process the 'start' and 'end' events in time order; at equal times end events must come first because of the half-open intervals.",
    "Sort starts and ends separately. Two pointers: if the next start is before the next end, increase the running count, otherwise decrease it. Track the maximum.",
  ],
  editorial:
    "Intervals of an interval graph can be coloured with exactly as many colours as the maximum clique, i.e. the maximum number of intervals covering a single point, so rooms = maximum overlap. Sorting starts and ends independently and merging them as events gives the overlap count; an end at time t is processed before a start at t because the intervals are half-open.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<long long> S(n), E(n);
    for (int i = 0; i < n; i++) scanf("%lld %lld", &S[i], &E[i]);
    sort(S.begin(), S.end());
    sort(E.begin(), E.end());
    int i = 0, j = 0, cur = 0, best = 0;
    while (i < n) {
        if (S[i] < E[j]) { cur++; i++; best = max(best, cur); }
        else { cur--; j++; }
    }
    printf("%d\\n", best);
}`,
  hidden: () => {
    const r = rng(4118);
    const f = (ps: number[][]) => `${ps.length}\n${nl(rows(ps))}`;
    return [
      f([[0, 1]]),
      f([[0, 1], [1, 2], [2, 3]]),
      f([[0, 10], [0, 10], [0, 10]]),
      f([[0, 30], [5, 10], [15, 20], [30, 40]]),
      f([[1, 1000000000], [2, 999999999], [3, 5]]),
      f(ivs(r, 15, 30, 10)),
      f(ivs(r, 800, 3000, 200)),
      f(ivs(r, 28000, 1e9, 1e8)),
      f(ivs(r, 30000, 1e6, 1e5)),
      f(ivs(r, 30000, 1e6, 20)),
      f(Array.from({ length: 30000 }, (_, i) => [i, i + 1])),
    ];
  },
});

// ---------------------------------------------------------------- hard

const kthTable = P({
  slug: "kth-in-multiplication-table",
  title: "K-th in the Multiplication Table",
  difficulty: "hard",
  rating: 1800,
  tags: ["binary search", "binary search on answer", "math"],
  timeLimitMs: 2000,
  statement:
    "Consider the n x m multiplication table whose cell in row i and column j (1-indexed) contains i * j. Write all n * m numbers of the table in non-decreasing order (equal numbers appear as many times as they occur in the table). Print the k-th number of this list.",
  inputFormat: "One line with n, m and k.",
  outputFormat: "Print the k-th smallest number in the table.",
  constraints: "1 <= n, m <= 10^6\n1 <= k <= n * m",
  samples: [
    { input: "3 3 5\n", output: "3\n", explanation: "Sorted table: 1 2 2 3 3 4 6 6 9." },
    { input: "2 3 6\n", output: "6\n" },
  ],
  hints: [
    "The table has up to 10^12 cells, so it cannot be generated. Think of a function that counts instead.",
    "Let cnt(x) be the number of table cells with value <= x. It is non-decreasing in x, so binary search the smallest x with cnt(x) >= k.",
    "In row i the number of cells <= x is min(m, x / i). Sum it over i = 1..n (use 64-bit integers). The answer x lies in [1, n * m].",
  ],
  editorial:
    "cnt(x) = sum over rows i of min(m, floor(x / i)) is computed in O(n). The k-th element is the smallest x with cnt(x) >= k; that x is guaranteed to be a table value because cnt jumps only at table values. Swapping so that n <= m is not even needed for 10^6. The search range is [1, n*m] (at most 10^12), about 40 iterations.\n\nComplexity: O(n log(nm)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    ll n, m, k;
    scanf("%lld %lld %lld", &n, &m, &k);
    auto cnt = [&](ll x) {
        ll s = 0;
        for (ll i = 1; i <= n; i++) s += min(m, x / i);
        return s;
    };
    ll lo = 1, hi = n * m;
    while (lo < hi) {
        ll mid = (lo + hi) / 2;
        if (cnt(mid) >= k) hi = mid; else lo = mid + 1;
    }
    printf("%lld\\n", lo);
}`,
  hidden: () => {
    const r = rng(4119);
    const t = ["3 3 5", "2 3 6", "1 1 1", "1 1000000 1", "1 1000000 1000000", "1000000 1 777777", "1000000 1000000 1", "1000000 1000000 1000000000000", "1000000 1000000 500000000000", "999983 1000000 123456789012", "1000000 999999 987654321", "1000 1000 500000"];
    for (let i = 0; i < 3; i++) {
      const n = r.int(1, 1e6);
      const m = r.int(1, 1e6);
      t.push(`${n} ${m} ${r.int(1, n * m)}`);
    }
    return t.map((x) => `${x}\n`);
  },
});

const mostOnTime = P({
  slug: "most-jobs-on-time",
  title: "Most Jobs on Time",
  difficulty: "hard",
  rating: 1900,
  tags: ["greedy", "heap", "scheduling", "sorting"],
  statement:
    "A single machine starts at time 0 and processes jobs one after another without pauses (jobs that you decide to skip are never run). Job i needs p_i time units and must be finished by its deadline d_i, i.e. its completion time must be at most d_i. You may skip any jobs. Choose which jobs to run, and in which order, so that every run job meets its deadline, and maximise the number of run jobs. Print that maximum.",
  inputFormat: "The first line contains n. Each of the next n lines contains p_i and d_i.",
  outputFormat: "Print the maximum number of jobs that can be completed on time.",
  constraints: "1 <= n <= 30000\n1 <= p_i, d_i <= 10^9",
  samples: [{ input: "4\n3 4\n2 5\n4 6\n1 7\n", output: "3\n", explanation: "Run the jobs with p = 3, 2 and 1 (finishing at 3, 5, 6), skip the job with p = 4." }],
  hints: [
    "Once the set of jobs to run is fixed, which order is the best? It tells you how to scan the jobs.",
    "Process jobs by increasing deadline, tentatively accepting each. If the schedule becomes too late, drop the longest job accepted so far (a max-heap of processing times).",
    "Keep time t = sum of accepted p. After adding job (p, d): push p, t += p; if t > d then t -= heap.top(), pop. The heap size at the end is the answer.",
  ],
  editorial:
    "(Moore-Hodgson.) For a fixed set of jobs, earliest deadline first is optimal, so scan jobs sorted by deadline. Add each job; if the prefix of accepted jobs now overruns the current deadline, remove the accepted job with the largest p. Removing the longest job restores feasibility using the fewest removals and keeps the total time minimal among all sets of the same size, so the invariant 'the heap holds a maximum-size feasible set with the least total time' is preserved. The answer is the heap size.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n;
    scanf("%d", &n);
    vector<pair<ll, ll>> v(n);
    for (auto &x : v) scanf("%lld %lld", &x.second, &x.first);
    sort(v.begin(), v.end());
    priority_queue<ll> pq;
    ll t = 0;
    for (auto &x : v) {
        pq.push(x.second);
        t += x.second;
        if (t > x.first) { t -= pq.top(); pq.pop(); }
    }
    printf("%d\\n", (int)pq.size());
}`,
  hidden: () => {
    const r = rng(4120);
    const f = (ps: number[][]) => `${ps.length}\n${nl(rows(ps))}`;
    const jobs = (n: number, maxP: number, dMul: number) => {
      const ps = arr(r, n, 1, maxP);
      const tot = ps.reduce((a, b) => a + b, 0);
      return ps.map((p) => [p, r.int(1, Math.max(1, Math.min(1e9, Math.floor(tot * dMul))))]);
    };
    return [
      f([[5, 5]]),
      f([[6, 5]]),
      f([[3, 4], [2, 5], [4, 6], [1, 7]]),
      f([[100, 200], [200, 1300], [1000, 1250], [2000, 3200]]),
      f([[1, 1], [1, 1], [1, 1]]),
      f([[2, 2], [2, 4], [2, 6], [2, 8]]),
      f(jobs(12, 10, 0.8)),
      f(jobs(500, 100, 0.3)),
      f(jobs(30000, 1e4, 0.3)),
      f(jobs(30000, 1e4, 0.05)),
      f(jobs(30000, 3e4, 0.9)),
      f(Array.from({ length: 30000 }, (_, i) => [r.int(1, 1000), 1000 * (i + 1)])),
    ];
  },
});

const kthPairSum = P({
  slug: "kth-smallest-pair-sum",
  title: "K-th Smallest Pair Sum",
  difficulty: "hard",
  rating: 1900,
  tags: ["binary search", "binary search on answer", "two pointers", "sorting"],
  statement:
    "You are given two arrays A (n numbers) and B (m numbers). Consider all n * m sums a_i + b_j, one for each pair (i, j), and write them in non-decreasing order (equal sums are listed repeatedly, once per pair). Print the k-th number of this list.",
  inputFormat: "The first line contains n, m and k. The second line contains the n numbers of A. The third line contains the m numbers of B.",
  outputFormat: "Print the k-th smallest sum.",
  constraints: "1 <= n, m <= 25000\n1 <= k <= n * m\n0 <= a_i, b_j <= 10^9",
  samples: [{ input: "3 3 4\n1 4 8\n2 3 5\n", output: "6\n", explanation: "Sorted sums: 3 4 6 6 7 9 10 11 13." }],
  hints: [
    "There are up to 6*10^8 sums. You cannot list them, but you might be able to count how many of them are <= some value x.",
    "Sort both arrays. For a fixed x, as a_i grows the number of b_j with a_i + b_j <= x shrinks, so a two-pointer sweep counts all pairs in O(n + m).",
    "Binary search the smallest x with count(x) >= k over [min A + min B, max A + max B]. Use 64-bit counters.",
  ],
  editorial:
    "Define cnt(x) = number of pairs with a_i + b_j <= x. With both arrays sorted, iterate i upward while a pointer j over B moves down, giving cnt in O(n + m). cnt is monotone, and the smallest x with cnt(x) >= k is a real pair sum and therefore the k-th element. A heap-based k-way merge would need O(k log n) which is too slow for k up to 6*10^8.\n\nComplexity: O((n + m) log(max sum)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n, m;
    ll k;
    scanf("%d %d %lld", &n, &m, &k);
    vector<ll> a(n), b(m);
    for (auto &x : a) scanf("%lld", &x);
    for (auto &x : b) scanf("%lld", &x);
    sort(a.begin(), a.end());
    sort(b.begin(), b.end());
    auto cnt = [&](ll x) {
        ll c = 0;
        int j = m;
        for (int i = 0; i < n; i++) {
            while (j > 0 && a[i] + b[j - 1] > x) j--;
            c += j;
        }
        return c;
    };
    ll lo = a[0] + b[0], hi = a[n - 1] + b[m - 1];
    while (lo < hi) {
        ll mid = (lo + hi) / 2;
        if (cnt(mid) >= k) hi = mid; else lo = mid + 1;
    }
    printf("%lld\\n", lo);
}`,
  hidden: () => {
    const r = rng(4121);
    const f = (k: number, a: number[], b: number[]) => `${a.length} ${b.length} ${k}\n${a.join(" ")}\n${b.join(" ")}\n`;
    return [
      f(1, [5], [7]),
      f(4, [1, 4, 8], [2, 3, 5]),
      f(9, [1, 4, 8], [2, 3, 5]),
      f(6, [0, 0, 0], [0, 0]),
      f(3, [1000000000, 0], [1000000000, 0]),
      f(20, arr(r, 8, 0, 30), arr(r, 7, 0, 30)),
      f(50000, arr(r, 1000, 0, 1e5), arr(r, 1000, 0, 1e5)),
      f(312500000, arr(r, 25000, 0, 1e9), arr(r, 25000, 0, 1e9)),
      f(625000000, arr(r, 25000, 0, 1e9), arr(r, 25000, 0, 1e9)),
      f(1, arr(r, 25000, 0, 1e9), arr(r, 25000, 0, 1e9)),
      f(100000000, arr(r, 25000, 0, 100), arr(r, 25000, 0, 100)),
      f(7777777, arr(r, 25000, 0, 1e9), arr(r, 20, 0, 1e9)),
    ];
  },
});

const weightedIntervals = P({
  slug: "heaviest-compatible-bookings",
  title: "Heaviest Compatible Bookings",
  difficulty: "hard",
  rating: 1800,
  tags: ["dynamic programming", "binary search", "sorting", "intervals"],
  statement:
    "A studio receives n booking requests. Request i occupies the half-open span [s_i, e_i) and pays w_i. Accepted requests must not overlap (one may start exactly when another ends). Choose a set of pairwise non-overlapping requests that maximises the total payment and print that maximum.",
  inputFormat: "The first line contains n. Each of the next n lines contains s_i, e_i and w_i.",
  outputFormat: "Print the maximum total payment.",
  constraints: "1 <= n <= 20000\n0 <= s_i < e_i <= 10^9\n1 <= w_i <= 10^9",
  samples: [{ input: "4\n1 3 5\n2 5 6\n4 6 5\n6 7 4\n", output: "14\n", explanation: "Take [1,3), [4,6) and [6,7): 5 + 5 + 4." }],
  hints: [
    "The plain 'earliest end first' greedy fails once requests have different values. Think of a DP over requests in some sorted order.",
    "Sort by end time. Let dp[i] be the best total using only the first i requests. Either skip request i, or take it and combine with the best solution among requests ending at or before s_i.",
    "dp[i] = max(dp[i-1], w_i + dp[p_i]), where p_i is the number of requests with end <= s_i, found with upper_bound on the sorted end times. Use 64-bit values (the sum reaches 2*10^13).",
  ],
  editorial:
    "Sort requests by end time e. Let dp[i] be the optimum over the first i requests. If request i is not taken the value is dp[i-1]. If it is taken, every other chosen request must end by s_i; all such requests are among the first p_i requests where p_i = number of requests with e <= s_i, and any choice among those is compatible with i. Hence dp[i] = max(dp[i-1], w_i + dp[p_i]). Since e_i > s_i, p_i < i.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n;
    scanf("%d", &n);
    vector<array<ll, 3>> v(n);
    for (auto &x : v) scanf("%lld %lld %lld", &x[1], &x[0], &x[2]);
    sort(v.begin(), v.end());
    vector<ll> ends(n), dp(n + 1, 0);
    for (int i = 0; i < n; i++) ends[i] = v[i][0];
    for (int i = 1; i <= n; i++) {
        ll s = v[i - 1][1], w = v[i - 1][2];
        int p = upper_bound(ends.begin(), ends.end(), s) - ends.begin();
        dp[i] = max(dp[i - 1], w + dp[p]);
    }
    printf("%lld\\n", dp[n]);
}`,
  hidden: () => {
    const r = rng(4122);
    const f = (ps: number[][]) => `${ps.length}\n${nl(rows(ps))}`;
    const jobs = (n: number, maxC: number, maxLen: number, maxW: number) => ivs(r, n, maxC, maxLen).map((iv) => [...iv, r.int(1, maxW)]);
    return [
      f([[0, 1, 7]]),
      f([[1, 3, 5], [2, 5, 6], [4, 6, 5], [6, 7, 4]]),
      f([[0, 10, 100], [0, 5, 30], [5, 10, 30]]),
      f([[0, 10, 50], [0, 5, 30], [5, 10, 30]]),
      f([[0, 1000000000, 1000000000], [0, 500000000, 600000000], [500000000, 1000000000, 600000000]]),
      f(jobs(12, 30, 8, 20)),
      f(jobs(500, 2000, 100, 1000)),
      f(jobs(20000, 1e9, 1e8, 1e9)),
      f(jobs(20000, 1e6, 1e4, 1e9)),
      f(jobs(20000, 1e5, 20, 1e6)),
      f(Array.from({ length: 20000 }, (_, i) => [i, i + 1, r.int(1, 1e9)])),
    ];
  },
});

const bestMedian = P({
  slug: "best-median-segment",
  title: "Best Median Segment",
  difficulty: "hard",
  rating: 2000,
  tags: ["binary search", "binary search on answer", "prefix sums", "arrays"],
  statement:
    "For a segment of length len, sort its elements in non-decreasing order; its median is the element at position floor((len + 1) / 2), counting positions from 1 (so for even length the lower middle element). You are given an array of n numbers and an integer L. Among all contiguous segments of length at least L, find the largest possible median and print it.",
  inputFormat: "The first line contains n and L. The second line contains the n array elements.",
  outputFormat: "Print the largest median over all segments of length at least L.",
  constraints: "1 <= L <= n <= 90000\n1 <= a_i <= 10^5",
  samples: [{ input: "6 3\n1 5 2 4 3 6\n", output: "4\n", explanation: "For example, [5,2,4] has the median 4; no segment of length >= 3 reaches 5." }],
  hints: [
    "Ask a yes/no question instead: is there a segment of length >= L whose median is at least x? Is that monotone in x?",
    "Replace elements >= x by +1 and others by -1. A segment has median >= x exactly when its sum is positive. Check this with prefix sums.",
    "Binary search x. For each right end r >= L, keep the minimum of prefix sums P[0..r-L] and test P[r] - minPrefix > 0.",
  ],
  editorial:
    "A segment of length len has median >= x iff the number of elements < x is at most floor((len-1)/2), i.e. there are strictly more elements >= x than elements < x, i.e. the +1/-1 sum is positive. The predicate 'some segment with length >= L has median >= x' is monotone in x, so binary search over x. For one x compute prefix sums P and, for each r, the minimum of P over indices <= r - L in O(1) amortised: the check is O(n). The answer is the largest x for which the check passes (x = min a always passes).\n\nComplexity: O(n log(max a)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, L;
    scanf("%d %d", &n, &L);
    vector<int> a(n);
    for (auto &x : a) scanf("%d", &x);
    auto ok = [&](int x) {
        vector<int> P(n + 1, 0);
        for (int i = 0; i < n; i++) P[i + 1] = P[i] + (a[i] >= x ? 1 : -1);
        int mn = INT_MAX;
        for (int r = L; r <= n; r++) {
            mn = min(mn, P[r - L]);
            if (P[r] - mn > 0) return true;
        }
        return false;
    };
    int lo = 1, hi = 100000;
    while (lo < hi) {
        int mid = (lo + hi + 1) / 2;
        if (ok(mid)) lo = mid; else hi = mid - 1;
    }
    printf("%d\\n", lo);
}`,
  hidden: () => {
    const r = rng(4123);
    const f = (L: number, a: number[]) => `${a.length} ${L}\n${a.join(" ")}\n`;
    const inc = Array.from({ length: 90000 }, (_, i) => 1 + Math.floor((i * 99999) / 89999));
    return [
      f(1, [7]),
      f(1, [3, 1, 2]),
      f(3, [1, 5, 2, 4, 3, 6]),
      f(2, [1, 100000, 1, 100000]),
      f(4, [5, 5, 5, 5, 5]),
      f(3, arr(r, 15, 1, 20)),
      f(10, arr(r, 300, 1, 100)),
      f(500, arr(r, 90000, 1, 100000)),
      f(2, arr(r, 90000, 1, 100000)),
      f(45000, arr(r, 90000, 1, 100000)),
      f(100, inc),
      f(100, inc.slice().reverse()),
      f(1000, arr(r, 40000, 1, 10)),
    ];
  },
});

// ---------------------------------------------------------------- expert

const kRoomsIntervals = P({
  slug: "most-bookings-k-rooms",
  title: "Most Bookings with K Rooms",
  difficulty: "expert",
  rating: 2300,
  tags: ["greedy", "sorting", "multiset", "intervals"],
  statement:
    "A conference center has k identical rooms. There are n booking requests, request i needs a room during the half-open time span [s_i, e_i). A room can host only one request at a time, but a request may start at the exact moment another one ends in the same room. Accept as many requests as possible so that all accepted requests can be assigned to rooms without conflicts, and print how many requests you can accept.",
  inputFormat: "The first line contains n and k. Each of the next n lines contains s_i and e_i.",
  outputFormat: "Print the maximum number of requests that can be accepted.",
  constraints: "1 <= k <= n <= 30000\n0 <= s_i < e_i <= 10^9",
  samples: [{ input: "6 2\n0 5\n1 4\n2 6\n4 8\n5 9\n7 10\n", output: "4\n", explanation: "Accept [1,4), [0,5), [4,8) and [5,9): at most two are active at any time." }],
  hints: [
    "For k = 1 this is the classic 'earliest end first' interval scheduling. How could that generalise to several rooms?",
    "Process requests by increasing end time and keep the time each room becomes free. A request must go to some room that is free by its start; which of those rooms is the least harmful to use?",
    "Put the k rooms' free times in a std::multiset (initially k zeros). For request (s, e) take the room with the largest free time <= s (upper_bound(s), then step back), replace it by e, and count it. If no such room exists, skip the request.",
  ],
  editorial:
    "Sort by end time. Maintain the multiset of 'room free times'. When request (s, e) arrives, any room with free time <= s can take it; assigning it to the room whose free time is the largest among those is best-fit: it wastes the least idle time, leaving rooms that are free earlier for requests starting earlier than s... which can no longer come, since requests arrive by end time and have s < e, but they may start before s, so rooms with early free times are exactly the ones that are valuable for them. Exchange argument: the greedy keeps, after processing each prefix, the multiset of free times that dominates (is pointwise not worse than) that of any other schedule with the same number of accepted requests, and accepting whenever possible never loses (an accepted request ending at e only replaces a free time by e, the smallest end among those still to come). Requests that cannot be placed are skipped.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<pair<ll, ll>> v(n);
    for (auto &p : v) scanf("%lld %lld", &p.second, &p.first);
    sort(v.begin(), v.end());
    multiset<ll> room;
    for (int i = 0; i < k; i++) room.insert(0);
    int cnt = 0;
    for (auto &p : v) {
        auto it = room.upper_bound(p.second);
        if (it == room.begin()) continue;
        --it;
        room.erase(it);
        room.insert(p.first);
        cnt++;
    }
    printf("%d\\n", cnt);
}`,
  hidden: () => {
    const r = rng(4124);
    const f = (k: number, ps: number[][]) => `${ps.length} ${k}\n${nl(rows(ps))}`;
    return [
      f(1, [[0, 1]]),
      f(1, [[0, 5], [1, 4], [2, 3]]),
      f(2, [[0, 5], [1, 4], [2, 6], [4, 8], [5, 9], [7, 10]]),
      f(2, [[0, 10], [0, 10], [0, 10]]),
      f(3, [[0, 10], [0, 10], [0, 10]]),
      f(2, ivs(r, 12, 30, 8)),
      f(3, ivs(r, 15, 20, 10)),
      f(5, ivs(r, 1000, 3000, 100)),
      f(30, ivs(r, 2000, 3000, 300)),
      f(2, ivs(r, 28000, 1e9, 2e7)),
      f(300, ivs(r, 30000, 1e6, 3e4)),
      f(1, ivs(r, 30000, 1e6, 1e3)),
      f(30000, ivs(r, 30000, 1e6, 3e4)),
    ];
  },
});

const raw: ProblemSeed[] = [
  digitSumSort,
  mergeSortedLists,
  medianRank,
  mergeIntervals,
  cheapestItems,
  integerRoot,
  boatsToCross,
  rangeCountQueries,
  coinChain,
  largestConcat,
  activitySelection,
  shippingCapacity,
  worstDelay,
  weightedFinish,
  matchWithin,
  aggressiveSpacing,
  coverSegments,
  roomsNeeded,
  kthTable,
  mostOnTime,
  kthPairSum,
  weightedIntervals,
  bestMedian,
  kRoomsIntervals,
];

export const problems: ProblemSeed[] = raw.map((p) => fitBudget(p));
