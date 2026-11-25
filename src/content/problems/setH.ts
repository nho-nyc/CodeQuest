import { fitBudget } from "./budget";
import { rng } from "./rng";
import type { ProblemSeed } from "./types";

type Spec = Omit<ProblemSeed, "timeLimitMs" | "memoryLimitMb" | "estimatedMinutes"> & { timeLimitMs?: number; estimatedMinutes?: number };

const P = (s: Spec): ProblemSeed => ({
  timeLimitMs: s.timeLimitMs ?? 1000,
  memoryLimitMb: 256,
  estimatedMinutes: s.difficulty === "newbie" ? 8 : s.difficulty === "easy" ? 15 : s.difficulty === "medium" ? 30 : s.difficulty === "hard" ? 50 : 70,
  ...s,
});

type Rng = ReturnType<typeof rng>;
const nl = (xs: string[]) => `${xs.join("\n")}\n`;
const arr = (r: Rng, n: number, lo: number, hi: number) => Array.from({ length: n }, () => r.int(lo, hi));
const distinctInts = (r: Rng, n: number, lo: number, hi: number) => {
  const s = new Set<number>();
  while (s.size < n) s.add(r.int(lo, hi));
  return r.shuffle([...s]);
};

// ---------------------------------------------------------------- newbie

const oddPopcount = P({
  slug: "odd-popcount-count",
  title: "Odd Number of Set Bits",
  difficulty: "newbie",
  rating: 800,
  tags: ["bit-manipulation", "implementation"],
  statement:
    "Write each of the n given non-negative integers in binary. Count how many of them contain an odd number of 1 bits.",
  inputFormat: "The first line contains n. The second line contains n integers a_1 ... a_n.",
  outputFormat: "Print a single integer: how many a_i have an odd number of 1 bits in binary.",
  constraints: "1 <= n <= 30000\n0 <= a_i <= 10^18",
  samples: [
    { input: "5\n1 2 3 7 8\n", output: "4\n", explanation: "1, 10, 111 and 1000 have an odd number of ones; 11 does not." },
    { input: "3\n0 3 5\n", output: "0\n" },
  ],
  hints: [
    "Do not convert to text. A number can be inspected bit by bit with shifts and masks.",
    "Repeatedly clear the lowest set bit (x &= x - 1) and count how many times it takes, or use a built-in popcount.",
    "Use 64-bit integers, since a_i can reach 10^18, then test the parity of the count with & 1.",
  ],
  editorial:
    "For each number count its set bits (loop clearing the lowest bit, or __builtin_popcountll) and check whether the count is odd. Values up to 10^18 need 64-bit integers.\n\nComplexity: O(n * 60).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    int ans = 0;
    for (int i = 0; i < n; i++) {
        unsigned long long a;
        scanf("%llu", &a);
        ans += __builtin_popcountll(a) & 1;
    }
    printf("%d\\n", ans);
}`,
  hidden: () => {
    const r = rng(8001);
    const big = (n: number, hi: bigint) => Array.from({ length: n }, () => r.big(0n, hi)).join(" ");
    const T: string[] = ["1\n0", "1\n1", "1\n1000000000000000000", "3\n1152921504606846975 576460752303423487 288230376092254207"];
    T.push(`10\n${Array.from({ length: 10 }, (_, i) => 2 ** i).join(" ")}`);
    T.push(`30000\n${Array.from({ length: 30000 }, (_, i) => i).join(" ")}`);
    T.push(`30000\n${big(30000, 1000000000000000000n)}`);
    T.push(`30000\n${big(30000, 1000n)}`);
    T.push(`2000\n${big(2000, 255n)}`);
    T.push(`30000\n${Array.from({ length: 30000 }, () => "1000000000000000000").join(" ")}`);
    return T.map((x) => `${x}\n`);
  },
});

// ---------------------------------------------------------------- easy

const pointsInRect = P({
  slug: "points-in-rectangle",
  title: "Points in a Rectangle",
  difficulty: "easy",
  rating: 900,
  tags: ["geometry", "implementation"],
  statement:
    "You are given an axis-parallel rectangle with corners (x1, y1) and (x2, y2), x1 <= x2 and y1 <= y2, and n points with integer coordinates. Count (a) the points that lie inside the rectangle or on its boundary and (b) the points that lie strictly inside it, not touching the boundary.",
  inputFormat: "The first line contains n. The second line contains x1 y1 x2 y2. Each of the next n lines contains the coordinates x y of one point.",
  outputFormat: "Print two integers separated by a space: the count including the boundary, then the count strictly inside.",
  constraints: "1 <= n <= 40000\n|coordinates| <= 10^6\nx1 <= x2, y1 <= y2",
  samples: [
    { input: "5\n0 0 4 4\n0 0\n2 2\n4 3\n5 5\n-1 2\n", output: "3 1\n", explanation: "(0,0), (2,2) and (4,3) are inside or on the boundary; only (2,2) is strictly inside." },
  ],
  hints: [
    "A point is inside exactly when both its x and y fall in the corresponding interval. Check the two axes independently.",
    "Boundary-inclusive uses <= and >=, strictly-inside uses < and >.",
    "Read every point once and update two counters; no sorting is needed.",
  ],
  editorial:
    "For each point test x1 <= x <= x2 and y1 <= y <= y2 for the first answer, and x1 < x < x2, y1 < y < y2 for the second. A degenerate rectangle (x1 = x2 or y1 = y2) simply has no strictly-inside points.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    long long x1, y1, x2, y2;
    scanf("%d %lld %lld %lld %lld", &n, &x1, &y1, &x2, &y2);
    int a = 0, b = 0;
    for (int i = 0; i < n; i++) {
        long long x, y;
        scanf("%lld %lld", &x, &y);
        if (x >= x1 && x <= x2 && y >= y1 && y <= y2) a++;
        if (x > x1 && x < x2 && y > y1 && y < y2) b++;
    }
    printf("%d %d\\n", a, b);
}`,
  hidden: () => {
    const r = rng(8002);
    const mk = (n: number, c: number, rect: number[]) => `${n}\n${rect.join(" ")}\n${nl(Array.from({ length: n }, () => `${r.int(-c, c)} ${r.int(-c, c)}`)).trim()}\n`;
    return [
      mk(1, 0, [0, 0, 0, 0]),
      mk(1, 5, [-5, -5, 5, 5]),
      mk(20, 3, [-1, -1, 2, 2]),
      mk(50, 2, [0, 0, 0, 2]),
      mk(200, 4, [-4, -4, 4, 4]),
      mk(40000, 1000000, [-500000, -300000, 400000, 600000]),
      mk(40000, 1000000, [-1000000, -1000000, 1000000, 1000000]),
      mk(40000, 10, [-3, -4, 5, 6]),
      mk(40000, 10, [7, 7, 8, 8]),
      mk(1000, 6, [2, -3, 2, 3]),
    ];
  },
});

