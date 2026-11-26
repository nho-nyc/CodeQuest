import { BFS_CODE, BFS_DEFAULT, runBfs, type BfsState } from "./bfs";
import { QUEUE_CODE, QUEUE_DEFAULT, STACK_CODE, STACK_DEFAULT, runContainer, type ContainerState } from "./containers";
import type { RunResult } from "./engine";
import { SLIDING_WINDOW_CODE, SLIDING_WINDOW_DEFAULT, runSlidingWindow, type SlidingWindowState } from "./sliding-window";
import { TWO_POINTERS_CODE, TWO_POINTERS_DEFAULT, runTwoPointers, type TwoPointersState } from "./two-pointers";

export type VizState = TwoPointersState | SlidingWindowState | ContainerState | BfsState;
export type VizId = "two-pointers" | "sliding-window" | "stack" | "queue" | "bfs";

export type Field = { key: string; label: string; hint: string; multiline?: boolean };

export type Algorithm = {
  id: VizId;
  title: string;
  blurb: string;
  fields: Field[];
  defaults: Record<string, string>;
  code: string[];
  seeing: string;
  insight: string;
  time: string;
  space: string;
  complexityNote: string;
  run: (v: Record<string, string>) => RunResult<VizState>;
};

const get = (v: Record<string, string>, k: string, d: Record<string, string>) => v[k] ?? d[k] ?? "";

export const ALGORITHMS: Algorithm[] = [
  {
    id: "two-pointers",
    title: "Two Pointers",
    blurb: "Find two values in a sorted array that add up to a target.",
    fields: [
      { key: "array", label: "Sorted array", hint: "2 to 12 whole numbers, smallest first, like 1, 2, 4, 6" },
      { key: "target", label: "Target sum", hint: "A whole number. Try 10 (found at once), 12 (both pointers move) or 20 (no pair)" },
    ],
    defaults: TWO_POINTERS_DEFAULT,
    code: TWO_POINTERS_CODE,
    seeing: "Each box is one array value. L marks the left pointer and R the right pointer. The sum bar shows the two values under the pointers added together, next to the target. Faded boxes were ruled out and will never be looked at again.",
    insight: "Because the array is sorted, a sum that is too small can only be fixed by moving L right, and a sum that is too large only by moving R left. No pair is skipped by mistake.",
    time: "O(n)",
    space: "O(1)",
    complexityNote: "Each step moves a pointer inward, so there are at most n - 1 steps. Checking every pair would take O(n²).",
    run: (v) => runTwoPointers({ array: get(v, "array", TWO_POINTERS_DEFAULT), target: get(v, "target", TWO_POINTERS_DEFAULT) }),
  },
  {
    id: "sliding-window",
    title: "Sliding Window",
    blurb: "Find the largest sum of k neighbouring values by sliding a window.",
    fields: [
      { key: "array", label: "Array", hint: "2 to 14 whole numbers, like 2, 1, 5, 1, 3" },
      { key: "k", label: "Window size k", hint: "From 1 up to the array length" },
    ],
    defaults: SLIDING_WINDOW_DEFAULT,
    code: SLIDING_WINDOW_CODE,
    seeing: "The bracket around some boxes is the current window of k values. A green box has just entered it and a red dashed box has just left. Below you see the window sum and the best sum found so far.",
    insight: "Moving the window by one place changes only two values: one enters, one leaves. Updating the sum with +new -old replaces k additions with 2.",
    time: "O(n)",
    space: "O(1)",
    complexityNote: "The first window costs k, then each slide costs 2 operations. Recomputing every window from scratch would cost O(n·k).",
    run: (v) => runSlidingWindow({ array: get(v, "array", SLIDING_WINDOW_DEFAULT), k: get(v, "k", SLIDING_WINDOW_DEFAULT) }),
  },
  {
    id: "stack",
    title: "Stack",
    blurb: "Last in, first out: push, pop, top and empty.",
    fields: [{ key: "ops", label: "Operations", hint: "Separate with commas. Use: push X, pop, top, empty (up to 20 operations, 10 values stored at once)", multiline: true }],
    defaults: STACK_DEFAULT,
    code: STACK_CODE,
    seeing: "The tall box is the stack, shown on its side like a pile of plates. The top is the open end. The chips above list your operations; the highlighted one is the step you are on.",
    insight: "Only the top is reachable. Whatever you pushed last comes out first, so a stack reverses order.",
    time: "O(1) per operation",
    space: "O(n)",
    complexityNote: "push, pop, top and empty each touch only the top element, so each is constant time. Storing n values takes O(n) memory.",
    run: (v) => runContainer("stack", { ops: get(v, "ops", STACK_DEFAULT) }),
  },
  {
    id: "queue",
    title: "Queue",
    blurb: "First in, first out: push, pop, front, back and empty.",
    fields: [{ key: "ops", label: "Operations", hint: "Separate with commas. Use: push X, pop, front, back, empty (up to 20 operations, 10 values stored at once)", multiline: true }],
    defaults: QUEUE_DEFAULT,
    code: QUEUE_CODE,
    seeing: "Values wait in a row. FRONT is where values leave and BACK is where new values join. The chips above list your operations; the highlighted one is the step you are on.",
    insight: "Values leave in the order they arrived, like a line at a shop. The longest-waiting value is always the next to go.",
    time: "O(1) per operation",
    space: "O(n)",
    complexityNote: "push, pop, front, back and empty all work at the ends only, so each is constant time with std::queue. Storing n values takes O(n) memory.",
    run: (v) => runContainer("queue", { ops: get(v, "ops", QUEUE_DEFAULT) }),
  },
  {
    id: "bfs",
    title: "Breadth-First Search",
    blurb: "Explore a graph level by level and measure distances from a start vertex.",
    fields: [
      { key: "vertices", label: "Vertices", hint: "How many vertices, 2 to 8, numbered from 0" },
      { key: "edges", label: "Edges", hint: "Undirected edges like 0-1, 0-2 (up to 14)", multiline: true },
      { key: "start", label: "Start vertex", hint: "A vertex number" },
    ],
    defaults: BFS_DEFAULT,
    code: BFS_CODE,
    seeing: "Circles are vertices and lines are edges. The number inside or beside a vertex is its distance from the start. The strip below lists the queue, front first, and the order vertices were visited. The orange vertex is being processed; the thick line is the edge being looked at.",
    insight: "The queue holds vertices in order of distance. Every vertex at distance d is processed before any at d + 1, so in an unweighted graph the first time BFS reaches a vertex is by a shortest path.",
    time: "O(n + m)",
    space: "O(n)",
    complexityNote: "Each vertex enters the queue once and each edge is looked at twice (once from each end) in an undirected graph, so O(n + m) with an adjacency list.",
    run: (v) => runBfs({ vertices: get(v, "vertices", BFS_DEFAULT), edges: get(v, "edges", BFS_DEFAULT), start: get(v, "start", BFS_DEFAULT) }),
  },
];

export const ALGORITHM_BY_ID: Record<VizId, Algorithm> = Object.fromEntries(ALGORITHMS.map((a) => [a.id, a])) as Record<VizId, Algorithm>;
export const isVizId = (s: unknown): s is VizId => typeof s === "string" && s in ALGORITHM_BY_ID;

/** Lessons that link to a visualizer, keyed by lesson slug (unique across the curriculum; a test enforces it). */
export const VISUALIZER_BY_LESSON: Record<string, VizId> = {
  "two-pointers": "two-pointers",
  "sliding-window": "sliding-window",
  stack: "stack",
  queue: "queue",
  bfs: "bfs",
};
