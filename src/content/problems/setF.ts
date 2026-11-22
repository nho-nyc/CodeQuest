import { fitBudget } from "./budget";
import { rng } from "./rng";
import type { ProblemSeed } from "./types";

type Spec = Omit<ProblemSeed, "timeLimitMs" | "memoryLimitMb" | "estimatedMinutes"> & { timeLimitMs?: number; estimatedMinutes?: number };

const P = (s: Spec): ProblemSeed => ({
  timeLimitMs: 1500,
  memoryLimitMb: 256,
  estimatedMinutes: s.difficulty === "newbie" ? 8 : s.difficulty === "easy" ? 15 : s.difficulty === "medium" ? 30 : s.difficulty === "hard" ? 50 : 70,
  ...s,
});

type R = ReturnType<typeof rng>;
type Edge = [number, number];
type WEdge = [number, number, number];
type Kind = "random" | "path" | "star" | "deep" | "binary" | "broom";

/** Random labelled tree on vertices 1..n, edges randomly oriented. */
function tree(r: R, n: number, kind: Kind = "random"): Edge[] {
  const p = r.shuffle(Array.from({ length: n }, (_, i) => i + 1));
  const es: Edge[] = [];
  for (let i = 2; i <= n; i++) {
    let par: number;
    if (kind === "path") par = i - 1;
    else if (kind === "star") par = 1;
    else if (kind === "deep") par = Math.max(1, i - r.int(1, 4));
    else if (kind === "binary") par = Math.floor(i / 2);
    else if (kind === "broom") par = i <= n / 2 ? i - 1 : Math.floor(n / 2);
    else par = r.int(1, i - 1);
    const a = p[par - 1]!;
    const b = p[i - 1]!;
    es.push(r.int(0, 1) ? [a, b] : [b, a]);
  }
  return es;
}
const wtree = (r: R, n: number, kind: Kind, maxW: number): WEdge[] => tree(r, n, kind).map(([a, b]) => [a, b, r.int(1, maxW)]);

/** Random simple undirected graph (no loops, no duplicate edges); optionally containing a spanning tree. */
function graph(r: R, n: number, m: number, connected: boolean, kind: Kind = "random"): Edge[] {
  const es: Edge[] = connected ? tree(r, n, kind) : [];
  const seen = new Set(es.map(([a, b]) => Math.min(a, b) * (n + 1) + Math.max(a, b)));
  let guard = 0;
  while (es.length < m && guard++ < m * 50 + 1000) {
    const a = r.int(1, n);
    const b = r.int(1, n);
    if (a === b) continue;
    const key = Math.min(a, b) * (n + 1) + Math.max(a, b);
    if (seen.has(key)) continue;
    seen.add(key);
    es.push([a, b]);
  }
  return es;
}
const withW = (r: R, es: Edge[], maxW: number): WEdge[] => es.map(([a, b]) => [a, b, r.int(1, maxW)]);
const lines = (es: number[][]) => es.map((e) => e.join(" ")).join("\n");
/** "n m" header followed by the edges. */
const gtxt = (n: number, es: number[][], extra = "") => `${n} ${es.length}${extra}\n${lines(es)}${es.length ? "\n" : ""}`;
const ttxt = (n: number, es: number[][]) => `${n}\n${lines(es)}${es.length ? "\n" : ""}`;
const gridTxt = (g: string[][]) => `${g.length} ${g[0]!.length}\n${g.map((row) => row.join("")).join("\n")}\n`;
const randGrid = (r: R, n: number, m: number, p: number, chars: [string, string]) =>
  Array.from({ length: n }, () => Array.from({ length: m }, () => (r.int(0, 999) < p * 1000 ? chars[1] : chars[0])));

// ---------------------------------------------------------------- newbie

const leaves = P({
  slug: "count-tree-leaves",
  title: "Count the Leaves",
  difficulty: "newbie",
  rating: 800,
  tags: ["graphs", "trees", "implementation"],
  statement:
    "You are given a tree with n vertices numbered 1 to n (a connected graph with n - 1 edges and no cycles). A leaf is a vertex that has exactly one neighbour. Count the leaves of the tree.",
  inputFormat: "The first line contains n. Each of the next n - 1 lines contains two integers a and b: an edge between vertices a and b.",
  outputFormat: "Print the number of leaves.",
  constraints: "2 <= n <= 50000",
  samples: [{ input: "5\n1 2\n1 3\n3 4\n3 5\n", output: "3\n", explanation: "Vertices 2, 4 and 5 each have a single neighbour." }],
  hints: [
    "A leaf is defined by how many edges touch it. Can you count that for every vertex without building the whole tree?",
    "Keep an array deg[v]. Each edge (a, b) adds one to deg[a] and one to deg[b].",
    "After reading all edges, count the vertices with deg[v] == 1.",
  ],
  editorial: "Count the degree of every vertex while reading the edges. The answer is the number of vertices of degree exactly 1. Since n >= 2 every vertex has degree at least 1, so no special case is needed.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<int> deg(n + 1, 0);
    for (int i = 0; i < n - 1; i++) {
        int a, b;
        scanf("%d %d", &a, &b);
        deg[a]++;
        deg[b]++;
    }
    int c = 0;
    for (int v = 1; v <= n; v++) if (deg[v] == 1) c++;
    printf("%d\\n", c);
    return 0;
}`,
  hidden: () => {
    const r = rng(6001);
    return [
      "2\n1 2\n",
      "3\n2 1\n2 3\n",
      ttxt(10, tree(r, 10, "star")),
      ttxt(12, tree(r, 12, "path")),
      ttxt(30, tree(r, 30, "random")),
      ttxt(100, tree(r, 100, "binary")),
      ttxt(1000, tree(r, 1000, "broom")),
      ttxt(50000, tree(r, 50000, "star")),
      ttxt(50000, tree(r, 50000, "path")),
      ttxt(50000, tree(r, 50000, "random")),
      ttxt(50000, tree(r, 50000, "binary")),
      ttxt(50000, tree(r, 50000, "deep")),
    ];
  },
});

const busiest = P({
  slug: "busiest-junction",
  title: "Busiest Junction",
  difficulty: "newbie",
  rating: 800,
  tags: ["graphs", "implementation"],
  statement:
    "A road map has n junctions numbered 1 to n and m two-way roads. No road connects a junction to itself and no two roads connect the same pair of junctions. The degree of a junction is the number of roads that touch it. Find the largest degree and the smallest-numbered junction that has this degree.",
  inputFormat: "The first line contains n and m. Each of the next m lines contains two integers a and b: a road between junctions a and b.",
  outputFormat: "Print two integers: the largest degree, then the smallest junction number with that degree.",
  constraints: "1 <= n <= 50000, 0 <= m <= 50000, 1 <= a, b <= n, a != b, no repeated roads",
  samples: [
    { input: "5 4\n1 2\n1 3\n2 3\n4 3\n", output: "3 3\n", explanation: "Junction 3 has three roads; junctions 1 and 2 have only two." },
    { input: "3 0\n", output: "0 1\n", explanation: "With no roads every degree is 0, and the smallest junction is 1." },
  ],
  hints: [
    "The busiest junction is the one with the most incident roads. What array lets you track that?",
    "Maintain deg[v], adding one for each endpoint of each road.",
    "Scan v from 1 to n and update the best only when deg[v] is strictly larger, so ties keep the smallest index.",
  ],
  editorial: "Compute degrees while reading. Then scan the vertices in increasing order and keep the first vertex that attains the maximum (update only on a strictly greater value). When m = 0 all degrees are 0 and the answer is `0 1`.\n\nComplexity: O(n + m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<int> deg(n + 1, 0);
    for (int i = 0; i < m; i++) {
        int a, b;
        scanf("%d %d", &a, &b);
        deg[a]++;
        deg[b]++;
    }
    int best = -1, who = 1;
    for (int v = 1; v <= n; v++) if (deg[v] > best) { best = deg[v]; who = v; }
    printf("%d %d\\n", best, who);
    return 0;
}`,
  hidden: () => {
    const r = rng(6002);
    return [
      "1 0\n",
      "2 1\n2 1\n",
      "4 0\n",
      gtxt(6, graph(r, 6, 6, false)),
      gtxt(20, graph(r, 20, 40, false)),
      gtxt(50, graph(r, 50, 30, true)),
      gtxt(1000, graph(r, 1000, 1000, false)),
      gtxt(50000, graph(r, 50000, 50000, false)),
      gtxt(50000, graph(r, 50000, 49999, true, "star")),
      gtxt(50000, graph(r, 50000, 49999, true, "path")),
      gtxt(250, graph(r, 250, 3000, false)),
      gtxt(50000, graph(r, 50000, 50000, true, "binary")),
    ];
  },
});

// ---------------------------------------------------------------- easy

const islands = P({
  slug: "count-islands-grid",
  title: "Count the Islands",
  difficulty: "easy",
  rating: 900,
  tags: ["graphs", "dfs", "bfs", "flood-fill", "grid"],
  statement:
    "A map is an n by m grid whose cells are land (`#`) or water (`.`). Two land cells belong to the same island if you can walk from one to the other by repeatedly moving to a land cell directly above, below, left or right (diagonal moves do not count). Count the islands.",
  inputFormat: "The first line contains n and m. Each of the next n lines contains a string of m characters, each `#` or `.`.",
  outputFormat: "Print the number of islands.",
  constraints: "1 <= n, m <= 600",
  samples: [
    {
      input: "4 5\n##..#\n#...#\n..#..\n#.###\n",
      output: "4\n",
      explanation: "The islands are {(1,1),(1,2),(2,1)}, {(1,5),(2,5)}, {(3,3),(4,3),(4,4),(4,5)} and {(4,1)}.",
    },
  ],
  hints: [
    "Every island is a connected group of land cells. Counting groups is the same as counting how many times you have to start a fresh exploration.",
    "Scan the grid. Whenever you see an unvisited land cell, add one to the answer and flood-fill (BFS or DFS) to mark its entire island as visited.",
    "Use an explicit queue or stack instead of recursion: a 600 x 600 grid can contain one island of 360000 cells and deep recursion may overflow the call stack.",
  ],
  editorial: "Scan all cells in order. At an unvisited land cell, increment the counter and run a flood fill (BFS with a queue) over the four neighbours, marking visited cells. Each cell is visited once, so the total work is linear in the grid size. Diagonal neighbours are not connected.\n\nComplexity: O(n * m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<string> g(n);
    for (auto &s : g) cin >> s;
    int ans = 0;
    vector<int> st;
    const int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) {
            if (g[i][j] != '#') continue;
            ans++;
            g[i][j] = '.';
            st.push_back(i * m + j);
            while (!st.empty()) {
                int c = st.back();
                st.pop_back();
                int x = c / m, y = c % m;
                for (int k = 0; k < 4; k++) {
                    int nx = x + dx[k], ny = y + dy[k];
                    if (nx < 0 || ny < 0 || nx >= n || ny >= m || g[nx][ny] != '#') continue;
                    g[nx][ny] = '.';
                    st.push_back(nx * m + ny);
                }
            }
        }
    cout << ans << "\\n";
    return 0;
}`,
  hidden: () => {
    const r = rng(6003);
    const chess = (n: number, m: number) => Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => ((i + j) % 2 === 0 ? "#" : ".")));
    const snake = (n: number, m: number) =>
      Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => (i % 2 === 0 ? "#" : i % 4 === 1 ? (j === m - 1 ? "#" : ".") : j === 0 ? "#" : ".")));
    return [
      "1 1\n#\n",
      "1 1\n.\n",
      "2 2\n#.\n.#\n",
      gridTxt(randGrid(r, 5, 7, 0.5, [".", "#"])),
      gridTxt(randGrid(r, 30, 30, 0.4, [".", "#"])),
      gridTxt(randGrid(r, 100, 100, 0.55, [".", "#"])),
      gridTxt(chess(40, 41)),
      gridTxt(randGrid(r, 600, 600, 0.45, [".", "#"])),
      gridTxt(randGrid(r, 600, 600, 0.6, [".", "#"])),
      gridTxt(snake(600, 600)),
      gridTxt(Array.from({ length: 600 }, () => Array(600).fill("#"))),
      gridTxt(randGrid(r, 1, 600, 0.5, [".", "#"])),
    ];
  },
});

const bipartite = P({
  slug: "two-team-split",
  title: "Two-Team Split",
  difficulty: "easy",
  rating: 1000,
  tags: ["graphs", "bipartite", "bfs", "dfs"],
  statement:
    "n players are numbered 1 to n. Some pairs of players are rivals. The coach wants to divide all players into exactly two teams (a team may be empty) so that no two rivals are on the same team. Decide whether this is possible.",
  inputFormat: "The first line contains n and m. Each of the next m lines contains two integers a and b: players a and b are rivals.",
  outputFormat: "Print `YES` if such a split exists, otherwise `NO`.",
  constraints: "1 <= n <= 50000, 0 <= m <= 50000, a != b, no pair is listed twice",
  samples: [
    { input: "3 3\n1 2\n2 3\n1 3\n", output: "NO\n", explanation: "Any two of the three mutual rivals would share a team." },
    { input: "4 3\n1 2\n2 3\n3 4\n", output: "YES\n", explanation: "Teams {1, 3} and {2, 4}." },
  ],
  hints: [
    "Once you place one player of a connected group on a team, every rival is forced onto the other team, and so on. The graph may be disconnected.",
    "This is two-colouring a graph. Run BFS or DFS from each uncoloured vertex, giving neighbours the opposite colour; an edge between equal colours means the answer is NO.",
    "Store colour[v] in {-1, 0, 1}. Loop over all start vertices so that every component is checked.",
  ],
  editorial: "A split exists exactly when the graph is bipartite, i.e. has no odd cycle. Start a BFS from every uncoloured vertex, colour it 0, and give each newly discovered neighbour the opposite colour. If an edge joins two vertices of the same colour, the answer is NO; otherwise YES. Components are independent.\n\nComplexity: O(n + m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<vector<int>> adj(n + 1);
    for (int i = 0; i < m; i++) {
        int a, b;
        scanf("%d %d", &a, &b);
        adj[a].push_back(b);
        adj[b].push_back(a);
    }
    vector<int> col(n + 1, -1);
    bool ok = true;
    for (int s = 1; s <= n && ok; s++) {
        if (col[s] != -1) continue;
        col[s] = 0;
        queue<int> q;
        q.push(s);
        while (!q.empty() && ok) {
            int v = q.front();
            q.pop();
            for (int to : adj[v]) {
                if (col[to] == -1) {
                    col[to] = col[v] ^ 1;
                    q.push(to);
                } else if (col[to] == col[v]) {
                    ok = false;
                    break;
                }
            }
        }
    }
    puts(ok ? "YES" : "NO");
    return 0;
}`,
  hidden: () => {
    const r = rng(6004);
    /** Random bipartite graph with a random side assignment. */
    const bip = (n: number, m: number, conn: boolean) => {
      const side = Array.from({ length: n + 1 }, () => r.int(0, 1));
      const es: Edge[] = [];
      const seen = new Set<number>();
      const add = (a: number, b: number) => {
        const key = Math.min(a, b) * (n + 1) + Math.max(a, b);
        if (a === b || side[a] === side[b] || seen.has(key)) return false;
        seen.add(key);
        es.push([a, b]);
        return true;
      };
      if (conn) for (let v = 2; v <= n; v++) { let u = r.int(1, v - 1); let t = 0; while (side[u] === side[v] && t++ < 50) u = r.int(1, v - 1); if (side[u] === side[v]) side[v] = 1 - side[u]!; add(u, v); }
      let g = 0;
      while (es.length < m && g++ < m * 30) add(r.int(1, n), r.int(1, n));
      return es;
    };
    const oddCycleInside = (n: number, m: number) => {
      const es = bip(n, m - 1, true);
      // add an edge between two vertices of equal colour by closing a path of even length: connect 1 with a vertex at distance 2
      const adj: number[][] = Array.from({ length: n + 1 }, () => []);
      es.forEach(([a, b]) => { adj[a]!.push(b); adj[b]!.push(a); });
      const set = new Set(es.map(([a, b]) => `${Math.min(a, b)},${Math.max(a, b)}`));
      for (let v = 1; v <= n; v++) for (const u of adj[v]!) for (const w of adj[u]!) {
        if (w !== v && !set.has(`${Math.min(v, w)},${Math.max(v, w)}`)) { es.push([v, w]); return es; }
      }
      return es;
    };
    return [
      "1 0\n",
      "2 1\n1 2\n",
      gtxt(6, [[1, 2], [2, 3], [3, 1], [4, 5]]),
      gtxt(10, bip(10, 12, false)),
      gtxt(20, oddCycleInside(20, 25)),
      gtxt(2000, bip(2000, 3000, true)),
      gtxt(50000, bip(50000, 50000, true)),
      gtxt(50000, oddCycleInside(50000, 50000)),
      gtxt(50000, graph(r, 50000, 49999, true, "path")),
      gtxt(50000, graph(r, 50000, 50000, true, "random")),
      gtxt(50000, bip(50000, 20000, false)),
      gtxt(49999, [...tree(r, 49998, "deep"), [49999, 49998]]),
    ];
  },
});