const turnCounts = P({
  slug: "polyline-turn-counts",
  title: "Left, Right, Straight",
  difficulty: "easy",
  rating: 1000,
  tags: ["geometry", "math"],
  statement:
    "A polyline visits the points p_1, p_2, ..., p_n in order. At every inner point p_i (2 <= i <= n-1) look at the vectors u = p_i - p_{i-1} and v = p_{i+1} - p_i and the cross product u.x * v.y - u.y * v.x. If it is positive the path turns left at p_i, if it is negative it turns right, and if it is zero the path goes straight (this includes zero-length moves and reversals). Count the left turns, right turns and straight points.",
  inputFormat: "The first line contains n. Each of the next n lines contains the integers x y of one point.",
  outputFormat: "Print three integers: the number of left turns, right turns and straight points. If n < 3 print `0 0 0`.",
  constraints: "1 <= n <= 30000\n|coordinates| <= 10^9",
  samples: [
    { input: "5\n0 0\n1 0\n1 1\n2 1\n3 1\n", output: "1 1 1\n", explanation: "Left at (1,0), right at (1,1), straight at (2,1)." },
  ],
  hints: [
    "The sign of the cross product of two consecutive moves tells the turn direction without any angles or floating point.",
    "Compute cross = ux*vy - uy*vx for every inner point and classify by its sign.",
    "Coordinate differences reach 2*10^9 and products 4*10^18; the cross product can be about 8*10^18, so use 64-bit (or 128-bit) integers carefully.",
  ],
  editorial:
    "Positive cross product means counter-clockwise, i.e. a left turn. Evaluate it for each consecutive triple in O(1). Differences are at most 2*10^9, so each product is at most 4*10^18 and the difference of two products at most 8*10^18, which still fits in a signed 64-bit integer; __int128 is a safe alternative.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<long long> x(n), y(n);
    for (int i = 0; i < n; i++) scanf("%lld %lld", &x[i], &y[i]);
    long long L = 0, R = 0, S = 0;
    for (int i = 1; i + 1 < n; i++) {
        __int128 ux = x[i] - x[i - 1], uy = y[i] - y[i - 1], vx = x[i + 1] - x[i], vy = y[i + 1] - y[i];
        __int128 c = ux * vy - uy * vx;
        if (c > 0) L++;
        else if (c < 0) R++;
        else S++;
    }
    printf("%lld %lld %lld\\n", L, R, S);
}`,
  hidden: () => {
    const r = rng(8003);
    const mk = (pts: number[][]) => `${pts.length}\n${nl(pts.map((p) => p.join(" "))).trim()}\n`;
    const walk = (n: number, c: number, step: number) => {
      const p = [[0, 0]];
      while (p.length < n) {
        const q = p[p.length - 1]!;
        p.push([Math.max(-c, Math.min(c, q[0]! + r.int(-step, step))), Math.max(-c, Math.min(c, q[1]! + r.int(-step, step)))]);
      }
      return p;
    };
    const circle = Array.from({ length: 30000 }, (_, i) => [Math.round(1e9 * Math.cos(i * 0.01)), Math.round(1e9 * Math.sin(i * 0.01))]);
    const rnd = (n: number) => Array.from({ length: n }, () => [r.int(-1e9, 1e9), r.int(-1e9, 1e9)]);
    return [
      mk([[0, 0]]),
      mk([[0, 0], [5, 5]]),
      mk([[0, 0], [1, 1], [2, 2]]),
      mk([[0, 0], [3, 0], [1, 0]]),
      mk(walk(30, 2, 1)),
      mk(walk(30000, 3, 1)),
      mk(walk(30000, 1000000000, 1000000000)),
      mk(circle),
      mk(rnd(30000)),
      mk(Array.from({ length: 30000 }, () => [5, 5])),
      mk([[-1e9, -1e9], [1e9, 1e9], [-1e9, 1e9], [1e9, -1e9], [-1e9, -1e9]]),
    ];
  },
});

const robotGrid = P({
  slug: "robot-final-cell",
  title: "Robot on a Walled Grid",
  difficulty: "easy",
  rating: 1100,
  tags: ["simulation", "implementation"],
  statement:
    "A robot stands on the cell marked S of an h x w grid. Cells are free (`.`) or walls (`#`). It executes a string of commands, one at a time: U, D, L, R move it one cell up (row - 1), down (row + 1), left (column - 1) or right (column + 1). If the target cell is outside the grid or a wall, the robot does not move and that command counts as blocked. Report where the robot ends up, how many distinct cells it has stood on (including the start) and how many commands were blocked.",
  inputFormat: "The first line contains h and w. The next h lines contain the grid. The last line contains the command string.",
  outputFormat: "Print four integers: final row, final column (both 1-based), number of distinct cells visited, number of blocked commands.",
  constraints: "1 <= h, w <= 500\nExactly one S in the grid.\n1 <= length of commands <= 200000",
  samples: [
    { input: "3 4\nS..#\n.#..\n....\nRRDLDDRR\n", output: "3 4 6 3\n", explanation: "The robot visits (1,1),(1,2),(1,3),(2,3),(3,3),(3,4); L hits a wall, then D and the final R hit the border." },
  ],
  hints: [
    "Simulate directly; the answer is determined by following the rules in order. Think about what must be recorded for a blocked move.",
    "Keep a boolean grid of visited cells and a counter that you increase only when a cell is visited for the first time.",
    "Map each letter to a (dr, dc) pair, test bounds and wall before moving, and count the command as blocked otherwise.",
  ],
  editorial:
    "Straightforward simulation. For each command compute the target cell; if it is out of range or a wall, increment the blocked counter, otherwise move and mark the cell visited. The S cell counts as free and visited at the start.\n\nComplexity: O(h*w + length of commands).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int h, w;
    cin >> h >> w;
    vector<string> g(h);
    int r = 0, c = 0;
    for (int i = 0; i < h; i++) {
        cin >> g[i];
        for (int j = 0; j < w; j++) if (g[i][j] == 'S') { r = i; c = j; }
    }
    string s;
    cin >> s;
    vector<vector<char>> vis(h, vector<char>(w, 0));
    vis[r][c] = 1;
    long long visited = 1, blocked = 0;
    for (char ch : s) {
        int dr = 0, dc = 0;
        if (ch == 'U') dr = -1;
        else if (ch == 'D') dr = 1;
        else if (ch == 'L') dc = -1;
        else dc = 1;
        int nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= h || nc < 0 || nc >= w || g[nr][nc] == '#') { blocked++; continue; }
        r = nr; c = nc;
        if (!vis[r][c]) { vis[r][c] = 1; visited++; }
    }
    printf("%d %d %lld %lld\\n", r + 1, c + 1, visited, blocked);
}`,
  hidden: () => {
    const r = rng(8004);
    const grid = (h: number, w: number, dens: number) => {
      const g = Array.from({ length: h }, () => Array.from({ length: w }, (): string => (r.int(0, 99) < dens ? "#" : ".")));
      g[r.int(0, h - 1)]![r.int(0, w - 1)] = "S";
      return g.map((row) => row.join(""));
    };
    const cmds = (n: number, alpha = "UDLR") => Array.from({ length: n }, () => r.pick([...alpha])).join("");
    const mk = (g: string[], c: string) => `${g.length} ${g[0]!.length}\n${g.join("\n")}\n${c}\n`;
    return [
      mk(["S"], "UDLR"),
      mk(["S."], "RRRLLL"),
      mk(grid(5, 5, 20), cmds(40)),
      mk(grid(10, 10, 0), cmds(200)),
      mk(grid(8, 8, 60), cmds(100)),
      mk(grid(500, 500, 0), cmds(200000)),
      mk(grid(500, 500, 25), cmds(200000)),
      mk(grid(500, 500, 10), cmds(200000, "UL")),
      mk(grid(500, 500, 3), "D".repeat(100000) + "R".repeat(100000)),
      mk(grid(1, 500, 0), cmds(1000, "LR")),
      mk(grid(500, 1, 0), cmds(1000, "UD")),
    ];
  },
});

const twoSingletons = P({
  slug: "two-singletons-xor",
  title: "The Two Odd Ones Out",
  difficulty: "easy",
  rating: 1200,
  tags: ["bit-manipulation", "math"],
  statement:
    "An array of n integers is built so that exactly two distinct values appear once and every other value appears exactly twice. Find the two values that appear once. You are encouraged to find a solution that uses O(1) extra memory and no sorting.",
  inputFormat: "The first line contains the even integer n. The second line contains the n integers.",
  outputFormat: "Print the two values that appear once, the smaller first, separated by a space.",
  constraints: "2 <= n <= 60000, n is even\n0 <= a_i <= 10^9",
  samples: [{ input: "6\n4 1 2 1 2 9\n", output: "4 9\n" }, { input: "2\n7 3\n", output: "3 7\n" }],
  hints: [
    "XOR cancels equal values. What is the XOR of the whole array in terms of the two unknown values?",
    "The total XOR equals x ^ y with x != y, so it has some set bit. That bit is 1 in exactly one of x, y. Split the array by that bit.",
    "Take the lowest set bit of the total XOR as a mask, XOR the elements with the bit set into one accumulator and the rest into another, then sort the two results.",
  ],
  editorial:
    "Let t be the XOR of all elements; paired values vanish, so t = x ^ y and t != 0. Pick any set bit b of t (for example t & -t). x and y differ at bit b, and every duplicated pair lands entirely in one group, so XORing the group with bit b set gives one singleton and the other group gives the other.\n\nComplexity: O(n), O(1) extra space.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<long long> a(n);
    long long t = 0;
    for (auto &v : a) { scanf("%lld", &v); t ^= v; }
    long long b = t & -t, x = 0, y = 0;
    for (auto v : a) {
        if (v & b) x ^= v;
        else y ^= v;
    }
    if (x > y) swap(x, y);
    printf("%lld %lld\\n", x, y);
}`,
  hidden: () => {
    const r = rng(8005);
    const mk = (m: number, hi: number, singles?: [number, number]) => {
      let vals = distinctInts(r, m + 4, 0, hi);
      if (singles) vals = [...singles, ...vals.filter((v) => v !== singles[0] && v !== singles[1])];
      vals = vals.slice(0, m + 2);
      const all: number[] = [vals[0]!, vals[1]!];
      for (let i = 2; i < vals.length; i++) all.push(vals[i]!, vals[i]!);
      const s = r.shuffle(all);
      return `${s.length}\n${s.join(" ")}\n`;
    };
    return [
      mk(0, 1000000000, [0, 1000000000]),
      mk(0, 10, [3, 7]),
      mk(1, 5, [1, 2]),
      mk(5, 20),
      mk(29999, 1000000000),
      mk(29999, 70000),
      mk(2000, 100000, [0, 1]),
      mk(29999, 1000000000, [536870912, 536870913]),
      mk(500, 1000000000),
      mk(29999, 1000000000, [999999999, 1000000000]),
    ];
  },
});

// ---------------------------------------------------------------- medium

const lifeSteps = P({
  slug: "game-of-life-torus",
  title: "Life on a Torus",
  difficulty: "medium",
  rating: 1300,
  tags: ["simulation", "implementation"],
  statement:
    "A grid of h rows and w columns holds live (`#`) and dead (`.`) cells. The grid wraps around in both directions, so it is a torus. In one step every cell simultaneously updates according to the number c of live cells among its 8 neighbours: a live cell stays alive when c is 2 or 3, otherwise it dies; a dead cell becomes alive when c is exactly 3. The 8 neighbours of (i, j) are (i + di, j + dj) for the 8 non-zero offsets (di, dj) in {-1, 0, 1}^2, taken modulo the grid size, and each offset is counted separately even when two offsets land on the same cell (possible when h or w is 1 or 2). Simulate t steps and print the final grid.",
  inputFormat: "The first line contains h, w and t. The next h lines contain the initial grid.",
  outputFormat: "Print h lines of w characters: the grid after t steps.",
  constraints: "1 <= h, w <= 100\n0 <= t <= 1000",
  samples: [
    { input: "5 5 1\n.....\n.....\n.###.\n.....\n.....\n", output: ".....\n..#..\n..#..\n..#..\n.....\n", explanation: "A horizontal blinker becomes vertical." },
    { input: "5 5 2\n.....\n.....\n.###.\n.....\n.....\n", output: ".....\n.....\n.###.\n.....\n.....\n" },
  ],
  hints: [
    "All cells must update at the same time, so you cannot overwrite the grid while reading it.",
    "Use two grids and swap them every step. Compute neighbours with modular indices.",
    "Precompute the wrapped row and column indices of each cell, or index with ((i + di + h) % h); cost is 8 * h * w * t = about 8*10^7.",
  ],
  editorial:
    "Plain simulation with double buffering. For each step and each cell count live cells over the 8 offsets using wrapped indices (so duplicates on tiny grids are counted as stated) and apply the rule. Cost O(8 * h * w * t) which is at most 8*10^7.\n\nComplexity: O(h * w * t).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int h, w, t;
    cin >> h >> w >> t;
    vector<string> g(h), ng(h, string(w, '.'));
    for (auto &s : g) cin >> s;
    while (t--) {
        for (int i = 0; i < h; i++)
            for (int j = 0; j < w; j++) {
                int c = 0;
                for (int di = -1; di <= 1; di++)
                    for (int dj = -1; dj <= 1; dj++) {
                        if (!di && !dj) continue;
                        c += g[(i + di + h) % h][(j + dj + w) % w] == '#';
                    }
                bool live = g[i][j] == '#';
                ng[i][j] = (live ? (c == 2 || c == 3) : c == 3) ? '#' : '.';
            }
        swap(g, ng);
    }
    for (auto &s : g) printf("%s\\n", s.c_str());
}`,
  hidden: () => {
    const r = rng(8006);
    const rnd = (h: number, w: number, d: number) => Array.from({ length: h }, () => Array.from({ length: w }, () => (r.int(0, 99) < d ? "#" : ".")).join(""));
    const mk = (h: number, w: number, t: number, g: string[]) => `${h} ${w} ${t}\n${g.join("\n")}\n`;
    const glider = (h: number, w: number) => {
      const g = Array.from({ length: h }, () => Array.from({ length: w }, () => "."));
      [[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]].forEach(([a, b]) => (g[a!]![b!] = "#"));
      return g.map((x) => x.join(""));
    };
    return [
      mk(1, 1, 5, ["#"]),
      mk(1, 2, 3, ["##"]),
      mk(2, 2, 4, ["#.", ".#"]),
      mk(3, 3, 7, rnd(3, 3, 50)),
      mk(4, 5, 0, rnd(4, 5, 50)),
      mk(1, 100, 1000, rnd(1, 100, 50)),
      mk(100, 1, 1000, rnd(100, 1, 50)),
      mk(10, 10, 40, glider(10, 10)),
      mk(30, 30, 1000, glider(30, 30)),
      mk(100, 100, 1000, rnd(100, 100, 35)),
      mk(100, 100, 1000, rnd(100, 100, 100)),
      mk(97, 83, 999, rnd(97, 83, 20)),
    ];
  },
});

const maxXorPairs = P({
  slug: "maximum-xor-pair-count",
  title: "Maximum XOR Pair",
  difficulty: "medium",
  rating: 1500,
  tags: ["bit-manipulation", "trie", "hashing"],
  statement:
    "Among all pairs of positions i < j consider the value a_i XOR a_j. Find the maximum such value M and also count the number of pairs (i < j) whose XOR equals exactly M.",
  inputFormat: "The first line contains n. The second line contains n integers a_1 ... a_n.",
  outputFormat: "Print M and the number of pairs achieving it, separated by a space.",
  constraints: "2 <= n <= 80000\n0 <= a_i < 2^20",
  samples: [{ input: "4\n1 2 3 4\n", output: "7 1\n", explanation: "Only 3 xor 4 = 7." }, { input: "3\n5 5 5\n", output: "0 3\n" }],
  hints: [
    "Trying all pairs costs n^2/2, about 3*10^9 for the largest input. Think about deciding the answer one bit at a time from the top.",
    "Greedy on prefixes: M has bit b set if there are two numbers whose prefixes (a >> b) XOR to the current candidate prefix. A boolean table over prefixes or a binary trie works.",
    "Once M is known, count pairs with a frequency array: sum cnt[v] * cnt[v ^ M] over all v, halve it when M > 0, and use cnt*(cnt-1)/2 when M = 0.",
  ],
  editorial:
    "Build M from the highest bit. Keep `ans`; for bit b try cand = ans | (1 << b). Insert every a >> b into a table and check if some p has p ^ (cand >> b) in the table; if yes, ans = cand. Because cand is non-zero the two numbers differ, so they are different positions. After M is fixed count pairs: for M > 0 each unordered pair {v, v ^ M} contributes cnt[v] * cnt[v ^ M], summing over all v counts each pair twice; for M = 0 all elements are equal and the count is C(cnt, 2).\n\nComplexity: O(20 * n + 2^20).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<int> a(n);
    for (auto &v : a) scanf("%d", &v);
    const int B = 20;
    vector<char> seen(1 << B);
    int ans = 0;
    for (int b = B - 1; b >= 0; b--) {
        fill(seen.begin(), seen.end(), 0);
        for (int v : a) seen[v >> b] = 1;
        int cand = ans | (1 << b);
        bool ok = false;
        for (int v : a) if (seen[(v >> b) ^ (cand >> b)]) { ok = true; break; }
        if (ok) ans = cand;
    }
    vector<long long> cnt(1 << B);
    for (int v : a) cnt[v]++;
    long long pairs = 0;
    if (ans == 0) {
        for (auto c : cnt) pairs += c * (c - 1) / 2;
    } else {
        for (int v = 0; v < (1 << B); v++) pairs += cnt[v] * cnt[v ^ ans];
        pairs /= 2;
    }
    printf("%d %lld\\n", ans, pairs);
}`,
  hidden: () => {
    const r = rng(8007);
    const mk = (xs: number[]) => `${xs.length}\n${xs.join(" ")}\n`;
    const twoSets = (n: number, x: number, m: number) => Array.from({ length: n }, () => (r.int(0, 1) ? x : x ^ m));
    return [
      mk([0, 0]),
      mk([1048575, 0]),
      mk([7, 7, 7, 7, 7]),
      mk(arr(r, 10, 0, 7)),
      mk(arr(r, 100, 0, 1048575)),
      mk(arr(r, 80000, 0, 1048575)),
      mk(arr(r, 80000, 0, 255)),
      mk(arr(r, 80000, 524288, 524288 + 1000)),
      mk(twoSets(80000, 345678, 1000001)),
      mk(Array.from({ length: 80000 }, (_, i) => i % 20 === 0 ? 1048575 : (i * 7919) % 524288)),
      mk([...Array.from({ length: 20 }, (_, i) => 1 << i), 0, 0]),
      mk(Array.from({ length: 80000 }, () => 1048575)),
    ];
  },
});

