/**
 * Curated links to practice problems on other judges. Every URL below was checked against the live site
 * (CSES task ids from the CSES problem set; Codeforces/AtCoder/VNOJ pages that exist). They are EXTERNAL:
 * CodeQuest does not judge them and awards no XP for them.
 */
export type Platform = "CSES" | "Codeforces" | "AtCoder" | "VNOJ";
export type ExternalProblem = { platform: Platform; title: string; url: string };

const cses = (id: number, title: string): ExternalProblem => ({ platform: "CSES", title, url: `https://cses.fi/problemset/task/${id}` });
const cf = (contest: number, index: string, title: string): ExternalProblem => ({ platform: "Codeforces", title: `${contest}${index} ${title}`, url: `https://codeforces.com/problemset/problem/${contest}/${index}` });
const ac = (contest: string, task: string, title: string): ExternalProblem => ({ platform: "AtCoder", title, url: `https://atcoder.jp/contests/${contest}/tasks/${task}` });
const vnoj = (code: string, title: string): ExternalProblem => ({ platform: "VNOJ", title, url: `https://oj.vnoi.info/problem/${code}` });

/** Keyed by unit slug. */
export const EXTERNAL_BY_UNIT: Record<string, ExternalProblem[]> = {
  "getting-started": [vnoj("post", "A cộng B (A plus B)")],
  conditionals: [cses(1068, "Weird Algorithm"), ac("abc042", "abc042_a", "Iroha and Haiku (ABC042 A)")],
  loops: [cses(1068, "Weird Algorithm"), cses(1083, "Missing Number"), cses(1069, "Repetitions")],
  functions: [cses(1070, "Permutations"), cses(1618, "Trailing Zeros")],
  arrays: [cses(1094, "Increasing Array"), cses(1083, "Missing Number"), cses(1643, "Maximum Subarray Sum"), cses(1646, "Static Range Sum Queries")],
  strings: [cf(71, "A", "Way Too Long Words"), cf(58, "A", "Chat room"), cses(1069, "Repetitions"), cses(1755, "Palindrome Reorder")],
  vectors: [cses(1621, "Distinct Numbers"), cses(1094, "Increasing Array"), cses(1070, "Permutations")],
  "sorting-searching": [cses(1621, "Distinct Numbers"), cses(1084, "Apartments"), cses(1090, "Ferris Wheel"), cses(1640, "Sum of Two Values"), cses(1074, "Stick Lengths"), ac("abc042", "abc042_b", "Iroha Loves Strings (ABC042 B)")],
  "problem-solving": [cses(1083, "Missing Number"), cses(1069, "Repetitions")],
  "prefix-two-pointers": [cses(1646, "Static Range Sum Queries"), cses(1640, "Sum of Two Values"), cses(1643, "Maximum Subarray Sum")],
  recursion: [cses(1070, "Permutations"), cses(2165, "Tower of Hanoi")],
  backtracking: [cses(1623, "Apple Division"), cses(1624, "Chessboard and Queens")],
  greedy: [cses(1629, "Movie Festival"), cses(1090, "Ferris Wheel")],
  "graph-traversal": [cses(1192, "Counting Rooms"), cses(1193, "Labyrinth"), cses(1666, "Building Roads")],
  "dp-intro": [cses(1633, "Dice Combinations"), cses(1634, "Minimizing Coins")],
  "references-pointers": [cses(1070, "Permutations"), cses(1071, "Number Spiral")],
  "stack-queue": [cses(2162, "Josephus Problem I"), cses(1645, "Nearest Smaller Values")],
  "set-map": [cses(1621, "Distinct Numbers"), cses(1619, "Restaurant Customers"), cses(1091, "Concert Tickets"), cses(1163, "Traffic Lights"), cf(44, "A", "Indian Summer")],
  "priority-queue-pairs": [cses(1164, "Room Allocation"), cses(1630, "Tasks and Deadlines"), cses(1671, "Shortest Routes I")],
};

/** Sites to browse for more, with what each is good for. */
export const PRACTICE_SITES: Array<{ platform: Platform; url: string; note: string }> = [
  { platform: "CSES", url: "https://cses.fi/problemset/", note: "The CSES Problem Set: ~300 classic problems grouped by topic. Best next step after each unit." },
  { platform: "Codeforces", url: "https://codeforces.com/problemset", note: "Filter by tag and rating (start at 800). Regular contests." },
  { platform: "AtCoder", url: "https://atcoder.jp/contests/practice", note: "AtCoder Beginner Contests are well suited to learners; the practice contest lets you test submission." },
  { platform: "VNOJ", url: "https://oj.vnoi.info", note: "VNOI Online Judge: problems in Vietnamese, including the VNOI archive and local contests." },
];

export function externalForUnit(slug: string): ExternalProblem[] {
  return EXTERNAL_BY_UNIT[slug] ?? [];
}