const hops = P({
  slug: "hop-counts-from-hub",
  title: "Hop Counts from the Hub",
  difficulty: "easy",
  rating: 1000,
  tags: ["graphs", "bfs", "shortest-path"],
  statement:
    "A network has n servers numbered 1 to n and m one-way links. Server 1 is the hub. For every server v, find the minimum number of links a message must traverse to get from the hub to v, or report that v cannot be reached.",
  inputFormat: "The first line contains n and m. Each of the next m lines contains two integers a and b: a one-way link from a to b. Links may repeat and may be self-loops.",
  outputFormat: "Print n integers separated by spaces: the i-th is the minimum number of links from server 1 to server i, or -1 if unreachable. The first value is always 0.",
  constraints: "1 <= n <= 50000, 0 <= m <= 50000",
  samples: [{ input: "5 5\n1 2\n2 3\n1 3\n3 4\n5 1\n", output: "0 1 1 2 -1\n", explanation: "Server 5 only has a link into the hub, so it cannot be reached." }],
  hints: [
    "Every link costs exactly one hop, so this is a shortest path problem in an unweighted graph.",
    "Breadth-first search from vertex 1 visits vertices in order of increasing distance; the first visit gives the answer.",
    "Initialise dist[] to -1, set dist[1] = 0, and push neighbours with dist[v] + 1 when dist is still -1. Remember the links are directed.",
  ],
  editorial: "Run BFS from vertex 1 on the directed graph. BFS processes vertices in non-decreasing distance, so the first time a vertex is reached its distance is minimal. Vertices never reached keep -1.\n\nComplexity: O(n + m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<vector<int>> adj(n + 1);
    for (int i = 0; i < m; i++) {
        int a, b;
        scanf("%d %d", &a, &b);
        adj[a].push_back(b);
    }
    vector<int> d(n + 1, -1);
    queue<int> q;
    d[1] = 0;
    q.push(1);
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        for (int to : adj[v]) if (d[to] < 0) { d[to] = d[v] + 1; q.push(to); }
    }
    for (int v = 1; v <= n; v++) printf("%d%c", d[v], v == n ? '\\n' : ' ');
    return 0;
}`,
  hidden: () => {
    const r = rng(6005);
    const dir = (n: number, m: number): Edge[] => {
      const es: Edge[] = [];
      for (let i = 0; i < m; i++) es.push([r.int(1, n), r.int(1, n)]);
      return es;
    };
    const chain = (n: number): Edge[] => Array.from({ length: n - 1 }, (_, i) => [i + 1, i + 2] as Edge);
    return [
      "1 0\n",
      "1 1\n1 1\n",
      "3 0\n",
      gtxt(8, dir(8, 10)),
      gtxt(20, dir(20, 25)),
      gtxt(1000, dir(1000, 1500)),
      gtxt(50000, dir(50000, 50000)),
      gtxt(50000, dir(50000, 30000)),
      gtxt(50000, chain(50000)),
      gtxt(50000, [...chain(25000), ...dir(25000, 24000)]),
      gtxt(50000, tree(r, 50000, "random").map(([a, b]) => (a < b ? [a, b] : [b, a]) as Edge)),
      gtxt(50000, chain(50000).reverse().map(([a, b]) => [b, a] as Edge)),
    ];
  },
});

const subtreeSizes = P({
  slug: "subtree-size-table",
  title: "Subtree Size Table",
  difficulty: "easy",
  rating: 1100,
  tags: ["graphs", "trees", "dfs"],
  statement:
    "You are given a tree with n vertices rooted at vertex 1. The subtree of a vertex v consists of v and every vertex whose path to the root passes through v. For every vertex, compute the size of its subtree.",
  inputFormat: "The first line contains n. Each of the next n - 1 lines contains two integers a and b: an edge of the tree.",
  outputFormat: "Print n integers separated by spaces: the i-th is the size of the subtree of vertex i.",
  constraints: "1 <= n <= 50000",
  samples: [{ input: "5\n1 2\n1 3\n3 4\n3 5\n", output: "5 1 3 1 1\n" }],
  hints: [
    "The size of a subtree is 1 plus the sum of the sizes of the children's subtrees. In which order must you compute them?",
    "Do a DFS or BFS from the root to record each vertex's parent and a visiting order; then process the vertices in reverse order, adding each size into its parent.",
    "A path-shaped tree has depth 50000, so avoid deep recursion: compute the BFS order with a queue, then loop backwards: size[parent[v]] += size[v].",
  ],
  editorial: "Run a BFS from vertex 1 to obtain a parent for each vertex and an order in which parents come before children. Initialise size[v] = 1 and iterate the order backwards, adding size[v] to size[parent[v]]. When v is processed all its children (which appear later in the order) have already contributed.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<vector<int>> adj(n + 1);
    for (int i = 0; i < n - 1; i++) {
        int a, b;
        scanf("%d %d", &a, &b);
        adj[a].push_back(b);
        adj[b].push_back(a);
    }
    vector<int> par(n + 1, 0), order, sz(n + 1, 1);
    order.push_back(1);
    for (size_t i = 0; i < order.size(); i++) {
        int v = order[i];
        for (int to : adj[v]) if (to != par[v]) { par[to] = v; order.push_back(to); }
    }
    for (int i = n - 1; i > 0; i--) sz[par[order[i]]] += sz[order[i]];
    for (int v = 1; v <= n; v++) printf("%d%c", sz[v], v == n ? '\\n' : ' ');
    return 0;
}`,
  hidden: () => {
    const r = rng(6006);
    return [
      "1\n",
      "2\n2 1\n",
      ttxt(10, tree(r, 10, "path")),
      ttxt(10, tree(r, 10, "star")),
      ttxt(40, tree(r, 40, "random")),
      ttxt(500, tree(r, 500, "broom")),
      ttxt(50000, tree(r, 50000, "path")),
      ttxt(50000, tree(r, 50000, "star")),
      ttxt(50000, tree(r, 50000, "random")),
      ttxt(50000, tree(r, 50000, "binary")),
      ttxt(50000, tree(r, 50000, "deep")),
      ttxt(50000, tree(r, 50000, "broom")),
    ];
  },
});

/** Random DAG: vertices placed in a random topological order; edges go from earlier to later positions within a window.
 *  With fixEnds, vertex 1 is first and vertex n last, and every vertex has an incoming edge (so n is reachable from 1). */
function dag(r: R, n: number, m: number, window: number, fixEnds: boolean): Edge[] {
  let ord = Array.from({ length: n }, (_, i) => i + 1);
  if (fixEnds) ord = [1, ...r.shuffle(ord.slice(1, n - 1)), n];
  else ord = r.shuffle(ord);
  const es: Edge[] = [];
  const seen = new Set<number>();
  const add = (i: number, j: number) => {
    const key = i * n + j;
    if (i >= j || seen.has(key)) return;
    seen.add(key);
    es.push([ord[i]!, ord[j]!]);
  };
  if (fixEnds) for (let j = 1; j < n; j++) add(Math.max(0, j - r.int(1, window)), j);
  let g = 0;
  while (es.length < m && g++ < m * 20 + 100) {
    const j = r.int(1, n - 1);
    add(Math.max(0, j - r.int(1, window)), j);
  }
  return es;
}

// ---------------------------------------------------------------- medium