const swapBudgetSmallest = P({
  slug: "smallest-array-k-adjacent-swaps",
  title: "Smallest Array with k Swaps",
  difficulty: "medium",
  rating: 1500,
  tags: ["greedy", "constructive"],
  statement:
    "You are given an array of n integers and may perform at most k operations, each swapping two adjacent elements. Among all arrays reachable this way, print the lexicographically smallest one (compare the first position where two arrays differ; the smaller value wins).",
  inputFormat: "The first line contains n and k. The second line contains n integers.",
  outputFormat: "Print the resulting array, separated by spaces.",
  constraints: "1 <= n <= 3000\n0 <= k <= 10^9\n1 <= a_i <= 10^9",
  samples: [
    { input: "5 3\n5 4 3 2 1\n", output: "2 5 4 3 1\n", explanation: "Move the 2 three steps to the front; no swaps remain." },
    { input: "4 10\n3 1 2 1\n", output: "1 1 2 3\n" },
  ],
  hints: [
    "Decide the array from left to right. For position i, which elements can still be brought there with the remaining swaps?",
    "Greedy: look at the window [i, i + k] and take the smallest value; among equal smallest values the leftmost one costs the fewest swaps.",
    "Bring the chosen element to position i by shifting the elements in between one step right (erase and insert in a vector), then subtract the distance from k.",
  ],
  editorial:
    "Fix positions from left to right. With k swaps left, the element at index p can be moved to position i for cost p - i, so the candidates are indices i..min(n-1, i+k). Choosing the smallest value is necessary for lexicographic minimality, and among ties the leftmost candidate costs least and leaves the rest of the array in the same relative order, so it is never worse. Remove it and insert it at i, subtract the distance from k, continue.\n\nComplexity: O(n^2).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    long long k;
    scanf("%d %lld", &n, &k);
    vector<long long> a(n);
    for (auto &v : a) scanf("%lld", &v);
    for (int i = 0; i < n && k > 0; i++) {
        int end = (int)min<long long>(n - 1, i + k);
        int p = i;
        for (int j = i; j <= end; j++) if (a[j] < a[p]) p = j;
        long long v = a[p];
        a.erase(a.begin() + p);
        a.insert(a.begin() + i, v);
        k -= p - i;
    }
    for (int i = 0; i < n; i++) printf("%lld%c", a[i], i + 1 < n ? ' ' : '\\n');
}`,
  hidden: () => {
    const r = rng(8008);
    const mk = (n: number, k: number, xs: number[]) => `${n} ${k}\n${xs.join(" ")}\n`;
    return [
      mk(1, 5, [7]),
      mk(5, 0, [5, 4, 3, 2, 1]),
      mk(6, 2, arr(r, 6, 1, 4)),
      mk(8, 1000, arr(r, 8, 1, 3)),
      mk(10, 7, arr(r, 10, 1, 10)),
      mk(3000, 1000000000, arr(r, 3000, 1, 1000000000)),
      mk(3000, 5000, arr(r, 3000, 1, 1000000000)),
      mk(3000, 3, arr(r, 3000, 1, 5)),
      mk(3000, 1000000, Array.from({ length: 3000 }, (_, i) => 3000 - i)),
      mk(3000, 2999, Array.from({ length: 3000 }, (_, i) => 3000 - i)),
      mk(3000, 100000, arr(r, 3000, 1, 4)),
      mk(2999, 1500, r.shuffle(Array.from({ length: 2999 }, (_, i) => i + 1))),
    ];
  },
});

const hullCount = P({
  slug: "convex-hull-vertex-count",
  title: "Convex Hull Size",
  difficulty: "medium",
  rating: 1600,
  tags: ["geometry", "sortings"],
  statement:
    "Given n distinct points with integer coordinates, consider their convex hull. Count its vertices, where a vertex is a corner of the hull: points that merely lie on an edge between two corners are not vertices. If all points are collinear the hull is a segment with 2 vertices (and a single point has 1 vertex). Also print twice the area of the hull.",
  inputFormat: "The first line contains n. Each of the next n lines contains x y.",
  outputFormat: "Print the number of hull vertices and the doubled area (an integer), separated by a space.",
  constraints: "1 <= n <= 40000\n|x|, |y| <= 10^6, all points distinct",
  samples: [
    { input: "6\n0 0\n2 0\n2 2\n0 2\n1 1\n1 0\n", output: "4 8\n", explanation: "(1,1) is inside and (1,0) lies on an edge." },
    { input: "3\n0 0\n1 1\n2 2\n", output: "2 0\n" },
  ],
  hints: [
    "Sort the points. The hull splits naturally into a lower chain and an upper chain.",
    "Monotone chain: scan sorted points keeping a stack; while the last two stack points and the new point do not make a strict left turn, pop.",
    "Popping on cross <= 0 removes collinear points, so the stack holds exactly the corners. Combine lower and upper chains without repeating endpoints; compute doubled area with the shoelace formula.",
  ],
  editorial:
    "Andrew's monotone chain: sort by (x, y), build the lower hull and the upper hull with a stack, popping while cross(prev2, prev1, p) <= 0. Dropping on equality discards collinear points. Concatenate chains (omitting the last point of each). The number of points left is the vertex count; for 1 point answer is 1, and a collinear set yields 2 vertices. Doubled area = |shoelace sum| over the hull in order, at most 8*10^12.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef pair<ll, ll> pt;
ll cross(pt o, pt a, pt b) { return (a.first - o.first) * (b.second - o.second) - (a.second - o.second) * (b.first - o.first); }
int main() {
    int n;
    scanf("%d", &n);
    vector<pt> p(n);
    for (auto &q : p) scanf("%lld %lld", &q.first, &q.second);
    sort(p.begin(), p.end());
    if (n == 1) { printf("1 0\\n"); return 0; }
    vector<pt> h;
    for (int pass = 0; pass < 2; pass++) {
        size_t start = h.size();
        for (int i = 0; i < n; i++) {
            pt q = pass == 0 ? p[i] : p[n - 1 - i];
            while (h.size() >= start + 2 && cross(h[h.size() - 2], h[h.size() - 1], q) <= 0) h.pop_back();
            h.push_back(q);
        }
        h.pop_back();
    }
    ll area2 = 0;
    int m = h.size();
    for (int i = 0; i < m; i++) {
        pt a = h[i], b = h[(i + 1) % m];
        area2 += a.first * b.second - a.second * b.first;
    }
    printf("%d %lld\\n", m, llabs(area2));
}`,
  hidden: () => {
    const r = rng(8009);
    const mk = (pts: number[][]) => `${pts.length}\n${nl(pts.map((p) => p.join(" "))).trim()}\n`;
    const uniq = (n: number, gen: () => number[]) => {
      const s = new Map<string, number[]>();
      let guard = 0;
      while (s.size < n && guard++ < 50 * n) {
        const p = gen();
        s.set(p.join(","), p);
      }
      return [...s.values()];
    };
    const C = 1000000;
    const circle = Array.from({ length: 2000 }, (_, i) => [Math.round(C * Math.cos((2 * Math.PI * i) / 2000)), Math.round(C * Math.sin((2 * Math.PI * i) / 2000))]);
    const parab = Array.from({ length: 1999 }, (_, i) => [i - 999, (i - 999) * (i - 999)]);
    const grid = Array.from({ length: 40000 }, (_, i) => [(i % 200) - 100, Math.floor(i / 200) - 100]);
    return [
      mk([[5, -5]]),
      mk([[0, 0], [3, 4]]),
      mk([[0, 0], [1, 1], [2, 2], [-1, -1], [5, 5]]),
      mk(uniq(8, () => [r.int(-3, 3), r.int(-3, 3)])),
      mk(uniq(100, () => [r.int(-30, 30), r.int(-30, 30)])),
      mk(uniq(40000, () => [r.int(-C, C), r.int(-C, C)])),
      mk(uniq(30000, () => [r.int(-50, 50), r.int(-200, 200)])),
      mk(r.shuffle(circle)),
      mk(r.shuffle(parab)),
      mk(r.shuffle(grid)),
      mk(uniq(40000, () => { const a = r.int(0, 3); const t = r.int(-C, C); return a === 0 ? [t, -C] : a === 1 ? [t, C] : a === 2 ? [-C, t] : [C, t]; })),
      mk(uniq(30000, () => { const t = r.int(-C, C); return [t, 3 * t % C]; })),
    ];
  },
});

