import { rng } from "./rng";
import { fitBudget } from "./budget";
import type { ProblemSeed } from "./types";

type Spec = Omit<ProblemSeed, "timeLimitMs" | "memoryLimitMb" | "estimatedMinutes"> & { timeLimitMs?: number; estimatedMinutes?: number };

const P = (s: Spec): ProblemSeed => ({
  timeLimitMs: 1000,
  memoryLimitMb: 256,
  estimatedMinutes: { newbie: 8, easy: 15, medium: 30, hard: 50, expert: 75 }[s.difficulty],
  ...s,
});

type R = ReturnType<typeof rng>;
const arr = (r: R, n: number, lo: number, hi: number) => Array.from({ length: n }, () => r.int(lo, hi));
const J = (xs: (number | string)[]) => xs.join(" ");
const L = (xs: (number | string)[]) => xs.join("\n") + "\n";

// ---------------------------------------------------------------- newbie

const plateStack = P({
  slug: "plate-stack-commands",
  title: "Plate Stack Commands",
  difficulty: "newbie",
  rating: 800,
  tags: ["stack", "implementation"],
  statement:
    "A cafeteria keeps plates in a single stack. You are given a list of commands. `PUSH x` places a plate numbered x on top of the stack. `POP` removes the top plate (if the stack is empty, nothing happens). `TOP` asks which plate is on top right now. For every `TOP` command print the number of the top plate, or the word `EMPTY` if there are no plates.",
  inputFormat: "The first line contains q, the number of commands. Each of the next q lines is one command: `PUSH x`, `POP` or `TOP`.",
  outputFormat: "For every TOP command print one line: the number on the top plate or `EMPTY`.",
  constraints: "1 <= q <= 40000\n1 <= x <= 10^9",
  samples: [
    {
      input: "7\nPUSH 5\nPUSH 8\nTOP\nPOP\nTOP\nPOP\nTOP\n",
      output: "8\n5\nEMPTY\n",
      explanation: "After the two pushes the top is 8. After one pop the top is 5. After the second pop the stack is empty.",
    },
  ],
  hints: [
    "The most recently placed plate is the first one removed. Which container behaves this way?",
    "Keep a stack (a vector used from the back works). Push, pop and look at the last element in O(1).",
    "Check for emptiness before every POP and every TOP. Read the command word first, then the number only for PUSH.",
  ],
  editorial: "Simulate with a stack. PUSH appends, POP removes the last element when one exists, TOP prints the last element or EMPTY.\n\nComplexity: O(q).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int q;
    scanf("%d", &q);
    vector<long long> st;
    char s[16];
    while (q--) {
        scanf("%s", s);
        if (s[0] == 'T') {
            if (st.empty()) puts("EMPTY");
            else printf("%lld\\n", st.back());
        } else if (s[1] == 'U') {
            long long x;
            scanf("%lld", &x);
            st.push_back(x);
        } else if (!st.empty()) st.pop_back();
    }
}`,
  hidden: () => {
    const r = rng(5001);
    const gen = (q: number, pushP: number, maxv: number) => {
      const ops: string[] = [];
      for (let i = 0; i < q; i++) {
        const x = r.int(1, 100);
        ops.push(x <= pushP ? `PUSH ${r.int(1, maxv)}` : x <= pushP + (100 - pushP) / 2 ? "POP" : "TOP");
      }
      return `${q}\n${L(ops)}`;
    };
    return [
      "1\nTOP\n",
      "1\nPOP\n",
      "3\nPUSH 1000000000\nTOP\nTOP\n",
      "4\nPOP\nPOP\nPUSH 3\nTOP\n",
      gen(10, 50, 9),
      gen(30, 40, 100),
      gen(200, 30, 1000),
      gen(2000, 60, 1e9),
      gen(40000, 50, 1e9),
      gen(40000, 25, 1e9),
      gen(40000, 80, 1e9),
      `40000\n${L(Array.from({ length: 40000 }, (_, i) => (i < 39999 ? `PUSH ${i + 1}` : "TOP")))}`,
    ];
  },
});

const firstRepeat = P({
  slug: "first-repeated-value",
  title: "First Repeated Value",
  difficulty: "newbie",
  rating: 800,
  tags: ["set", "implementation"],
  statement:
    "Scan an array from left to right. The first moment you meet a value that you have already seen earlier in the array, you stop. Print that value. If every value in the array is different, print -1.",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print the first value that repeats an earlier one, or -1.",
  constraints: "1 <= n <= 60000\n1 <= a_i <= 10^9",
  samples: [
    { input: "6\n3 1 4 1 5 3\n", output: "1\n", explanation: "The second 1 (position 4) is the first element equal to an earlier one." },
    { input: "3\n1 2 3\n", output: "-1\n" },
  ],
  hints: [
    "You only need to know, for each new element, whether it appeared before.",
    "A hash set (or an ordered set) answers membership in O(1) / O(log n).",
    "Insert elements one by one; the first element whose insertion finds it already present is the answer. Remember the final -1.",
  ],
  editorial: "Keep a set of seen values. Process the array in order; if the current value is in the set print it and stop, otherwise insert it. If the loop ends print -1.\n\nComplexity: O(n log n) with std::set, O(n) expected with hashing.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    set<int> seen;
    for (int i = 0; i < n; i++) {
        int x;
        scanf("%d", &x);
        if (seen.count(x)) {
            printf("%d\\n", x);
            return 0;
        }
        seen.insert(x);
    }
    puts("-1");
}`,
  hidden: () => {
    const r = rng(5002);
    const f = (a: number[]) => `${a.length}\n${J(a)}\n`;
    return [
      f([5]),
      f([5, 5]),
      f([1, 2, 3, 4, 5]),
      f([7, 8, 9, 8, 7]),
      f([1e9, 1, 1e9]),
      f(arr(r, 20, 1, 8)),
      f(arr(r, 1000, 1, 1e9)),
      f(arr(r, 60000, 1, 1e9)),
      f(Array.from({ length: 60000 }, (_, i) => (i === 59999 ? 1 : i + 1))),
      f(Array.from({ length: 60000 }, (_, i) => 1e9 - i)),
      f(arr(r, 60000, 1, 200000)),
    ];
  },
});

const serviceDesk = P({
  slug: "service-desk-queue",
  title: "Service Desk Queue",
  difficulty: "newbie",
  rating: 800,
  tags: ["queue", "implementation"],
  statement:
    "A service desk serves customers strictly in the order they arrived. You are given a list of events. `ARRIVE name` puts a customer at the back of the line. `SERVE` serves the customer at the front of the line; print the customer's name, or `NOBODY` if the line is empty. After all events, print how many customers are still waiting.",
  inputFormat: "The first line contains q. Each of the next q lines is `ARRIVE name` (name is a lowercase word of length 1 to 8) or `SERVE`.",
  outputFormat: "For every SERVE print one line with the served name or `NOBODY`. Then print a final line with the number of customers still waiting.",
  constraints: "1 <= q <= 50000",
  samples: [
    {
      input: "6\nARRIVE ann\nARRIVE bob\nSERVE\nSERVE\nSERVE\nARRIVE cy\n",
      output: "ann\nbob\nNOBODY\n1\n",
    },
  ],
  hints: [
    "First come, first served: the earliest arrival leaves first.",
    "A queue gives you O(1) push at the back and pop from the front.",
    "Use a queue of strings. At SERVE check whether it is empty before reading the front.",
  ],
  editorial: "Simulate with a FIFO queue. ARRIVE pushes the name, SERVE pops the front (or prints NOBODY). The answer for the last line is the size of the queue.\n\nComplexity: O(q).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int q;
    cin >> q;
    queue<string> line;
    while (q--) {
        string c;
        cin >> c;
        if (c == "ARRIVE") {
            string s;
            cin >> s;
            line.push(s);
        } else if (line.empty()) cout << "NOBODY\\n";
        else {
            cout << line.front() << "\\n";
            line.pop();
        }
    }
    cout << line.size() << "\\n";
}`,
  hidden: () => {
    const r = rng(5003);
    const name = () => Array.from({ length: r.int(1, 8) }, () => String.fromCharCode(97 + r.int(0, 25))).join("");
    const gen = (q: number, arrP: number) => `${q}\n${L(Array.from({ length: q }, () => (r.int(1, 100) <= arrP ? `ARRIVE ${name()}` : "SERVE")))}`;
    return [
      "1\nSERVE\n",
      "1\nARRIVE z\n",
      "3\nARRIVE a\nSERVE\nSERVE\n",
      gen(12, 50),
      gen(60, 40),
      gen(500, 60),
      gen(5000, 50),
      gen(50000, 50),
      gen(50000, 80),
      gen(50000, 20),
      `50000\n${L(Array.from({ length: 50000 }, (_, i) => (i < 25000 ? `ARRIVE n${i % 10}` : "SERVE")))}`,
    ];
  },
});

// ---------------------------------------------------------------- easy

const nextGreater = P({
  slug: "next-greater-to-the-right",
  title: "Next Greater to the Right",
  difficulty: "easy",
  rating: 1000,
  tags: ["stack", "monotonic-stack"],
  statement:
    "For each element a_i of an array, find the value of the nearest element to its right that is strictly greater than a_i. If there is no such element, the answer for that position is -1.",
  inputFormat: "The first line contains n. The second line contains n integers a_1 ... a_n.",
  outputFormat: "Print n integers separated by spaces: the answer for every position.",
  constraints: "1 <= n <= 60000\n1 <= a_i <= 10^9",
  samples: [{ input: "7\n2 7 3 5 4 6 8\n", output: "7 8 5 6 6 8 -1\n" }],
  hints: [
    "Checking every element to the right takes O(n^2) in the worst case (for example a decreasing array).",
    "Process from the right and keep a stack of candidates; elements that are not greater than the current one can never be an answer for anything further left.",
    "Scan i from n down to 1. Pop while stack top <= a_i. The answer is the top (or -1). Then push a_i.",
  ],
  editorial: "Scan from right to left with a stack holding candidates in decreasing order from bottom to top... precisely, values that are still useful. For a_i pop all values <= a_i: they are hidden behind a_i for every element to the left. What remains on top, if any, is the nearest strictly greater value. Push a_i. Every element is pushed and popped once.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<long long> a(n), ans(n);
    for (auto &x : a) scanf("%lld", &x);
    vector<long long> st;
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && st.back() <= a[i]) st.pop_back();
        ans[i] = st.empty() ? -1 : st.back();
        st.push_back(a[i]);
    }
    for (int i = 0; i < n; i++) printf("%lld%c", ans[i], i + 1 < n ? ' ' : '\\n');
}`,
  hidden: () => {
    const r = rng(5004);
    const f = (a: number[]) => `${a.length}\n${J(a)}\n`;
    const N = 60000;
    return [
      f([1]),
      f([5, 5, 5]),
      f([1, 2, 3, 4, 5]),
      f([5, 4, 3, 2, 1]),
      f([3, 1, 2, 1, 4, 1]),
      f(arr(r, 15, 1, 6)),
      f(arr(r, 1000, 1, 1e9)),
      f(arr(r, N, 1, 1e9)),
      f(Array.from({ length: N }, (_, i) => 1e9 - i)),
      f(Array.from({ length: N }, (_, i) => i + 1)),
      f(arr(r, N, 1, 3)),
      f(Array.from({ length: N }, (_, i) => (i % 2 ? 1e9 : 1 + (i % 1000)))),
    ];
  },
});