const taskOrder = P({
  slug: "smallest-task-order",
  title: "Smallest Task Order",
  difficulty: "medium",
  rating: 1400,
  tags: ["graphs", "topological-sort", "priority-queue"],
  statement:
    "There are n tasks numbered 1 to n and m rules. A rule `a b` means task a must be done before task b. You do one task at a time and must respect every rule. Among all valid orders, output the lexicographically smallest one: the order whose first differing position holds the smaller task number. If no valid order exists, output -1.",
  inputFormat: "The first line contains n and m. Each of the next m lines contains a rule `a b`. Rules may repeat.",
  outputFormat: "Print n integers separated by spaces: the lexicographically smallest valid order, or the single integer -1 if the rules contain a cycle.",
  constraints: "1 <= n <= 50000, 0 <= m <= 50000, 1 <= a, b <= n, a != b",
  samples: [
    { input: "5 4\n3 1\n3 2\n1 4\n2 4\n", output: "3 1 2 4 5\n", explanation: "At each step pick the smallest task whose prerequisites are all done." },
    { input: "3 3\n1 2\n2 3\n3 1\n", output: "-1\n" },
  ],
  hints: [
    "At any moment you can only do tasks whose prerequisites are finished. Which of those should you pick to make the sequence smallest?",
    "Kahn's topological sort with a min-heap instead of a plain queue: always take the smallest available task.",
    "Keep indegree[] counts. Push every task with indegree 0 into a min-priority-queue; pop the smallest, output it, and decrement its successors. If fewer than n tasks are output there is a cycle.",
  ],
  editorial: "Greedy works: the first element of the lexicographically smallest order must be the smallest task with no unfinished prerequisite, and after fixing it the remaining problem is the same. Maintain the set of ready tasks in a min-heap; pop the smallest, append it, and release successors whose indegree drops to zero. If the output has fewer than n tasks, a cycle blocks the rest and the answer is -1. Duplicate rules just increase indegree consistently.\n\nComplexity: O((n + m) log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<vector<int>> adj(n + 1);
    vector<int> indeg(n + 1, 0);
    for (int i = 0; i < m; i++) {
        int a, b;
        scanf("%d %d", &a, &b);
        adj[a].push_back(b);
        indeg[b]++;
    }
    priority_queue<int, vector<int>, greater<int>> pq;
    for (int v = 1; v <= n; v++) if (!indeg[v]) pq.push(v);
    vector<int> out;
    while (!pq.empty()) {
        int v = pq.top();
        pq.pop();
        out.push_back(v);
        for (int to : adj[v]) if (--indeg[to] == 0) pq.push(to);
    }
    if ((int)out.size() < n) {
        puts("-1");
        return 0;
    }
    for (int i = 0; i < n; i++) printf("%d%c", out[i], i + 1 == n ? '\\n' : ' ');
    return 0;
}`,
  hidden: () => {
    const r = rng(6007);
    const withCycle = (n: number, m: number, win: number) => {
      const es = dag(r, n, m, win, false);
      const [a, b] = es[es.length - 1]!;
      es.push([b, a]);
      return es;
    };
    return [
      "1 0\n",
      "4 0\n",
      "3 2\n2 1\n2 1\n",
      gtxt(8, dag(r, 8, 10, 4, false)),
      gtxt(30, dag(r, 30, 60, 10, false)),
      gtxt(1000, dag(r, 1000, 2000, 30, false)),
      gtxt(50000, dag(r, 50000, 50000, 5, false)),
      gtxt(50000, dag(r, 50000, 50000, 50000, false)),
      gtxt(50000, dag(r, 50000, 30000, 2, false)),
      gtxt(50000, dag(r, 50000, 49999, 1, false)),
      gtxt(40000, withCycle(40000, 49000, 6)),
      gtxt(15, withCycle(15, 20, 15)),
    ];
  },
});

const cheapestRoute = P({
  slug: "cheapest-route-cost",
  title: "Cheapest Route",
  difficulty: "medium",
  rating: 1400,
  tags: ["graphs", "dijkstra", "shortest-path"],
  statement:
    "A country has n cities numbered 1 to n and m one-way roads. Driving along road i from city a to city b costs w units of fuel. Find the minimum total fuel needed to travel from city 1 to city n.",
  inputFormat: "The first line contains n and m. Each of the next m lines contains three integers a, b, w: a one-way road from a to b costing w. Roads may repeat.",
  outputFormat: "Print the minimum total cost, or -1 if city n cannot be reached from city 1.",
  constraints: "2 <= n <= 25000, 0 <= m <= 25000, 1 <= a, b <= n, 1 <= w <= 10^9. The answer may not fit in 32 bits.",
  samples: [
    { input: "4 5\n1 2 5\n1 3 2\n3 2 1\n2 4 4\n3 4 10\n", output: "7\n", explanation: "1 -> 3 -> 2 -> 4 costs 2 + 1 + 4." },
    { input: "3 1\n2 3 5\n", output: "-1\n" },
  ],
  hints: [
    "Edge weights are positive and different, so a plain BFS is not enough. What generalises BFS to weighted edges?",
    "Dijkstra's algorithm with a priority queue of (distance, vertex).",
    "Use 64-bit integers for distances (up to about 2.5 * 10^13). Skip stale heap entries whose stored distance is larger than dist[v].",
  ],
  editorial: "Run Dijkstra from city 1: repeatedly extract the unsettled city with the smallest tentative distance and relax its outgoing roads. All weights are positive, so this is correct. Distances need 64-bit integers. If dist[n] is still infinity, print -1.\n\nComplexity: O((n + m) log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<vector<pair<int, ll>>> adj(n + 1);
    for (int i = 0; i < m; i++) {
        int a, b;
        ll w;
        scanf("%d %d %lld", &a, &b, &w);
        adj[a].push_back({b, w});
    }
    const ll INF = LLONG_MAX / 4;
    vector<ll> d(n + 1, INF);
    priority_queue<pair<ll, int>, vector<pair<ll, int>>, greater<pair<ll, int>>> pq;
    d[1] = 0;
    pq.push({0, 1});
    while (!pq.empty()) {
        auto [dv, v] = pq.top();
        pq.pop();
        if (dv > d[v]) continue;
        for (auto [to, w] : adj[v]) if (dv + w < d[to]) { d[to] = dv + w; pq.push({d[to], to}); }
    }
    printf("%lld\\n", d[n] >= INF ? -1LL : d[n]);
    return 0;
}`,
  hidden: () => {
    const r = rng(6008);
    const dirW = (n: number, m: number, maxW: number): WEdge[] => Array.from({ length: m }, () => [r.int(1, n), r.int(1, n), r.int(1, maxW)] as WEdge);
    const chain = (n: number, w: number): WEdge[] => Array.from({ length: n - 1 }, (_, i) => [i + 1, i + 2, w] as WEdge);
    return [
      "2 0\n",
      "2 1\n1 2 1000000000\n",
      gtxt(6, dirW(6, 12, 20)),
      gtxt(50, dirW(50, 200, 100)),
      gtxt(500, dirW(500, 1500, 1000000000)),
      gtxt(25000, dirW(25000, 25000, 1000)),
      gtxt(25000, dirW(25000, 25000, 1000000)),
      gtxt(25000, [...chain(25000, 1000000000).slice(0, 24000), ...dirW(25000, 900, 1000000000)]),
      gtxt(25000, [...chain(25000, 1000000000), ...dirW(25000, 500, 1000000000).slice(0, 0)]),
      gtxt(25000, dirW(25000, 60, 5)),
      gtxt(20000, dirW(20000, 25000, 3)),
      gtxt(25000, [...chain(25000, 7).slice(0, 12000), ...dirW(25000, 12000, 30)]),
    ];
  },
});

const cableCost = P({
  slug: "cable-network-cost",
  title: "Cheapest Cable Network",
  difficulty: "medium",
  rating: 1400,
  tags: ["graphs", "mst", "dsu", "greedy"],
  statement:
    "A company wants to connect n offices numbered 1 to n with cables. There are m possible cable links, each joining two offices at a given cost. Choose a set of links so that every office can reach every other office (directly or through other offices) with minimum total cost, and output that cost.",
  inputFormat: "The first line contains n and m. Each of the next m lines contains three integers a, b, c: a possible cable between offices a and b with cost c.",
  outputFormat: "Print the minimum total cost, or -1 if the offices cannot all be connected. For n = 1 the answer is 0.",
  constraints: "1 <= n <= 25000, 0 <= m <= 25000, 1 <= a, b <= n, a != b, 1 <= c <= 10^9. The total may not fit in 32 bits.",
  samples: [
    { input: "4 5\n1 2 3\n2 3 1\n3 4 4\n1 4 2\n1 3 5\n", output: "6\n", explanation: "Take costs 1 (2-3), 2 (1-4) and 3 (1-2)." },
    { input: "3 1\n1 2 5\n", output: "-1\n" },
  ],
  hints: [
    "You need a spanning tree of minimum total weight. Cycles never help, because you could drop the most expensive link on one.",
    "Kruskal: sort links by cost and add a link if it joins two different groups; track groups with a disjoint-set union.",
    "Count how many links you accepted. If it is not n - 1 at the end, the graph is disconnected and the answer is -1. Use 64-bit for the total.",
  ],
  editorial: "Sort the edges by cost. Process them in order and accept an edge exactly when its endpoints are in different DSU components (union them). This builds a minimum spanning tree (cut property). If fewer than n - 1 edges are accepted the graph is disconnected.\n\nComplexity: O(m log m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
vector<int> p;
int find(int x) { while (p[x] != x) { p[x] = p[p[x]]; x = p[x]; } return x; }
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<array<ll, 3>> e(m);
    for (auto &x : e) scanf("%lld %lld %lld", &x[1], &x[2], &x[0]);
    sort(e.begin(), e.end());
    p.resize(n + 1);
    iota(p.begin(), p.end(), 0);
    ll tot = 0;
    int cnt = 0;
    for (auto &x : e) {
        int a = find(x[1]), b = find(x[2]);
        if (a == b) continue;
        p[a] = b;
        tot += x[0];
        cnt++;
    }
    printf("%lld\\n", cnt == n - 1 ? tot : -1LL);
    return 0;
}`,
  hidden: () => {
    const r = rng(6009);
    return [
      "1 0\n",
      "2 1\n2 1 7\n",
      gtxt(5, withW(r, graph(r, 5, 4, false), 10)),
      gtxt(8, withW(r, graph(r, 8, 15, true), 10)),
      gtxt(100, withW(r, graph(r, 100, 300, true), 3)),
      gtxt(2000, withW(r, graph(r, 2000, 5000, true), 1000000000)),
      gtxt(25000, withW(r, graph(r, 25000, 25000, true), 1000000000).slice(0, 24000)),
      gtxt(25000, withW(r, graph(r, 25000, 25000, true), 1000000)),
      gtxt(25000, withW(r, graph(r, 25000, 24999, true, "path"), 1000000000)),
      gtxt(25000, withW(r, graph(r, 25000, 25000, true, "star"), 10)),
      gtxt(25000, withW(r, graph(r, 25000, 25000, false), 1000000)),
      gtxt(12000, withW(r, graph(r, 12000, 25000, true), 1000000000)),
    ];
  },
});

const treeDiameter = P({
  slug: "longest-path-in-tree",
  title: "Longest Path in a Tree",
  difficulty: "medium",
  rating: 1500,
  tags: ["graphs", "trees", "dfs", "bfs", "diameter"],
  statement:
    "You are given a tree with n vertices where every edge has a positive length. The distance between two vertices is the sum of edge lengths on the unique path joining them. Find the largest distance between any two vertices (the diameter of the tree).",
  inputFormat: "The first line contains n. Each of the next n - 1 lines contains a, b, w: an edge between a and b of length w.",
  outputFormat: "Print the diameter. For n = 1 print 0.",
  constraints: "1 <= n <= 25000, 1 <= w <= 10^9. The answer may not fit in 32 bits.",
  samples: [{ input: "5\n1 2 3\n2 3 4\n2 4 5\n4 5 1\n", output: "10\n", explanation: "The path 3 - 2 - 4 - 5 has length 4 + 5 + 1." }],
  hints: [
    "Trying every pair of vertices is far too slow. Is there a vertex that must always be an end of some longest path?",
    "Take any vertex s and find the farthest vertex a from it. Then a is one endpoint of a diameter; the farthest vertex from a gives the other endpoint.",
    "Implement the farthest-vertex search iteratively (stack or queue with a parent array and 64-bit distances); a path-shaped tree is 25000 levels deep.",
  ],
  editorial: "Classic two-sweep technique: for any start s, the farthest vertex a is an endpoint of some diameter (in trees with positive weights); a second search from a finds the farthest vertex b, and dist(a, b) is the diameter. Each search is a linear traversal. Use 64-bit distances.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int n;
vector<vector<pair<int, ll>>> adj;
pair<int, ll> far(int s) {
    vector<ll> d(n + 1, -1);
    vector<int> st = {s};
    d[s] = 0;
    pair<int, ll> best = {s, 0};
    while (!st.empty()) {
        int v = st.back();
        st.pop_back();
        if (d[v] > best.second) best = {v, d[v]};
        for (auto [to, w] : adj[v]) if (d[to] < 0) { d[to] = d[v] + w; st.push_back(to); }
    }
    return best;
}
int main() {
    scanf("%d", &n);
    adj.resize(n + 1);
    for (int i = 0; i < n - 1; i++) {
        int a, b;
        ll w;
        scanf("%d %d %lld", &a, &b, &w);
        adj[a].push_back({b, w});
        adj[b].push_back({a, w});
    }
    int a = far(1).first;
    printf("%lld\\n", far(a).second);
    return 0;
}`,
  hidden: () => {
    const r = rng(6010);
    const wt = (n: number, kind: Kind, maxW: number) => ttxt(n, wtree(r, n, kind, maxW));
    return [
      "1\n",
      "2\n1 2 1000000000\n",
      wt(8, "random", 10),
      wt(30, "path", 100),
      wt(200, "broom", 1000000000),
      wt(1000, "random", 1000000000),
      wt(25000, "path", 1000000000),
      wt(25000, "star", 1000000000),
      wt(25000, "random", 1000000000),
      wt(25000, "deep", 1000000000),
      wt(25000, "binary", 1000000000),
      wt(25000, "broom", 5),
    ];
  },
});

