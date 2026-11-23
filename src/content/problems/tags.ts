/**
 * Canonical topic tags. Problem authors wrote tags freely ("binary search", "binary-search", "dp", "dynamic programming"...),
 * which made the topic filter long and made the same topic appear twice. Everything is normalised through here.
 */
const ALIAS: Record<string, string> = {
  "2d-prefix-sums": "prefix-sums", "difference-array": "prefix-sums", "prefix-sum": "prefix-sums", "prefix-products": "prefix-sums",
  "binary-search-on-answer": "binary-search",
  "dynamic-programming": "dp", knapsack: "dp", lis: "dp", "interval-dp": "dp", kadane: "dp", partitions: "dp",
  "fenwick-tree": "fenwick-tree", grid: "grids", sortings: "sorting",
  "monotonic-deque": "monotonic-queue", "sweep-line": "sweep-line", "offline-queries": "offline",
  "frequency-counting": "counting", bitmask: "bit-manipulation", bitset: "bit-manipulation",
  rmq: "sparse-table", "0-1-bfs": "bfs", "multi-source-bfs": "bfs", dag: "graphs", bipartite: "graphs", "flood-fill": "graphs", "state-space": "graphs",
  "low-link": "graph-connectivity", bridges: "graph-connectivity", "articulation-points": "graph-connectivity", tarjan: "graph-connectivity", scc: "graph-connectivity",
  kmp: "pattern-matching", "z-function": "pattern-matching", "prefix-function": "pattern-matching",
  eertree: "palindromes", manacher: "palindromes", "suffix-automaton": "string-structures", trie: "string-structures",
  "order-statistics": "set-map", multiset: "set-map", set: "set-map", map: "set-map",
  deque: "queue", "linked-list": "data-structures", design: "data-structures", "priority-queue": "heap",
  diameter: "trees", "tree-dp": "trees", "centroid-decomposition": "trees", "binary-lifting": "lca",
  "linear-recurrence": "matrices", "matrix-exponentiation": "matrices",
  "modular-arithmetic": "number-theory", divisors: "number-theory", factorization: "number-theory", sieve: "number-theory", totient: "number-theory", dirichlet: "number-theory",
  burnside: "combinatorics", catalan: "combinatorics",
  cipher: "strings", expression: "strings", parsing: "strings", brackets: "strings", lexicographic: "strings", periodicity: "strings",
  josephus: "simulation", loops: "implementation", scheduling: "greedy",
  dijkstra: "shortest-path", "floyd-warshall": "shortest-path", "second-best-mst": "mst", "lazy-propagation": "segment-tree",
};

export function canonicalTag(raw: string): string {
  const k = raw.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return ALIAS[k] ?? k;
}

export function canonicalTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map(canonicalTag).filter(Boolean))];
}
