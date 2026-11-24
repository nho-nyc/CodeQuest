/**
 * Learning design of every unit: what the learner can do afterwards, which units must be mastered first
 * (the prerequisite GRAPH) and which problems in the Practice library reinforce it.
 *
 * Rules enforced by tests (src/tests/curriculum.test.ts):
 *  - prerequisites are unit slugs that come EARLIER in the global order (so the graph is a DAG);
 *  - every unit has 3+ objectives; practice slugs exist in the problem library.
 * Units without an entry here (e.g. created in the admin CMS) depend on the unit before them.
 */
export type UnitMeta = { objectives: string[]; prerequisites: string[]; practice: string[] };

export const UNIT_META: Record<string, UnitMeta> = {
  "getting-started": {
    objectives: ["Explain what a program and a compiler are", "Write, compile and run a program that prints text", "Read input with cin and print results with cout"],
    prerequisites: [],
    practice: ["hello-coder", "sum-of-two-numbers"],
  },
  "variables-data-types": {
    objectives: ["Declare and update int, long long, double, char and bool variables", "Choose a type that does not overflow", "Convert between types on purpose"],
    prerequisites: ["getting-started"],
    practice: ["sum-of-two-numbers", "seconds-to-days-clock"],
  },
  operators: {
    objectives: ["Use + - * / and % correctly, including integer division", "Combine conditions with && || !", "Predict results using operator precedence"],
    prerequisites: ["variables-data-types"],
    practice: ["count-even-numbers", "clock-after-minutes"],
  },
  conditionals: {
    objectives: ["Branch with if / else if / else", "Nest and combine conditions without duplicated logic", "Choose between switch and if chains"],
    prerequisites: ["operators"],
    practice: ["prime-or-not", "leap-years-in-range"],
  },
  loops: {
    objectives: ["Repeat work with for, while and do-while", "Control loops with break and continue", "Count the operations of nested loops"],
    prerequisites: ["conditionals"],
    practice: ["sum-of-digits", "digit-staircase", "reverse-the-digits"],
  },
  functions: {
    objectives: ["Write functions with parameters and return values", "Pass by value and by reference and tell the difference", "Read a simple recursive function"],
    prerequisites: ["loops"],
    practice: ["prime-or-not", "gcd-and-lcm-of-array"],
  },
  arrays: {
    objectives: ["Store and index data in arrays", "Traverse an array to sum, count and find a maximum", "Work with 2D arrays"],
    prerequisites: ["loops"],
    practice: ["reverse-the-array", "min-max-above-average", "two-diagonal-sums"],
  },
  strings: {
    objectives: ["Read, index and traverse std::string", "Use size, substr, find and concatenation", "Count and compare characters"],
    prerequisites: ["loops"],
    practice: ["clean-palindrome-check", "run-length-encode-string", "caesar-shift-text"],
  },
  vectors: {
    objectives: ["Grow and shrink a vector with push_back and pop_back", "Loop with indices and range-based for", "Know when a vector is better than an array"],
    prerequisites: ["arrays"],
    practice: ["running-record-highs", "rotate-array-right"],
  },
  "references-pointers": {
    objectives: ["Use references to modify arguments", "Read and use basic pointers", "Use auto and understand where variables live"],
    prerequisites: ["functions", "vectors"],
    practice: ["rotate-array-right", "robot-final-cell"],
  },
  "sorting-searching": {
    objectives: ["Sort with std::sort, including custom comparators", "Binary search a sorted array", "Explain why binary search needs sorted data"],
    prerequisites: ["vectors"],
    practice: ["sort-by-digit-sum", "median-and-rank", "first-not-smaller"],
  },
  "stack-queue": {
    objectives: ["Use stack, queue and deque and name their order rules", "Pick the container that matches a problem", "Match brackets with a stack"],
    prerequisites: ["vectors"],
    practice: ["plate-stack-commands", "balanced-brackets", "service-desk-queue"],
  },
  "set-map": {
    objectives: ["Store unique values with set", "Count and look up by key with map", "Choose between vector, set and map"],
    prerequisites: ["vectors"],
    practice: ["first-repeated-value", "most-frequent-word"],
  },
  "priority-queue-pairs": {
    objectives: ["Pull the largest or smallest item with priority_queue", "Group values with pair and tuple", "Estimate running time from constraints"],
    prerequisites: ["stack-queue", "set-map", "sorting-searching"],
    practice: ["kth-largest-so-far", "shortest-job-first-finish"],
  },
  "problem-solving": {
    objectives: ["Break a problem into candidates and a validity check", "Write a correct brute force with nested loops", "Estimate the number of steps from the constraints and reject plans that are too slow", "Choose long long when a count can overflow int"],
    prerequisites: ["loops", "arrays"],
    practice: ["longest-equal-run", "equal-value-pairs", "convert-to-base-b"],
  },
  "prefix-two-pointers": {
    objectives: ["Build a prefix sum array and answer range sums in O(1)", "Use two pointers on a sorted array to find a pair", "Maintain a sliding window of fixed or variable size", "Pick the right technique from the problem statement"],
    prerequisites: ["problem-solving", "vectors"],
    practice: ["range-sum-queries", "pair-with-given-sum", "best-window-start", "one-sided-values", "closest-pair-sum"],
  },
  recursion: {
    objectives: ["Write a recursive function with a base case and a smaller recursive call", "Trace calls and returns on the call stack", "Explain why plain recursive Fibonacci is slow", "Know when recursion is too deep and use a loop instead"],
    prerequisites: ["functions", "problem-solving"],
    practice: ["three-step-staircase", "pascal-triangle-entry", "kth-char-of-expansion"],
  },
  backtracking: {
    objectives: ["Generate all subsets with choose, explore, undo", "Generate permutations with a used array", "Prune branches that cannot lead to an answer", "Judge whether 2^n or n! is feasible for the given limits"],
    prerequisites: ["recursion", "vectors"],
    practice: ["count-subsets-with-sum-forty", "subsets-hitting-target", "independent-sets-of-size-k"],
  },
  greedy: {
    objectives: ["Describe a greedy choice and why it can be correct", "Find counterexamples to a greedy rule", "Sort first and sweep once for interval and scheduling problems", "Decide between greedy and DP"],
    prerequisites: ["sorting-searching", "problem-solving"],
    practice: ["cheapest-items-budget", "most-bookings", "boats-to-cross", "fewest-notes-chain", "largest-concatenation"],
  },
  "graph-traversal": {
    objectives: ["Represent a graph as an adjacency list", "Write DFS with a visited array and count connected components", "Write BFS with a queue and compute shortest distances", "Treat a grid as a graph"],
    prerequisites: ["stack-queue", "recursion", "vectors"],
    practice: ["count-tree-leaves", "busiest-junction", "count-islands-grid", "two-team-split", "hop-counts-from-hub", "shortest-path-in-grid"],
  },
  "dp-intro": {
    objectives: ["Define the state, transition, base case and answer of a DP", "Speed up recursion with memoization", "Fill a table bottom-up", "Recognise when greedy fails and DP is needed"],
    prerequisites: ["recursion", "greedy"],
    practice: ["three-step-staircase", "neighbor-free-loot", "fewest-coins", "grid-paths-around-rocks", "coin-combinations-count"],
  },
};