const dagRoutes = P({
  slug: "route-counting-dag",
  title: "Counting Routes in a DAG",
  difficulty: "medium",
  rating: 1500,
  tags: ["graphs", "dp", "dag", "topological-sort", "counting"],
  statement:
    "A project has n stages numbered 1 to n and m one-way transitions. The transitions never form a cycle (the graph is a DAG), and no transition is listed twice. A route is a sequence of stages starting at stage 1 and ending at stage n in which consecutive stages are joined by a transition. Count the routes, modulo 1000000007.",
  inputFormat: "The first line contains n and m. Each of the next m lines contains two integers a and b: a one-way transition from a to b.",
  outputFormat: "Print the number of routes from 1 to n modulo 1000000007.",
  constraints: "2 <= n <= 50000, 0 <= m <= 50000. The graph is acyclic; there are no repeated transitions.",
  samples: [{ input: "4 5\n1 2\n1 3\n2 3\n2 4\n3 4\n", output: "3\n", explanation: "1-2-4, 1-3-4 and 1-2-3-4." }],
  hints: [
    "The number of routes to a stage is the sum of the number of routes to each stage that has a transition into it.",
    "Process stages in a topological order so that when you reach a stage all its predecessors are already final: ways[v] = sum of ways[u] over transitions u -> v.",
    "Use Kahn's algorithm (indegree queue). Set ways[1] = 1, and when popping u add ways[u] mod p into ways[v] for each u -> v. Print ways[n].",
  ],
  editorial: "Let ways[v] be the number of routes from 1 to v. Then ways[1] = 1 and ways[v] is the sum of ways[u] over incoming transitions. Because the graph is a DAG, a topological order evaluates this recurrence correctly; stages that appear before stage 1 in the order contribute 0 as ways is 0 for them. The count can be huge, so reduce modulo 10^9 + 7 at each addition.\n\nComplexity: O(n + m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    const long long MOD = 1000000007LL;
    int n, m;
    scanf("%d %d", &n, &m);
    vector<vector<int>> adj(n + 1);
    vector<int> indeg(n + 1, 0);
    for (int i = 0; i < m; i++) {
        int a, b;
        scanf("%d %d", &a, &b);
        adj[a].push_back(b);
        indeg[b]++;
    }
    vector<long long> ways(n + 1, 0);
    ways[1] = 1;
    queue<int> q;
    for (int v = 1; v <= n; v++) if (!indeg[v]) q.push(v);
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        for (int to : adj[u]) {
            ways[to] = (ways[to] + ways[u]) % MOD;
            if (--indeg[to] == 0) q.push(to);
        }
    }
    printf("%lld\\n", ways[n]);
    return 0;
}`,
  hidden: () => {
    const r = rng(6011);
    const noPath = (n: number) => gtxt(n, dag(r, n, n, 3, false).filter(([, b]) => b !== n));
    return [
      "2 0\n",
      "2 1\n1 2\n",
      "2 1\n2 1\n",
      gtxt(6, dag(r, 6, 9, 4, true)),
      gtxt(40, dag(r, 40, 100, 5, true)),
      gtxt(1000, dag(r, 1000, 3000, 4, true)),
      gtxt(50000, dag(r, 50000, 50000, 3, true)),
      gtxt(50000, dag(r, 50000, 50000, 2, true)),
      gtxt(50000, dag(r, 50000, 49999, 1, true)),
      gtxt(50000, dag(r, 50000, 50000, 50000, true)),
      noPath(2000),
      gtxt(20000, dag(r, 20000, 50000, 2, true)),
    ];
  },
});

const fewestWalls = P({
  slug: "fewest-walls-to-break",
  title: "Fewest Walls to Break",
  difficulty: "medium",
  rating: 1500,
  tags: ["graphs", "bfs", "0-1-bfs", "grid", "shortest-path"],
  statement:
    "A dungeon is an n by m grid of free cells (`.`) and wall cells (`#`). You start at the top-left cell and want to reach the bottom-right cell, moving between cells that share a side. Stepping onto a free cell is free, but stepping onto a wall cell means you must break it, which counts as one broken wall (breaking a wall does not change the grid for later steps, so walking back onto the same wall would count again). Find the minimum number of walls you must break.",
  inputFormat: "The first line contains n and m. Each of the next n lines contains a string of m characters `.` or `#`. The start and target cells are `.`.",
  outputFormat: "Print the minimum number of broken walls.",
  constraints: "1 <= n, m <= 600",
  samples: [
    { input: "3 3\n.#.\n###\n.#.\n", output: "2\n", explanation: "Every route must cross the middle row and then one more wall." },
    { input: "2 2\n..\n..\n", output: "0\n" },
  ],
  hints: [
    "Each move costs either 0 (free cell) or 1 (wall cell). It is a shortest path problem on the grid graph with two kinds of edge weights.",
    "Dijkstra works, but there is a faster special case for weights 0 and 1: use a deque, pushing 0-cost moves to the front and 1-cost moves to the back (0-1 BFS).",
    "dist[cell] starts at infinity. Pop the front cell, and for each neighbour with cost c = (wall ? 1 : 0), relax dist[nb] = dist[cur] + c; push_front if c = 0 else push_back.",
  ],
  editorial: "Model cells as vertices; the cost of entering a cell is 1 for a wall and 0 for a free cell. With weights in {0, 1}, a deque gives Dijkstra-quality ordering in linear time: relaxing a 0-edge pushes the vertex to the front, a 1-edge pushes it to the back. The answer is dist at the bottom-right cell.\n\nComplexity: O(n * m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<string> g(n);
    for (auto &s : g) cin >> s;
    const int INF = 1e9;
    vector<int> d(n * m, INF);
    deque<int> dq;
    d[0] = 0;
    dq.push_back(0);
    const int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
    while (!dq.empty()) {
        int c = dq.front();
        dq.pop_front();
        int x = c / m, y = c % m;
        for (int k = 0; k < 4; k++) {
            int nx = x + dx[k], ny = y + dy[k];
            if (nx < 0 || ny < 0 || nx >= n || ny >= m) continue;
            int w = g[nx][ny] == '#' ? 1 : 0;
            int id = nx * m + ny;
            if (d[c] + w < d[id]) {
                d[id] = d[c] + w;
                if (w == 0) dq.push_front(id);
                else dq.push_back(id);
            }
        }
    }
    cout << d[n * m - 1] << "\\n";
    return 0;
}`,
  hidden: () => {
    const r = rng(6012);
    const mk = (n: number, m: number, p: number) => {
      const g = randGrid(r, n, m, p, [".", "#"]);
      g[0]![0] = ".";
      g[n - 1]![m - 1] = ".";
      return gridTxt(g);
    };
    const allWall = (n: number, m: number) => {
      const g = Array.from({ length: n }, () => Array(m).fill("#") as string[]);
      g[0]![0] = ".";
      g[n - 1]![m - 1] = ".";
      return gridTxt(g);
    };
    const maze = (n: number, m: number) => {
      const g = Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => (i % 2 === 0 ? "." : (i % 4 === 1 ? j === m - 1 : j === 0) ? "." : "#")));
      return gridTxt(g);
    };
    return [
      "1 1\n.\n",
      "1 2\n.#\n".replace("#", "."),
      "1 3\n.#.\n",
      mk(6, 6, 0.5),
      mk(30, 30, 0.6),
      mk(100, 100, 0.5),
      allWall(40, 50),
      mk(600, 600, 0.3),
      mk(600, 600, 0.5),
      mk(600, 600, 0.7),
      maze(600, 600),
      allWall(600, 600),
    ];
  },
});

const treeDist = P({
  slug: "tree-distance-queries",
  title: "Distances in a Tree",
  difficulty: "medium",
  rating: 1600,
  tags: ["graphs", "trees", "lca", "binary-lifting"],
  statement:
    "You are given a tree with n vertices. Answer q queries: for two vertices u and v, how many edges lie on the path between them?",
  inputFormat: "The first line contains n and q. The next n - 1 lines each contain an edge a b. The next q lines each contain a query u v.",
  outputFormat: "For each query print the number of edges on the path from u to v, one answer per line.",
  constraints: "1 <= n, q <= 20000",
  samples: [{ input: "5 3\n1 2\n1 3\n3 4\n3 5\n2 5\n4 5\n2 2\n", output: "3\n2\n0\n" }],
  hints: [
    "Walking from u to v for every query can cost O(n) each. Think about what the path looks like relative to the root: it goes up to a meeting vertex, then down.",
    "dist(u, v) = depth[u] + depth[v] - 2 * depth[lca(u, v)]. Compute the lowest common ancestor quickly with binary lifting.",
    "Compute parent and depth with a BFS from vertex 1, build up[j][v] = 2^j-th ancestor, lift the deeper vertex to the same depth, then lift both together from the highest power down.",
  ],
  editorial: "Root the tree at 1 and compute depths. With binary lifting tables up[j][v], the LCA is found in O(log n): first raise the deeper vertex to the other's depth, then raise both while their 2^j ancestors differ. The path length is depth[u] + depth[v] - 2 * depth[lca].\n\nComplexity: O((n + q) log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, q;
    scanf("%d %d", &n, &q);
    vector<vector<int>> adj(n + 1);
    for (int i = 0; i < n - 1; i++) {
        int a, b;
        scanf("%d %d", &a, &b);
        adj[a].push_back(b);
        adj[b].push_back(a);
    }
    const int LOG = 16;
    vector<vector<int>> up(LOG, vector<int>(n + 1, 0));
    vector<int> dep(n + 1, 0), order = {1};
    up[0][1] = 1;
    for (size_t i = 0; i < order.size(); i++) {
        int v = order[i];
        for (int to : adj[v]) if (to != up[0][v]) { up[0][to] = v; dep[to] = dep[v] + 1; order.push_back(to); }
    }
    for (int j = 1; j < LOG; j++) for (int v = 1; v <= n; v++) up[j][v] = up[j - 1][up[j - 1][v]];
    while (q--) {
        int u, v;
        scanf("%d %d", &u, &v);
        int a = u, b = v;
        if (dep[a] < dep[b]) swap(a, b);
        int diff = dep[a] - dep[b];
        for (int j = 0; j < LOG; j++) if (diff >> j & 1) a = up[j][a];
        if (a != b) {
            for (int j = LOG - 1; j >= 0; j--) if (up[j][a] != up[j][b]) { a = up[j][a]; b = up[j][b]; }
            a = up[0][a];
        }
        printf("%d\\n", dep[u] + dep[v] - 2 * dep[a]);
    }
    return 0;
}`,
  hidden: () => {
    const r = rng(6013);
    const mk = (n: number, q: number, kind: Kind) => `${n} ${q}\n${lines(tree(r, n, kind))}${n > 1 ? "\n" : ""}${lines(Array.from({ length: q }, () => [r.int(1, n), r.int(1, n)]))}\n`;
    const ends = (n: number, q: number) => `${n} ${q}\n${lines(tree(r, n, "path"))}\n${lines(Array.from({ length: q }, () => [r.int(1, 50), r.int(n - 50, n)]))}\n`;
    return [
      "1 2\n1 1\n1 1\n",
      "2 3\n1 2\n1 2\n2 2\n2 1\n",
      mk(8, 10, "random"),
      mk(50, 60, "binary"),
      mk(1000, 1000, "random"),
      mk(20000, 20000, "path"),
      mk(20000, 20000, "random"),
      mk(20000, 20000, "deep"),
      mk(20000, 20000, "star"),
      mk(20000, 20000, "binary"),
      mk(20000, 20000, "broom"),
      ends(20000, 20000),
    ];
  },
});

