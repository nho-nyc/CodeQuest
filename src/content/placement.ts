/**
 * Skills measured by the placement test. Every skill is tied to lessons that CodeQuest actually teaches, and the
 * questions are drawn from those lessons' existing question pools (never from the unit assessments), so the test
 * cannot ask about anything the curriculum does not cover.
 *
 * `units` are the units whose content the skill represents: they decide what to recommend when the skill is weak.
 */
export type SkillSource = { unit: string; lessons?: string[] };
export type SkillDef = { id: string; title: string; blurb: string; sources: SkillSource[]; units: string[]; count: number };

export const SKILLS: SkillDef[] = [
  { id: "basics", title: "Variables and conditions", blurb: "Types, arithmetic, comparisons and if / else.", sources: [{ unit: "variables-data-types" }, { unit: "operators" }, { unit: "conditionals" }], units: ["variables-data-types", "operators", "conditionals"], count: 2 },
  { id: "loops", title: "Loops", blurb: "Repeating work with for and while, and counting steps.", sources: [{ unit: "loops" }], units: ["loops"], count: 1 },
  { id: "arrays-strings", title: "Arrays and strings", blurb: "Storing, indexing and traversing sequences.", sources: [{ unit: "arrays" }, { unit: "strings" }], units: ["arrays", "strings"], count: 2 },
  { id: "brute-force", title: "Brute force thinking", blurb: "Trying every candidate and checking each one.", sources: [{ unit: "problem-solving", lessons: ["brute-force"] }], units: ["problem-solving"], count: 1 },
  { id: "complexity", title: "Estimating complexity", blurb: "Judging from the constraints whether an idea is fast enough.", sources: [{ unit: "problem-solving", lessons: ["will-it-be-fast-enough"] }], units: ["problem-solving"], count: 1 },
  { id: "prefix-sums", title: "Prefix sums", blurb: "Answering range sums with a precomputed array.", sources: [{ unit: "prefix-two-pointers", lessons: ["prefix-sums"] }], units: ["prefix-two-pointers"], count: 1 },
  { id: "two-pointers", title: "Two pointers and sliding window", blurb: "Walking two positions through an array.", sources: [{ unit: "prefix-two-pointers", lessons: ["two-pointers", "sliding-window"] }], units: ["prefix-two-pointers"], count: 2 },
  { id: "sorting-search", title: "Sorting and binary search", blurb: "std::sort, comparators and halving the search range.", sources: [{ unit: "sorting-searching" }], units: ["sorting-searching"], count: 2 },
  { id: "recursion", title: "Functions and recursion", blurb: "Writing functions, base cases and the call stack.", sources: [{ unit: "functions" }, { unit: "recursion", lessons: ["base-case-and-call-stack", "thinking-recursively"] }], units: ["functions", "recursion"], count: 2 },
  { id: "stack-queue", title: "Stack and queue", blurb: "Last-in-first-out and first-in-first-out containers.", sources: [{ unit: "stack-queue" }], units: ["stack-queue"], count: 1 },
  { id: "graphs", title: "DFS and BFS", blurb: "Exploring graphs depth-first and breadth-first.", sources: [{ unit: "graph-traversal", lessons: ["graphs-adjacency-lists", "dfs", "bfs"] }], units: ["graph-traversal"], count: 2 },
  { id: "greedy", title: "Greedy thinking", blurb: "Local best choices, and when they fail.", sources: [{ unit: "greedy", lessons: ["greedy-choice", "sort-then-greedy"] }], units: ["greedy"], count: 1 },
  { id: "dp", title: "Intro to dynamic programming", blurb: "Remembering subproblem answers.", sources: [{ unit: "dp-intro", lessons: ["memoization", "tabulation"] }], units: ["dp-intro"], count: 1 },
];

/** Question types that are quick to answer and hard to pass by luck. Long interactions (arrange / match) and 50% true-false are left out. */
export const PLACEMENT_TYPES = ["predict_output", "find_bug", "multiple_choice"] as const;