const wordFreq = P({
  slug: "most-frequent-word",
  title: "Most Frequent Word",
  difficulty: "easy",
  rating: 900,
  tags: ["map", "strings"],
  statement:
    "You are given a list of words. Find the word that appears most often. If several words share the highest count, choose the lexicographically smallest of them. Print that word and its count.",
  inputFormat: "The first line contains n. The second line contains n lowercase words separated by spaces.",
  outputFormat: "Print the winning word and its number of occurrences, separated by a space.",
  constraints: "1 <= n <= 60000\nEach word has length between 1 and 10 and consists of lowercase letters.",
  samples: [
    { input: "6\nthe cat the dog cat the\n", output: "the 3\n" },
    { input: "5\nb a b a c\n", output: "a 2\n", explanation: "a and b both appear twice; a is smaller." },
  ],
  hints: [
    "You need to count how many times each distinct word occurs.",
    "A map from word to count does this. Think about how to break ties.",
    "std::map iterates in lexicographic order; take the first entry with the maximum count and update only on a strictly larger count.",
  ],
  editorial: "Count occurrences in a map<string,int>. Iterate the map in key order and keep the entry with the largest count, replacing it only when a strictly larger count appears; this keeps the lexicographically smallest word among ties.\n\nComplexity: O(n log n * L) with L the word length.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    cin >> n;
    map<string, int> c;
    for (int i = 0; i < n; i++) {
        string s;
        cin >> s;
        c[s]++;
    }
    string best;
    int bc = 0;
    for (auto &p : c)
        if (p.second > bc) {
            bc = p.second;
            best = p.first;
        }
    cout << best << " " << bc << "\\n";
}`,
  hidden: () => {
    const r = rng(5005);
    const w = (len: number) => Array.from({ length: len }, () => String.fromCharCode(97 + r.int(0, 25))).join("");
    const f = (a: string[]) => `${a.length}\n${J(a)}\n`;
    const vocab = (k: number, len: number) => Array.from({ length: k }, () => w(r.int(1, len)));
    const pickFrom = (v: string[], n: number) => Array.from({ length: n }, () => r.pick(v));
    const v5 = vocab(5, 3);
    const v200 = vocab(200, 10);
    const v5000 = vocab(5000, 10);
    return [
      f(["a"]),
      f(["zz", "zz", "aa", "aa"]),
      f(["b", "c", "a"]),
      f(pickFrom(v5, 20)),
      f(pickFrom(v200, 500)),
      f(pickFrom(v5000, 60000)),
      f(pickFrom(v200, 60000)),
      f(pickFrom(vocab(2, 10), 60000)),
      f(Array.from({ length: 60000 }, () => w(10))),
      f(Array.from({ length: 60000 }, (_, i) => (i % 2 ? "ab" : "aa"))),
    ];
  },
});

const bracketFix = P({
  slug: "min-bracket-insertions",
  title: "Minimum Bracket Insertions",
  difficulty: "easy",
  rating: 1000,
  tags: ["stack", "strings", "greedy"],
  statement:
    "A string made only of the characters `(` and `)` is balanced if every `)` can be matched with an earlier unmatched `(` and every `(` gets matched. You may insert extra brackets at any positions (you may not delete or change existing ones). Find the minimum number of insertions needed to make the string balanced.",
  inputFormat: "One line containing the string s.",
  outputFormat: "Print the minimum number of inserted characters.",
  constraints: "1 <= |s| <= 200000",
  samples: [
    { input: "())(\n", output: "2\n", explanation: "Insert one ( at the start and one ) at the end: (())()." },
    { input: "(()\n", output: "1\n" },
  ],
  hints: [
    "Scan left to right and track how many `(` are currently waiting for a partner.",
    "When you see `)` with no waiting `(`, you must insert a `(` for it. Whatever is still waiting at the end needs a `)` each.",
    "Keep two counters: open (waiting) and added. The answer is added + open at the end.",
  ],
  editorial: "Greedy counter that mimics a stack of open brackets. On `(` increment open. On `)` decrement open if positive, otherwise it is unmatched and we count one insertion. At the end every remaining open bracket needs one closing bracket. The greedy is optimal because each unmatched `)` forces its own insertion regardless of the future.\n\nComplexity: O(|s|).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    cin >> s;
    long long open = 0, add = 0;
    for (char c : s) {
        if (c == '(') open++;
        else if (open > 0) open--;
        else add++;
    }
    cout << add + open << "\\n";
}`,
  hidden: () => {
    const r = rng(5006);
    const rs = (n: number, p: number) => Array.from({ length: n }, () => (r.int(1, 100) <= p ? "(" : ")")).join("");
    const N = 200000;
    return [
      "(",
      ")",
      "()",
      ")(",
      "((()))",
      "(((",
      ")))",
      rs(30, 50),
      rs(1000, 50),
      rs(N, 50),
      rs(N, 70),
      rs(N, 30),
      "(".repeat(N),
      ")".repeat(N),
      "()".repeat(N / 2),
    ].map((x) => `${x}\n`);
  },
});

const clusters = P({
  slug: "network-clusters",
  title: "Network Clusters",
  difficulty: "easy",
  rating: 1100,
  tags: ["dsu", "graphs"],
  statement:
    "There are n computers numbered 1..n and m cables; cable i directly connects computers u_i and v_i. Two computers are in the same cluster if they can reach each other through cables. Print the number of clusters and the size of the largest cluster.",
  inputFormat: "The first line contains n and m. Each of the next m lines contains two integers u and v (cables may repeat; u may equal v).",
  outputFormat: "Print two integers: the number of clusters and the size of the largest cluster.",
  constraints: "1 <= n <= 100000\n0 <= m <= 50000\n1 <= u, v <= n",
  samples: [{ input: "6 3\n1 2\n2 3\n4 5\n", output: "3 3\n", explanation: "Clusters {1,2,3}, {4,5}, {6}." }],
  hints: [
    "Each cable merges two groups. You never need to split groups.",
    "A disjoint set union (union-find) with a size array supports merging and size lookup.",
    "Union every cable; the cluster count is the number of roots, and the largest size is the maximum of sz[root].",
  ],
  editorial: "Use DSU with path compression and union by size. Start with n singleton sets; for each cable union the endpoints. At the end count roots and take the maximum root size. Self loops and repeated cables are harmless.\n\nComplexity: O((n + m) alpha(n)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int p[100005], sz[100005];
int fnd(int x) { return p[x] == x ? x : p[x] = fnd(p[x]); }
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    for (int i = 1; i <= n; i++) p[i] = i, sz[i] = 1;
    while (m--) {
        int u, v;
        scanf("%d %d", &u, &v);
        u = fnd(u), v = fnd(v);
        if (u == v) continue;
        if (sz[u] < sz[v]) swap(u, v);
        p[v] = u;
        sz[u] += sz[v];
    }
    int cnt = 0, best = 0;
    for (int i = 1; i <= n; i++)
        if (fnd(i) == i) cnt++, best = max(best, sz[i]);
    printf("%d %d\\n", cnt, best);
}`,
  hidden: () => {
    const r = rng(5007);
    const f = (n: number, es: number[][]) => `${n} ${es.length}\n${L(es.map((e) => J(e)))}`;
    const rnd = (n: number, m: number) => Array.from({ length: m }, () => [r.int(1, n), r.int(1, n)]);
    return [
      f(1, []),
      f(1, [[1, 1]]),
      f(5, []),
      f(4, [[1, 2], [2, 1], [3, 3]]),
      f(10, rnd(10, 6)),
      f(50, rnd(50, 30)),
      f(1000, rnd(1000, 400)),
      f(100000, rnd(100000, 50000)),
      f(100000, rnd(100000, 20000)),
      f(60000, rnd(60000, 50000)),
      f(100000, Array.from({ length: 50000 }, (_, i) => [i + 1, i + 2])),
      f(50001, Array.from({ length: 50000 }, (_, i) => [1, i + 2])),
    ];
  },
});

const kthLargestStream = P({
  slug: "kth-largest-so-far",
  title: "K-th Largest So Far",
  difficulty: "easy",
  rating: 1100,
  tags: ["priority-queue", "heap"],
  statement:
    "Numbers arrive one at a time. After each arrival, print the k-th largest value among all numbers received so far (counting duplicates separately), or -1 if fewer than k numbers have arrived.",
  inputFormat: "The first line contains n and k. The second line contains the n numbers in arrival order.",
  outputFormat: "Print n integers separated by spaces: the answer after each arrival.",
  constraints: "1 <= k <= n <= 60000\n1 <= a_i <= 10^9",
  samples: [{ input: "4 2\n5 1 7 3\n", output: "-1 1 5 5\n", explanation: "After 5,1 the second largest is 1; after 7 it is 5; after 3 the numbers 7,5,3,1 give 5." }],
  hints: [
    "Re-sorting after every arrival is far too slow when n is large.",
    "Only the k largest values matter. Keep them in a min-heap of size at most k; its top is the k-th largest.",
    "Push each number. If the heap grows beyond k, pop the smallest. If size < k print -1 else print the top.",
  ],
  editorial: "Maintain a min-heap containing the k largest values seen so far. A new value is pushed; if the heap has more than k elements the smallest is removed (it can never be among the top k again because values only get added). When the heap has exactly k elements the top is the k-th largest.\n\nComplexity: O(n log k).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    priority_queue<long long, vector<long long>, greater<long long>> pq;
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        pq.push(x);
        if ((int)pq.size() > k) pq.pop();
        printf("%lld%c", (int)pq.size() < k ? -1LL : pq.top(), i + 1 < n ? ' ' : '\\n');
    }
}`,
  hidden: () => {
    const r = rng(5008);
    const f = (k: number, a: number[]) => `${a.length} ${k}\n${J(a)}\n`;
    const N = 60000;
    return [
      f(1, [4]),
      f(1, [3, 1, 4, 1, 5]),
      f(3, [3, 1, 4, 1, 5]),
      f(5, [2, 2, 2, 2, 2]),
      f(2, arr(r, 20, 1, 10)),
      f(10, arr(r, 500, 1, 1e9)),
      f(1, arr(r, N, 1, 1e9)),
      f(N, arr(r, N, 1, 1e9)),
      f(1000, arr(r, N, 1, 1e9)),
      f(30000, arr(r, N, 1, 1e9)),
      f(100, Array.from({ length: N }, (_, i) => i + 1)),
      f(100, Array.from({ length: N }, (_, i) => N - i)),
    ];
  },
});