const cityPairs = P({
  slug: "city-pair-distances",
  title: "All City Pair Distances",
  difficulty: "medium",
  rating: 1500,
  tags: ["graphs", "floyd-warshall", "shortest-path"],
  statement:
    "There are n cities and m one-way roads, each with a positive length. For an ordered pair of distinct cities (a, b), city b is reachable from a if some sequence of roads leads from a to b; its distance is the length of the shortest such route. Compute how many ordered pairs (a, b) with a != b are reachable and the sum of their distances.",
  inputFormat: "The first line contains n and m. Each of the next m lines contains a, b, w: a one-way road from a to b of length w. Roads between the same pair of cities may repeat.",
  outputFormat: "Print two integers: the number of reachable ordered pairs of distinct cities, and the sum of their shortest distances.",
  constraints: "1 <= n <= 300, 0 <= m <= 30000, 1 <= a, b <= n, a != b, 1 <= w <= 10^6",
  samples: [
    {
      input: "4 5\n1 2 3\n2 3 4\n1 3 10\n3 1 2\n4 1 1\n",
      output: "9 40\n",
      explanation: "Distances: 1->2 3, 1->3 7, 2->3 4, 2->1 6, 3->1 2, 3->2 5, 4->1 1, 4->2 4, 4->3 8.",
    },
  ],
  hints: [
    "You need the shortest distance between every pair, not just from one source. With n only 300, what all-pairs algorithm fits?",
    "Floyd-Warshall: for each intermediate city k, relax d[i][j] = min(d[i][j], d[i][k] + d[k][j]). Initialise d[i][i] = 0 and keep the minimum among repeated roads.",
    "Use a large sentinel (such as 10^18 / 4) for unreachable pairs and skip it when summing; the sum needs 64-bit integers.",
  ],
  editorial: "Initialise d[i][i] = 0, d[a][b] = min over parallel roads, everything else infinity. Floyd-Warshall's triple loop with k outermost computes all-pairs shortest paths in O(n^3) = 2.7 * 10^7 steps. Finally count pairs i != j with finite distance and add their distances (64-bit).\n\nComplexity: O(n^3 + m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    const ll INF = (ll)1e18 / 4;
    vector<vector<ll>> d(n, vector<ll>(n, INF));
    for (int i = 0; i < n; i++) d[i][i] = 0;
    for (int i = 0; i < m; i++) {
        int a, b;
        ll w;
        scanf("%d %d %lld", &a, &b, &w);
        d[a - 1][b - 1] = min(d[a - 1][b - 1], w);
    }
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++) {
            if (d[i][k] >= INF) continue;
            for (int j = 0; j < n; j++) if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
        }
    ll cnt = 0, sum = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) if (i != j && d[i][j] < INF) { cnt++; sum += d[i][j]; }
    printf("%lld %lld\\n", cnt, sum);
    return 0;
}`,
  hidden: () => {
    const r = rng(6014);
    const rnd = (n: number, m: number, maxW: number) => {
      const es: WEdge[] = [];
      while (es.length < m) {
        const a = r.int(1, n);
        const b = r.int(1, n);
        if (a !== b) es.push([a, b, r.int(1, maxW)]);
      }
      return gtxt(n, es);
    };
    const ringN = (n: number) => gtxt(n, Array.from({ length: n }, (_, i) => [i + 1, ((i + 1) % n) + 1, 1000000] as WEdge));
    return [
      "1 0\n",
      "2 1\n2 1 5\n",
      "3 0\n",
      rnd(5, 8, 10),
      rnd(20, 30, 100),
      rnd(100, 150, 1000000),
      rnd(300, 200, 1000000),
      rnd(300, 600, 1000000),
      rnd(300, 30000, 1000000),
      rnd(300, 30000, 3),
      ringN(300),
      rnd(250, 20000, 1000000),
    ];
  },
});

const nearestStation = P({
  slug: "nearest-station-total",
  title: "Distance to the Nearest Station",
  difficulty: "medium",
  rating: 1500,
  tags: ["graphs", "bfs", "multi-source-bfs", "grid"],
  statement:
    "A city is an n by m grid. Each cell is a station (`S`), an open street (`.`) or a building (`#`). You can move between cells sharing a side, never entering a building. For every open street cell, the walking distance to its nearest station is the minimum number of moves needed to get from the cell to any station. Compute the sum of these distances over all open street cells that can reach some station, and also count the open street cells that cannot reach any station.",
  inputFormat: "The first line contains n and m. Each of the next n lines contains a string of m characters from `S`, `.`, `#`. There is at least one station.",
  outputFormat: "Print two integers: the sum of the nearest-station distances over open cells that can reach a station, and the number of open cells that cannot.",
  constraints: "1 <= n, m <= 600",
  samples: [
    {
      input: "3 5\nS..#.\n.#...\n...#S\n",
      output: "21 0\n",
      explanation: "Every open cell can reach a station; the nearest-station distances add up to 21.",
    },
  ],
  hints: [
    "Running a BFS from every open cell is far too slow. Reverse the viewpoint: which single search gives each cell its distance to the closest station?",
    "Multi-source BFS: put all stations in the queue at distance 0 and expand together; the first time a cell is reached is its distance to the nearest station.",
    "Keep dist = -1 for unvisited. After the BFS, loop over cells equal to '.', adding dist if it is >= 0, and counting it as unreachable if it is -1. Use 64-bit for the sum.",
  ],
  editorial: "A BFS that starts with every station in the queue computes, for each cell, the shortest distance to the nearest station (as if a super-source were connected to all stations at cost 0). After it finishes, open cells with a distance contribute to the sum, the others are counted as unreachable. The sum can reach about 10^11, so use 64-bit.\n\nComplexity: O(n * m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n, m;
    cin >> n >> m;
    vector<string> g(n);
    for (auto &s : g) cin >> s;
    vector<int> d(n * m, -1);
    queue<int> q;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) if (g[i][j] == 'S') { d[i * m + j] = 0; q.push(i * m + j); }
    const int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
    while (!q.empty()) {
        int c = q.front();
        q.pop();
        int x = c / m, y = c % m;
        for (int k = 0; k < 4; k++) {
            int nx = x + dx[k], ny = y + dy[k];
            if (nx < 0 || ny < 0 || nx >= n || ny >= m || g[nx][ny] == '#' || d[nx * m + ny] >= 0) continue;
            d[nx * m + ny] = d[c] + 1;
            q.push(nx * m + ny);
        }
    }
    ll sum = 0, bad = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) if (g[i][j] == '.') { if (d[i * m + j] >= 0) sum += d[i * m + j]; else bad++; }
    cout << sum << " " << bad << "\\n";
    return 0;
}`,
  hidden: () => {
    const r = rng(6015);
    const mk = (n: number, m: number, pWall: number, stations: number) => {
      const g = randGrid(r, n, m, pWall, [".", "#"]);
      for (let k = 0; k < stations; k++) g[r.int(0, n - 1)]![r.int(0, m - 1)] = "S";
      return gridTxt(g);
    };
    const corner = (n: number, m: number) => {
      const g = Array.from({ length: n }, () => Array(m).fill(".") as string[]);
      g[0]![0] = "S";
      return gridTxt(g);
    };
    return [
      "1 1\nS\n",
      "1 4\n.S#.\n",
      "2 2\nS#\n#.\n",
      mk(6, 6, 0.3, 2),
      mk(30, 30, 0.35, 3),
      mk(100, 100, 0.3, 1),
      mk(600, 600, 0.25, 1),
      mk(600, 600, 0.4, 5),
      mk(600, 600, 0.1, 40),
      mk(600, 600, 0.55, 3),
      corner(600, 600),
      mk(1, 600, 0.2, 1),
    ];
  },
});

/** Random cactus-like graph: blocks (single edges or cycles) hung on random earlier vertices; labels shuffled. */
function cactus(r: R, n: number): Edge[] {
  const lab = r.shuffle(Array.from({ length: n }, (_, i) => i + 1));
  const es: Edge[] = [];
  let id = 2;
  while (id <= n) {
    const cur = r.int(1, id - 1);
    const len = Math.min(r.int(1, 5), n - id + 1);
    if (len === 1) es.push([cur, id]);
    else {
      es.push([cur, id]);
      for (let k = 0; k < len - 1; k++) es.push([id + k, id + k + 1]);
      es.push([id + len - 1, cur]);
    }
    id += len;
  }
  return es.map(([a, b]) => [lab[a - 1]!, lab[b - 1]!]);
}
const cycleEdges = (n: number): Edge[] => Array.from({ length: n }, (_, i) => [i + 1, (i + 1) % n + 1] as Edge);

// ---------------------------------------------------------------- hard

const bridgesHubs = P({
  slug: "critical-links-and-hubs",
  title: "Critical Links and Hubs",
  difficulty: "hard",
  rating: 1900,
  tags: ["graphs", "dfs", "bridges", "articulation-points", "low-link"],
  statement:
    "A network has n routers and m cables. No cable connects a router to itself and no two cables join the same pair. A cable is critical if removing it (and only it) increases the number of connected components. A router is a hub if removing it (together with all cables attached to it) increases the number of connected components among the remaining routers. Count the critical cables and the hubs.",
  inputFormat: "The first line contains n and m. Each of the next m lines contains two integers a and b: a cable between routers a and b. The network may be disconnected.",
  outputFormat: "Print two integers: the number of critical cables and the number of hubs.",
  constraints: "1 <= n <= 40000, 0 <= m <= 40000, no loops, no repeated cables",
  samples: [
    { input: "5 5\n1 2\n2 3\n3 1\n3 4\n4 5\n", output: "2 2\n", explanation: "Critical cables: 3-4 and 4-5. Hubs: routers 3 and 4." },
    { input: "3 2\n1 2\n2 3\n", output: "2 1\n" },
  ],
  hints: [
    "Whether a cable or router is critical depends on whether the rest of the graph can still reach around it. DFS tree edges and back edges encode exactly that.",
    "Compute tin[v] (entry time) and low[v] (the earliest entry time reachable from v's subtree using at most one back edge). A tree edge (p, v) is a bridge iff low[v] > tin[p]; a non-root p is a hub if some child has low[v] >= tin[p]; the root is a hub iff it has at least 2 DFS children.",
    "With n = 40000 a path-shaped graph makes recursive DFS 40000 deep. Implement the DFS iteratively with an explicit stack and per-vertex adjacency iterators, tracking the edge id used to enter each vertex (to skip only that edge).",
  ],
  editorial: "Run a DFS forest computing tin and low. For a tree edge p -> v: if low[v] > tin[p] the edge is a bridge. If low[v] >= tin[p] and p is not a DFS root, p is an articulation point (v's subtree cannot bypass p). A DFS root is an articulation point exactly when it has two or more DFS children. Parent-edge skipping is by edge id (the graph is simple, so skipping by parent vertex would also work). Do the traversal iteratively to avoid stack overflow.\n\nComplexity: O(n + m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<vector<pair<int, int>>> adj(n + 1);
    for (int i = 0; i < m; i++) {
        int a, b;
        scanf("%d %d", &a, &b);
        adj[a].push_back({b, i});
        adj[b].push_back({a, i});
    }
    vector<int> tin(n + 1, 0), low(n + 1, 0), it(n + 1, 0), pe(n + 1, -1);
    vector<char> br(m, 0), art(n + 1, 0);
    int timer = 0;
    for (int s = 1; s <= n; s++) {
        if (tin[s]) continue;
        vector<int> st = {s};
        tin[s] = low[s] = ++timer;
        int rootChildren = 0;
        while (!st.empty()) {
            int v = st.back();
            if (it[v] < (int)adj[v].size()) {
                auto [to, id] = adj[v][it[v]++];
                if (id == pe[v]) continue;
                if (tin[to]) low[v] = min(low[v], tin[to]);
                else {
                    pe[to] = id;
                    tin[to] = low[to] = ++timer;
                    st.push_back(to);
                }
            } else {
                st.pop_back();
                if (!st.empty()) {
                    int p = st.back();
                    low[p] = min(low[p], low[v]);
                    if (low[v] > tin[p]) br[pe[v]] = 1;
                    if (p == s) rootChildren++;
                    else if (low[v] >= tin[p]) art[p] = 1;
                }
            }
        }
        if (rootChildren >= 2) art[s] = 1;
    }
    int b = 0, a = 0;
    for (int i = 0; i < m; i++) b += br[i];
    for (int v = 1; v <= n; v++) a += art[v];
    printf("%d %d\\n", b, a);
    return 0;
}`,
  hidden: () => {
    const r = rng(6016);
    return [
      "1 0\n",
      "2 1\n1 2\n",
      "3 3\n1 2\n2 3\n3 1\n",
      gtxt(10, graph(r, 10, 11, false)),
      gtxt(40, cactus(r, 40)),
      gtxt(300, graph(r, 300, 20000, false)),
      gtxt(40000, graph(r, 40000, 39999, true, "random")),
      gtxt(40000, graph(r, 40000, 39999, true, "path")),
      gtxt(40000, cycleEdges(40000)),
      gtxt(40000, cactus(r, 40000)),
      gtxt(40000, graph(r, 40000, 40000, false)),
      gtxt(40000, graph(r, 40000, 40000, false)),
      gtxt(40000, graph(r, 40000, 39999, true, "star")),
    ];
  },
});

