import { finishTrace, parseIntField, type RunResult, type Step } from "./engine";

export type BfsState = {
  kind: "bfs";
  n: number;
  /** Undirected edges as [smaller, larger]. */
  edges: Array<[number, number]>;
  adj: number[][];
  start: number;
  queue: number[];
  /** dist[v] is -1 until v is discovered. */
  dist: number[];
  order: number[];
  current: number | null;
  /** Edge being looked at right now. */
  exploring: [number, number] | null;
  discovered: number | null;
  /** Vertices whose neighbours are all processed. */
  finished: number[];
  phase: "start" | "pop" | "look-new" | "look-seen" | "finish" | "done";
};

export const BFS_CODE = [
  "vector<int> dist(n, -1);",
  "queue<int> q;",
  "dist[s] = 0; q.push(s);",
  "while (!q.empty()) {",
  "    int u = q.front(); q.pop();",
  "    for (int v : adj[u]) {",
  "        if (dist[v] == -1) {",
  "            dist[v] = dist[u] + 1;",
  "            q.push(v);",
  "        }",
  "    }",
  "}",
];

export const BFS_DEFAULT = { vertices: "7", edges: "0-1, 0-2, 1-3, 1-4, 2-5, 4-6, 5-6", start: "0" };
export const MAX_VERTICES = 8;
export const MAX_EDGES = 14;

export function parseGraph(vertices: string, edges: string): { ok: true; n: number; edges: Array<[number, number]> } | { ok: false; errors: string[] } {
  const nf = parseIntField(vertices, { lo: 2, hi: MAX_VERTICES, label: "Vertices" });
  if (!nf.ok) return { ok: false, errors: [nf.error] };
  const n = nf.value;
  const parts = edges.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { ok: false, errors: ["Edges: enter at least one edge written like 0-1, separated by commas."] };
  if (parts.length > MAX_EDGES) return { ok: false, errors: [`Edges: use at most ${MAX_EDGES} edges (you gave ${parts.length}).`] };
  const seen = new Set<string>();
  const out: Array<[number, number]> = [];
  for (const p of parts) {
    const m = /^(\d+)\s*-\s*(\d+)$/.exec(p);
    if (!m) return { ok: false, errors: [`Edges: "${p.slice(0, 15)}" is not an edge. Write two vertex numbers with a dash, like 2-5.`] };
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a >= n || b >= n) return { ok: false, errors: [`Edges: ${p} uses a vertex that does not exist. Vertices are numbered 0 to ${n - 1}.`] };
    if (a === b) return { ok: false, errors: [`Edges: ${p} connects a vertex to itself, which BFS does not need.`] };
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (seen.has(key)) return { ok: false, errors: [`Edges: ${key} is listed twice. Each undirected edge only needs to appear once.`] };
    seen.add(key);
    out.push([Math.min(a, b), Math.max(a, b)]);
  }
  return { ok: true, n, edges: out };
}

export function runBfs(input: { vertices: string; edges: string; start: string }): RunResult<BfsState> {
  const g = parseGraph(input.vertices, input.edges);
  if (!g.ok) return { ok: false, errors: g.errors };
  const sf = parseIntField(input.start, { lo: 0, hi: g.n - 1, label: "Start vertex" });
  if (!sf.ok) return { ok: false, errors: [sf.error] };
  const { n, edges } = g;
  const s = sf.value;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    adj[a]!.push(b);
    adj[b]!.push(a);
  }
  adj.forEach((l) => l.sort((x, y) => x - y));
  const dist = Array<number>(n).fill(-1);
  const queue: number[] = [];
  const order: number[] = [];
  const finished: number[] = [];
  const steps: Step<BfsState>[] = [];
  const snap = (phase: BfsState["phase"], o: Partial<BfsState> = {}): BfsState => ({ kind: "bfs", n, edges, adj, start: s, queue: [...queue], dist: [...dist], order: [...order], current: null, exploring: null, discovered: null, finished: [...finished], phase, ...o });

  steps.push({ state: snap("start"), line: 0, tone: "info", what: `Start BFS from vertex ${s}. dist[v] = -1 means "not discovered yet".`, why: "BFS needs to remember which vertices it has already found, so no vertex is processed twice. dist does that and also stores the distance.", notice: "dist[v] = -1 is the 'visited' check." });
  dist[s] = 0;
  queue.push(s);
  steps.push({ state: snap("start", { discovered: s }), line: 2, tone: "good", what: `Set dist[${s}] = 0 and put ${s} in the queue.`, why: "The start is 0 steps from itself. The queue holds vertices that are discovered but whose neighbours we have not looked at yet.", notice: "The queue is the to-do list." });

  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    steps.push({ state: snap("pop", { current: u }), line: 4, tone: "info", what: `Take ${u} from the front of the queue (distance ${dist[u]}). Now look at all its neighbours: ${adj[u]!.length ? adj[u]!.join(", ") : "none"}.`, why: "The front of the queue is the vertex that was discovered earliest. Always taking the earliest first is what makes the search spread outwards level by level.", notice: "Distances in the queue never decrease: all distance-d vertices come before distance d+1." });
    for (const v of adj[u]!) {
      const edge: [number, number] = [Math.min(u, v), Math.max(u, v)];
      if (dist[v] === -1) {
        dist[v] = dist[u]! + 1;
        queue.push(v);
        steps.push({ state: snap("look-new", { current: u, exploring: edge, discovered: v }), line: 7, tone: "good", what: `Edge ${u}-${v}: ${v} is new. Set dist[${v}] = dist[${u}] + 1 = ${dist[v]} and add ${v} to the back of the queue.`, why: `We reached ${v} from ${u}, which is ${dist[u]} steps away, so ${v} is ${dist[v]} steps away. Because we process vertices in order of distance, this first time we see ${v} is also the shortest way to it.`, notice: "A vertex is discovered once and never updated again." });
      } else {
        steps.push({ state: snap("look-seen", { current: u, exploring: edge }), line: 6, tone: "info", what: `Edge ${u}-${v}: ${v} was already discovered (dist ${dist[v]}), so skip it.`, why: `${v} is already in the queue or done, with an equal or shorter distance. Adding it again would repeat work and could create an endless loop in a graph with cycles.`, notice: "The dist check is what stops BFS from going in circles." });
      }
    }
    finished.push(u);
    steps.push({ state: snap("finish", { current: u }), line: 10, tone: "info", what: `All neighbours of ${u} are handled. ${queue.length ? `Queue now: ${queue.join(", ")}.` : "The queue is empty."}`, why: "A vertex is finished once every neighbour has been looked at." });
  }
  const unreached = dist.map((d, v) => (d === -1 ? v : -1)).filter((v) => v >= 0);
  steps.push({ state: snap("done"), line: 11, tone: "good", what: `The queue is empty, so BFS is done. Visit order: ${order.join(", ")}.${unreached.length ? ` Not reachable from ${s}: ${unreached.join(", ")}.` : ""}`, why: unreached.length ? "Vertices with dist -1 are in a different connected component: no path from the start reaches them." : "Every vertex was reached. The distances are the minimum number of edges from the start.", notice: "In an unweighted graph, BFS gives shortest paths: it finishes all vertices at distance d before any at d + 1." });
  return finishTrace(steps);
}