// ---------------------------------------------------------------- medium

const windowMaxTotal = P({
  slug: "window-maximum-total",
  title: "Window Maximum Total",
  difficulty: "medium",
  rating: 1300,
  tags: ["deque", "monotonic-queue", "sliding-window"],
  statement:
    "Given an array of n integers and a window length k, consider every contiguous window of exactly k elements (there are n - k + 1 of them). Print the sum of the maximum values of all these windows.",
  inputFormat: "The first line contains n and k. The second line contains n integers.",
  outputFormat: "Print one integer: the sum of the window maxima.",
  constraints: "1 <= k <= n <= 120000\n0 <= a_i <= 10^4",
  samples: [{ input: "5 3\n1 3 2 5 4\n", output: "13\n", explanation: "Window maxima are 3, 5, 5." }],
  hints: [
    "Scanning each window costs O(k); with n and k both large that is too slow.",
    "Keep a deque of indices whose values are decreasing. The front is always the maximum of the current window.",
    "For each new index pop smaller values from the back, push the index, drop the front if it left the window, and add a[front] once the first window is complete.",
  ],
  editorial: "Monotonic deque. When adding index i, remove back indices with values <= a[i] (they can never be a maximum while i is in the window, and i outlives them). Remove the front if its index is <= i - k. After processing i >= k-1 the front holds the window maximum. Sum in 64-bit.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<int> a(n);
    for (auto &x : a) scanf("%d", &x);
    deque<int> dq;
    long long sum = 0;
    for (int i = 0; i < n; i++) {
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();
        dq.push_back(i);
        if (dq.front() <= i - k) dq.pop_front();
        if (i >= k - 1) sum += a[dq.front()];
    }
    printf("%lld\\n", sum);
}`,
  hidden: () => {
    const r = rng(5009);
    const f = (k: number, a: number[]) => `${a.length} ${k}\n${J(a)}\n`;
    const N = 120000;
    return [
      f(1, [0]),
      f(1, [4, 2, 9]),
      f(3, [4, 2, 9]),
      f(2, [5, 5, 5, 5]),
      f(4, arr(r, 30, 0, 20)),
      f(7, arr(r, 1000, 0, 1e4)),
      f(60000, arr(r, N, 0, 1e4)),
      f(N, arr(r, N, 0, 1e4)),
      f(5000, arr(r, N, 0, 1e4)),
      f(60000, Array.from({ length: N }, (_, i) => i % 10000)),
      f(60000, Array.from({ length: N }, (_, i) => 10000 - (i % 10000))),
      f(1, arr(r, N, 0, 1e4)),
    ];
  },
});

const circleElimination = P({
  slug: "circle-elimination-order",
  title: "Circle Elimination Order",
  difficulty: "medium",
  rating: 1600,
  tags: ["josephus", "fenwick-tree", "simulation", "data-structures"],
  statement:
    "n people stand in a circle numbered 1..n clockwise. Counting starts at person 1 (person 1 is counted as 1). Every k-th counted person leaves the circle; counting then resumes with the next person still in the circle (that person is counted as 1). This continues until nobody is left. Print the numbers of the people in the order they leave.",
  inputFormat: "One line with two integers n and k.",
  outputFormat: "Print n integers separated by spaces: the order of leaving.",
  constraints: "1 <= n <= 300000\n1 <= k <= 10^9",
  samples: [
    { input: "7 3\n", output: "3 6 2 7 5 1 4\n" },
    { input: "5 1\n", output: "1 2 3 4 5\n" },
  ],
  hints: [
    "With k up to 10^9 you cannot walk k steps. Only k mod (current size) matters, and walking one by one in a list is too slow anyway.",
    "Keep the remaining people in order and find the person at a given rank quickly. A Fenwick tree of 0/1 flags supports 'find the r-th remaining person' and deletion in O(log n).",
    "Keep cur = rank (0-based) of the person where counting starts. With m people left: cur = (cur + k - 1) mod m, remove the person with rank cur; cur stays valid for the next round.",
  ],
  editorial: "Let m be the current number of people and cur the 0-based rank of the person counted as 1. The leaving person has rank (cur + k - 1) mod m. After deleting that person, the next person in the circle has the same rank cur (modulo the new size, handled by the mod next round). To find a person by rank and delete them we use a Fenwick tree over 0/1 flags with binary descent for the r-th one.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    long long k;
    scanf("%d %lld", &n, &k);
    vector<int> bit(n + 1);
    for (int i = 1; i <= n; i++) bit[i] = i & -i;
    int LOG = 1;
    while ((1 << LOG) <= n) LOG++;
    long long cur = 0;
    for (int m = n; m >= 1; m--) {
        cur = (cur + k - 1) % m;
        int r = cur + 1, pos = 0;
        for (int b = LOG; b >= 0; b--) {
            int np = pos + (1 << b);
            if (np <= n && bit[np] < r) {
                pos = np;
                r -= bit[np];
            }
        }
        int p = pos + 1;
        printf("%d%c", p, m > 1 ? ' ' : '\\n');
        for (int i = p; i <= n; i += i & -i) bit[i]--;
    }
}`,
  hidden: () => {
    const f = (n: number, k: number) => `${n} ${k}\n`;
    const r = rng(5010);
    return [
      f(1, 1),
      f(1, 1000000000),
      f(2, 2),
      f(10, 2),
      f(10, 10),
      f(17, 5),
      f(100, 1000000000),
      f(1000, r.int(1, 1e9)),
      f(300000, 1),
      f(300000, 2),
      f(300000, 1000000000),
      f(300000, 299999),
      f(299999, r.int(1, 1e9)),
      f(250000, 7),
    ];
  },
});