const indepSets = P({
  slug: "independent-sets-of-size-k",
  title: "Independent Sets of Size K",
  difficulty: "hard",
  rating: 1900,
  tags: ["graphs", "trees", "dp", "tree-dp", "knapsack", "counting"],
  statement:
    "In a tree with n vertices, a set of vertices is independent if no two vertices in the set are joined by an edge. Count the independent sets that contain exactly k vertices, modulo 1000000007. The empty set counts as independent (relevant only if k = 0).",
  inputFormat: "The first line contains n and k. Each of the next n - 1 lines contains two integers a and b: an edge of the tree.",
  outputFormat: "Print the number of independent sets of size exactly k, modulo 1000000007.",
  constraints: "1 <= n <= 2000, 0 <= k <= n",
  samples: [
    { input: "3 2\n1 2\n2 3\n", output: "1\n", explanation: "Only {1, 3}." },
    { input: "4 2\n1 2\n1 3\n1 4\n", output: "3\n", explanation: "Any two of the three leaves." },
  ],
  hints: [
    "Decide for each vertex whether it is chosen. A chosen vertex forbids its children from being chosen. What do you need to remember about each subtree?",
    "Tree DP with a count dimension: A[v][j] = number of ways to choose j vertices in v's subtree when v is NOT chosen, B[v][j] when v IS chosen. Merge children like a knapsack.",
    "Merging a child c into v: newA[i+j] += A[v][i] * (A[c][j] + B[c][j]); newB[i+j] += B[v][i] * A[c][j]. Truncate arrays at size min(subtree size, k) so the total work stays O(n * k) (O(n^2) worst case).",
  ],
  editorial: "For each vertex keep two polynomials indexed by the number of chosen vertices: A (vertex not chosen) and B (vertex chosen). A leaf has A = 1 + 0x and B = x. Merging a child multiplies polynomials: A_v gets A_v * (A_c + B_c) and B_v gets B_v * A_c. If each polynomial is limited to degree min(subtree size, k), the standard subtree-size argument bounds the total work by O(n * min(n, k)) = O(n^2). The answer is the coefficient of x^k in A_root + B_root. Process vertices in reverse BFS order to avoid recursion.\n\nComplexity: O(n^2).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const ll MOD = 1000000007LL;
int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<vector<int>> adj(n + 1);
    for (int i = 0; i < n - 1; i++) {
        int a, b;
        scanf("%d %d", &a, &b);
        adj[a].push_back(b);
        adj[b].push_back(a);
    }
    vector<int> par(n + 1, 0), order = {1};
    for (size_t i = 0; i < order.size(); i++) {
        int v = order[i];
        for (int to : adj[v]) if (to != par[v]) { par[to] = v; order.push_back(to); }
    }
    vector<vector<ll>> A(n + 1), B(n + 1);
    for (int v = 1; v <= n; v++) {
        A[v] = {1, 0};
        B[v] = {0, 1};
        if (k == 0) { A[v].resize(1); B[v].resize(1); }
    }
    for (int idx = n - 1; idx > 0; idx--) {
        int c = order[idx], v = par[c];
        int lv = A[v].size(), lc = A[c].size();
        int nl = min(lv - 1 + lc - 1, k) + 1;
        vector<ll> NA(nl, 0), NB(nl, 0);
        for (int i = 0; i < lv; i++)
            for (int j = 0; j < lc && i + j < nl; j++) {
                NA[i + j] = (NA[i + j] + A[v][i] * ((A[c][j] + B[c][j]) % MOD)) % MOD;
                NB[i + j] = (NB[i + j] + B[v][i] * A[c][j]) % MOD;
            }
        A[v] = move(NA);
        B[v] = move(NB);
        vector<ll>().swap(A[c]);
        vector<ll>().swap(B[c]);
    }
    ll ans = 0;
    if (k < (int)A[1].size()) ans = (A[1][k] + B[1][k]) % MOD;
    printf("%lld\\n", ans);
    return 0;
}`,
  hidden: () => {
    const r = rng(6017);
    const mk = (n: number, k: number, kind: Kind) => `${n} ${k}\n${lines(tree(r, n, kind))}${n > 1 ? "\n" : ""}`;
    return [
      "1 0\n",
      "1 1\n",
      "2 2\n1 2\n",
      mk(10, 3, "random"),
      mk(12, 6, "path"),
      mk(30, 0, "random"),
      mk(200, 40, "random"),
      mk(2000, 1, "random"),
      mk(2000, 700, "path"),
      mk(2000, 1000, "path"),
      mk(2000, 500, "random"),
      mk(2000, 2000, "star"),
      mk(2000, 1999, "star"),
      mk(2000, 900, "binary"),
      mk(2000, 1000, "broom"),
    ];
  },
});

const pathSpread = P({
  slug: "path-spread-queries",
  title: "Spread of Weights on a Path",
  difficulty: "hard",
  rating: 1800,
  tags: ["graphs", "trees", "lca", "binary-lifting", "queries"],
  statement:
    "You are given a tree with n vertices and positive edge weights. For each query (u, v), look at all edges on the path from u to v and output the difference between the largest and the smallest weight among them. If u = v the path has no edges and the answer is 0.",
  inputFormat: "The first line contains n and q. The next n - 1 lines each contain a, b, w: an edge between a and b with weight w. The next q lines each contain a query u v.",
  outputFormat: "For each query print max - min of the edge weights on the path from u to v, one per line.",
  constraints: "1 <= n, q <= 15000, 1 <= w <= 10^6",
  samples: [{ input: "5 3\n1 2 5\n1 3 2\n3 4 9\n3 5 4\n2 4\n5 4\n2 2\n", output: "7\n5\n0\n", explanation: "Path 2-1-3-4 has weights 5, 2, 9; path 5-3-4 has weights 4, 9." }],
  hints: [
    "Max and min over a path decompose: the path from u to v is the path from u up to the LCA plus the path from v up to the LCA.",
    "Binary lifting stores, for each vertex and power j, the 2^j-th ancestor together with the max and min edge weight on that upward jump; both statistics merge with max/min, which is idempotent and associative.",
    "While lifting the deeper vertex to the other's depth, and then both together, fold mx[j][v] and mn[j][v] into running totals. Finally include the two edges leading into the LCA. Handle u = v separately (no edges: print 0).",
  ],
  editorial: "Root the tree at 1. For each vertex v store up[j][v], mx[j][v], mn[j][v]: the 2^j-th ancestor and the maximum and minimum weight on the 2^j edges leading there. Table construction is O(n log n). A query lifts the deeper endpoint to the depth of the shallower, folding the statistics, then lifts both while their ancestors differ, and finally folds the last edge on each side. The answer is the folded maximum minus the folded minimum (0 when u = v).\n\nComplexity: O((n + q) log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, q;
    scanf("%d %d", &n, &q);
    vector<vector<pair<int, int>>> adj(n + 1);
    for (int i = 0; i < n - 1; i++) {
        int a, b, w;
        scanf("%d %d %d", &a, &b, &w);
        adj[a].push_back({b, w});
        adj[b].push_back({a, w});
    }
    const int LOG = 15, INF = 1e9;
    vector<vector<int>> up(LOG, vector<int>(n + 1, 1)), mx(LOG, vector<int>(n + 1, 0)), mn(LOG, vector<int>(n + 1, INF));
    vector<int> dep(n + 1, 0), par(n + 1, 0), order = {1};
    for (size_t i = 0; i < order.size(); i++) {
        int v = order[i];
        for (auto [to, w] : adj[v]) if (to != par[v]) {
            par[to] = v;
            dep[to] = dep[v] + 1;
            up[0][to] = v;
            mx[0][to] = mn[0][to] = w;
            order.push_back(to);
        }
    }
    for (int j = 1; j < LOG; j++)
        for (int v = 1; v <= n; v++) {
            int mid = up[j - 1][v];
            up[j][v] = up[j - 1][mid];
            mx[j][v] = max(mx[j - 1][v], mx[j - 1][mid]);
            mn[j][v] = min(mn[j - 1][v], mn[j - 1][mid]);
        }
    while (q--) {
        int u, v;
        scanf("%d %d", &u, &v);
        if (u == v) { puts("0"); continue; }
        int hi = 0, lo = INF;
        if (dep[u] < dep[v]) swap(u, v);
        int diff = dep[u] - dep[v];
        for (int j = 0; j < LOG; j++) if (diff >> j & 1) { hi = max(hi, mx[j][u]); lo = min(lo, mn[j][u]); u = up[j][u]; }
        if (u != v) {
            for (int j = LOG - 1; j >= 0; j--) if (up[j][u] != up[j][v]) {
                hi = max({hi, mx[j][u], mx[j][v]});
                lo = min({lo, mn[j][u], mn[j][v]});
                u = up[j][u];
                v = up[j][v];
            }
            hi = max({hi, mx[0][u], mx[0][v]});
            lo = min({lo, mn[0][u], mn[0][v]});
        }
        printf("%d\\n", hi - lo);
    }
    return 0;
}`,
  hidden: () => {
    const r = rng(6018);
    const mk = (n: number, q: number, kind: Kind, maxW: number, qs?: () => number[]) =>
      `${n} ${q}\n${lines(wtree(r, n, kind, maxW))}${n > 1 ? "\n" : ""}${lines(Array.from({ length: q }, qs ?? (() => [r.int(1, n), r.int(1, n)])))}\n`;
    return [
      "1 1\n1 1\n",
      "2 3\n1 2 7\n1 2\n2 2\n2 1\n",
      mk(8, 12, "random", 10),
      mk(60, 80, "binary", 5),
      mk(1000, 1000, "random", 1000000),
      mk(15000, 15000, "path", 1000000),
      mk(15000, 15000, "random", 1000000),
      mk(15000, 15000, "deep", 1000000),
      mk(15000, 15000, "star", 1000000),
      mk(15000, 15000, "binary", 1000000),
      mk(15000, 15000, "broom", 1000),
      mk(15000, 15000, "path", 1000000, () => [r.int(1, 40), r.int(14960, 15000)]),
    ];
  },
});

const couponRoads = P({
  slug: "coupon-roads",
  title: "Coupon Roads",
  difficulty: "hard",
  rating: 1900,
  tags: ["graphs", "dijkstra", "shortest-path", "state-space"],
  statement:
    "A country has n cities and m two-way roads, each with a toll. You hold k coupons; each coupon lets you drive through one road for free (the toll becomes 0). A coupon is used for one pass over a road, so driving the same road twice uses two coupons. You may use any number of coupons from 0 to k. Find the minimum total toll to travel from city 1 to city n.",
  inputFormat: "The first line contains n, m and k. Each of the next m lines contains a, b, w: a two-way road between a and b with toll w. Roads may repeat.",
  outputFormat: "Print the minimum total toll, or -1 if city n cannot be reached from city 1.",
  constraints: "2 <= n <= 15000, 0 <= m <= 25000, 0 <= k <= 10, 1 <= a, b <= n, a != b, 1 <= w <= 10^9",
  samples: [
    { input: "4 4 1\n1 2 10\n2 3 20\n3 4 30\n1 3 35\n", output: "30\n", explanation: "Route 1-2-3-4 with the coupon on 3-4 costs 10 + 20 = 30 (so does 1-3-4 with a coupon on 1-3)." },
    { input: "2 1 0\n1 2 5\n", output: "5\n" },
  ],
  hints: [
    "A plain shortest path is not enough: the best choice of free roads depends on how many coupons are left when you arrive somewhere.",
    "Expand the state to (city, coupons used). Moving along a road either pays w and keeps the count, or pays 0 and increases the count by one.",
    "Run Dijkstra over the (n * (k + 1)) states with 64-bit distances; the answer is the minimum of dist[n][j] over all j in 0..k.",
  ],
  editorial: "Build a layered graph with k + 1 layers (layer j = j coupons used). From (v, j), each road (v, to, w) leads to (to, j) at cost w and, if j < k, to (to, j + 1) at cost 0. Dijkstra on this graph has about 11 * 15000 states and 11 * 50000 transitions. The answer is the minimum distance to (n, j) over all j (using fewer coupons is allowed). Distances need 64-bit integers.\n\nComplexity: O(k (n + m) log(k n)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n, m, k;
    scanf("%d %d %d", &n, &m, &k);
    vector<vector<pair<int, ll>>> adj(n + 1);
    for (int i = 0; i < m; i++) {
        int a, b;
        ll w;
        scanf("%d %d %lld", &a, &b, &w);
        adj[a].push_back({b, w});
        adj[b].push_back({a, w});
    }
    const ll INF = LLONG_MAX / 4;
    int K = k + 1;
    vector<ll> d((size_t)(n + 1) * K, INF);
    priority_queue<pair<ll, int>, vector<pair<ll, int>>, greater<pair<ll, int>>> pq;
    d[1 * K + 0] = 0;
    pq.push({0, 1 * K});
    while (!pq.empty()) {
        auto [dv, s] = pq.top();
        pq.pop();
        if (dv > d[s]) continue;
        int v = s / K, j = s % K;
        for (auto [to, w] : adj[v]) {
            int s1 = to * K + j;
            if (dv + w < d[s1]) { d[s1] = dv + w; pq.push({d[s1], s1}); }
            if (j + 1 < K) {
                int s2 = to * K + j + 1;
                if (dv < d[s2]) { d[s2] = dv; pq.push({dv, s2}); }
            }
        }
    }
    ll ans = INF;
    for (int j = 0; j < K; j++) ans = min(ans, d[(size_t)n * K + j]);
    printf("%lld\\n", ans >= INF ? -1LL : ans);
    return 0;
}`,
  hidden: () => {
    const r = rng(6019);
    const mk = (n: number, m: number, k: number, maxW: number, conn: boolean, kind: Kind = "random") =>
      `${n} ${m} ${k}\n${lines(withW(r, graph(r, n, m, conn, kind), maxW))}\n`;
    return [
      "2 0 5\n",
      "2 1 0\n1 2 1000000000\n",
      "2 1 10\n2 1 1000000000\n",
      mk(6, 9, 1, 20, true),
      mk(30, 60, 2, 100, true),
      mk(500, 1500, 3, 1000000000, true),
      mk(15000, 25000, 10, 1000000000, true),
      mk(15000, 25000, 10, 1000, true),
      mk(15000, 25000, 0, 1000000, true),
      mk(15000, 14999, 4, 1000000000, true, "path"),
      mk(15000, 25000, 10, 5, true, "deep"),
      mk(15000, 15000, 7, 100, false),
      mk(15000, 25000, 1, 1000000000, true, "broom"),
    ];
  },
});

const sccSummary = P({
  slug: "strongly-connected-groups",
  title: "Strongly Connected Groups",
  difficulty: "hard",
  rating: 1800,
  tags: ["graphs", "scc", "tarjan", "dfs", "dag"],
  statement:
    "In a directed graph with n vertices and m edges, two vertices belong to the same strongly connected component (SCC) if each can reach the other. Compress every SCC into a single node; the result is a DAG. Report: the number of SCCs, the number of SCCs that have no incoming edge from a different SCC, and the number of vertices in the largest SCC.",
  inputFormat: "The first line contains n and m. Each of the next m lines contains a, b: a directed edge from a to b. Edges may repeat and may be self-loops.",
  outputFormat: "Print three integers: the number of SCCs, the number of SCCs with no incoming edge from another SCC, and the size of the largest SCC.",
  constraints: "1 <= n <= 50000, 0 <= m <= 50000",
  samples: [
    { input: "6 7\n1 2\n2 3\n3 1\n3 4\n4 5\n5 4\n6 6\n", output: "3 2 3\n", explanation: "SCCs: {1,2,3}, {4,5}, {6}. {4,5} has an incoming edge from {1,2,3}; the other two have none." },
  ],
  hints: [
    "A vertex set where everyone reaches everyone is a cycle-like structure. A single DFS can discover these groups if you track how far back each subtree can climb.",
    "Tarjan's algorithm: maintain index and lowlink per vertex plus a stack; when lowlink[v] == index[v], pop the stack down to v to form one SCC.",
    "After labelling components, scan all edges: whenever comp[a] != comp[b], mark comp[b] as having an incoming edge. Components never marked are the sources. Make the DFS iterative; n = 50000 allows a 50000-long chain.",
  ],
  editorial: "Run Tarjan's SCC algorithm (iteratively with an explicit call stack). Each vertex gets an index and a lowlink; a vertex whose lowlink equals its index is the root of an SCC, which is everything above it on the Tarjan stack. With component ids assigned, count components, component sizes (for the maximum) and mark every component that is the target of an edge between two different components; unmarked components are the sources of the condensation DAG.\n\nComplexity: O(n + m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<vector<int>> adj(n + 1);
    vector<pair<int, int>> E(m);
    for (auto &e : E) {
        scanf("%d %d", &e.first, &e.second);
        adj[e.first].push_back(e.second);
    }
    vector<int> idx(n + 1, 0), low(n + 1, 0), comp(n + 1, -1), it(n + 1, 0), sz;
    vector<int> S, cs;
    int t = 0, c = 0;
    for (int s = 1; s <= n; s++) {
        if (idx[s]) continue;
        idx[s] = low[s] = ++t;
        S.push_back(s);
        cs.push_back(s);
        while (!cs.empty()) {
            int v = cs.back();
            if (it[v] < (int)adj[v].size()) {
                int w = adj[v][it[v]++];
                if (!idx[w]) {
                    idx[w] = low[w] = ++t;
                    S.push_back(w);
                    cs.push_back(w);
                } else if (comp[w] < 0) low[v] = min(low[v], idx[w]);
            } else {
                if (low[v] == idx[v]) {
                    int cnt = 0;
                    while (true) {
                        int x = S.back();
                        S.pop_back();
                        comp[x] = c;
                        cnt++;
                        if (x == v) break;
                    }
                    sz.push_back(cnt);
                    c++;
                }
                cs.pop_back();
                if (!cs.empty()) low[cs.back()] = min(low[cs.back()], low[v]);
            }
        }
    }
    vector<char> hasIn(c, 0);
    for (auto &e : E) if (comp[e.first] != comp[e.second]) hasIn[comp[e.second]] = 1;
    int src = 0;
    for (int i = 0; i < c; i++) if (!hasIn[i]) src++;
    printf("%d %d %d\\n", c, src, *max_element(sz.begin(), sz.end()));
    return 0;
}`,
  hidden: () => {
    const r = rng(6020);
    const dirRand = (n: number, m: number): Edge[] => Array.from({ length: m }, () => [r.int(1, n), r.int(1, n)] as Edge);
    const bigCycle = (n: number): Edge[] => cycleEdges(n).map(([a, b]) => [a, b] as Edge);
    /** Several cycles of random sizes linked in a DAG-like fashion. */
    const blocks = (n: number): Edge[] => {
      const es: Edge[] = [];
      const lab = r.shuffle(Array.from({ length: n }, (_, i) => i + 1));
      let at = 0;
      let prevStart = -1;
      while (at < n && es.length < 49000) {
        const len = Math.min(r.int(1, 8), n - at);
        for (let k = 0; k < len; k++) es.push([lab[at + k]!, lab[at + ((k + 1) % len)]!]);
        if (prevStart >= 0 && r.int(0, 2) > 0) es.push([lab[prevStart]!, lab[at]!]);
        prevStart = at;
        at += len;
      }
      return es;
    };
    return [
      "1 0\n",
      "1 1\n1 1\n",
      "3 3\n1 2\n2 3\n3 1\n",
      gtxt(8, dirRand(8, 10)),
      gtxt(40, dirRand(40, 50)),
      gtxt(1000, dirRand(1000, 1500)),
      gtxt(50000, dirRand(50000, 50000)),
      gtxt(50000, dirRand(50000, 35000)),
      gtxt(50000, bigCycle(50000)),
      gtxt(50000, dag(r, 50000, 50000, 4, false)),
      gtxt(40000, blocks(40000)),
      gtxt(50000, [...bigCycle(25000), ...dirRand(50000, 20000)]),
    ];
  },
});