const powerNim = P({
  slug: "power-of-two-nim",
  title: "Nim with Powers of Two",
  difficulty: "medium",
  rating: 1500,
  tags: ["game-theory", "math"],
  statement:
    "Two players play on several piles of stones and move alternately, the first player starting. In a move the player chooses one pile and removes exactly 2^k stones from it for some k >= 0 (1, 2, 4, 8, ... stones), provided the pile has at least that many. A player who cannot move loses. Both play optimally. For each game decide who wins.",
  inputFormat: "The first line contains the number of games T. Each game is given as a line with n followed by a line with the n pile sizes.",
  outputFormat: "For every game print FIRST if the first player wins and SECOND otherwise.",
  constraints: "1 <= T <= 10000\n1 <= n, sum of all n <= 30000\n1 <= pile size <= 10^18",
  samples: [{ input: "3\n1\n3\n2\n1 2\n2\n4 5\n", output: "SECOND\nFIRST\nFIRST\n" }],
  hints: [
    "The piles are independent, so Sprague-Grundy applies. Compute the Grundy value of a single pile of size s for small s by hand or with a brute-force program.",
    "Grundy values for the single-pile game follow a very short pattern in s. Find it, then XOR the values across piles.",
    "The Grundy value of a pile of s stones is s mod 3 (check: 2^k mod 3 is 1 or 2, so you can never reach a pile of the same residue). The first player wins iff the XOR of all (pile mod 3) is non-zero.",
  ],
  editorial:
    "Let g(s) be the Grundy number of a pile. g(0) = 0, g(1) = mex{g(0)} = 1, g(2) = mex{g(1), g(0)} = 2, g(3) = mex{g(2), g(1)} = 0, and by induction g(s) = s mod 3: powers of two are never multiples of 3, so s - 2^k never has residue s mod 3, while residues 0..2 are all reachable from a residue r > 0 in every smaller class (2^k takes both residues 1 and 2 as needed), and from a multiple of 3 only residues 1, 2 are reachable. The game is the sum of piles, so the first player wins iff the XOR of the g values is non-zero.\n\nComplexity: O(sum of n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int T;
    scanf("%d", &T);
    while (T--) {
        int n;
        scanf("%d", &n);
        int x = 0;
        for (int i = 0; i < n; i++) {
            long long s;
            scanf("%lld", &s);
            x ^= (int)(s % 3);
        }
        puts(x ? "FIRST" : "SECOND");
    }
}`,
  hidden: () => {
    const r = rng(8010);
    const game = (n: number, hi: bigint, wantZero: boolean) => {
      for (let tries = 0; tries < 200; tries++) {
        const p = Array.from({ length: n }, () => r.big(1n, hi));
        const x = p.reduce((a, v) => a ^ Number(v % 3n), 0);
        if ((x === 0) === wantZero) return `${n}\n${p.join(" ")}`;
      }
      return `${n}\n${Array.from({ length: n }, () => "3").join(" ")}`;
    };
    const mk = (gs: string[]) => `${gs.length}\n${gs.join("\n")}\n`;
    const T18 = 1000000000000000000n;
    return [
      mk(["1\n1"]),
      mk(["1\n3", "1\n2", "2\n1 2", "2\n4 5"]),
      mk(Array.from({ length: 30 }, (_, i) => game(r.int(1, 4), 20n, i % 2 === 0))),
      mk(Array.from({ length: 200 }, (_, i) => game(r.int(1, 6), 1000000n, i % 3 === 0))),
      mk(Array.from({ length: 1500 }, (_, i) => game(r.int(1, 30), T18, i % 2 === 0))),
      mk(Array.from({ length: 1500 }, (_, i) => game(r.int(1, 30), T18, i % 3 !== 0))),
      mk([game(1500, T18, true), game(1500, T18, false)]),
      mk([game(30000, T18, true)]),
      mk(Array.from({ length: 10000 }, (_, i) => game(r.int(1, 5), T18, i % 2 === 1))),
      mk(["1\n1000000000000000000", "3\n1000000000000000000 999999999999999999 999999999999999998"]),
    ];
  },
});

const subsetSumMitm = P({
  slug: "count-subsets-with-sum-forty",
  title: "Forty Coins",
  difficulty: "medium",
  rating: 1700,
  tags: ["meet-in-the-middle", "two-pointers", "sortings"],
  statement:
    "You have n coins with positive integer values a_1 ... a_n. Count the subsets of coins (subsets of positions, so equal values at different positions are different coins; the empty subset counts only if S = 0) whose values add up to exactly S.",
  inputFormat: "The first line contains n and S. The second line contains the n values.",
  outputFormat: "Print the number of subsets with sum exactly S.",
  constraints: "1 <= n <= 40\n1 <= a_i <= 10^9\n1 <= S <= 4*10^10",
  samples: [{ input: "4 5\n1 2 3 4\n", output: "2\n", explanation: "{1,4} and {2,3}." }, { input: "3 100\n1 2 3\n", output: "0\n" }],
  hints: [
    "2^40 subsets is far too many, and the sums are too large for a knapsack table. How many coins could you still brute-force, and could two such groups be combined?",
    "Split the coins into two halves. Enumerate all 2^20 subset sums of each half, sort them, and for every left sum count how many right sums equal S minus it.",
    "Use two pointers over the two sorted arrays (or lower/upper bound). The answer can reach C(40,20), so use 64-bit counters.",
  ],
  editorial:
    "Meet in the middle: the left half (first n/2 coins) and right half give lists L and R of at most 2^20 subset sums each. A subset of the whole set is a pair (l, r) and its sum is l + r, so the answer is the number of pairs with l + r = S. Sort both lists and sweep with two pointers, multiplying run lengths of equal values.\n\nComplexity: O(2^(n/2) * n/2) time and O(2^(n/2)) memory.",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
vector<ll> sums(const vector<ll> &a) {
    vector<ll> s(1, 0);
    for (ll v : a) {
        size_t m = s.size();
        for (size_t i = 0; i < m; i++) s.push_back(s[i] + v);
    }
    sort(s.begin(), s.end());
    return s;
}
int main() {
    int n;
    ll S;
    scanf("%d %lld", &n, &S);
    vector<ll> a(n);
    for (auto &v : a) scanf("%lld", &v);
    int h = n / 2;
    vector<ll> L = sums(vector<ll>(a.begin(), a.begin() + h)), R = sums(vector<ll>(a.begin() + h, a.end()));
    ll ans = 0;
    int j = (int)R.size() - 1;
    size_t i = 0;
    while (i < L.size() && j >= 0) {
        ll cur = L[i] + R[j];
        if (cur < S) i++;
        else if (cur > S) j--;
        else {
            ll x = L[i], y = R[j];
            ll cx = 0, cy = 0;
            while (i < L.size() && L[i] == x) { cx++; i++; }
            while (j >= 0 && R[j] == y) { cy++; j--; }
            ans += cx * cy;
        }
    }
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(8011);
    const mk = (xs: number[], s: number) => `${xs.length} ${s}\n${xs.join(" ")}\n`;
    const subsetOf = (xs: number[]) => xs.reduce((a, v) => a + (r.int(0, 1) ? v : 0), 0) || xs[0]!;
    const rnd40 = arr(r, 40, 1, 1000000000);
    const mid = arr(r, 40, 1, 100);
    const pow = Array.from({ length: 30 }, (_, i) => 2 ** i);
    return [
      mk([5], 5),
      mk([5], 4),
      mk([1, 1, 1, 1], 2),
      mk([1, 2, 3, 4], 5),
      mk(arr(r, 12, 1, 20), 30),
      mk(Array(40).fill(1), 20),
      mk(Array(40).fill(5), 100),
      mk(rnd40, subsetOf(rnd40)),
      mk(rnd40, 20000000000),
      mk(mid, subsetOf(mid)),
      mk(mid, 1500),
      mk(pow, subsetOf(pow)),
      mk(arr(r, 40, 1, 2), 30),
    ];
  },
});

const segmentPairs = P({
  slug: "touching-segment-pairs",
  title: "Touching Segments",
  difficulty: "medium",
  rating: 1500,
  tags: ["geometry", "implementation"],
  statement:
    "You are given n segments in the plane with integer endpoints. A segment may degenerate to a single point. Count the pairs of segments (i < j) that have at least one common point: crossing, touching at an endpoint, a point lying inside the other segment, or overlapping along a stretch all count.",
  inputFormat: "The first line contains n. Each of the next n lines contains x1 y1 x2 y2.",
  outputFormat: "Print the number of intersecting pairs.",
  constraints: "1 <= n <= 5000\n|coordinates| <= 10^9",
  samples: [
    { input: "4\n0 0 4 4\n0 4 4 0\n5 5 6 6\n4 4 8 0\n", output: "2\n", explanation: "Segments 1-2 cross and 1-4 touch at (4,4)." },
    { input: "2\n0 0 2 0\n1 0 3 0\n", output: "1\n" },
  ],
  hints: [
    "n is only 5000, so test all pairs, but the test itself must be exact: no floating point, and collinear cases need care.",
    "Use orientation (sign of the cross product) of each endpoint relative to the other segment. The general case is different orientations on both segments; zero orientations need an on-segment (bounding box) check.",
    "Cross products reach 8*10^18; use __int128 or compare signs carefully. A degenerate point segment works with the same routine because all its orientations are 0 and the bounding-box checks resolve it.",
  ],
  editorial:
    "For segments AB and CD compute o1 = orient(A,B,C), o2 = orient(A,B,D), o3 = orient(C,D,A), o4 = orient(C,D,B) as signs. They intersect if o1 != o2 and o3 != o4, or if some orientation is 0 and the corresponding point lies within the bounding box of the other segment (which for collinear points means it lies on the segment). Check all pairs.\n\nComplexity: O(n^2).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
struct P { ll x, y; };
int orient(P a, P b, P c) {
    __int128 v = (__int128)(b.x - a.x) * (c.y - a.y) - (__int128)(b.y - a.y) * (c.x - a.x);
    return v > 0 ? 1 : v < 0 ? -1 : 0;
}
bool on(P a, P b, P c) { return min(a.x, b.x) <= c.x && c.x <= max(a.x, b.x) && min(a.y, b.y) <= c.y && c.y <= max(a.y, b.y); }
bool inter(P a, P b, P c, P d) {
    int o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
    if (o1 != o2 && o3 != o4) return true;
    if (o1 == 0 && on(a, b, c)) return true;
    if (o2 == 0 && on(a, b, d)) return true;
    if (o3 == 0 && on(c, d, a)) return true;
    if (o4 == 0 && on(c, d, b)) return true;
    return false;
}
int main() {
    int n;
    scanf("%d", &n);
    vector<P> a(n), b(n);
    for (int i = 0; i < n; i++) scanf("%lld %lld %lld %lld", &a[i].x, &a[i].y, &b[i].x, &b[i].y);
    long long ans = 0;
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) ans += inter(a[i], b[i], a[j], b[j]);
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(8012);
    const mk = (s: number[][]) => `${s.length}\n${nl(s.map((x) => x.join(" "))).trim()}\n`;
    const rs = (n: number, c: number) => Array.from({ length: n }, () => [r.int(-c, c), r.int(-c, c), r.int(-c, c), r.int(-c, c)]);
    const C = 1000000000;
    return [
      mk([[0, 0, 1, 1]]),
      mk([[0, 0, 0, 0], [0, 0, 0, 0]]),
      mk([[0, 0, 0, 0], [1, 1, 3, 3], [2, 2, 2, 2], [5, 5, 5, 5]]),
      mk(rs(30, 3)),
      mk(rs(200, 10)),
      mk(rs(5000, 5)),
      mk(rs(5000, 1000)),
      mk(rs(5000, C)),
      mk(Array.from({ length: 5000 }, (_, i) => [i, 0, i, 5000])),
      mk(Array.from({ length: 5000 }, (_, i) => [-C, i, C, i + 1])),
      mk(Array.from({ length: 5000 }, () => { const y = r.int(0, 20); const a = r.int(-30, 30); return [a, y, a + r.int(0, 10), y]; })),
      mk(Array.from({ length: 5000 }, () => { const t = r.int(-C, C - 1); return [t, t, t + r.int(0, 1), t + r.int(0, 1)]; })),
    ];
  },
});

const pickPolygon = P({
  slug: "lattice-points-in-polygon",
  title: "Lattice Points Inside",
  difficulty: "medium",
  rating: 1600,
  tags: ["geometry", "math", "number-theory"],
  statement:
    "A simple polygon (no self-intersections or self-touching) has vertices with integer coordinates, listed in order around the boundary, clockwise or counter-clockwise. Count the lattice points (points with integer coordinates) strictly inside the polygon, and the lattice points on its boundary (including all vertices).",
  inputFormat: "The first line contains n. Each of the next n lines contains x y of a vertex.",
  outputFormat: "Print two integers: the number of interior lattice points I and the number of boundary lattice points B.",
  constraints: "3 <= n <= 40000\n|x|, |y| <= 10^6\nThe polygon has positive area.",
  samples: [
    { input: "4\n0 0\n4 0\n4 4\n0 4\n", output: "9 16\n" },
    { input: "3\n0 0\n3 0\n0 3\n", output: "1 9\n" },
  ],
  hints: [
    "Counting points one by one is impossible for coordinates up to 10^6. Is there a formula relating area, interior points and boundary points?",
    "Pick's theorem: A = I + B/2 - 1. The area comes from the shoelace formula, and the boundary points on each edge number gcd(|dx|, |dy|).",
    "Compute 2A as an integer (shoelace, absolute value), B as the sum of gcds over edges, then I = (2A - B + 2) / 2.",
  ],
  editorial:
    "Doubled area 2A is the absolute value of the shoelace sum. On an edge with difference (dx, dy) there are gcd(|dx|, |dy|) lattice points excluding one endpoint, so the boundary total is B = sum of these. Pick's theorem gives I = A - B/2 + 1 = (2A - B + 2) / 2.\n\nComplexity: O(n log C).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n;
    scanf("%d", &n);
    vector<ll> x(n), y(n);
    for (int i = 0; i < n; i++) scanf("%lld %lld", &x[i], &y[i]);
    ll a2 = 0, b = 0;
    for (int i = 0; i < n; i++) {
        int j = (i + 1) % n;
        a2 += x[i] * y[j] - x[j] * y[i];
        b += __gcd(llabs(x[j] - x[i]), llabs(y[j] - y[i]));
    }
    a2 = llabs(a2);
    printf("%lld %lld\\n", (a2 - b + 2) / 2, b);
}`,
  hidden: () => {
    const r = rng(8013);
    const mk = (pts: number[][]) => `${pts.length}\n${nl(pts.map((p) => p.join(" "))).trim()}\n`;
    const star = (n: number, R: number, lo: number, cw: boolean) => {
      const p = Array.from({ length: n }, (_, i) => {
        const th = (2 * Math.PI * i) / n;
        const rad = r.int(Math.floor(R * lo), R);
        return [Math.round(rad * Math.cos(th)), Math.round(rad * Math.sin(th))];
      });
      return cw ? p.reverse() : p;
    };
    const C = 1000000;
    const stair = (k: number) => {
      const p: number[][] = [[0, 0]];
      for (let i = 0; i < k; i++) {
        p.push([i * 3 + 3, i * 2]);
        p.push([i * 3 + 3, i * 2 + 2]);
      }
      p.push([0, 2 * k]);
      return p;
    };
    return [
      mk([[0, 0], [4, 0], [4, 4], [0, 4]]),
      mk([[0, 0], [0, 3], [3, 0]]),
      mk([[1, 1], [2, 1], [2, 2]]),
      mk([[-C, -C], [C, -C], [C, C], [-C, C]]),
      mk([[0, 0], [C, 1], [1, C]]),
      mk(star(12, 50, 0.4, false)),
      mk(star(200, 100000, 0.5, true)),
      mk(star(40000, C, 0.1, false)),
      mk(star(40000, C, 0.9, true)),
      mk(stair(500)),
      mk([[0, 0], [10, 0], [10, 10], [5, 10], [5, 5], [0, 5]]),
      mk([[0, 0], [6, 4], [12, 0], [6, -4]]),
    ];
  },
});