const cheapestRowPicks = P({
  slug: "k-cheapest-row-picks",
  title: "K Cheapest Row Picks",
  difficulty: "medium",
  rating: 1700,
  tags: ["priority-queue", "heap", "sorting"],
  statement:
    "A table has n rows and m columns of positive costs. A pick chooses exactly one cell from every row (different column choices count as different picks, even if the sums are equal). The cost of a pick is the sum of the chosen cells. Print the k smallest pick costs in non-decreasing order.",
  inputFormat: "The first line contains n, m and k. Each of the next n lines contains m integers: the costs of that row.",
  outputFormat: "Print k integers separated by spaces: the k smallest pick costs in non-decreasing order.",
  constraints: "1 <= n, m;  n * m <= 60000\n1 <= k <= min(100, m^n)\n1 <= cost <= 10^6",
  samples: [{ input: "2 3 4\n1 4 5\n2 2 9\n", output: "3 3 6 6\n", explanation: "Picks 1+2 (two ways), 4+2 (two ways), ... give 3,3,6,6,7,7,10,..." }],
  hints: [
    "There are m^n picks, far too many to list. But only the k smallest matter, and you can build them row by row.",
    "Keep the k smallest sums for the first i rows. To add row i+1, you need the k smallest sums of (old sum + new cell): a merge of sorted lists.",
    "Sort the new row. Put (old[0] + row[j], 0, j) for every j into a min-heap; pop the smallest, and push the next old sum with the same j. Stop after k pops.",
  ],
  editorial: "Let A be the sorted list of the k smallest sums of the first i rows. For the next row B (sorted), the candidates are A[x] + B[j]. For fixed j the sums are increasing in x, so we merge m sorted streams with a heap: start with x = 0 for each j, pop the smallest, and advance x for that j. After k pops we have the new list. Repeat for every row.\n\nComplexity: O(n * (m + k) log m) roughly, i.e. O(nm log m + n k log m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n, m, k;
    scanf("%d %d %d", &n, &m, &k);
    vector<ll> A = {0};
    for (int r = 0; r < n; r++) {
        vector<ll> B(m);
        for (auto &x : B) scanf("%lld", &x);
        sort(B.begin(), B.end());
        priority_queue<tuple<ll, int, int>, vector<tuple<ll, int, int>>, greater<tuple<ll, int, int>>> pq;
        for (int j = 0; j < m; j++) pq.push({A[0] + B[j], 0, j});
        vector<ll> C;
        while ((int)C.size() < k && !pq.empty()) {
            auto [s, i, j] = pq.top();
            pq.pop();
            C.push_back(s);
            if (i + 1 < (int)A.size()) pq.push({A[i + 1] + B[j], i + 1, j});
        }
        A = C;
    }
    for (int i = 0; i < k; i++) printf("%lld%c", A[i], i + 1 < k ? ' ' : '\\n');
}`,
  hidden: () => {
    const r = rng(5011);
    const f = (n: number, m: number, k: number, hi = 1e6) => `${n} ${m} ${k}\n${L(Array.from({ length: n }, () => J(arr(r, m, 1, hi))))}`;
    return [
      f(1, 1, 1),
      f(1, 5, 3, 10),
      f(2, 3, 4, 9),
      f(3, 2, 8, 5),
      f(3, 3, 20, 4),
      f(5, 4, 100, 1000),
      f(10, 10, 100, 100),
      f(2, 30000, 100),
      f(60000, 1, 1),
      f(30000, 2, 100),
      f(1000, 60, 100),
      f(200, 300, 100),
      f(12, 5000, 100, 5),
      f(100, 600, 100, 1000000),
    ];
  },
});

const shortestJobFirst = P({
  slug: "shortest-job-first-finish",
  title: "Shortest Job First",
  difficulty: "medium",
  rating: 1400,
  tags: ["priority-queue", "simulation", "sorting"],
  statement:
    "A single machine runs jobs one at a time without interruption. Job i arrives at time t_i and needs d_i time units. Whenever the machine becomes free (or at time 0), it picks, among the jobs that have already arrived (t <= current time) and are not yet run, the one with the smallest d; ties are broken by the smaller index. If no job is waiting, the machine idles until the next arrival. Print the finishing time of every job, in input order.",
  inputFormat: "The first line contains n. Each of the next n lines contains t_i and d_i.",
  outputFormat: "Print n integers separated by spaces: the finishing time of job 1, job 2, ..., job n.",
  constraints: "1 <= n <= 50000\n0 <= t_i <= 10^5\n1 <= d_i <= 10^5",
  samples: [{ input: "4\n0 7\n2 4\n4 1\n5 4\n", output: "7 12 8 16\n", explanation: "Job 1 runs 0-7. At time 7 jobs 2,3,4 wait; job 3 (d=1) runs 7-8, then job 2 runs 8-12, then job 4 runs 12-16." }],
  hints: [
    "Simulate time. The only decision point is when the machine becomes free.",
    "Sort jobs by arrival. Keep a min-heap of arrived, unstarted jobs keyed by (d, index).",
    "At each step: if the heap is empty jump the clock to the next arrival; push everything with t <= clock; pop the best job; clock += d and record the finish time.",
  ],
  editorial: "Sort by arrival time. Maintain a clock and a heap ordered by (d, index). Loop until all jobs ran: if the heap is empty set clock = max(clock, next arrival); move all arrived jobs into the heap; pop the top job, advance the clock by its duration and store it as the finishing time. Each job is pushed and popped once.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n;
    scanf("%d", &n);
    vector<ll> t(n), d(n), fin(n);
    for (int i = 0; i < n; i++) scanf("%lld %lld", &t[i], &d[i]);
    vector<int> ord(n);
    iota(ord.begin(), ord.end(), 0);
    sort(ord.begin(), ord.end(), [&](int a, int b) { return t[a] < t[b]; });
    priority_queue<pair<ll, int>, vector<pair<ll, int>>, greater<pair<ll, int>>> pq;
    ll clock = 0;
    int ptr = 0, done = 0;
    while (done < n) {
        if (pq.empty()) clock = max(clock, t[ord[ptr]]);
        while (ptr < n && t[ord[ptr]] <= clock) {
            pq.push({d[ord[ptr]], ord[ptr]});
            ptr++;
        }
        auto [dd, id] = pq.top();
        pq.pop();
        clock += dd;
        fin[id] = clock;
        done++;
    }
    for (int i = 0; i < n; i++) printf("%lld%c", fin[i], i + 1 < n ? ' ' : '\\n');
}`,
  hidden: () => {
    const r = rng(5012);
    const f = (js: number[][]) => `${js.length}\n${L(js.map((j) => J(j)))}`;
    const rj = (n: number, tmax: number, dmax: number) => Array.from({ length: n }, () => [r.int(0, tmax), r.int(1, dmax)]);
    const N = 50000;
    return [
      f([[0, 1]]),
      f([[5, 3]]),
      f([[0, 3], [0, 3], [0, 3]]),
      f([[100, 1], [0, 1], [50, 1]]),
      f(rj(10, 10, 5)),
      f(rj(100, 100, 20)),
      f(rj(2000, 100000, 100)),
      f(rj(N, 100000, 100000)),
      f(rj(N, 1000, 100000)),
      f(rj(N, 100000, 3)),
      f(rj(N, 0, 100000)),
      f(Array.from({ length: N }, (_, i) => [0, 100000 - (i % 100000)])),
      f(Array.from({ length: N }, (_, i) => [Math.min(100000, i * 2), r.int(1, 10)])),
    ];
  },
});

const coveredLength = P({
  slug: "covered-length-timeline",
  title: "Covered Length Timeline",
  difficulty: "medium",
  rating: 1500,
  tags: ["map", "set", "intervals", "data-structures"],
  statement:
    "A long fence has integer positions. You paint segments one after another; painting the half-open segment [l, r) covers all unit cells l, l+1, ..., r-1 (cells already painted stay painted). After each painting operation print the total number of painted unit cells.",
  inputFormat: "The first line contains q. Each of the next q lines contains l and r.",
  outputFormat: "Print q integers separated by spaces: the number of painted cells after each operation.",
  constraints: "1 <= q <= 40000\n1 <= l < r <= 10^6",
  samples: [{ input: "4\n1 4\n6 8\n3 7\n10 11\n", output: "3 5 7 8\n", explanation: "After [3,7): cells 1..7 are painted (7 cells). Then one more cell (10)." }],
  hints: [
    "Painting every cell of every segment is too slow for long segments; keep painted cells as disjoint intervals instead.",
    "Store disjoint, non-touching intervals in an ordered map keyed by their left end. A new segment may overlap several of them.",
    "Find the first stored interval that could overlap (the one before upper_bound(l) if it reaches l). Absorb all intervals with start <= r, subtract their lengths, insert the merged interval, add its length.",
  ],
  editorial: "Keep an ordered map from start to end of disjoint painted intervals and the running total. For a new segment [l, r): start at the interval just before upper_bound(l) if it ends at or after l, else at upper_bound(l). While the current interval starts at or before r, extend l and r to the union, subtract the interval length from the total and erase it. Insert [l, r) and add r - l. Each interval is erased at most once after being inserted, so the total work is amortized.\n\nComplexity: O(q log q).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int q;
    scanf("%d", &q);
    map<int, int> iv;
    ll total = 0;
    for (int i = 0; i < q; i++) {
        int l, r;
        scanf("%d %d", &l, &r);
        auto it = iv.upper_bound(l);
        if (it != iv.begin()) {
            auto pv = prev(it);
            if (pv->second >= l) it = pv;
        }
        while (it != iv.end() && it->first <= r) {
            l = min(l, it->first);
            r = max(r, it->second);
            total -= it->second - it->first;
            it = iv.erase(it);
        }
        iv[l] = r;
        total += r - l;
        printf("%lld%c", total, i + 1 < q ? ' ' : '\\n');
    }
}`,
  hidden: () => {
    const r = rng(5013);
    const f = (s: number[][]) => `${s.length}\n${L(s.map((x) => J(x)))}`;
    const rs = (q: number, maxv: number, maxlen: number) =>
      Array.from({ length: q }, () => {
        const l = r.int(1, maxv - 1);
        return [l, Math.min(maxv, l + r.int(1, maxlen))];
      });
    const Q = 40000;
    return [
      f([[1, 2]]),
      f([[1, 1000000]]),
      f([[5, 10], [5, 10], [1, 5], [10, 12]]),
      f([[1, 3], [5, 7], [3, 5]]),
      f(rs(20, 30, 8)),
      f(rs(500, 1000, 20)),
      f(rs(Q, 1000000, 1000000)),
      f(rs(Q, 1000000, 100)),
      f(rs(Q, 1000000, 5)),
      f(Array.from({ length: Q }, (_, i) => [i * 25 + 1, i * 25 + 11])),
      f(Array.from({ length: Q }, (_, i) => [Q - i, 1000000 - i])),
      f(Array.from({ length: Q }, (_, i) => [i * 2 + 1, i * 2 + 2])),
      f(rs(Q, 100, 100)),
    ];
  },
});

const lruReplay = P({
  slug: "lru-cache-replay",
  title: "LRU Cache Replay",
  difficulty: "medium",
  rating: 1300,
  tags: ["linked-list", "map", "simulation", "design"],
  statement:
    "A cache holds at most c key-value pairs. The cache starts empty. `G k` looks up key k: print its value, or -1 if it is not in the cache; a successful lookup makes k the most recently used key. `P k v` stores value v for key k (overwriting an existing value) and makes k the most recently used key; if the cache then holds more than c keys, the least recently used key is evicted. After all operations print the final contents.",
  inputFormat: "The first line contains c and q. Each of the next q lines is `G k` or `P k v`.",
  outputFormat: "For every G operation print one line with the value or -1. Then print a line with the number of keys in the cache, and a line with those keys from the most recently used to the least recently used (an empty line if the cache is empty).",
  constraints: "1 <= c <= 100000\n1 <= q <= 45000\n1 <= k <= 100000\n1 <= v <= 10^6",
  samples: [
    {
      input: "2 7\nP 1 10\nP 2 20\nG 1\nP 3 30\nG 2\nG 3\nP 1 11\n",
      output: "10\n-1\n30\n2\n1 3\n",
      explanation: "G 1 refreshes key 1, so P 3 evicts key 2. G 2 misses. P 1 11 updates key 1 and makes it the newest, leaving order 1, 3.",
    },
  ],
  hints: [
    "You need to find a key quickly and also to know which key is least recently used.",
    "Combine a doubly linked list ordered by recency with a hash map from key to list node.",
    "On every access move the node to the front. On overflow remove the back node and erase its key from the map. std::list with an unordered_map of iterators does it.",
  ],
  editorial: "Keep a std::list of (key, value) ordered from most to least recently used, plus an unordered_map from key to list iterator. G: if present splice the node to the front and print the value. P: update or insert at the front; if size > c pop_back and erase from the map. Finally print the list order.\n\nComplexity: O(q) expected.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int c, q;
    scanf("%d %d", &c, &q);
    list<pair<int, int>> lst;
    unordered_map<int, list<pair<int, int>>::iterator> mp;
    while (q--) {
        char t;
        int k;
        scanf(" %c %d", &t, &k);
        if (t == 'G') {
            auto it = mp.find(k);
            if (it == mp.end()) puts("-1");
            else {
                lst.splice(lst.begin(), lst, it->second);
                printf("%d\\n", it->second->second);
            }
        } else {
            int v;
            scanf("%d", &v);
            auto it = mp.find(k);
            if (it != mp.end()) {
                it->second->second = v;
                lst.splice(lst.begin(), lst, it->second);
            } else {
                lst.push_front({k, v});
                mp[k] = lst.begin();
                if ((int)lst.size() > c) {
                    mp.erase(lst.back().first);
                    lst.pop_back();
                }
            }
        }
    }
    printf("%d\\n", (int)lst.size());
    bool first = true;
    for (auto &p : lst) {
        if (!first) printf(" ");
        first = false;
        printf("%d", p.first);
    }
    printf("\\n");
}`,
  hidden: () => {
    const r = rng(5014);
    const gen = (c: number, q: number, keys: number, getP: number) => {
      const ops: string[] = [];
      for (let i = 0; i < q; i++) ops.push(r.int(1, 100) <= getP ? `G ${r.int(1, keys)}` : `P ${r.int(1, keys)} ${r.int(1, 1e6)}`);
      return `${c} ${q}\n${L(ops)}`;
    };
    return [
      "1 1\nG 5\n",
      "1 3\nP 1 5\nP 2 6\nG 1\n",
      "3 6\nP 1 1\nP 2 2\nP 3 3\nG 1\nP 4 4\nG 2\n",
      gen(3, 30, 6, 50),
      gen(5, 200, 10, 50),
      gen(100, 5000, 300, 40),
      gen(1000, 45000, 2000, 50),
      gen(20000, 45000, 100000, 30),
      gen(100000, 45000, 100000, 50),
      gen(50, 45000, 100, 50),
      gen(1, 45000, 3, 50),
      `20 45000\n${L(Array.from({ length: 45000 }, (_, i) => `P ${(i % 20) + 1} ${i + 1}`))}`,
    ];
  },
});

