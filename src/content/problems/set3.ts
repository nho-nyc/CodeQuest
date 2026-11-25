import { rng } from "./rng";
import type { ProblemSeed } from "./types";

const arr = (r: ReturnType<typeof rng>, n: number, lo: number, hi: number) => Array.from({ length: n }, () => r.int(lo, hi));

function balanced(r: ReturnType<typeof rng>, len: number): string {
  const open = "([{";
  const close: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const stack: string[] = [];
  const out: string[] = [];
  while (out.length + stack.length < len) {
    if (stack.length === 0 || r.int(0, 2) > 0) {
      const c = r.pick([...open]);
      stack.push(c);
      out.push(c);
    } else out.push(close[stack.pop()!]!);
  }
  while (stack.length) out.push(close[stack.pop()!]!);
  return out.join("");
}

export const brackets: ProblemSeed = {
  slug: "balanced-brackets",
  title: "Balanced Brackets",
  difficulty: "easy",
  rating: 1100,
  tags: ["stack", "strings"],
  timeLimitMs: 1000,
  memoryLimitMb: 256,
  estimatedMinutes: 15,
  statement: "A string made only of the characters ( ) [ ] { } is balanced when every opening bracket is closed by the same kind of bracket, in the correct order. For example `([]{})` is balanced, while `([)]` and `(()` are not. Decide whether the given string is balanced.",
  inputFormat: "One line containing the string s.",
  outputFormat: "Print `YES` if s is balanced, otherwise `NO`.",
  constraints: "1 <= |s| <= 2 * 10^5",
  samples: [{ input: "([]{})\n", output: "YES\n" }, { input: "([)]\n", output: "NO\n" }, { input: "(((\n", output: "NO\n" }],
  hints: [
    "The most recently opened bracket must be the first one to be closed.",
    "That last-in, first-out behaviour is exactly what a stack gives you.",
    "Push every opening bracket. For a closing bracket, the stack must be non-empty and its top must be the matching opening bracket, then pop. At the end the stack must be empty.",
  ],
  editorial: "Scan the string with a stack. An opening bracket is pushed. A closing bracket must match the bracket on top of the stack, otherwise the answer is NO; if it matches, pop. After the scan the stack must be empty, otherwise some bracket was never closed. Check for an empty stack before reading its top.\n\nComplexity: O(|s|).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    cin >> s;
    string st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            st.push_back(c);
        } else {
            if (st.empty()) { cout << "NO\\n"; return 0; }
            char o = st.back();
            bool ok = (c == ')' && o == '(') || (c == ']' && o == '[') || (c == '}' && o == '{');
            if (!ok) { cout << "NO\\n"; return 0; }
            st.pop_back();
        }
    }
    cout << (st.empty() ? "YES" : "NO") << "\\n";
    return 0;
}`,
  hidden: () => {
    const r = rng(31);
    const flip = (s: string, i: number) => s.slice(0, i) + (s[i] === "(" ? ")" : "(") + s.slice(i + 1);
    const b1 = balanced(r, 200000);
    const b2 = balanced(r, 1000);
    return ["()\n", ")(\n", "(\n", ")\n", "{[()]}\n", "{[(])}\n", "((()))[]{}\n", `${b2}\n`, `${flip(b2, 500)}\n`, `${b1}\n`, `${flip(b1, 99999)}\n`, `${"(".repeat(100000)}${")".repeat(100000)}\n`, `${"(".repeat(100000)}${")".repeat(99999)}]\n`, `${")".repeat(200000)}\n`];
  },
};

export const subarrayCount: ProblemSeed = {
  slug: "subarrays-with-sum-k",
  title: "Subarrays with Sum K",
  difficulty: "medium",
  rating: 1500,
  tags: ["prefix-sum", "hashing", "arrays"],
  timeLimitMs: 1500,
  memoryLimitMb: 256,
  estimatedMinutes: 25,
  statement: "Given an array of n integers and a number k, count the contiguous subarrays whose elements sum to exactly k. Different positions count as different subarrays even if the values are the same.",
  inputFormat: "The first line contains n and k. The second line contains n integers.",
  outputFormat: "Print the number of subarrays with sum k.",
  constraints: "1 <= n <= 2 * 10^5\n-10^9 <= a_i <= 10^9\n-10^14 <= k <= 10^14",
  samples: [{ input: "5 3\n1 2 1 2 1\n", output: "4\n", explanation: "The subarrays at positions (1,2), (2,3), (3,4) and (4,5) all sum to 3." }, { input: "3 0\n0 0 0\n", output: "6\n" }],
  hints: [
    "Fix the right end of a subarray. What would have to be true about everything to its left for the subarray ending here to sum to exactly k? Can you remember that information instead of re-adding elements?",
    "A subarray sum is a difference of two prefix sums p. For each right end r, count how many earlier prefix sums equal p[r] - k. A map from prefix sum to count does this.",
    "Keep `map<long long,long long> cnt` with cnt[0] = 1. For each element update the running sum s, add cnt[s - k] to the answer, then do cnt[s]++. Use long long: the answer can reach 2 * 10^10. Prefer std::map over unordered_map to avoid hash attacks.",
  ],
  editorial: "Let p_i be prefix sums with p_0 = 0. The subarray (l, r] has sum p_r - p_l, so it equals k exactly when p_l = p_r - k. Iterate r from left to right, and keep a counter of how many times each prefix sum has appeared before; add the count of (p_r - k) to the answer. The answer can reach n(n+1)/2 ~ 2 * 10^10, which needs `long long`.\n\nComplexity: O(n log n) with an ordered map.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long k;
    cin >> n >> k;
    map<long long, long long> cnt;
    cnt[0] = 1;
    long long s = 0, ans = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        s += x;
        auto it = cnt.find(s - k);
        if (it != cnt.end()) ans += it->second;
        cnt[s]++;
    }
    cout << ans << "\\n";
    return 0;
}`,
  hidden: () => {
    const r = rng(32);
    const mk = (a: number[], k: number) => `${a.length} ${k}\n${a.join(" ")}\n`;
    return [mk([5], 5), mk([5], 4), mk([0], 0), mk([1, -1, 1, -1], 0), mk(arr(r, 100, -3, 3), 2), mk(arr(r, 1000, -1e9, 1e9), 0), mk(arr(r, 200000, -1, 1), 0), mk(Array(200000).fill(0), 0), mk(Array(200000).fill(1), 100000), mk(arr(r, 200000, -1e9, 1e9), 123456789), mk(arr(r, 200000, 0, 2), 3)];
  },
};