// ---------------------------------------------------------------- hard

/** Header line "n q" plus generator line "x0 A B M" shared by several array-generated problems. */
const genHead = (n: number, q: number, x0: number, A: number, B: number, M: number) => `${n} ${q}\n${x0} ${A} ${B} ${M}\n`;
const lrPair = (r: Rng, n: number, wide = false) => {
  let l = r.int(1, n);
  let rr = r.int(1, n);
  if (wide) {
    l = r.int(1, Math.max(1, Math.floor(n / 10)));
    rr = r.int(n - Math.floor(n / 10), n);
  }
  return l <= rr ? [l, rr] : [rr, l];
};

const distinctSum = P({
  slug: "distinct-value-sum-queries",
  title: "Sum of Distinct Values",
  difficulty: "hard",
  rating: 1900,
  tags: ["fenwick-tree", "offline-queries", "data-structures"],
  statement:
    "An array a_1 ... a_n is generated from four numbers: a_1 = x0 and a_(i+1) = (a_i * A + B) mod M. For each query (l, r) report the sum of the distinct values among a_l ... a_r (every value is counted once, however many times it occurs in the range).",
  inputFormat: "The first line contains n and q. The second line contains x0, A, B and M. Each of the next q lines contains l and r.",
  outputFormat: "For each query print the requested sum on its own line.",
  constraints: "1 <= n <= 500000\n1 <= q <= 40000\n1 <= M <= 10^9, 0 <= x0, A, B < M\n1 <= l <= r <= n",
  samples: [{ input: "6 4\n2 3 1 11\n1 6\n2 4\n3 6\n1 1\n", output: "14\n8\n7\n2\n", explanation: "The array is 2 7 0 1 4 2." }],
  hints: [
    "Answering each query with a scan and a seen-array costs n*q, about 2*10^10 here. Try handling all queries together, sorted by right end.",
    "Sweep r from left to right. Keep, for every value, only its latest position counted: when value v appears at position i, remove v at its previous position and add v at i, in a Fenwick tree.",
    "Then the answer for (l, r) is the prefix-sum difference sum(l..r) of the Fenwick tree at the moment the sweep reaches r. Compress values (or use a hash map) for the last-occurrence table, and use 64-bit sums.",
  ],
  editorial:
    "Offline sweep over the right end r. Maintain a Fenwick tree over positions where position p holds a_p exactly when p is the last occurrence of its value among a_1..a_r. When advancing to r, subtract a_r at its previous last occurrence (if any) and add it at r. Then the sum of distinct values in [l, r] is the Fenwick range sum over [l, r], because each distinct value of the window is represented by its last occurrence which lies inside [l, r], and values whose last occurrence is before l do not appear in the window.\n\nComplexity: O((n + q) log n) plus value compression.",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int n, q;
vector<ll> bit;
void upd(int i, ll v) { for (; i <= n; i += i & -i) bit[i] += v; }
ll qry(int i) { ll s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; }
int main() {
    ll x0, A, B, M;
    scanf("%d %d %lld %lld %lld %lld", &n, &q, &x0, &A, &B, &M);
    vector<ll> a(n + 1);
    a[1] = x0;
    for (int i = 2; i <= n; i++) a[i] = (a[i - 1] * A + B) % M;
    vector<ll> vals(a.begin() + 1, a.end());
    sort(vals.begin(), vals.end());
    vals.erase(unique(vals.begin(), vals.end()), vals.end());
    vector<int> last(vals.size(), 0);
    vector<array<int, 3>> qs(q);
    for (int i = 0; i < q; i++) {
        scanf("%d %d", &qs[i][1], &qs[i][0]);
        qs[i][2] = i;
    }
    sort(qs.begin(), qs.end());
    bit.assign(n + 1, 0);
    vector<ll> ans(q);
    int r = 0;
    for (auto &Q : qs) {
        while (r < Q[0]) {
            r++;
            int id = lower_bound(vals.begin(), vals.end(), a[r]) - vals.begin();
            if (last[id]) upd(last[id], -a[r]);
            upd(r, a[r]);
            last[id] = r;
        }
        ans[Q[2]] = qry(Q[0]) - qry(Q[1] - 1);
    }
    for (int i = 0; i < q; i++) printf("%lld\\n", ans[i]);
}`,
  hidden: () => {
    const r = rng(8014);
    const mk = (n: number, q: number, x0: number, A: number, B: number, M: number, wide = false) =>
      genHead(n, q, x0, A, B, M) + nl(Array.from({ length: q }, () => lrPair(r, n, wide).join(" "))).trim() + "\n";
    return [
      mk(1, 1, 0, 0, 0, 1),
      mk(6, 4, 2, 3, 1, 11),
      mk(10, 10, 5, 1, 0, 100),
      mk(50, 50, 7, 3, 5, 13),
      mk(500000, 40000, 123456789, 987654321, 12345, 1000000000, true),
      mk(500000, 4000, 1, 1, 1, 1000000000, true),
      mk(500000, 4000, 0, 1, 1, 1000),
      mk(500000, 4000, 7, 31, 11, 1000003, true),
      mk(500000, 4000, 5, 1, 0, 1000000000),
      mk(500000, 4000, 3, 5, 7, 99991),
      mk(500000, 40000, 999999999, 999999999, 999999999, 999999999, true),
      mk(500000, 4000, 1, 2, 1, 262144),
    ];
  },
});

const assignAddSum = P({
  slug: "assign-add-sum-queries",
  title: "Assign, Add, Sum",
  difficulty: "hard",
  rating: 2000,
  tags: ["segment-tree", "lazy-propagation", "data-structures"],
  statement:
    "An array a_1 ... a_n is generated from x0, A, B and M by a_1 = x0 and a_(i+1) = (a_i * A + B) mod M. Then q operations are applied in order. Type 1 l r v sets every a_i with l <= i <= r to v. Type 2 l r v adds v to every a_i in l..r. Type 3 l r asks for the current sum of a_l ... a_r.",
  inputFormat: "The first line contains n and q. The second line contains x0, A, B and M. Each of the next q lines is `1 l r v`, `2 l r v` or `3 l r`.",
  outputFormat: "For each operation of type 3, print the sum on its own line.",
  constraints: "1 <= n <= 500000\n1 <= q <= 30000\n1 <= M <= 10^9, 0 <= x0, A, B < M\n1 <= l <= r <= n\n0 <= v <= 1000 for type 2, 0 <= v <= 10^9 for type 1",
  samples: [{ input: "5 5\n1 1 1 100\n3 1 5\n1 2 4 10\n3 1 5\n2 3 5 2\n3 2 4\n", output: "15\n36\n34\n", explanation: "Array 1 2 3 4 5, then 1 10 10 10 5, then 1 10 12 12 7." }],
  hints: [
    "Updating elements one by one costs O(n) per operation and about 1.5*10^10 in total. Use a structure that handles ranges lazily.",
    "A segment tree storing the sum per node with lazy tags. The difficulty is composing an assignment with an addition that arrives later (and vice versa).",
    "Keep two tags per node: `assign` (or none) and `add`. Applying 'set v' replaces both (assign = v, add = 0); applying 'add v' increases `assign` if one exists, otherwise `add`. Push tags down before descending.",
  ],
  editorial:
    "Lazy segment tree. Node stores its sum and a pending operation, which is either 'assign value s then add d' (with s possibly absent). Applying assign v to a node of length len sets sum = v * len and the tag to (assign v, add 0). Applying add v sets sum += v * len and, if an assign is pending, increments it, otherwise increases the add tag. Both composition rules keep the tag representable in O(1). Values stay below about 1.1*10^9 and sums below 6*10^14, which fits in 64 bits.\n\nComplexity: O(n + q log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int n, q;
vector<ll> sm, as, ad;
vector<ll> a;
void applySet(int o, int len, ll v) { sm[o] = v * len; as[o] = v; ad[o] = 0; }
void applyAdd(int o, int len, ll v) {
    sm[o] += v * len;
    if (as[o] >= 0) as[o] += v;
    else ad[o] += v;
}
void push(int o, int l, int r) {
    int m = (l + r) / 2;
    if (as[o] >= 0) {
        applySet(2 * o, m - l + 1, as[o]);
        applySet(2 * o + 1, r - m, as[o]);
        as[o] = -1;
    }
    if (ad[o]) {
        applyAdd(2 * o, m - l + 1, ad[o]);
        applyAdd(2 * o + 1, r - m, ad[o]);
        ad[o] = 0;
    }
}
void build(int o, int l, int r) {
    as[o] = -1;
    if (l == r) { sm[o] = a[l]; return; }
    int m = (l + r) / 2;
    build(2 * o, l, m);
    build(2 * o + 1, m + 1, r);
    sm[o] = sm[2 * o] + sm[2 * o + 1];
}
void update(int o, int l, int r, int ql, int qr, int type, ll v) {
    if (qr < l || r < ql) return;
    if (ql <= l && r <= qr) {
        if (type == 1) applySet(o, r - l + 1, v);
        else applyAdd(o, r - l + 1, v);
        return;
    }
    push(o, l, r);
    int m = (l + r) / 2;
    update(2 * o, l, m, ql, qr, type, v);
    update(2 * o + 1, m + 1, r, ql, qr, type, v);
    sm[o] = sm[2 * o] + sm[2 * o + 1];
}
ll query(int o, int l, int r, int ql, int qr) {
    if (qr < l || r < ql) return 0;
    if (ql <= l && r <= qr) return sm[o];
    push(o, l, r);
    int m = (l + r) / 2;
    return query(2 * o, l, m, ql, qr) + query(2 * o + 1, m + 1, r, ql, qr);
}
int main() {
    ll x0, A, B, M;
    scanf("%d %d %lld %lld %lld %lld", &n, &q, &x0, &A, &B, &M);
    a.assign(n + 1, 0);
    a[1] = x0;
    for (int i = 2; i <= n; i++) a[i] = (a[i - 1] * A + B) % M;
    sm.assign(4 * n + 4, 0);
    as.assign(4 * n + 4, -1);
    ad.assign(4 * n + 4, 0);
    build(1, 1, n);
    while (q--) {
        int t, l, r;
        scanf("%d %d %d", &t, &l, &r);
        if (t == 3) printf("%lld\\n", query(1, 1, n, l, r));
        else {
            ll v;
            scanf("%lld", &v);
            update(1, 1, n, l, r, t, v);
        }
    }
}`,
  hidden: () => {
    const r = rng(8015);
    const mk = (n: number, q: number, x0: number, A: number, B: number, M: number, w: [number, number, number], wide = false) => {
      const ops = Array.from({ length: q }, (_, i) => {
        const [l, rr] = lrPair(r, n, wide && i % 2 === 0);
        const t = i === q - 1 ? 3 : r.pick([1, 2, 3].flatMap((x, k) => Array(w[k]!).fill(x)));
        if (t === 3) return `3 ${l} ${rr}`;
        return `${t} ${l} ${rr} ${t === 1 ? r.int(0, 1000000000) : r.int(0, 1000)}`;
      });
      return genHead(n, q, x0, A, B, M) + ops.join("\n") + "\n";
    };
    return [
      mk(1, 5, 7, 1, 1, 10, [1, 1, 1]),
      mk(5, 5, 1, 1, 1, 100, [1, 1, 3]),
      mk(20, 40, 3, 7, 1, 50, [2, 2, 3]),
      mk(100, 300, 9, 5, 5, 1000, [1, 1, 1]),
      mk(500000, 30000, 12345, 6789, 101, 1000000000, [1, 1, 1], true),
      mk(500000, 3000, 12345, 6789, 101, 1000000000, [1, 4, 1], true),
      mk(500000, 3000, 5, 1, 1, 1000000000, [4, 1, 3], true),
      mk(500000, 3000, 0, 0, 0, 1, [1, 1, 5]),
      mk(499999, 25000, 1, 2, 3, 1000, [3, 3, 2], true),
      mk(300000, 3000, 777, 31, 17, 999999937, [1, 1, 2]),
    ];
  },
});