const skylineRect = P({
  slug: "skyline-largest-rectangle",
  title: "Skyline Largest Rectangle",
  difficulty: "medium",
  rating: 1500,
  tags: ["stack", "monotonic-stack"],
  statement:
    "A skyline consists of n adjacent buildings, each of width 1, with heights h_1 ... h_n. A rectangle with sides parallel to the axes must lie completely inside the skyline union (its bottom on the ground). Find the maximum possible area of such a rectangle.",
  inputFormat: "The first line contains n. The second line contains n integers h_1 ... h_n.",
  outputFormat: "Print the maximum area.",
  constraints: "1 <= n <= 80000\n0 <= h_i <= 10^6",
  samples: [{ input: "6\n2 1 5 6 2 3\n", output: "10\n", explanation: "Buildings 3 and 4 (heights 5 and 6) give 5 * 2 = 10." }],
  hints: [
    "An optimal rectangle can be assumed to have height equal to some building h_i. How far can it extend left and right?",
    "For each i, find the nearest strictly smaller building on both sides; a monotonic stack finds all of them in O(n).",
    "Process left to right with a stack of increasing heights. When h_i is smaller than the top, pop and compute area = height * (i - newTop - 1). Add a sentinel 0 at the end.",
  ],
  editorial: "For each building the widest rectangle of its height spans from the nearest smaller bar on the left to the nearest smaller bar on the right. A stack with increasing heights computes both borders: when bar i causes bar j to be popped, i is the right border and the new top is the left border. Area is h_j * (i - left - 1). A final sentinel of height 0 flushes the stack. Area needs 64-bit (up to 8*10^10).\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n;
    scanf("%d", &n);
    vector<ll> h(n + 1, 0);
    for (int i = 0; i < n; i++) scanf("%lld", &h[i]);
    vector<int> st;
    ll best = 0;
    for (int i = 0; i <= n; i++) {
        while (!st.empty() && h[st.back()] >= h[i]) {
            ll height = h[st.back()];
            st.pop_back();
            int left = st.empty() ? -1 : st.back();
            best = max(best, height * (i - left - 1));
        }
        st.push_back(i);
    }
    printf("%lld\\n", best);
}`,
  hidden: () => {
    const r = rng(5015);
    const f = (a: number[]) => `${a.length}\n${J(a)}\n`;
    const N = 80000;
    return [
      f([0]),
      f([7]),
      f([3, 3, 3, 3]),
      f([1, 2, 3, 4, 5]),
      f([5, 4, 3, 2, 1]),
      f([2, 0, 2]),
      f(arr(r, 15, 0, 10)),
      f(arr(r, 1000, 0, 1e6)),
      f(arr(r, N, 0, 1e6)),
      f(Array.from({ length: N }, () => 1e6)),
      f(Array.from({ length: N }, (_, i) => i + 1)),
      f(Array.from({ length: N }, (_, i) => N - i)),
      f(arr(r, N, 500000, 1000000)),
      f(Array.from({ length: N }, (_, i) => (i < N / 2 ? i + 1 : N - i))),
    ];
  },
});

const rangeMinPos = P({
  slug: "range-minimum-with-position",
  title: "Range Minimum with Position",
  difficulty: "medium",
  rating: 1300,
  tags: ["sparse-table", "rmq", "data-structures"],
  statement:
    "You are given a fixed array of n integers and q queries. Each query gives positions l and r (1-indexed, l <= r). Print the minimum value among a_l ... a_r together with the leftmost position in [l, r] where this minimum occurs.",
  inputFormat: "The first line contains n and q. The second line contains the n integers. Each of the next q lines contains l and r.",
  outputFormat: "For each query print two integers on one line: the minimum value and its leftmost position.",
  constraints: "1 <= n <= 40000\n1 <= q <= 30000\n1 <= a_i <= 10^5\n1 <= l <= r <= n",
  samples: [{ input: "6 3\n5 2 8 2 9 1\n1 5\n3 4\n6 6\n", output: "2 2\n2 4\n1 6\n" }],
  hints: [
    "The array never changes, so you can afford to precompute something once and answer each query in O(1).",
    "A sparse table stores the answer for every segment of length 2^j. Overlapping two such segments covers any range, which is fine for min.",
    "Store indices instead of values and compare by (value, index) so ties resolve to the leftmost position. Use floor(log2(len)) from a precomputed table.",
  ],
  editorial: "Build sp[j][i] = index of the smallest element (leftmost on ties) in [i, i + 2^j). A query [l, r] uses j = floor(log2(r - l + 1)) and combines sp[j][l] and sp[j][r - 2^j + 1]; because min is idempotent, overlap is harmless, and breaking ties by smaller index yields the leftmost position.\n\nComplexity: O(n log n + q).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, q;
    scanf("%d %d", &n, &q);
    vector<int> a(n);
    for (auto &x : a) scanf("%d", &x);
    int K = 1;
    while ((1 << K) <= n) K++;
    vector<vector<int>> sp(K, vector<int>(n));
    for (int i = 0; i < n; i++) sp[0][i] = i;
    auto better = [&](int x, int y) { return (a[x] < a[y] || (a[x] == a[y] && x < y)) ? x : y; };
    for (int j = 1; j < K; j++)
        for (int i = 0; i + (1 << j) <= n; i++) sp[j][i] = better(sp[j - 1][i], sp[j - 1][i + (1 << (j - 1))]);
    while (q--) {
        int l, r;
        scanf("%d %d", &l, &r);
        l--, r--;
        int j = 31 - __builtin_clz(r - l + 1);
        int b = better(sp[j][l], sp[j][r - (1 << j) + 1]);
        printf("%d %d\\n", a[b], b + 1);
    }
}`,
  hidden: () => {
    const r = rng(5016);
    const f = (a: number[], qs: number[][]) => `${a.length} ${qs.length}\n${J(a)}\n${L(qs.map((x) => J(x)))}`;
    const rq = (n: number, q: number) =>
      Array.from({ length: q }, () => {
        const x = r.int(1, n);
        const y = r.int(1, n);
        return [Math.min(x, y), Math.max(x, y)];
      });
    const N = 40000;
    const Q = 30000;
    return [
      f([4], [[1, 1]]),
      f([3, 3, 3], [[1, 3], [2, 3], [1, 1]]),
      f([5, 2, 8, 2, 9, 1], [[1, 5], [3, 4], [6, 6]]),
      f(arr(r, 20, 1, 5), rq(20, 30)),
      f(arr(r, 1000, 1, 1e5), rq(1000, 1000)),
      f(arr(r, N, 1, 1e5), rq(N, Q)),
      f(arr(r, N, 1, 3), rq(N, Q)),
      f(Array.from({ length: N }, (_, i) => N - i), Array.from({ length: Q }, () => [1, N])),
      f(Array.from({ length: N }, (_, i) => i + 1), rq(N, Q)),
      f(arr(r, N, 1, 1e5), Array.from({ length: Q }, (_, i) => [1 + (i % 100), N - (i % 77)])),
    ];
  },
});