export const minCoins: ProblemSeed = {
  slug: "fewest-coins",
  title: "Fewest Coins",
  difficulty: "medium",
  rating: 1500,
  tags: ["dp"],
  timeLimitMs: 1500,
  memoryLimitMb: 256,
  estimatedMinutes: 25,
  statement: "You have n kinds of coins, each available in unlimited quantity. Find the minimum number of coins needed to pay exactly x, or report that it is impossible.",
  inputFormat: "The first line contains n and x. The second line contains the n coin values.",
  outputFormat: "Print the minimum number of coins, or -1 if x cannot be paid exactly.",
  constraints: "1 <= n <= 100\n1 <= x <= 10^5\n1 <= c_i <= 10^5",
  samples: [{ input: "3 11\n1 2 5\n", output: "3\n", explanation: "5 + 5 + 1." }, { input: "2 7\n4 6\n", output: "-1\n" }],
  hints: [
    "Picking the biggest coin first (greedy) does not always work. Try coins 1, 3, 4 and amount 6.",
    "Let f(v) be the fewest coins to pay exactly v. The last coin used is some c_i, so f(v) depends on f(v - c_i).",
    "dp[0] = 0 and dp[v] = min over coins c <= v of dp[v - c] + 1, with 'infinity' for unreachable amounts. Fill v from 1 to x and print -1 when dp[x] is still infinity.",
  ],
  editorial: "Classic unbounded-knapsack DP. dp[v] = minimum number of coins for amount v; dp[0] = 0; dp[v] = min(dp[v - c] + 1) over coins c <= v where dp[v - c] is reachable. The answer is dp[x] or -1. A recursive solution without memoisation is exponential, and a greedy choice of the largest coin is incorrect (coins 1, 3, 4 and amount 6 give 4 + 1 + 1 greedily but 3 + 3 optimally).\n\nComplexity: O(n * x) time, O(x) memory.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, x;
    cin >> n >> x;
    vector<int> c(n);
    for (auto &v : c) cin >> v;
    const int INF = 1e9;
    vector<int> dp(x + 1, INF);
    dp[0] = 0;
    for (int v = 1; v <= x; v++)
        for (int coin : c)
            if (coin <= v && dp[v - coin] != INF) dp[v] = min(dp[v], dp[v - coin] + 1);
    cout << (dp[x] == INF ? -1 : dp[x]) << "\\n";
    return 0;
}`,
  hidden: () => {
    const r = rng(33);
    const mk = (c: number[], x: number) => `${c.length} ${x}\n${c.join(" ")}\n`;
    const distinct = (n: number, lo: number, hi: number) => {
      const s = new Set<number>();
      while (s.size < n) s.add(r.int(lo, hi));
      return [...s];
    };
    return [mk([1], 1), mk([2], 3), mk([1, 3, 4], 6), mk([5, 7], 23), mk([100000], 100000), mk([2, 4, 6, 8], 99999), mk(distinct(100, 1, 1000), 100000), mk(distinct(100, 50, 100000), 100000), mk(distinct(100, 90000, 100000), 100000), mk([1, 2, 5, 10, 20, 50, 100, 200], 99999), mk(distinct(100, 1, 150), 100000), mk([99991, 3], 100000)];
  },
};

export const gridPath: ProblemSeed = {
  slug: "shortest-path-in-grid",
  title: "Shortest Path in a Grid",
  difficulty: "medium",
  rating: 1500,
  tags: ["bfs", "graphs", "shortest-path"],
  timeLimitMs: 1500,
  memoryLimitMb: 256,
  estimatedMinutes: 25,
  statement: "You are given a grid with n rows and m columns. A cell is either free (`.`) or a wall (`#`). You start in the top-left cell and want to reach the bottom-right cell. In one move you can step to a neighbouring free cell: up, down, left or right. Find the minimum number of moves.",
  inputFormat: "The first line contains n and m. Each of the next n lines contains a string of m characters.",
  outputFormat: "Print the minimum number of moves, or -1 if the target cannot be reached. It is guaranteed that the start and target cells are free.",
  constraints: "1 <= n, m <= 1000",
  samples: [{ input: "3 4\n....\n.##.\n....\n", output: "5\n" }, { input: "2 2\n.#\n#.\n", output: "-1\n" }],
  hints: [
    "Every move costs 1, so you are looking for the shortest path in an unweighted graph where cells are vertices.",
    "Breadth-first search explores cells in order of increasing distance, so the first time it reaches a cell is the shortest way.",
    "Keep `dist[n][m]` initialised to -1 and a queue. Push the start with distance 0. Pop a cell, try its 4 neighbours that are inside the grid, free and unvisited, set dist = dist + 1 and push. Print dist of the target. The grid can have 10^6 cells, so use an iterative queue, not recursion.",
  ],
  editorial: "Treat each free cell as a vertex connected to its free neighbours. BFS from the start gives the shortest distance (number of moves) to every reachable cell. A DFS does not give shortest paths, and a recursive DFS may overflow the stack on a 10^6-cell grid. If the target is never reached, print -1.\n\nComplexity: O(n * m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m;
    cin >> n >> m;
    vector<string> g(n);
    for (auto &s : g) cin >> s;
    vector<int> dist(n * m, -1);
    queue<int> q;
    dist[0] = 0;
    q.push(0);
    const int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
    while (!q.empty()) {
        int cur = q.front();
        q.pop();
        int x = cur / m, y = cur % m;
        for (int k = 0; k < 4; k++) {
            int nx = x + dx[k], ny = y + dy[k];
            if (nx < 0 || ny < 0 || nx >= n || ny >= m || g[nx][ny] == '#') continue;
            int id = nx * m + ny;
            if (dist[id] != -1) continue;
            dist[id] = dist[cur] + 1;
            q.push(id);
        }
    }
    cout << dist[n * m - 1] << "\\n";
    return 0;
}`,
  hidden: () => {
    const r = rng(34);
    const render = (g: string[][]) => `${g.length} ${g[0]!.length}\n${g.map((row) => row.join("")).join("\n")}\n`;
    const random = (n: number, m: number, p: number) => {
      const g = Array.from({ length: n }, () => Array.from({ length: m }, () => (r.int(0, 999) < p * 1000 ? "#" : ".")));
      g[0]![0] = ".";
      g[n - 1]![m - 1] = ".";
      return render(g);
    };
    const open = (n: number, m: number) => render(Array.from({ length: n }, () => Array(m).fill(".")));
    const snake = (n: number, m: number) => {
      const g = Array.from({ length: n }, (_, i) => Array.from({ length: m }, () => (i % 2 === 0 ? "." : "#")));
      for (let i = 1; i < n; i += 2) g[i]![(i >> 1) % 2 === 0 ? m - 1 : 0] = ".";
      return render(g);
    };
    return ["1 1\n.\n", "1 5\n.....\n", "1 3\n.#.\n", "3 3\n...\n###\n...\n", random(10, 10, 0.2), random(50, 50, 0.3), random(300, 300, 0.25), random(1000, 1000, 0.3), random(1000, 1000, 0.4), open(1000, 1000), snake(999, 1000), snake(1000, 999)];
  },
};

export const lis: ProblemSeed = {
  slug: "longest-increasing-subsequence",
  title: "Longest Increasing Subsequence",
  difficulty: "hard",
  rating: 1700,
  tags: ["dp", "binary-search"],
  timeLimitMs: 1000,
  memoryLimitMb: 256,
  estimatedMinutes: 35,
  statement: "A subsequence is obtained by deleting zero or more elements without changing the order of the rest. Given an array, find the length of its longest strictly increasing subsequence.",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print the length of the longest strictly increasing subsequence.",
  constraints: "1 <= n <= 2 * 10^5\n-10^9 <= a_i <= 10^9",
  samples: [{ input: "8\n10 9 2 5 3 7 101 18\n", output: "4\n", explanation: "For example 2, 3, 7, 18." }, { input: "4\n7 7 7 7\n", output: "1\n", explanation: "Strictly increasing: equal elements do not count." }],
  hints: [
    "The simple dp[i] = 1 + max(dp[j]) over j < i with a_j < a_i is O(n^2), which is too slow for n = 2 * 10^5. Can you keep something smaller than dp?",
    "Maintain tails[k] = the smallest possible last value of an increasing subsequence of length k + 1. This array is always sorted.",
    "For each x, find the first position in tails whose value is >= x using lower_bound. If it is the end, push_back(x), otherwise overwrite it with x. The answer is tails.size(). Use lower_bound (not upper_bound) for strict increase.",
  ],
  editorial: "Patience-sorting technique. tails[k] stores the smallest tail of an increasing subsequence of length k + 1. Tails is increasing, so for each new element x we binary search the first tail >= x: replacing it keeps the tail as small as possible, and appending extends the longest length. Using `lower_bound` enforces strictness (equal values replace rather than extend). Note that tails is not itself the subsequence, only its length equals the answer.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<int> tails;
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    cout << tails.size() << "\\n";
    return 0;
}`,
  hidden: () => {
    const r = rng(35);
    const mk = (a: number[]) => `${a.length}\n${a.join(" ")}\n`;
    const inc = Array.from({ length: 200000 }, (_, i) => i - 100000);
    return [mk([1]), mk([2, 1]), mk([1, 2]), mk([5, 5, 5]), mk([3, 1, 2, 1, 8, 5, 6]), mk(arr(r, 100, -20, 20)), mk(arr(r, 2000, -1e9, 1e9)), mk(arr(r, 200000, -1e9, 1e9)), mk(inc), mk([...inc].reverse()), mk(Array(200000).fill(7)), mk(arr(r, 200000, 1, 100)), mk(inc.map((x, i) => (i % 2 ? x : -x)))];
  },
};