const disjointMasks = P({
  slug: "disjoint-mask-pairs",
  title: "Pairs with Zero AND",
  difficulty: "hard",
  rating: 1900,
  tags: ["bit-manipulation", "dp", "bitmask"],
  statement:
    "Given n integers, count the pairs of positions i < j with a_i AND a_j = 0, that is, the two numbers have no set bit in common.",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print the number of such pairs.",
  constraints: "2 <= n <= 90000\n0 <= a_i < 2^18",
  samples: [{ input: "4\n1 2 3 4\n", output: "4\n", explanation: "(1,2), (1,4), (2,4), (3,4)." }, { input: "3\n0 0 5\n", output: "3\n" }],
  hints: [
    "Checking all pairs is about 4*10^9 operations. The values only have 18 bits, which allows a table over all 2^18 masks.",
    "a_j works with a_i exactly when a_j is a subset of the complement of a_i. So you need, for every mask m, the number of elements that are submasks of m.",
    "Compute that with the sum-over-subsets DP: for each bit, for each mask having the bit, f[mask] += f[mask ^ bit]. Then sum f[~a_i & full] over i, subtract the self pairs (elements equal to 0) and halve.",
  ],
  editorial:
    "Let f[m] = number of elements that are submasks of m, built from the frequency table with the standard SOS DP over 18 bits (2^18 * 18 operations). The number of ordered pairs (i, j), including i = j, with a_i & a_j = 0 equals the sum over i of f[full ^ a_i]. The only i = j pairs counted are those with a_i = 0. So the answer is (ordered - zeros) / 2.\n\nComplexity: O(n + 18 * 2^18).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n;
    scanf("%d", &n);
    const int B = 18, FULL = (1 << B) - 1;
    vector<int> a(n);
    vector<ll> f(1 << B, 0);
    ll zeros = 0;
    for (auto &v : a) {
        scanf("%d", &v);
        f[v]++;
        zeros += v == 0;
    }
    for (int b = 0; b < B; b++)
        for (int m = 0; m <= FULL; m++)
            if (m >> b & 1) f[m] += f[m ^ (1 << b)];
    ll ordered = 0;
    for (int v : a) ordered += f[FULL ^ v];
    printf("%lld\\n", (ordered - zeros) / 2);
}`,
  hidden: () => {
    const r = rng(8016);
    const mk = (xs: number[]) => `${xs.length}\n${xs.join(" ")}\n`;
    const sparse = (n: number, bits: number) => Array.from({ length: n }, () => {
      let v = 0;
      for (let i = 0; i < bits; i++) v |= 1 << r.int(0, 17);
      return v;
    });
    const MAX = 262143;
    return [
      mk([0, 0]),
      mk([MAX, MAX]),
      mk([1, 2, 3, 4]),
      mk([0, 0, 5]),
      mk(arr(r, 60, 0, 255)),
      mk(arr(r, 90000, 0, MAX)),
      mk(sparse(90000, 2)),
      mk(sparse(90000, 3)),
      mk(sparse(90000, 1)),
      mk(Array.from({ length: 90000 }, (_, i) => (i % 2 ? 0x2aaaa : 0x15555))),
      mk(Array.from({ length: 90000 }, (_, i) => (i % 100 === 0 ? 0 : MAX))),
      mk(Array.from({ length: 90000 }, () => 0)),
    ];
  },
});

const unionArea = P({
  slug: "union-area-of-rectangles",
  title: "Union Area",
  difficulty: "hard",
  rating: 2000,
  tags: ["segment-tree", "sweep-line", "coordinate-compression", "geometry"],
  statement:
    "You are given n axis-parallel rectangles with integer coordinates; rectangle i covers the region x1_i <= x <= x2_i, y1_i <= y <= y2_i (with x1 < x2 and y1 < y2). Print the area of the union of all rectangles, counting every point of the plane covered by at least one rectangle once.",
  inputFormat: "The first line contains n. Each of the next n lines contains x1 y1 x2 y2.",
  outputFormat: "Print the area of the union.",
  constraints: "1 <= n <= 14000\n0 <= x1 < x2 <= 10^9, 0 <= y1 < y2 <= 10^9",
  samples: [{ input: "2\n0 0 4 4\n2 2 6 6\n", output: "28\n", explanation: "16 + 16 - 4." }, { input: "3\n0 0 1 1\n1 0 2 1\n5 5 6 6\n", output: "3\n" }],
  hints: [
    "A compressed grid has up to (2n)^2 = 784 million cells here, which is too big. Sweep a vertical line over x instead.",
    "Between two consecutive event x-coordinates the covered length along y is constant. Track it with a segment tree over the compressed y-coordinates where each node stores a cover count and the covered length.",
    "On a left edge add +1 to the y-range, on a right edge add -1 (no push-down needed: a node is 'fully covered' when its count is positive). Area += covered length * (x - previous x), using 64-bit integers (the answer can be 10^18).",
  ],
  editorial:
    "Create 2n events (x, y1, y2, +1/-1) sorted by x, and compress all y values. Segment tree over elementary y-intervals: `cnt[node]` counts rectangles that fully cover the node's span, and `len[node]` is the covered length inside the span (full span if cnt > 0, else the sum of children). Process events in x order: before applying the events at x, add len[root] * (x - prevX) to the answer. Rectangle counts never go negative because each removal matches a prior insertion of the identical range.\n\nComplexity: O(n log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
vector<ll> ys;
vector<int> cnt;
vector<ll> len;
void upd(int o, int l, int r, int ql, int qr, int v) {
    if (qr <= l || r <= ql) return;
    if (ql <= l && r <= qr) cnt[o] += v;
    else {
        int m = (l + r) / 2;
        upd(2 * o, l, m, ql, qr, v);
        upd(2 * o + 1, m, r, ql, qr, v);
    }
    if (cnt[o] > 0) len[o] = ys[r] - ys[l];
    else if (r - l == 1) len[o] = 0;
    else len[o] = len[2 * o] + len[2 * o + 1];
}
int main() {
    int n;
    scanf("%d", &n);
    struct E { ll x; int a, b, v; };
    vector<E> ev;
    vector<array<ll, 4>> rc(n);
    for (auto &r : rc) {
        scanf("%lld %lld %lld %lld", &r[0], &r[1], &r[2], &r[3]);
        ys.push_back(r[1]);
        ys.push_back(r[3]);
    }
    sort(ys.begin(), ys.end());
    ys.erase(unique(ys.begin(), ys.end()), ys.end());
    int m = ys.size() - 1;
    for (auto &r : rc) {
        int a = lower_bound(ys.begin(), ys.end(), r[1]) - ys.begin();
        int b = lower_bound(ys.begin(), ys.end(), r[3]) - ys.begin();
        ev.push_back({r[0], a, b, 1});
        ev.push_back({r[2], a, b, -1});
    }
    sort(ev.begin(), ev.end(), [](const E &p, const E &q) { return p.x < q.x; });
    cnt.assign(4 * m + 4, 0);
    len.assign(4 * m + 4, 0);
    ll area = 0, px = ev[0].x;
    for (auto &e : ev) {
        area += len[1] * (e.x - px);
        px = e.x;
        upd(1, 0, m, e.a, e.b, e.v);
    }
    printf("%lld\\n", area);
}`,
  hidden: () => {
    const r = rng(8017);
    const C = 1000000000;
    const rect = (c: number, maxW: number) => {
      const x1 = r.int(0, c - 1);
      const y1 = r.int(0, c - 1);
      return [x1, y1, Math.min(c, x1 + r.int(1, maxW)), Math.min(c, y1 + r.int(1, maxW))];
    };
    const mk = (rs: number[][]) => `${rs.length}\n${nl(rs.map((x) => x.join(" "))).trim()}\n`;
    return [
      mk([[0, 0, 1, 1]]),
      mk([[0, 0, 4, 4], [2, 2, 6, 6]]),
      mk([[0, 0, 1, 1], [1, 0, 2, 1], [5, 5, 6, 6]]),
      mk([[0, 0, C, C], [0, 0, C, C], [5, 5, 10, 10]]),
      mk(Array.from({ length: 60 }, () => rect(20, 8))),
      mk(Array.from({ length: 14000 }, () => rect(C, C))),
      mk(Array.from({ length: 14000 }, () => rect(C, 50000000))),
      mk(Array.from({ length: 14000 }, () => rect(100, 30))),
      mk(Array.from({ length: 14000 }, (_, i) => [i * 70000, i * 70000, i * 70000 + 1000000000 - 14000 * 70000 + 70000 * 0 + 50000, C])),
      mk(Array.from({ length: 14000 }, (_, i) => (i % 2 ? [0, i * 70000, C, i * 70000 + 1] : [i * 70000, 0, i * 70000 + 1, C]))),
      mk(Array.from({ length: 14000 }, (_, i) => [i, i, C - i, C - i])),
      mk(Array.from({ length: 14000 }, () => { const x = r.int(0, C - 1); return [x, 0, x + 1, C]; })),
    ];
  },
});