const mutableSums = P({
  slug: "mutable-range-sums",
  title: "Mutable Range Sums",
  difficulty: "medium",
  rating: 1300,
  tags: ["fenwick-tree", "data-structures"],
  statement:
    "You are given an array of n integers and a sequence of operations. Operation `1 i x` adds x to the i-th element (x may be negative). Operation `2 l r` asks for the sum a_l + ... + a_r at that moment. Answer every query.",
  inputFormat: "The first line contains n and q. The second line contains the n initial values. Each of the next q lines is an operation `1 i x` or `2 l r`.",
  outputFormat: "For every operation of type 2 print the sum on its own line.",
  constraints: "1 <= n <= 25000\n1 <= q <= 25000\n|a_i|, |x| <= 10^6\n1 <= i, l <= r <= n",
  samples: [{ input: "5 4\n1 2 3 4 5\n2 1 5\n1 3 -3\n2 2 4\n2 3 3\n", output: "15\n6\n0\n" }],
  hints: [
    "Recomputing prefix sums after every update costs O(n) per operation.",
    "A Fenwick tree (binary indexed tree) supports point update and prefix sum in O(log n).",
    "Range sum = prefix(r) - prefix(l - 1). Build the tree from the initial array by n point additions (or the linear build). Use 64-bit integers.",
  ],
  editorial: "Fenwick tree where node i stores the sum of a block of length lowbit(i). add(i, x) walks i += i & -i; prefix(i) walks i -= i & -i. Query is prefix(r) - prefix(l-1). Sums reach 25000 * 2*10^6 which still fits 64-bit comfortably (and even 32-bit is risky), so use long long.\n\nComplexity: O((n + q) log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int n;
ll bit[30005];
void add(int i, ll x) {
    for (; i <= n; i += i & -i) bit[i] += x;
}
ll pre(int i) {
    ll s = 0;
    for (; i > 0; i -= i & -i) s += bit[i];
    return s;
}
int main() {
    int q;
    scanf("%d %d", &n, &q);
    for (int i = 1; i <= n; i++) {
        ll x;
        scanf("%lld", &x);
        add(i, x);
    }
    while (q--) {
        int t;
        ll a, b;
        scanf("%d %lld %lld", &t, &a, &b);
        if (t == 1) add(a, b);
        else printf("%lld\\n", pre(b) - pre(a - 1));
    }
}`,
  hidden: () => {
    const r = rng(5017);
    const gen = (n: number, q: number, upP: number, hi: number) => {
      const ops: string[] = [];
      let hasQuery = false;
      for (let i = 0; i < q; i++) {
        if (r.int(1, 100) <= upP && !(i === q - 1 && !hasQuery)) ops.push(`1 ${r.int(1, n)} ${r.int(-hi, hi)}`);
        else {
          const x = r.int(1, n);
          const y = r.int(1, n);
          ops.push(`2 ${Math.min(x, y)} ${Math.max(x, y)}`);
          hasQuery = true;
        }
      }
      return `${n} ${q}\n${J(arr(r, n, -hi, hi))}\n${L(ops)}`;
    };
    return [
      "1 2\n5\n2 1 1\n1 1 -5\n",
      "1 3\n-7\n2 1 1\n1 1 7\n2 1 1\n",
      gen(8, 20, 50, 10),
      gen(50, 200, 50, 100),
      gen(1000, 2000, 50, 1e6),
      gen(25000, 25000, 50, 1e6),
      gen(25000, 25000, 90, 1e6),
      gen(25000, 25000, 10, 1e6),
      gen(25000, 25000, 50, 5),
      `25000 25000\n${J(Array.from({ length: 25000 }, () => 1e6))}\n${L(Array.from({ length: 25000 }, (_, i) => (i % 2 ? "2 1 25000" : `1 ${i + 1} 1000000`)))}`,
    ];
  },
});

// ---------------------------------------------------------------- hard

const cutComponents = P({
  slug: "components-after-cuts",
  title: "Components After Cuts",
  difficulty: "hard",
  rating: 1800,
  tags: ["dsu", "offline", "graphs"],
  statement:
    "A network has n nodes and m numbered cables (cable i connects u_i and v_i). Then q cables are cut one by one: the j-th cut removes cable e_j (all e_j are distinct). After each cut, print the number of connected components of the remaining network.",
  inputFormat: "The first line contains n and m. The next m lines contain the cables u_i v_i (in order, numbered 1..m; repeated cables and self loops are possible). Then a line with q, followed by a line with the q cable numbers e_1 ... e_q.",
  outputFormat: "Print q integers separated by spaces: the number of components after each cut.",
  constraints: "1 <= n <= 30000\n1 <= m <= 35000\n1 <= q <= m\n1 <= u_i, v_i <= n",
  samples: [{ input: "4 4\n1 2\n2 3\n3 4\n4 1\n3\n1 3 4\n", output: "1 2 3\n", explanation: "A 4-cycle. After cutting cable 1 the path 2-3-4-1 keeps it connected; after also cutting 3 we have {2,3} and {4,1}; after cutting 4 only cable 2 remains." }],
  hints: [
    "DSU merges easily but cannot split. Think about running time backwards.",
    "Process the cuts in reverse: starting from the graph that still has the never-cut cables, adding cables back only merges components.",
    "Union all cables not in the cut list; the count is the answer after the last cut. Then for j = q down to 2 add cable e_j back, update the count, and the new count is the answer after cut j - 1.",
  ],
  editorial: "Deleting edges is hard for DSU, adding is easy. Let C_j be the component count after cut j. C_q is the count of the graph with all cut cables removed, found with a DSU over the never-cut cables. Going backwards, adding cable e_j to the graph after cut j gives the graph after cut j - 1, so C_{j-1} = C_j minus one if the endpoints were in different components. \n\nComplexity: O((n + m) alpha(n)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int p[30005], sz[30005], comp;
int fnd(int x) { return p[x] == x ? x : p[x] = fnd(p[x]); }
void uni(int a, int b) {
    a = fnd(a), b = fnd(b);
    if (a == b) return;
    if (sz[a] < sz[b]) swap(a, b);
    p[b] = a;
    sz[a] += sz[b];
    comp--;
}
int main() {
    int n, m, q;
    scanf("%d %d", &n, &m);
    vector<int> u(m + 1), v(m + 1);
    for (int i = 1; i <= m; i++) scanf("%d %d", &u[i], &v[i]);
    scanf("%d", &q);
    vector<int> e(q);
    vector<char> cut(m + 1, 0);
    for (auto &x : e) scanf("%d", &x), cut[x] = 1;
    for (int i = 1; i <= n; i++) p[i] = i, sz[i] = 1;
    comp = n;
    for (int i = 1; i <= m; i++)
        if (!cut[i]) uni(u[i], v[i]);
    vector<int> ans(q);
    for (int j = q - 1; j >= 0; j--) {
        ans[j] = comp;
        uni(u[e[j]], v[e[j]]);
    }
    for (int j = 0; j < q; j++) printf("%d%c", ans[j], j + 1 < q ? ' ' : '\\n');
}`,
  hidden: () => {
    const r = rng(5018);
    const f = (n: number, es: number[][], cuts: number[]) => `${n} ${es.length}\n${L(es.map((e) => J(e)))}${cuts.length}\n${J(cuts)}\n`;
    const rnd = (n: number, m: number) => Array.from({ length: m }, () => [r.int(1, n), r.int(1, n)]);
    const cutsOf = (m: number, q: number) => r.shuffle(Array.from({ length: m }, (_, i) => i + 1)).slice(0, q);
    const M = 35000;
    return [
      f(1, [[1, 1]], [1]),
      f(2, [[1, 2]], [1]),
      f(4, [[1, 2], [2, 3], [3, 4], [4, 1]], [1, 3, 4]),
      f(5, rnd(5, 7), cutsOf(7, 7)),
      f(10, rnd(10, 15), cutsOf(15, 8)),
      f(100, rnd(100, 150), cutsOf(150, 150)),
      f(30000, rnd(30000, M), cutsOf(M, M)),
      f(30000, rnd(30000, M), cutsOf(M, 10)),
      f(30000, rnd(30000, M), cutsOf(M, 20000)),
      f(30000, Array.from({ length: 29999 }, (_, i) => [i + 1, i + 2]), r.shuffle(Array.from({ length: 29999 }, (_, i) => i + 1))),
      f(30000, Array.from({ length: 29999 }, (_, i) => [1, i + 2]), Array.from({ length: 29999 }, (_, i) => i + 1)),
      f(20000, rnd(20000, M), cutsOf(M, 30000)),
    ];
  },
});