export const inversions: ProblemSeed = {
  slug: "count-inversions",
  title: "Count Inversions",
  difficulty: "hard",
  rating: 1800,
  tags: ["divide-and-conquer", "sorting", "data-structures"],
  timeLimitMs: 1500,
  memoryLimitMb: 256,
  estimatedMinutes: 40,
  statement: "An inversion is a pair of positions i < j with a_i > a_j. Count the inversions in the given array. An array sorted in non-decreasing order has none.",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print the number of inversions.",
  constraints: "1 <= n <= 2 * 10^5\n-10^9 <= a_i <= 10^9",
  samples: [{ input: "5\n2 4 1 3 5\n", output: "3\n", explanation: "The inversions are (2,1), (4,1) and (4,3)." }, { input: "3\n3 2 1\n", output: "3\n" }],
  hints: [
    "Checking all pairs is O(n^2) with about 2 * 10^10 pairs. You need roughly O(n log n).",
    "Merge sort: while merging two sorted halves, whenever you take an element from the right half, it is smaller than all remaining elements of the left half.",
    "In merge(), when right[j] < left[i] add (number of elements left in the left half) to the answer. Equal elements are not inversions, so take from the left on ties. The count can exceed 2^31, so use long long.",
  ],
  editorial: "Count inversions during merge sort. Split the array, count inversions inside each half recursively, then count the cross inversions while merging: if the next element comes from the right half, it forms an inversion with every element still waiting in the left half. Take the left element on ties because equal values are not inversions. An alternative is a Fenwick tree over compressed values. The maximum answer is n(n-1)/2 ~ 2 * 10^10, which does not fit in int.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
long long sortCount(vector<int> &a, vector<int> &tmp, int l, int r) {
    if (r - l <= 1) return 0;
    int m = (l + r) / 2;
    long long res = sortCount(a, tmp, l, m) + sortCount(a, tmp, m, r);
    int i = l, j = m, k = l;
    while (i < m || j < r) {
        if (j >= r || (i < m && a[i] <= a[j])) tmp[k++] = a[i++];
        else { res += m - i; tmp[k++] = a[j++]; }
    }
    for (int t = l; t < r; t++) a[t] = tmp[t];
    return res;
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<int> a(n), tmp(n);
    for (auto &x : a) cin >> x;
    cout << sortCount(a, tmp, 0, n) << "\\n";
    return 0;
}`,
  hidden: () => {
    const r = rng(36);
    const mk = (a: number[]) => `${a.length}\n${a.join(" ")}\n`;
    const inc = Array.from({ length: 200000 }, (_, i) => i);
    return [mk([1]), mk([1, 2]), mk([2, 1]), mk([5, 5, 5]), mk([3, 1, 2]), mk(arr(r, 100, -10, 10)), mk(arr(r, 1000, -1e9, 1e9)), mk(arr(r, 200000, -1e9, 1e9)), mk(inc), mk([...inc].reverse()), mk(Array(200000).fill(1)), mk(arr(r, 200000, 1, 5)), mk(r.shuffle(inc))];
  },
};