const dagTokens = P({
  slug: "token-game-on-dag",
  title: "Tokens on a DAG",
  difficulty: "hard",
  rating: 1900,
  tags: ["game-theory", "graphs", "topological-sort"],
  statement:
    "A directed acyclic graph has n vertices and m edges. A game starts with k tokens placed on vertices (several tokens may share a vertex). Two players alternate moves, the first player starting: a move picks any token and moves it along one outgoing edge to the next vertex. A player who cannot move any token loses. Both play optimally. Answer q independent games on the same graph.",
  inputFormat: "The first line contains n and m. The next m lines each contain u v, a directed edge from u to v. The next line contains q. Each of the next q lines contains k followed by the k vertices holding the tokens.",
  outputFormat: "For each game print FIRST if the first player wins, otherwise SECOND.",
  constraints: "1 <= n <= 30000\n0 <= m <= 40000\nThe graph is acyclic, without self-loops.\n1 <= q <= 6000, 1 <= k <= 4",
  samples: [{ input: "4 4\n1 2\n1 3\n2 4\n3 4\n4\n1 1\n2 2 3\n2 1 2\n1 2\n", output: "SECOND\nSECOND\nFIRST\nFIRST\n" }],
  hints: [
    "Several tokens form a sum of independent games. Which theory computes the winner of sums of impartial games?",
    "Compute the Grundy value of each vertex as the mex of the Grundy values of its successors; the first player wins iff the XOR of the tokens' values is non-zero.",
    "Vertex numbers are arbitrary, so find an order where successors come first: Kahn's algorithm on the graph (processing in reverse order) avoids deep recursion. Compute mex with a timestamped marker array.",
  ],
  editorial:
    "A game with several tokens is the disjunctive sum of the single-token games, so by Sprague-Grundy it is a first-player win iff the XOR of the Grundy numbers is non-zero. For a vertex, g(v) = mex{g(w) : v -> w}. Produce a topological order (Kahn), then evaluate vertices in reverse order so successors are known. Grundy values are at most about sqrt(2m). Each query XORs at most 4 numbers.\n\nComplexity: O(n + m + sum of k).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<vector<int>> adj(n + 1);
    vector<int> indeg(n + 1, 0);
    for (int i = 0; i < m; i++) {
        int u, v;
        scanf("%d %d", &u, &v);
        adj[u].push_back(v);
        indeg[v]++;
    }
    vector<int> order;
    for (int i = 1; i <= n; i++) if (!indeg[i]) order.push_back(i);
    for (size_t h = 0; h < order.size(); h++)
        for (int w : adj[order[h]])
            if (--indeg[w] == 0) order.push_back(w);
    vector<int> g(n + 1, 0), mark(n + 2, 0);
    int stamp = 0;
    for (int i = n - 1; i >= 0; i--) {
        int v = order[i];
        stamp++;
        for (int w : adj[v]) if (g[w] <= n) mark[g[w]] = stamp;
        int x = 0;
        while (mark[x] == stamp) x++;
        g[v] = x;
    }
    int q;
    scanf("%d", &q);
    while (q--) {
        int k, x = 0;
        scanf("%d", &k);
        while (k--) {
            int v;
            scanf("%d", &v);
            x ^= g[v];
        }
        puts(x ? "FIRST" : "SECOND");
    }
}`,
  hidden: () => {
    const r = rng(8018);
    // edges are given between ranks (low -> high); labels are a random permutation of 1..n
    const build = (n: number, edgesByRank: number[][], q: number, kmax: number) => {
      const label = r.shuffle(Array.from({ length: n }, (_, i) => i + 1));
      const succ: number[][] = Array.from({ length: n }, () => []);
      for (const [a, b] of edgesByRank) succ[a!]!.push(b!);
      const g = new Array<number>(n).fill(0);
      for (let v = n - 1; v >= 0; v--) {
        const seen = new Set(succ[v]!.map((w) => g[w]!));
        let x = 0;
        while (seen.has(x)) x++;
        g[v] = x;
      }
      const byG = new Map<number, number[]>();
      g.forEach((x, v) => byG.set(x, [...(byG.get(x) ?? []), v]));
      const qs: string[] = [];
      for (let i = 0; i < q; i++) {
        const k = r.int(1, kmax);
        const vs = Array.from({ length: k }, () => r.int(0, n - 1));
        if (i % 2 === 0) {
          const x = vs.slice(0, -1).reduce((a, v) => a ^ g[v]!, 0);
          const cands = byG.get(x);
          if (cands) vs[k - 1] = r.pick(cands);
        }
        qs.push(`${k} ${vs.map((v) => label[v]).join(" ")}`);
      }
      const es = edgesByRank.map(([a, b]) => `${label[a!]} ${label[b!]}`);
      return `${n} ${es.length}\n${es.join("\n")}${es.length ? "\n" : ""}${q}\n${qs.join("\n")}\n`;
    };
    const randomDag = (n: number, m: number, span: number) => {
      const s = new Set<string>();
      const es: number[][] = [];
      while (es.length < m) {
        const a = r.int(0, n - 2);
        const b = Math.min(n - 1, a + r.int(1, span));
        if (s.has(`${a},${b}`)) continue;
        s.add(`${a},${b}`);
        es.push([a, b]);
      }
      return es;
    };
    const complete = (s: number) => {
      const es: number[][] = [];
      for (let i = 0; i < s; i++) for (let j = i + 1; j < s; j++) es.push([i, j]);
      return es;
    };
    return [
      build(1, [], 4, 3),
      build(5, [[0, 1], [1, 2], [0, 2], [2, 3], [3, 4]], 20, 3),
      build(30, randomDag(30, 60, 6), 100, 4),
      build(200, randomDag(200, 400, 30), 300, 4),
      build(30000, randomDag(30000, 40000, 3), 6000, 4),
      build(30000, randomDag(30000, 40000, 30000), 6000, 4),
      build(30000, Array.from({ length: 29999 }, (_, i) => [i, i + 1]), 6000, 4),
      build(30000, complete(280), 6000, 4),
      build(30000, [], 6000, 4),
      build(30000, Array.from({ length: 29999 }, (_, i) => [0, i + 1]), 3000, 4),
      build(1000, complete(250).concat(randomDag(1000, 3000, 20)), 2000, 3),
    ];
  },
});

const countGeRangeAdd = P({
  slug: "count-at-least-with-range-add",
  title: "Count at Least X",
  timeLimitMs: 2000,
  difficulty: "hard",
  rating: 2100,
  tags: ["sqrt-decomposition", "data-structures", "binary-search"],
  statement:
    "An array a_1 ... a_n is generated by a_1 = x0 and a_(i+1) = (a_i * A + B) mod M. Then q operations are executed in order. Type 1 l r x adds x (possibly negative) to every a_i in l..r. Type 2 l r x asks how many i in l..r currently satisfy a_i >= x.",
  inputFormat: "The first line contains n and q. The second line contains x0, A, B and M. Each of the next q lines contains `t l r x`.",
  outputFormat: "For every operation of type 2 print the answer on its own line.",
  constraints: "1 <= n <= 300000\n1 <= q <= 20000\n1 <= M <= 10^9, 0 <= x0, A, B < M\n1 <= l <= r <= n\n|x| <= 10^9 for type 1, |x| <= 10^14 for type 2",
  samples: [{ input: "5 4\n3 1 2 100\n2 1 5 7\n1 1 3 4\n2 2 4 10\n2 1 5 9\n", output: "3\n1\n4\n", explanation: "Array 3 5 7 9 11, later 7 9 11 9 11." }],
  hints: [
    "Scanning the range per query costs n*q, about 6*10^9. No simple tree maintains the 'count >= x' under range adds, so think about splitting the array into blocks.",
    "Sqrt decomposition: blocks of size about sqrt(n), each keeping its elements sorted and a lazy add. A fully covered block is answered by binary search for x minus its lazy value.",
    "For partially covered blocks update or inspect elements one by one; after a partial update, rebuild that block's sorted copy. Use 64-bit integers.",
  ],
  editorial:
    "Split the array into blocks of 512 elements. Each block keeps the elements (without lazy), a sorted copy, and a lazy add. A range add adds to the lazy of fully covered blocks (O(1) each) and modifies elements in at most two partial blocks, which are re-sorted. A count query uses binary search in each fully covered block (a_i + lazy >= x iff a_i >= x - lazy) and a direct scan of the partial blocks. Per operation O((n / B) log B + B log B).\n\nComplexity: O(q * (sqrt(n) log n)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const int BS = 512;
int n, q;
vector<ll> a, lz;
vector<vector<ll>> srt;
void rebuild(int b) {
    srt[b].assign(a.begin() + b * BS, a.begin() + min(n, (b + 1) * BS));
    sort(srt[b].begin(), srt[b].end());
}
int main() {
    ll x0, A, B, M;
    scanf("%d %d %lld %lld %lld %lld", &n, &q, &x0, &A, &B, &M);
    a.assign(n, 0);
    a[0] = x0;
    for (int i = 1; i < n; i++) a[i] = (a[i - 1] * A + B) % M;
    int nb = (n + BS - 1) / BS;
    lz.assign(nb, 0);
    srt.assign(nb, {});
    for (int b = 0; b < nb; b++) rebuild(b);
    while (q--) {
        int t, l, r;
        ll x;
        scanf("%d %d %d %lld", &t, &l, &r, &x);
        l--; r--;
        int bl = l / BS, br = r / BS;
        if (t == 1) {
            auto part = [&](int b, int lo, int hi) {
                for (int i = lo; i <= hi; i++) a[i] += x;
                rebuild(b);
            };
            if (bl == br) part(bl, l, r);
            else {
                part(bl, l, (bl + 1) * BS - 1);
                part(br, br * BS, r);
                for (int b = bl + 1; b < br; b++) lz[b] += x;
            }
        } else {
            ll c = 0;
            auto part = [&](int b, int lo, int hi) {
                for (int i = lo; i <= hi; i++) c += a[i] + lz[b] >= x;
            };
            if (bl == br) part(bl, l, r);
            else {
                part(bl, l, (bl + 1) * BS - 1);
                part(br, br * BS, r);
                for (int b = bl + 1; b < br; b++) c += srt[b].end() - lower_bound(srt[b].begin(), srt[b].end(), x - lz[b]);
            }
            printf("%lld\\n", c);
        }
    }
}`,
  hidden: () => {
    const r = rng(8019);
    const mk = (n: number, q: number, x0: number, A: number, B: number, M: number, p1: number, wide = false, xr = 1000000000) => {
      const ops = Array.from({ length: q }, (_, i) => {
        const [l, rr] = lrPair(r, n, wide && i % 2 === 0);
        const t = i === q - 1 ? 2 : r.int(1, 10) <= p1 ? 1 : 2;
        return t === 1 ? `1 ${l} ${rr} ${r.int(-1000000000, 1000000000)}` : `2 ${l} ${rr} ${r.int(-xr, xr)}`;
      });
      return genHead(n, q, x0, A, B, M) + ops.join("\n") + "\n";
    };
    return [
      mk(1, 5, 4, 1, 1, 10, 5),
      mk(5, 4, 3, 1, 2, 100, 3),
      mk(30, 60, 5, 3, 7, 50, 5),
      mk(1500, 400, 11, 13, 17, 1000, 5, false, 2000),
      mk(300000, 20000, 123456, 654321, 99, 1000000000, 5, true, 1500000000),
      mk(300000, 2000, 123456, 654321, 99, 1000000000, 2, true, 1000000000),
      mk(300000, 2000, 1, 1, 1, 1000000000, 8, true, 100000000000000),
      mk(300000, 2000, 0, 0, 0, 1, 5, false, 3000000000),
      mk(300000, 2000, 5, 3, 1, 7, 5, true, 20000000000),
      mk(299999, 20000, 987, 321, 654, 999999937, 5, false, 5000000000000),
    ];
  },
});