const secondRoute = P({
  slug: "second-cheapest-route",
  title: "Second Cheapest Route",
  difficulty: "hard",
  rating: 2000,
  tags: ["graphs", "dijkstra", "shortest-path"],
  statement:
    "A kingdom has n towns and m two-way roads with positive lengths. A trip from town 1 to town n may pass through towns and roads several times (a trip is any walk). Let D be the minimum possible trip length. Find the minimum trip length that is strictly greater than D.",
  inputFormat: "The first line contains n and m. Each of the next m lines contains a, b, w: a two-way road of length w between towns a and b. Roads may repeat.",
  outputFormat: "Print the smallest trip length strictly greater than D, or -1 if town n cannot be reached from town 1.",
  constraints: "2 <= n <= 25000, 0 <= m <= 25000, 1 <= a, b <= n, a != b, 1 <= w <= 10^9",
  samples: [
    { input: "3 3\n1 2 1\n2 3 1\n1 3 5\n", output: "4\n", explanation: "D = 2. The trip 1-2-1-2-3 has length 4, the direct road has length 5." },
    { input: "2 1\n1 2 3\n", output: "9\n", explanation: "Go forth and back once more: 3 + 3 + 3." },
    { input: "3 1\n1 2 4\n", output: "-1\n" },
  ],
  hints: [
    "Because walks may repeat roads, the second best answer can reuse edges, e.g. by stepping back and forth. You need the best and the best strictly larger value for each vertex.",
    "Keep two distances per town: d1[v], the shortest, and d2[v], the shortest strictly greater than d1[v]. Run a Dijkstra-style process where each heap entry may improve either one.",
    "When relaxing nd = d + w towards `to`: if nd < d1[to], the old d1 becomes d2 and d1 = nd; else if d1[to] < nd < d2[to], set d2[to] = nd. Push when anything changes; skip a popped entry if its distance exceeds d2[v].",
  ],
  editorial: "Generalise Dijkstra to track the two smallest distinct walk lengths per vertex. A candidate length nd for vertex `to` either beats d1 (then the old d1 is demoted to d2), or lies strictly between d1 and d2 (it replaces d2), or is ignored. Each vertex is settled at most twice, giving 2 (n + m) heap operations. Since walks may repeat edges, if n is reachable a longer walk always exists, so -1 only occurs when it is unreachable.\n\nComplexity: O((n + m) log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<vector<pair<int, ll>>> adj(n + 1);
    for (int i = 0; i < m; i++) {
        int a, b;
        ll w;
        scanf("%d %d %lld", &a, &b, &w);
        adj[a].push_back({b, w});
        adj[b].push_back({a, w});
    }
    const ll INF = LLONG_MAX / 4;
    vector<ll> d1(n + 1, INF), d2(n + 1, INF);
    priority_queue<pair<ll, int>, vector<pair<ll, int>>, greater<pair<ll, int>>> pq;
    d1[1] = 0;
    pq.push({0, 1});
    while (!pq.empty()) {
        auto [d, v] = pq.top();
        pq.pop();
        if (d > d2[v]) continue;
        for (auto [to, w] : adj[v]) {
            ll nd = d + w;
            if (nd < d1[to]) {
                d2[to] = d1[to];
                d1[to] = nd;
                pq.push({nd, to});
                if (d2[to] < INF) pq.push({d2[to], to});
            } else if (nd > d1[to] && nd < d2[to]) {
                d2[to] = nd;
                pq.push({nd, to});
            }
        }
    }
    printf("%lld\\n", d2[n] >= INF ? -1LL : d2[n]);
    return 0;
}`,
  hidden: () => {
    const r = rng(6021);
    const mk = (n: number, m: number, maxW: number, conn: boolean, kind: Kind = "random") => gtxt(n, withW(r, graph(r, n, m, conn, kind), maxW));
    return [
      "2 0\n",
      "2 1\n2 1 1000000000\n",
      mk(5, 7, 5, true),
      mk(10, 14, 3, true),
      mk(100, 200, 10, true),
      mk(1000, 2000, 1000000000, true),
      mk(25000, 25000, 1000000000, true),
      mk(25000, 25000, 3, true),
      mk(25000, 24999, 1000000000, true, "path"),
      mk(25000, 24999, 1000000, true, "star"),
      mk(25000, 25000, 5, true, "binary"),
      mk(25000, 20000, 100, false),
      mk(12000, 25000, 2, true, "deep"),
    ];
  },
});

const shortestCount = P({
  slug: "shortest-route-census",
  title: "Shortest Route Census",
  difficulty: "hard",
  rating: 1900,
  tags: ["graphs", "dijkstra", "shortest-path", "counting", "dp"],
  statement:
    "A map has n towns and m two-way roads with positive lengths. Let D be the shortest distance from town 1 to town n. Report D, the number of distinct shortest routes from 1 to n (modulo 1000000007; two routes are different if their sequences of roads differ, and parallel roads are distinct roads), and the number of towns that lie on at least one shortest route.",
  inputFormat: "The first line contains n and m. Each of the next m lines contains a, b, w: a two-way road between a and b with length w. Roads may repeat.",
  outputFormat: "If town n is unreachable print -1. Otherwise print three integers: D, the number of shortest routes modulo 1000000007, and the number of towns on at least one shortest route (towns 1 and n included).",
  constraints: "2 <= n <= 25000, 0 <= m <= 25000, 1 <= a, b <= n, a != b, 1 <= w <= 10^9",
  samples: [
    { input: "4 5\n1 2 1\n1 3 1\n2 4 1\n3 4 1\n2 3 5\n", output: "2 2 4\n", explanation: "Routes 1-2-4 and 1-3-4 of length 2; all four towns are on one of them." },
    { input: "3 1\n1 2 1\n", output: "-1\n" },
  ],
  hints: [
    "Counting needs a consistent processing order: a road can be part of a shortest route only if it goes from a vertex with smaller distance to one with larger distance by exactly its length.",
    "While running Dijkstra from town 1, keep cnt[v]: when you find a path of equal length to v, add cnt[u] to cnt[v]; when you find a strictly shorter one, replace cnt[v] by cnt[u].",
    "For the number of towns on some shortest route, also run Dijkstra from town n: v qualifies iff dist1[v] + distN[v] == D. Count roads to a pair of towns separately (parallel roads count as different routes).",
  ],
  editorial: "Dijkstra from town 1 computes dist1 and the number of shortest paths cnt[v] mod p: when relaxing u -> v with equal total length add cnt[u], with a smaller one overwrite. Positive weights ensure cnt[u] is final when u is popped. A second Dijkstra from town n gives distN. A town v lies on some shortest route exactly when dist1[v] + distN[v] = D. Distances need 64-bit.\n\nComplexity: O((n + m) log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const ll INF = LLONG_MAX / 4, MOD = 1000000007LL;
int n;
vector<vector<pair<int, ll>>> adj;
void dijk(int s, vector<ll> &d, vector<ll> &cnt) {
    d.assign(n + 1, INF);
    cnt.assign(n + 1, 0);
    priority_queue<pair<ll, int>, vector<pair<ll, int>>, greater<pair<ll, int>>> pq;
    d[s] = 0;
    cnt[s] = 1;
    pq.push({0, s});
    while (!pq.empty()) {
        auto [dv, v] = pq.top();
        pq.pop();
        if (dv > d[v]) continue;
        for (auto [to, w] : adj[v]) {
            if (dv + w < d[to]) { d[to] = dv + w; cnt[to] = cnt[v]; pq.push({d[to], to}); }
            else if (dv + w == d[to]) cnt[to] = (cnt[to] + cnt[v]) % MOD;
        }
    }
}
int main() {
    int m;
    scanf("%d %d", &n, &m);
    adj.resize(n + 1);
    for (int i = 0; i < m; i++) {
        int a, b;
        ll w;
        scanf("%d %d %lld", &a, &b, &w);
        adj[a].push_back({b, w});
        adj[b].push_back({a, w});
    }
    vector<ll> d1, c1, dn, cn;
    dijk(1, d1, c1);
    if (d1[n] >= INF) { puts("-1"); return 0; }
    dijk(n, dn, cn);
    int on = 0;
    for (int v = 1; v <= n; v++) if (d1[v] < INF && dn[v] < INF && d1[v] + dn[v] == d1[n]) on++;
    printf("%lld %lld %d\\n", d1[n], c1[n] % MOD, on);
    return 0;
}`,
  hidden: () => {
    const r = rng(6022);
    const mk = (n: number, m: number, maxW: number, conn: boolean, kind: Kind = "random") => gtxt(n, withW(r, graph(r, n, m, conn, kind), maxW));
    /** Layers of width W fully connected to the next layer; unit weights, so there are W^(L-1) * W shortest routes. */
    const layered = (L: number, W: number): string => {
      const n = 2 + L * W;
      const id = (l: number, k: number) => 2 + l * W + k;
      const es: WEdge[] = [];
      for (let k = 0; k < W; k++) es.push([1, id(0, k), 1]);
      for (let l = 0; l + 1 < L; l++) for (let a = 0; a < W; a++) for (let b = 0; b < W; b++) es.push([id(l, a), id(l + 1, b), 1]);
      for (let k = 0; k < W; k++) es.push([id(L - 1, k), n, 1]);
      // relabel so that 1 stays the source and n the sink
      const mid = r.shuffle(Array.from({ length: n - 2 }, (_, i) => i + 2));
      const map = (x: number) => (x === 1 ? 1 : x === n ? n : mid[x - 2]!);
      return gtxt(n, es.map(([a, b, w]) => [map(a), map(b), w] as WEdge));
    };
    return [
      "2 0\n",
      "2 2\n1 2 5\n2 1 5\n",
      mk(6, 9, 3, true),
      mk(12, 25, 2, true),
      layered(3, 3),
      layered(100, 10),
      layered(200, 10),
      mk(25000, 25000, 2, true),
      mk(25000, 25000, 1000000000, true),
      mk(25000, 24999, 1, true, "binary"),
      mk(25000, 24999, 1000000000, true, "path"),
      mk(25000, 25000, 1, false),
      mk(5000, 25000, 1, true),
    ];
  },
});

// ---------------------------------------------------------------- expert

