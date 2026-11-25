/**
 * Read-only audit of the problem bank. It FLAGS suspicious metadata for a human to review; it never rewrites content.
 * Usage: npx tsx scripts/audit-problems.ts [--json]
 */
import { PROBLEMS } from "../src/content/problems";
import type { ProblemSeed } from "../src/content/problems/types";

type Flag = { slug: string; check: string; detail: string };
const flags: Flag[] = [];
const flag = (slug: string, check: string, detail: string) => flags.push({ slug, check, detail });

const BANDS: Record<string, [number, number]> = { newbie: [800, 1000], easy: [800, 1300], medium: [1200, 1800], hard: [1600, 2300], expert: [2000, 3500] };

/** Evidence a reference solution really uses the technique its tag claims. A missing signal is a flag to review, not proof. */
const SIGNALS: Record<string, RegExp> = {
  "binary-search": /lower_bound|upper_bound|binary_search|\bmid\b|\blo\b[\s\S]*\bhi\b/,
  dp: /\bdp\b|\bf\[|\bg\[|memo|\bbest\[/i,
  sorting: /\bsort\(|stable_sort|\bpriority_queue|\bset<|\bmap</,
  stack: /stack|vector<.*> *st\b|\bst\.push_back|\bst\.back/,
  "monotonic-stack": /stack|\bst\.back|\bst\.push_back/,
  heap: /priority_queue|make_heap|push_heap/,
  dsu: /\bfind\(|\bparent\b|\bpar\[|\bdsu\b|\buf\b/i,
  bfs: /queue|deque/,
  dfs: /dfs|stack|\bvisit|recurs|\bvis\[/i,
  "shortest-path": /priority_queue|dist\[|\bd\[|dijkstra|floyd/i,
  "prefix-sums": /pref|prefix|\bps\[|\bpre\[|\bs\[i *\+ *1\]|\bsum\[/i,
  "two-pointers": /\bl\b[\s\S]*\br\b|\bi\b[\s\S]*\bj\b|\blo\b[\s\S]*\bhi\b|left[\s\S]*right/,
  "sliding-window": /\bl\b[\s\S]*\br\b|window|\bj\b[\s\S]*\bi\b|\blo\b[\s\S]*\bhi\b/,
  hashing: /unordered_|\bmap<|\bset<|hash|mod|%/,
  "fenwick-tree": /fen|bit|\b&\s*-/i,
  "segment-tree": /seg|tree|\bnode\b/i,
  "bit-manipulation": /<<|>>|\^|&|__builtin|bitset/,
  matrices: /mat|\bM\b|matrix/i,
  "number-theory": /gcd|%|sieve|prime|\bmod\b/i,
  "pattern-matching": /\bfail|\bpi\[|\bz\[|\bpre\[|kmp|hash/i,
  "topological-sort": /indeg|in_deg|topo|\bdeg\[/i,
  lca: /up\[|anc|lca|\bjump/i,
  "set-map": /set<|map<|multiset/,
  queue: /queue|deque/,
  "monotonic-queue": /deque|queue/,
};

const LEAKY = /binary search|two pointers?|sliding window|prefix sums?|dynamic programming|\bdp\b|dijkstra|\bbfs\b|\bdfs\b|greedy|sort the|segment tree|fenwick|union[- ]find|\bdsu\b|topological|monotonic|hash ?map|stack|heap|priority queue/i;
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3));
const jacc = (a: Set<string>, b: Set<string>) => {
  let i = 0;
  for (const x of a) if (b.has(x)) i++;
  return i / Math.max(1, a.size + b.size - i);
};

export function editorialComplexity(p: ProblemSeed): string | null {
  const m = p.editorial.match(/O\(([^()]*(?:\([^()]*\))?[^()]*)\)/);
  return m ? m[0] : null;
}

for (const p of PROBLEMS) {
  const band = BANDS[p.difficulty]!;
  if (p.rating < band[0] || p.rating > band[1]) flag(p.slug, "difficulty-rating", `${p.difficulty} but rating ${p.rating} (expected ${band[0]}-${band[1]})`);
  if (p.tags.length === 0 || p.tags.length > 5) flag(p.slug, "tag-count", `${p.tags.length} tags`);
  for (const t of p.tags) {
    const re = SIGNALS[t];
    if (re && !re.test(p.reference)) flag(p.slug, "tag-vs-solution", `tag "${t}" has no trace in the reference solution`);
  }
  if (p.tags.length === 1 && p.tags[0] === "implementation" && p.rating >= 1500) flag(p.slug, "weak-tags", `rating ${p.rating} but only "implementation"`);
  const cx = editorialComplexity(p);
  const maxN = Math.max(0, ...[...p.constraints.matchAll(/(\d[\d,]*)(?:\s*[×x*]\s*10\^?(\d+))?|10\^(\d+)|10\^\{?(\d+)\}?/g)].map((m) => {
    if (m[3] || m[4]) return 10 ** Number(m[3] ?? m[4]);
    const base = Number(m[1]!.replace(/,/g, ""));
    return m[2] ? base * 10 ** Number(m[2]) : base;
  }));
  if (!cx) flag(p.slug, "complexity-missing", "editorial states no O(...) bound");
  else if (/O\(n\^2\)|O\(n²\)/.test(cx) && maxN >= 200_000) flag(p.slug, "complexity-vs-constraints", `editorial ${cx} but constraints reach ${maxN}`);
  const [h1, h2, h3] = p.hints;
  if (new Set(p.hints.map((h) => h.trim().toLowerCase())).size < 3) flag(p.slug, "hint-duplicate", "two hints are identical");
  if (LEAKY.test(h1)) flag(p.slug, "hint1-names-technique", h1.slice(0, 90));
  if (!LEAKY.test(h2) && !LEAKY.test(h3) && p.rating >= 1200) flag(p.slug, "hint2-no-direction", "hint 2/3 name no technique at all");
  if (/```|;\s*$|for \(|while \(|#include/.test(h1 + h2)) flag(p.slug, "hint-contains-code", "hint 1/2 contains code");
  const ed = words(p.editorial);
  for (const [i, h] of p.hints.entries()) if (jacc(words(h), ed) > 0.5) flag(p.slug, "hint-paraphrases-editorial", `hint ${i + 1} overlaps editorial ${(jacc(words(h), ed) * 100) | 0}%`);
  if (h3.length < h1.length * 0.6) flag(p.slug, "hint3-thin", `hint 3 (${h3.length} chars) is much shorter than hint 1 (${h1.length})`);
}

// near-duplicate statements: cosine on word counts
const vec = PROBLEMS.map((p) => {
  const m = new Map<string, number>();
  for (const w of p.statement.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)) if (w.length > 3) m.set(w, (m.get(w) ?? 0) + 1);
  return m;
});
const norm = vec.map((m) => Math.sqrt([...m.values()].reduce((a, b) => a + b * b, 0)));
for (let i = 0; i < PROBLEMS.length; i++) for (let j = i + 1; j < PROBLEMS.length; j++) {
  let dot = 0;
  for (const [w, c] of vec[i]!) dot += c * (vec[j]!.get(w) ?? 0);
  const cos = dot / (norm[i]! * norm[j]! || 1);
  const a = PROBLEMS[i]!, b = PROBLEMS[j]!;
  const sameTags = jacc(new Set(a.tags), new Set(b.tags));
  if (cos > 0.55 || (cos > 0.4 && sameTags === 1 && Math.abs(a.rating - b.rating) <= 100)) flag(a.slug, "near-duplicate", `${b.slug} (statement similarity ${cos.toFixed(2)}, tags ${sameTags.toFixed(2)}, ratings ${a.rating}/${b.rating})`);
}

const by: Record<string, Flag[]> = {};
for (const f of flags) (by[f.check] ??= []).push(f);
if (process.argv.includes("--json")) console.log(JSON.stringify(flags, null, 1));
else {
  console.log(`Audited ${PROBLEMS.length} problems; ${flags.length} flags for human review.\n`);
  for (const [check, list] of Object.entries(by)) {
    console.log(`## ${check} (${list.length})`);
    for (const f of list.slice(0, 40)) console.log(`  ${f.slug}: ${f.detail}`);
    if (list.length > 40) console.log(`  ... ${list.length - 40} more`);
  }
}