const smallestMerge = P({
  slug: "lexicographically-smallest-merge",
  title: "Smallest Merge of Two Strings",
  difficulty: "hard",
  rating: 1900,
  tags: ["strings", "greedy", "hashing", "constructive"],
  statement:
    "You are given two strings s and t of lowercase letters. Build a string by repeatedly removing the first character of s or the first character of t (your choice) and appending it to the result, until both are empty. Among all possible results print the lexicographically smallest one.",
  inputFormat: "The first line contains s. The second line contains t.",
  outputFormat: "Print the smallest result.",
  constraints: "1 <= |s|, |t| <= 100000",
  samples: [{ input: "ab\nac\n", output: "aabc\n" }, { input: "ca\nc\n", output: "cac\n" }],
  hints: [
    "Taking the smaller first letter is right, but what if the first letters are equal? Then you need to look further into both strings.",
    "At each step compare the remaining suffixes S = s[i..] and T = t[j..] and take from the one that is smaller when each is followed by a character larger than 'z'. The sentinel makes the shorter string lose a prefix tie correctly.",
    "A naive comparison is quadratic on strings like aaaa...; compute the longest common prefix of the two suffixes with polynomial hashing and binary search, or with a suffix array of S + sentinel + T + sentinel.",
  ],
  editorial:
    "Greedy: at each step take the first character from the string whose remaining suffix, with a sentinel larger than every letter appended, is lexicographically smaller. The sentinel matters when one suffix is a prefix of the other: the one that continues with a letter is smaller than the one that ends. If both suffixes are equal either choice gives the same result. Comparisons use hashing with binary search for the LCP (mod 2^61 - 1), O(log n) each.\n\nComplexity: O((|s| + |t|) log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef unsigned long long ull;
const ull MOD = (1ULL << 61) - 1;
ull mulm(ull a, ull b) {
    __uint128_t c = (__uint128_t)a * b;
    ull r = (ull)(c & MOD) + (ull)(c >> 61);
    if (r >= MOD) r -= MOD;
    return r;
}
struct H {
    vector<ull> h;
    string s;
    void init(const string &x, const vector<ull> &pw, ull base) {
        s = x;
        h.assign(x.size() + 1, 0);
        for (size_t i = 0; i < x.size(); i++) {
            ull v = mulm(h[i], base) + (ull)x[i];
            if (v >= MOD) v -= MOD;
            h[i + 1] = v;
        }
        (void)pw;
    }
    ull get(int l, int len, const vector<ull> &pw) const {
        ull v = h[l + len] + MOD - mulm(h[l], pw[len]);
        if (v >= MOD) v -= MOD;
        return v;
    }
};
int main() {
    string s, t;
    cin >> s >> t;
    s += '{';
    t += '{';
    int n = s.size(), m = t.size();
    const ull base = 911382323ULL * 1000003ULL % MOD;
    vector<ull> pw(max(n, m) + 2);
    pw[0] = 1;
    for (size_t i = 1; i < pw.size(); i++) pw[i] = mulm(pw[i - 1], base);
    H hs, ht;
    hs.init(s, pw, base);
    ht.init(t, pw, base);
    string res;
    int i = 0, j = 0;
    while (i < n - 1 || j < m - 1) {
        bool takeS;
        if (i >= n - 1) takeS = false;
        else if (j >= m - 1) takeS = true;
        else {
            int lo = 0, hi = min(n - i, m - j);
            while (lo < hi) {
                int mid = (lo + hi + 1) / 2;
                if (hs.get(i, mid, pw) == ht.get(j, mid, pw)) lo = mid;
                else hi = mid - 1;
            }
            if (lo == min(n - i, m - j)) takeS = true;
            else takeS = s[i + lo] < t[j + lo];
        }
        if (takeS) res += s[i++];
        else res += t[j++];
    }
    printf("%s\\n", res.c_str());
}`,
  hidden: () => {
    const r = rng(8020);
    const str = (n: number, alpha: string) => Array.from({ length: n }, () => r.pick([...alpha])).join("");
    const per = (unit: string, n: number) => unit.repeat(Math.ceil(n / unit.length)).slice(0, n);
    const mk = (a: string, b: string) => `${a}\n${b}\n`;
    return [
      mk("a", "a"),
      mk("ab", "ac"),
      mk("ca", "c"),
      mk("b", "a"),
      mk(str(12, "ab"), str(9, "ab")),
      mk(str(300, "abc"), str(250, "abc")),
      mk("a".repeat(100000), "a".repeat(100000)),
      mk("a".repeat(100000), "a".repeat(99999) + "b"),
      mk(per("ab", 100000), per("ab", 99999)),
      mk(str(100000, "ab"), str(100000, "ab")),
      mk(per("abaab", 100000) , per("abaac", 100000)),
      mk(str(100000, "abcdefghijklmnopqrstuvwxyz"), str(100000, "abcdefghijklmnopqrstuvwxyz")),
    ];
  },
});

const assignmentCount = P({
  slug: "min-cost-assignment-ways",
  title: "Cheapest Assignments and How Many",
  difficulty: "hard",
  rating: 1800,
  tags: ["dp", "bitmask"],
  statement:
    "There are n workers and n jobs, and cost c[i][j] is paid when worker i takes job j. Every worker gets exactly one job and every job exactly one worker. Find the minimum possible total cost and the number of different assignments (permutations) that attain it.",
  inputFormat: "The first line contains n. Each of the next n lines contains n integers: row i of the cost matrix.",
  outputFormat: "Print the minimum total cost and the number of optimal assignments, separated by a space.",
  constraints: "1 <= n <= 20\n0 <= c[i][j] <= 1000",
  samples: [{ input: "2\n1 2\n2 1\n", output: "2 1\n" }, { input: "3\n1 1 1\n1 1 1\n1 1 1\n", output: "3 6\n" }],
  hints: [
    "n! assignments is far too many for n = 20 (about 2.4*10^18). Notice that the set of already used jobs summarises the state.",
    "Process workers in order; the worker to place next is determined by how many jobs are already taken. Let dp[mask] describe the best way to assign the first popcount(mask) workers to the jobs in mask.",
    "Keep for each mask a pair (min cost, number of ways) and merge pairs: smaller cost replaces, equal cost adds the counts. Counts reach 20! which fits in an unsigned 64-bit integer.",
  ],
  editorial:
    "dp[mask] = (best cost, ways) where mask is the set of jobs used by workers 0..popcount(mask)-1. Transition: for each job j not in mask, candidate = dp[mask].cost + c[popcount(mask)][j] into dp[mask | 1<<j]; keep the minimum and add the ways on equal cost. The answer is dp[full]. The number of ways is at most 20! = 2.43*10^18, below 2^63.\n\nComplexity: O(2^n * n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef unsigned long long ull;
int main() {
    int n;
    scanf("%d", &n);
    vector<vector<int>> c(n, vector<int>(n));
    for (auto &r : c) for (auto &v : r) scanf("%d", &v);
    int full = (1 << n) - 1;
    vector<int> best(1 << n, INT_MAX);
    vector<ull> ways(1 << n, 0);
    best[0] = 0;
    ways[0] = 1;
    for (int mask = 0; mask < full; mask++) {
        if (best[mask] == INT_MAX) continue;
        int i = __builtin_popcount(mask);
        for (int j = 0; j < n; j++) {
            if (mask >> j & 1) continue;
            int nm = mask | (1 << j), v = best[mask] + c[i][j];
            if (v < best[nm]) { best[nm] = v; ways[nm] = ways[mask]; }
            else if (v == best[nm]) ways[nm] += ways[mask];
        }
    }
    printf("%d %llu\\n", best[full], ways[full]);
}`,
  hidden: () => {
    const r = rng(8021);
    const mk = (n: number, f: (i: number, j: number) => number) => `${n}\n${nl(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => f(i, j)).join(" "))).trim()}\n`;
    return [
      mk(1, () => 7),
      mk(2, (i, j) => (i === j ? 1 : 2)),
      mk(3, () => 1),
      mk(6, () => r.int(0, 10)),
      mk(10, () => r.int(0, 1000)),
      mk(20, () => r.int(0, 1000)),
      mk(20, () => 0),
      mk(20, () => 1000),
      mk(20, () => r.int(0, 1)),
      mk(20, () => r.int(0, 2)),
      mk(20, (i, j) => (i === j ? 0 : 5)),
      mk(19, (i, j) => Math.abs(i - j)),
      mk(20, (i, j) => (i + j) % 5),
    ];
  },
});

const raw: ProblemSeed[] = [
  oddPopcount,
  pointsInRect,
  turnCounts,
  robotGrid,
  twoSingletons,
  lifeSteps,
  maxXorPairs,
  swapBudgetSmallest,
  hullCount,
  powerNim,
  subsetSumMitm,
  segmentPairs,
  pickPolygon,
  distinctSum,
  assignAddSum,
  disjointMasks,
  unionArea,
  dagTokens,
  countGeRangeAdd,
  smallestMerge,
  assignmentCount,
];

export const problems: ProblemSeed[] = raw.map((p) => fitBudget(p));