const closePairs = P({
  slug: "close-pairs-in-tree",
  title: "Close Pairs in a Tree",
  difficulty: "expert",
  rating: 2400,
  tags: ["graphs", "trees", "centroid-decomposition", "divide-and-conquer", "two-pointers"],
  statement:
    "You are given a tree with n vertices (every edge has length 1). Count the unordered pairs of distinct vertices {u, v} whose distance (number of edges on the path between them) is at most K.",
  inputFormat: "The first line contains n and K. Each of the next n - 1 lines contains two integers a and b: an edge of the tree.",
  outputFormat: "Print the number of unordered pairs {u, v}, u != v, with dist(u, v) <= K.",
  constraints: "1 <= n <= 50000, 1 <= K <= n. The answer may not fit in 32 bits.",
  samples: [
    { input: "4 2\n1 2\n2 3\n3 4\n", output: "5\n", explanation: "Pairs (1,2), (2,3), (3,4), (1,3), (2,4)." },
    { input: "5 1\n1 2\n1 3\n1 4\n1 5\n", output: "4\n" },
  ],
  hints: [
    "Checking all pairs is O(n^2) pairs, too many. Split the problem by a vertex: every path either passes through a chosen vertex c or lies entirely inside one of the pieces left after removing c.",
    "Centroid decomposition: pick the centroid c of the current piece, count pairs whose path passes through c, then recurse on each remaining piece. Depth is O(log n).",
    "For the centroid c, collect the distances of all vertices in the piece (c itself at 0), count pairs with d_i + d_j <= K using sort and two pointers, then subtract the same count computed inside each child subtree (distances measured from c) to remove pairs that do not actually pass through c. Do BFS iteratively, not recursively.",
  ],
  editorial: "Centroid decomposition. For a piece with centroid c, every path through c joins two vertices in different child subtrees (or c itself). Let D be the multiset of distances from c over the whole piece (including c with 0), and for each child subtree let D_s be distances from c inside it. The number of pairs with d_i + d_j <= K that pass through c is pairs(D) - sum over s of pairs(D_s), where pairs() counts index pairs i < j with sum <= K via sorting and two pointers. Remove c and repeat on each child piece. Every vertex appears in O(log n) pieces, giving O(n log^2 n). All traversals are done with BFS to avoid deep recursion.\n\nComplexity: O(n log^2 n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int n, K;
vector<vector<int>> adj;
vector<char> rem;
ll pairsLE(vector<int> &d) {
    sort(d.begin(), d.end());
    ll c = 0;
    int l = 0, r = (int)d.size() - 1;
    while (l < r) {
        if (d[l] + d[r] <= K) { c += r - l; l++; }
        else r--;
    }
    return c;
}
int main() {
    scanf("%d %d", &n, &K);
    adj.resize(n + 1);
    for (int i = 0; i < n - 1; i++) {
        int a, b;
        scanf("%d %d", &a, &b);
        adj[a].push_back(b);
        adj[b].push_back(a);
    }
    rem.assign(n + 1, 0);
    vector<int> par(n + 1, 0), sz(n + 1, 0), dep(n + 1, 0);
    vector<int> roots = {1};
    ll ans = 0;
    while (!roots.empty()) {
        int s = roots.back();
        roots.pop_back();
        vector<int> ord = {s};
        par[s] = 0;
        for (size_t i = 0; i < ord.size(); i++) {
            int v = ord[i];
            for (int to : adj[v]) if (!rem[to] && to != par[v]) { par[to] = v; ord.push_back(to); }
        }
        int tot = ord.size();
        for (int v : ord) sz[v] = 1;
        for (int i = tot - 1; i > 0; i--) sz[par[ord[i]]] += sz[ord[i]];
        int c = s;
        while (true) {
            int nxt = 0;
            for (int to : adj[c]) if (!rem[to] && to != par[c] && sz[to] * 2 > tot) { nxt = to; break; }
            if (!nxt) break;
            c = nxt;
        }
        vector<int> all = {0};
        for (int u : adj[c]) {
            if (rem[u]) continue;
            vector<int> lst;
            vector<int> q = {u};
            par[u] = c;
            dep[u] = 1;
            for (size_t i = 0; i < q.size(); i++) {
                int v = q[i];
                lst.push_back(dep[v]);
                for (int to : adj[v]) if (!rem[to] && to != par[v]) { par[to] = v; dep[to] = dep[v] + 1; q.push_back(to); }
            }
            ans -= pairsLE(lst);
            all.insert(all.end(), lst.begin(), lst.end());
        }
        ans += pairsLE(all);
        rem[c] = 1;
        for (int u : adj[c]) if (!rem[u]) roots.push_back(u);
    }
    printf("%lld\\n", ans);
    return 0;
}`,
  hidden: () => {
    const r = rng(6023);
    const mk = (n: number, K: number, kind: Kind) => `${n} ${K}\n${lines(tree(r, n, kind))}${n > 1 ? "\n" : ""}`;
    return [
      "1 1\n",
      "2 1\n1 2\n",
      mk(10, 3, "random"),
      mk(30, 5, "path"),
      mk(100, 8, "binary"),
      mk(1000, 20, "random"),
      mk(50000, 1, "random"),
      mk(50000, 25000, "path"),
      mk(50000, 50000, "random"),
      mk(50000, 2, "star"),
      mk(50000, 1, "star"),
      mk(50000, 15, "binary"),
      mk(50000, 100, "deep"),
      mk(50000, 700, "random"),
      mk(50000, 12000, "broom"),
    ];
  },
});

const runnerUp = P({
  slug: "runner-up-spanning-cost",
  title: "Runner-Up Spanning Cost",
  difficulty: "expert",
  rating: 2300,
  tags: ["graphs", "mst", "lca", "binary-lifting", "second-best-mst"],
  statement:
    "A weighted undirected graph has n vertices and m edges (edges may repeat; there are no self-loops). A spanning tree is a set of n - 1 edges connecting all vertices. Let W be the minimum total weight of a spanning tree. Find the minimum total weight of a spanning tree whose weight is strictly greater than W. (Different edge sets with the same weight W do not count.)",
  inputFormat: "The first line contains n and m. Each of the next m lines contains a, b, w: an edge between a and b with weight w.",
  outputFormat: "Print the smallest spanning tree weight strictly greater than W, or -1 if the graph is not connected or no spanning tree has weight above W.",
  constraints: "2 <= n <= 25000, 0 <= m <= 25000, 1 <= a, b <= n, a != b, 1 <= w <= 10^9",
  samples: [
    { input: "4 5\n1 2 1\n2 3 2\n3 4 3\n1 3 2\n1 4 5\n", output: "7\n", explanation: "W = 6. Swapping 2-3 (weight 2) for 1-3 (weight 2) keeps weight 6, so the next best is replacing 1-2 by 1-3: 7." },
    { input: "3 2\n1 2 1\n2 3 1\n", output: "-1\n", explanation: "The graph is a tree: only one spanning tree." },
  ],
  hints: [
    "A runner-up tree can be taken to differ from a minimum spanning tree T by one edge: add one non-tree edge and remove one tree edge on the cycle it creates. Which removed edge gives the smallest increase?",
    "For a non-tree edge (a, b, w), the cycle is the tree path a..b plus the edge. Removing the heaviest tree edge M on that path gives increase w - M, but if M == w the increase is 0 and does not count; then use the largest path edge strictly smaller than w.",
    "Build the MST with Kruskal, root it, and use binary lifting storing the largest and the second largest distinct weight on each 2^j jump. Query each non-tree edge's path in O(log n), merge the two top values from both sides, and take the minimum positive increase.",
  ],
  editorial: "Build an MST T with Kruskal (if fewer than n - 1 edges join, answer -1). Any strictly heavier spanning tree is at least as heavy as the best single-edge exchange with positive cost: for a non-tree edge e = (a, b, w), adding e to T creates a cycle through the tree path P(a, b); removing a path edge f of weight x gives weight W + w - x, with x <= w by the cycle property. We want the largest x < w on the path, i.e. the maximum if it is below w, otherwise the second distinct maximum. Binary lifting with (largest, second largest distinct) weights per jump yields these in O(log n) per query. The answer is W + the minimum positive increase over all non-tree edges, or -1 if none exists.\n\nComplexity: O(m log m + (n + m) log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef pair<int, int> pii;
pii mg(pii a, pii b) {
    int c[4] = {a.first, a.second, b.first, b.second};
    int x = 0, y = 0;
    for (int v : c) {
        if (v > x) { y = x; x = v; }
        else if (v < x && v > y) y = v;
    }
    return {x, y};
}
vector<int> p;
int find(int x) { while (p[x] != x) { p[x] = p[p[x]]; x = p[x]; } return x; }
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<array<int, 3>> e(m);
    for (auto &x : e) scanf("%d %d %d", &x[1], &x[2], &x[0]);
    sort(e.begin(), e.end());
    p.resize(n + 1);
    iota(p.begin(), p.end(), 0);
    vector<char> inT(m, 0);
    vector<vector<pair<int, int>>> adj(n + 1);
    ll W = 0;
    int cnt = 0;
    for (int i = 0; i < m; i++) {
        int a = find(e[i][1]), b = find(e[i][2]);
        if (a == b) continue;
        p[a] = b;
        inT[i] = 1;
        W += e[i][0];
        cnt++;
        adj[e[i][1]].push_back({e[i][2], e[i][0]});
        adj[e[i][2]].push_back({e[i][1], e[i][0]});
    }
    if (cnt != n - 1) { puts("-1"); return 0; }
    const int LOG = 15;
    vector<vector<int>> up(LOG, vector<int>(n + 1, 1)), m1(LOG, vector<int>(n + 1, 0)), m2(LOG, vector<int>(n + 1, 0));
    vector<int> dep(n + 1, 0), par(n + 1, 0), order = {1};
    for (size_t i = 0; i < order.size(); i++) {
        int v = order[i];
        for (auto [to, w] : adj[v]) if (to != par[v]) {
            par[to] = v;
            dep[to] = dep[v] + 1;
            up[0][to] = v;
            m1[0][to] = w;
            order.push_back(to);
        }
    }
    for (int j = 1; j < LOG; j++)
        for (int v = 1; v <= n; v++) {
            int mid = up[j - 1][v];
            up[j][v] = up[j - 1][mid];
            pii r = mg({m1[j - 1][v], m2[j - 1][v]}, {m1[j - 1][mid], m2[j - 1][mid]});
            m1[j][v] = r.first;
            m2[j][v] = r.second;
        }
    ll best = LLONG_MAX;
    for (int i = 0; i < m; i++) {
        if (inT[i]) continue;
        int u = e[i][1], v = e[i][2], w = e[i][0];
        pii res = {0, 0};
        if (dep[u] < dep[v]) swap(u, v);
        int diff = dep[u] - dep[v];
        for (int j = 0; j < LOG; j++) if (diff >> j & 1) { res = mg(res, {m1[j][u], m2[j][u]}); u = up[j][u]; }
        if (u != v) {
            for (int j = LOG - 1; j >= 0; j--) if (up[j][u] != up[j][v]) {
                res = mg(res, {m1[j][u], m2[j][u]});
                res = mg(res, {m1[j][v], m2[j][v]});
                u = up[j][u];
                v = up[j][v];
            }
            res = mg(res, {m1[0][u], 0});
            res = mg(res, {m1[0][v], 0});
        }
        if (res.first < w) best = min(best, (ll)w - res.first);
        else if (res.second > 0) best = min(best, (ll)w - res.second);
    }
    if (best == LLONG_MAX) puts("-1");
    else printf("%lld\\n", W + best);
    return 0;
}`,
  hidden: () => {
    const r = rng(6024);
    const mk = (n: number, m: number, maxW: number, conn: boolean, kind: Kind = "random") => gtxt(n, withW(r, graph(r, n, m, conn, kind), maxW));
    /** Connected graph where some edges are duplicated with different weights. */
    const dup = (n: number, m: number, maxW: number) => {
      const es = withW(r, graph(r, n, n - 1 + Math.floor((m - n + 1) / 2), true), maxW);
      while (es.length < m) {
        const [a, b] = es[r.int(0, es.length - 1)]!;
        es.push([a, b, r.int(1, maxW)]);
      }
      return gtxt(n, es);
    };
    return [
      "2 0\n",
      "2 2\n1 2 5\n2 1 5\n",
      "2 2\n1 2 5\n2 1 8\n",
      "3 3\n1 2 1\n2 3 1\n1 3 1\n",
      mk(6, 10, 3, true),
      mk(10, 15, 2, true),
      dup(12, 25, 4),
      mk(200, 600, 5, true),
      mk(25000, 24999, 1000000000, true),
      mk(25000, 25000, 1000000000, true),
      mk(25000, 25000, 3, true),
      mk(25000, 25000, 1000000000, true, "path"),
      mk(12000, 25000, 2, true, "deep"),
      dup(5000, 25000, 1000),
      mk(25000, 20000, 100, false),
    ];
  },
});

const raw: ProblemSeed[] = [
  leaves,
  busiest,
  islands,
  bipartite,
  hops,
  subtreeSizes,
  taskOrder,
  cheapestRoute,
  cableCost,
  treeDiameter,
  dagRoutes,
  fewestWalls,
  treeDist,
  cityPairs,
  nearestStation,
  bridgesHubs,
  indepSets,
  pathSpread,
  couponRoads,
  sccSummary,
  secondRoute,
  shortestCount,
  closePairs,
  runnerUp,
];

export const problems: ProblemSeed[] = raw.map((p) => fitBudget(p));