const rangeSumMaxMin = P({
  slug: "sum-of-subarray-ranges",
  title: "Sum of Subarray Ranges",
  difficulty: "hard",
  rating: 1800,
  tags: ["monotonic-stack", "stack", "counting"],
  statement:
    "The range of a subarray is its maximum minus its minimum. Over all n(n+1)/2 non-empty contiguous subarrays of the given array, compute the sum of their ranges.",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print the total sum.",
  constraints: "1 <= n <= 80000\n1 <= a_i <= 10^6",
  samples: [{ input: "3\n1 3 2\n", output: "5\n", explanation: "Ranges: [1]=0,[3]=0,[2]=0,[1,3]=2,[3,2]=1,[1,3,2]=2." }],
  hints: [
    "Enumerating all subarrays is O(n^2) or worse. Split the sum into (sum of maxima) minus (sum of minima).",
    "For each element count in how many subarrays it is the maximum: it depends on how far it can extend left and right before meeting a larger element.",
    "Use a monotonic stack for the borders; break ties asymmetrically (strict on one side, non-strict on the other) so each subarray is credited to exactly one position. Sum of minima = -(sum of maxima of the negated array).",
  ],
  editorial: "Let left_i be the distance to the previous element that is >= a_i and right_i the distance to the next element that is > a_i (asymmetric ties). Element i is the credited maximum of left_i * right_i subarrays, so the sum of maxima is sum a_i * left_i * right_i. Do the same for the negated array to get minus the sum of minima. Add both. The total is at most about 5*10^15 and fits in 64 bits.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
ll sumMax(const vector<ll> &a) {
    int n = a.size();
    vector<int> L(n), R(n), st;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && a[st.back()] < a[i]) st.pop_back();
        L[i] = st.empty() ? -1 : st.back();
        st.push_back(i);
    }
    st.clear();
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && a[st.back()] <= a[i]) st.pop_back();
        R[i] = st.empty() ? n : st.back();
        st.push_back(i);
    }
    ll s = 0;
    for (int i = 0; i < n; i++) s += a[i] * (ll)(i - L[i]) * (R[i] - i);
    return s;
}
int main() {
    int n;
    scanf("%d", &n);
    vector<ll> a(n), b(n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]), b[i] = -a[i];
    printf("%lld\\n", sumMax(a) + sumMax(b));
}`,
  hidden: () => {
    const r = rng(5019);
    const f = (a: number[]) => `${a.length}\n${J(a)}\n`;
    const N = 80000;
    return [
      f([5]),
      f([1, 3, 2]),
      f([4, 4, 4, 4]),
      f([1, 2, 3, 4, 5]),
      f([5, 4, 3, 2, 1]),
      f(arr(r, 12, 1, 5)),
      f(arr(r, 500, 1, 1e6)),
      f(arr(r, N, 1, 1e6)),
      f(arr(r, N, 1, 2)),
      f(Array.from({ length: N }, (_, i) => (i % 2 ? 1e6 : 1))),
      f(Array.from({ length: N }, (_, i) => (i < N / 2 ? i + 1 : N - i))),
      f(Array.from({ length: N }, (_, i) => (i % 2 ? 1e6 : 1) + 0 * i)),
      f(Array.from({ length: N }, (_, i) => 1 + ((i * 7919) % 1000000))),
    ];
  },
});

const windowMedianTotal = P({
  slug: "sliding-window-median-total",
  title: "Sliding Window Median Total",
  difficulty: "hard",
  rating: 2000,
  tags: ["fenwick-tree", "order-statistics", "multiset", "sliding-window"],
  statement:
    "For every contiguous window of exactly k elements of the array, take its lower median: sort the window and take the element at position floor((k+1)/2) (1-indexed; for odd k this is the middle, for even k the smaller of the two middle values). Print the sum of the lower medians of all n - k + 1 windows.",
  inputFormat: "The first line contains n and k. The second line contains n integers.",
  outputFormat: "Print the sum of the window medians.",
  constraints: "1 <= k <= n <= 80000\n1 <= a_i <= 10^6",
  samples: [
    { input: "5 3\n1 3 2 5 4\n", output: "9\n", explanation: "Windows [1,3,2], [3,2,5], [2,5,4] have medians 2, 3, 4." },
    { input: "4 4\n7 1 5 3\n", output: "3\n", explanation: "Sorted: 1 3 5 7, the 2nd element is 3." },
  ],
  hints: [
    "Sorting every window costs O(k log k) each, too slow when k and n are large.",
    "You need the r-th smallest of a multiset that gains one element and loses one element per step.",
    "Compress the values and use a Fenwick tree of counts: add the entering value, remove the leaving one, and find the r-th smallest by binary descent on the tree. (Two balanced multisets also work.)",
  ],
  editorial: "Coordinate-compress values. Maintain a Fenwick tree where position v stores the multiplicity of value v in the current window. Sliding the window is two point updates. The lower median is the r-th smallest value with r = (k+1)/2, found by descending the Fenwick tree in O(log n). Sum the medians in 64-bit.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<int> a(n);
    for (auto &x : a) scanf("%d", &x);
    vector<int> vals(a);
    sort(vals.begin(), vals.end());
    vals.erase(unique(vals.begin(), vals.end()), vals.end());
    int m = vals.size();
    vector<int> id(n);
    for (int i = 0; i < n; i++) id[i] = lower_bound(vals.begin(), vals.end(), a[i]) - vals.begin() + 1;
    vector<int> bit(m + 1, 0);
    auto add = [&](int i, int d) {
        for (; i <= m; i += i & -i) bit[i] += d;
    };
    int LOG = 1;
    while ((1 << LOG) <= m) LOG++;
    auto kth = [&](int r) {
        int pos = 0;
        for (int b = LOG; b >= 0; b--) {
            int np = pos + (1 << b);
            if (np <= m && bit[np] < r) {
                pos = np;
                r -= bit[np];
            }
        }
        return pos + 1;
    };
    ll sum = 0;
    for (int i = 0; i < n; i++) {
        add(id[i], 1);
        if (i >= k) add(id[i - k], -1);
        if (i >= k - 1) sum += vals[kth((k + 1) / 2) - 1];
    }
    printf("%lld\\n", sum);
}`,
  hidden: () => {
    const r = rng(5020);
    const f = (k: number, a: number[]) => `${a.length} ${k}\n${J(a)}\n`;
    const N = 80000;
    return [
      f(1, [9]),
      f(2, [5, 5]),
      f(3, [1, 3, 2, 5, 4]),
      f(4, [7, 1, 5, 3]),
      f(2, arr(r, 30, 1, 10)),
      f(5, arr(r, 200, 1, 1e6)),
      f(40000, arr(r, N, 1, 1e6)),
      f(N, arr(r, N, 1, 1e6)),
      f(1000, arr(r, N, 1, 1e6)),
      f(39999, arr(r, N, 1, 5)),
      f(30001, Array.from({ length: N }, (_, i) => i + 1)),
      f(30000, Array.from({ length: N }, (_, i) => N - i)),
      f(2, arr(r, N, 1, 1e6)),
    ];
  },
});

const increasingTriples = P({
  slug: "increasing-triples-count",
  title: "Increasing Triples Count",
  difficulty: "hard",
  rating: 1800,
  tags: ["fenwick-tree", "counting", "data-structures"],
  statement:
    "Count the triples of positions i < j < k such that a_i < a_j < a_k (strictly increasing values).",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print the number of such triples.",
  constraints: "1 <= n <= 80000\n1 <= a_i <= 10^6",
  samples: [
    { input: "4\n1 2 3 4\n", output: "4\n" },
    { input: "3\n3 2 1\n", output: "0\n" },
  ],
  hints: [
    "Fix the middle element j. The number of triples with this middle is (choices of i) times (choices of k).",
    "choices of i = number of earlier elements smaller than a_j; choices of k = number of later elements greater than a_j. Both are 'count of smaller values among a prefix' queries.",
    "Sweep left to right with a Fenwick tree over compressed values to get left[j]; sweep right to left to get right[j]. Answer = sum of left[j] * right[j] in 64-bit (can reach about 10^14).",
  ],
  editorial: "For every j let lo_j = #{i < j: a_i < a_j} and hi_j = #{k > j: a_k > a_j}. The answer is sum lo_j * hi_j. Both counts come from a Fenwick tree over values: sweeping left to right, query the prefix of values below a_j then insert a_j; sweeping right to left, query values above a_j (total inserted minus prefix up to a_j) then insert.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const int M = 1000001;
int bit[M + 1];
void add(int i) {
    for (; i <= M; i += i & -i) bit[i]++;
}
int pre(int i) {
    int s = 0;
    for (; i > 0; i -= i & -i) s += bit[i];
    return s;
}
int main() {
    int n;
    scanf("%d", &n);
    vector<int> a(n);
    for (auto &x : a) scanf("%d", &x);
    vector<ll> lo(n);
    for (int i = 0; i < n; i++) {
        lo[i] = pre(a[i] - 1);
        add(a[i]);
    }
    memset(bit, 0, sizeof bit);
    ll ans = 0;
    for (int i = n - 1; i >= 0; i--) {
        ll hi = (n - 1 - i) - pre(a[i]);
        ans += lo[i] * hi;
        add(a[i]);
    }
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(5021);
    const f = (a: number[]) => `${a.length}\n${J(a)}\n`;
    const N = 80000;
    return [
      f([1]),
      f([1, 2, 3]),
      f([2, 2, 2, 2]),
      f([1, 3, 2, 4, 5]),
      f(arr(r, 15, 1, 8)),
      f(arr(r, 500, 1, 1e6)),
      f(arr(r, N, 1, 1e6)),
      f(Array.from({ length: N }, (_, i) => i + 1)),
      f(Array.from({ length: N }, (_, i) => N - i)),
      f(arr(r, N, 1, 10)),
      f(Array.from({ length: N }, (_, i) => (i % 2 ? 1000000 - i : i + 1))),
      f(Array.from({ length: N }, (_, i) => 1 + ((i * 7919) % 1000000))),
    ];
  },
});

const dailyTrade = P({
  slug: "daily-trade-max-profit",
  title: "Daily Trade Max Profit",
  difficulty: "hard",
  rating: 2000,
  tags: ["priority-queue", "greedy", "heap"],
  statement:
    "You know the price of a share for each of n consecutive days. On each day you may do exactly one of: buy one share, sell one share (if you own at least one), or do nothing. You start with no shares and must own none after day n. You may hold many shares at the same time. Find the maximum total profit (money earned from sales minus money spent on purchases).",
  inputFormat: "The first line contains n. The second line contains the n prices p_1 ... p_n.",
  outputFormat: "Print the maximum profit.",
  constraints: "1 <= n <= 80000\n1 <= p_i <= 10^6",
  samples: [
    { input: "4\n1 5 2 8\n", output: "10\n", explanation: "Buy at 1, sell at 5, buy at 2, sell at 8." },
    { input: "3\n5 4 3\n", output: "0\n" },
    { input: "5\n2 9 3 6 7\n", output: "11\n", explanation: "Buy 2 and 3, sell 9 and 7 (profit 7 + 4)." },
  ],
  hints: [
    "Think of each day as either adding a potential purchase price or pairing with a cheaper earlier price. The one-action-per-day rule is what makes greedy tricky.",
    "Keep a min-heap of 'prices at which a share could still be considered bought'. When today's price is higher than the heap minimum, take the profit from that pair.",
    "For each price p: push p; if heap.top < p then profit += p - top, pop, and push p again (selling today may later be regretted and turned into a hold). Print the profit.",
  ],
  editorial: "Classic regret greedy. Process days in order with a min-heap of candidate buy prices. For today's price p, if the cheapest candidate c is below p, take profit p - c and remove c; then push p once more: that copy represents 'undoing the sale today' (if a later higher price comes, selling then instead of today gives p_future - c = (p - c) + (p_future - p)). Without a profitable pair, push p once. The profit is accumulated through these exchanges and always corresponds to a valid schedule, ending with zero shares.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n;
    scanf("%d", &n);
    priority_queue<ll, vector<ll>, greater<ll>> pq;
    ll profit = 0;
    for (int i = 0; i < n; i++) {
        ll p;
        scanf("%lld", &p);
        pq.push(p);
        if (pq.top() < p) {
            profit += p - pq.top();
            pq.pop();
            pq.push(p);
        }
    }
    printf("%lld\\n", profit);
}`,
  hidden: () => {
    const r = rng(5022);
    const f = (a: number[]) => `${a.length}\n${J(a)}\n`;
    const N = 80000;
    return [
      f([5]),
      f([3, 3, 3]),
      f([1, 5, 2, 8]),
      f([5, 4, 3, 2, 1]),
      f([10, 5, 4, 7, 9, 12, 6, 2, 10]),
      f(arr(r, 10, 1, 20)),
      f(arr(r, 200, 1, 1000)),
      f(arr(r, N, 1, 1e6)),
      f(Array.from({ length: N }, (_, i) => i + 1)),
      f(Array.from({ length: N }, (_, i) => N - i)),
      f(Array.from({ length: N }, (_, i) => (i % 2 ? 1e6 : 1))),
      f(arr(r, N, 1, 5)),
    ];
  },
});

const visiblePairs = P({
  slug: "mutually-visible-pairs",
  title: "Mutually Visible Pairs",
  difficulty: "hard",
  rating: 1900,
  tags: ["monotonic-stack", "stack", "counting"],
  statement:
    "n people stand in a line with heights h_1 ... h_n (not necessarily distinct). Two people i < j can see each other if every person standing strictly between them is not taller than the shorter of the two (that is, height <= min(h_i, h_j)). Neighbors always see each other. Count the pairs (i, j) that can see each other.",
  inputFormat: "The first line contains n. The second line contains n integers h_1 ... h_n.",
  outputFormat: "Print the number of visible pairs.",
  constraints: "1 <= n <= 80000\n1 <= h_i <= 10^6",
  samples: [
    { input: "4\n2 4 1 3\n", output: "4\n", explanation: "Visible pairs: (1,2), (2,3), (3,4), (2,4). Pair (1,3) is blocked by 4." },
    { input: "3\n5 5 5\n", output: "3\n" },
  ],
  hints: [
    "Checking all pairs is O(n^2), too slow when n is 80000 (and the answer can be about 3 * 10^9).",
    "Process people left to right. A new person sees exactly those earlier people who are 'visible from the right', and those form a non-increasing stack of heights.",
    "Stack stores (height, count of equal heights). Pop all smaller heights, adding their counts. If the top equals the new height add its count and merge. If a taller one remains, add 1. Push the merged entry.",
  ],
  editorial: "Maintain a stack of groups (height, cnt) with strictly decreasing heights from bottom to top; it contains exactly the earlier people who can still see someone arriving later. For a new person with height h: every group with smaller height is visible to him and then hidden forever behind him, so add cnt and pop. If the next group has equal height add its cnt, merge it into the new group, and pop. If the stack is still non-empty, its top is taller: that person sees the new one, add 1. Push (h, merged count). Use 64-bit for the answer.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n;
    scanf("%d", &n);
    vector<pair<ll, ll>> st;
    ll ans = 0;
    for (int i = 0; i < n; i++) {
        ll h;
        scanf("%lld", &h);
        ll cnt = 1;
        while (!st.empty() && st.back().first < h) {
            ans += st.back().second;
            st.pop_back();
        }
        if (!st.empty() && st.back().first == h) {
            ans += st.back().second;
            cnt += st.back().second;
            st.pop_back();
        }
        if (!st.empty()) ans++;
        st.push_back({h, cnt});
    }
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(5023);
    const f = (a: number[]) => `${a.length}\n${J(a)}\n`;
    const N = 80000;
    return [
      f([7]),
      f([2, 4, 1, 3]),
      f([5, 5, 5]),
      f([1, 2, 3, 4]),
      f([4, 3, 2, 1]),
      f([3, 1, 3, 1, 3]),
      f(arr(r, 15, 1, 5)),
      f(arr(r, 1000, 1, 1e6)),
      f(arr(r, N, 1, 1e6)),
      f(Array.from({ length: N }, () => 1000000)),
      f(arr(r, N, 1, 3)),
      f(Array.from({ length: N }, (_, i) => i + 1)),
      f(Array.from({ length: N }, (_, i) => N - i)),
    ];
  },
});

// ---------------------------------------------------------------- expert

const connectivityOverTime = P({
  slug: "connectivity-over-time",
  title: "Connectivity Over Time",
  difficulty: "expert",
  rating: 2400,
  tags: ["dsu", "offline", "divide-and-conquer", "segment-tree", "data-structures"],
  statement:
    "A graph on nodes 1..n starts with no edges. You get a sequence of operations. `+ u v` adds the edge {u, v} (it is guaranteed not to be present at that moment, u != v). `- u v` removes the edge {u, v} (guaranteed to be present). `? u v` asks whether u and v are connected by a path using the edges present right now. Answer every query with YES or NO.",
  inputFormat: "The first line contains n and q. Each of the next q lines is one operation `+ u v`, `- u v` or `? u v`.",
  outputFormat: "For every `?` operation print YES or NO on its own line.",
  constraints: "2 <= n <= 30000\n1 <= q <= 45000\n1 <= u, v <= n",
  samples: [
    {
      input: "5 8\n+ 1 2\n+ 2 3\n? 1 3\n- 2 3\n? 1 3\n+ 3 4\n+ 1 4\n? 1 3\n",
      output: "YES\nNO\nYES\n",
      explanation: "After removing {2,3} nodes 1 and 3 are disconnected; edges {3,4} and {1,4} reconnect them.",
    },
  ],
  hints: [
    "DSU supports adding edges but not removing them. Each edge, however, exists during a known interval of time.",
    "Offline: build a segment tree over the time axis and attach each edge to the O(log q) nodes covering its lifetime. A DFS from the root visits every moment while exactly the right edges are applied.",
    "Use a DSU with union by size and NO path compression, recording every successful union on a stack. On leaving a segment tree node, roll back to the stack size you had on entering. At a leaf that is a query, check find(u) == find(v).",
  ],
  editorial: "Read all operations first. For each edge record the interval [start, end) of operation indices during which it is present (end = q if never removed). Insert each interval into a segment tree over [0, q): the edge is stored in the O(log q) canonical nodes that cover it. Run a DFS over the tree: at a node, union all edges stored there (with union by size, no path compression, pushing changes to an undo stack), recurse into the children, then undo to the previous stack size. At a leaf, if the operation is a query, the DSU currently holds exactly the edges present at that moment, so answer connectivity. Union by size keeps find at O(log n).\n\nComplexity: O(q log q log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int n, q;
vector<int> par, sz, stk;
int fnd(int x) {
    while (par[x] != x) x = par[x];
    return x;
}
void uni(int a, int b) {
    a = fnd(a), b = fnd(b);
    if (a == b) return;
    if (sz[a] < sz[b]) swap(a, b);
    par[b] = a;
    sz[a] += sz[b];
    stk.push_back(b);
}
void rollback(size_t t) {
    while (stk.size() > t) {
        int b = stk.back();
        stk.pop_back();
        int a = par[b];
        sz[a] -= sz[b];
        par[b] = b;
    }
}
vector<vector<pair<int, int>>> tr;
vector<char> typ;
vector<int> qa, qb;
void addEdge(int node, int l, int r, int ql, int qr, pair<int, int> e) {
    if (qr <= l || r <= ql) return;
    if (ql <= l && r <= qr) {
        tr[node].push_back(e);
        return;
    }
    int m = (l + r) / 2;
    addEdge(node * 2, l, m, ql, qr, e);
    addEdge(node * 2 + 1, m, r, ql, qr, e);
}
void dfs(int node, int l, int r) {
    size_t saved = stk.size();
    for (auto &e : tr[node]) uni(e.first, e.second);
    if (r - l == 1) {
        if (typ[l] == '?') puts(fnd(qa[l]) == fnd(qb[l]) ? "YES" : "NO");
    } else {
        int m = (l + r) / 2;
        dfs(node * 2, l, m);
        dfs(node * 2 + 1, m, r);
    }
    rollback(saved);
}
int main() {
    scanf("%d %d", &n, &q);
    typ.assign(q, 0);
    qa.assign(q, 0);
    qb.assign(q, 0);
    tr.assign(4 * q + 4, {});
    par.resize(n + 1);
    sz.assign(n + 1, 1);
    iota(par.begin(), par.end(), 0);
    map<pair<int, int>, int> start;
    for (int i = 0; i < q; i++) {
        char c;
        int u, v;
        scanf(" %c %d %d", &c, &u, &v);
        typ[i] = c;
        qa[i] = u;
        qb[i] = v;
        if (u > v) swap(u, v);
        if (c == '+') start[{u, v}] = i;
        else if (c == '-') {
            addEdge(1, 0, q, start[{u, v}], i, {u, v});
            start.erase({u, v});
        }
    }
    for (auto &p : start) addEdge(1, 0, q, p.second, q, p.first);
    dfs(1, 0, q);
}`,
  hidden: () => {
    const r = rng(5024);
    const gen = (n: number, q: number, wAdd: number, wDel: number, locality = 0) => {
      const ops: string[] = [];
      const present: string[] = [];
      const set = new Set<string>();
      const node = () => (locality ? r.int(1, Math.min(n, locality)) : r.int(1, n));
      for (let i = 0; i < q; i++) {
        const x = r.int(1, 100);
        if (x <= wAdd) {
          let done = false;
          for (let t = 0; t < 20 && !done; t++) {
            const u = node();
            const v = node();
            if (u === v) continue;
            const a = Math.min(u, v);
            const b = Math.max(u, v);
            const key = `${a} ${b}`;
            if (set.has(key)) continue;
            set.add(key);
            present.push(key);
            ops.push(`+ ${u} ${v}`);
            done = true;
          }
          if (done) continue;
        } else if (x <= wAdd + wDel && present.length > 0) {
          const idx = r.int(0, present.length - 1);
          const key = present[idx]!;
          present[idx] = present[present.length - 1]!;
          present.pop();
          set.delete(key);
          ops.push(r.int(0, 1) ? `- ${key}` : `- ${key.split(" ").reverse().join(" ")}`);
          continue;
        }
        let u = node();
        let v = node();
        if (u === v) v = (u % n) + 1;
        ops.push(`? ${u} ${v}`);
        u = 0;
      }
      return `${n} ${ops.length}\n${L(ops)}`;
    };
    return [
      "2 3\n+ 1 2\n? 1 2\n- 2 1\n",
      "2 1\n? 1 2\n",
      "5 8\n+ 1 2\n+ 2 3\n? 1 3\n- 2 3\n? 1 3\n+ 3 4\n+ 1 4\n? 1 3\n",
      gen(6, 40, 35, 25),
      gen(10, 100, 30, 30),
      gen(50, 500, 40, 20),
      gen(1000, 5000, 40, 25),
      gen(30000, 45000, 35, 15),
      gen(30000, 45000, 45, 30),
      gen(30000, 45000, 50, 10),
      gen(300, 45000, 33, 33),
      gen(30000, 45000, 40, 20, 1000),
      gen(30000, 45000, 30, 10, 60),
    ];
  },
});

const raw: ProblemSeed[] = [
  plateStack,
  firstRepeat,
  serviceDesk,
  nextGreater,
  wordFreq,
  bracketFix,
  clusters,
  kthLargestStream,
  windowMaxTotal,
  circleElimination,
  cheapestRowPicks,
  shortestJobFirst,
  coveredLength,
  lruReplay,
  skylineRect,
  rangeMinPos,
  mutableSums,
  cutComponents,
  rangeSumMaxMin,
  windowMedianTotal,
  increasingTriples,
  dailyTrade,
  visiblePairs,
  connectivityOverTime,
];

export const problems: ProblemSeed[] = raw.map((p) => fitBudget(p));
