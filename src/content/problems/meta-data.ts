import type { ProblemMeta } from "./meta";

/**
 * Hand-written teaching metadata. Only problems that were reviewed against their reference solution and editorial are listed here;
 * the rest of the bank has no metadata yet and the app simply shows less for them (see `parseProblemMeta`).
 * Topics live in `tags`, difficulty in `difficulty`/`rating`: neither is repeated here. Rules are enforced by tests/problem-meta.test.ts.
 */
const m = (primarySkill: string, approach: string, timeComplexity: string, spaceComplexity: string, commonMistakes: string[]): ProblemMeta => ({
  primarySkill, approach, timeComplexity, spaceComplexity, commonMistakes,
});

export const PROBLEM_META: Record<string, ProblemMeta> = {
  "sum-of-two-numbers": m("math", "Add the two values in a 64-bit type, because 10^18 plus 10^18 overflows an int.", "O(1)", "O(1)", [
    "Reading the numbers into int, which overflows silently on large tests.",
    "Assuming the sum fits in 32 bits just because the samples are small.",
  ]),
  "seconds-to-days-clock": m("math", "Peel off days, hours, minutes and seconds with integer division and remainder, largest unit first.", "O(1)", "O(1)", [
    "Forgetting zero-padding so 5 minutes prints as 5 instead of 05.",
    "Using int for a value that reaches 10^12.",
  ]),
  "count-even-numbers": m("implementation", "Read the numbers one at a time and count those whose remainder modulo 2 is 0.", "O(n)", "O(1)", [
    "Testing x % 2 == 1 for oddness, which fails for negative numbers (the remainder is -1).",
    "Storing every number when a running counter is enough.",
  ]),
  "clock-after-minutes": m("math", "Convert the time to minutes since midnight, add m, take the result modulo 1440, then convert back.", "O(1)", "O(1)", [
    "Adding m to the hours separately and forgetting to carry minutes.",
    "Using a 32-bit integer for m, which reaches 10^15.",
    "Printing a single digit instead of two digits for hours or minutes.",
  ]),
  "prime-or-not": m("number-theory", "Trial division: a composite n has a divisor at most sqrt(n), so test divisors only up to that bound.", "O(t * sqrt(n))", "O(1)", [
    "Looping up to n instead of sqrt(n), which times out for n = 10^9.",
    "Calling 1 prime, or forgetting that 2 is prime.",
    "Computing the limit with sqrt() in floating point, which can be off by one; loop while d * d <= n instead.",
  ]),
  "leap-years-in-range": m("math", "Count leap years up to Y with Y/4 - Y/100 + Y/400 and subtract the count before the range.", "O(1)", "O(1)", [
    "Looping over every year in the range, which is too slow for 10^9 years.",
    "Forgetting the century rule or the multiple-of-400 exception.",
    "Computing f(b) - f(a) instead of f(b) - f(a - 1), which drops year a.",
  ]),
  "sum-of-digits": m("math", "Take the last digit with % 10, add it, drop it with / 10, and repeat until the number is 0.", "O(number of digits)", "O(1)", [
    "Using int for values up to 10^18.",
    "Not handling n = 0, whose answer is 0.",
  ]),
  "digit-staircase": m("implementation", "Nested loops: for each row print the leading spaces, then the digits j % 10 for j from 1 to the row number.", "O(n^2)", "O(1)", [
    "Printing 10 instead of 0 after 9; the digit is j % 10.",
    "Off-by-one in the number of leading spaces.",
  ]),
  "reverse-the-digits": m("math", "Work on the absolute value as a string, reverse it, strip leading zeros and restore the sign.", "O(number of digits)", "O(number of digits)", [
    "Leaving leading zeros, so 1200 reverses to 0021 instead of 21.",
    "Dropping the sign of negative numbers.",
  ]),
  "gcd-and-lcm-of-array": m("number-theory", "Fold the array: g = gcd(g, a_i) and l = l / gcd(l, a_i) * a_i, always dividing before multiplying.", "O(n log A)", "O(1)", [
    "Multiplying before dividing, which overflows 64 bits even though the final lcm fits.",
    "Starting the gcd at 1 instead of 0.",
  ]),
  "reverse-the-array": m("arrays", "Store the values in an array and print it from the last index to the first.", "O(n)", "O(n)", [
    "Printing a trailing space or missing separators between values.",
    "Using slow input for 10^5 numbers without disabling stream synchronisation.",
  ]),
  "min-max-above-average": m("arrays", "Track min, max and sum while reading, then count elements with a_i * n > sum to avoid floating point.", "O(n)", "O(n)", [
    "Comparing with a floating-point average and losing precision.",
    "Using a 32-bit integer for the sum or for a_i * n.",
  ]),
  "two-diagonal-sums": m("matrices", "For row i add a[i][i] to the main diagonal and a[i][n-1-i] to the anti-diagonal while reading.", "O(n^2)", "O(1)", [
    "Using n - i instead of n - 1 - i for the anti-diagonal column.",
    "Taking the difference without the absolute value.",
  ]),
  "clean-palindrome-check": m("strings", "Keep only letters and digits in lower case, then compare the cleaned text with its reverse.", "O(n)", "O(n)", [
    "Reading the line with cin >> so everything after the first space is lost; use getline.",
    "Comparing the raw text without removing spaces and punctuation or ignoring case.",
  ]),
  "run-length-encode-string": m("strings", "Scan with a pointer, extend while the letter repeats, then append the letter and the run length.", "O(n)", "O(n)", [
    "Writing the count as a single character, which breaks for runs of 10 or more.",
    "Forgetting to flush the final run after the loop.",
  ]),
  "caesar-shift-text": m("strings", "Reduce k to 0..25 with ((k % 26) + 26) % 26, then rotate each letter inside its own case and copy other characters.", "O(n)", "O(n)", [
    "Applying a negative k directly, because C++ gives a negative remainder.",
    "Reading the text with cin >> so spaces are lost; use getline.",
    "Shifting punctuation or digits.",
  ]),
  "running-record-highs": m("arrays", "Scan left to right, keeping the maximum so far; each element strictly greater than it is a new record.", "O(n)", "O(1)", [
    "Counting equal values as records.",
    "Starting the maximum at 0, which fails when every temperature is negative.",
  ]),
  "rotate-array-right": m("arrays", "Only k modulo n matters; element i after the rotation is a[(i - s + n) mod n].", "O(n)", "O(n)", [
    "Simulating k steps, which is impossible for k up to 10^18.",
    "Reading k into an int.",
    "A negative index from (i - s) % n; add n first.",
  ]),
  "robot-final-cell": m("simulation", "Simulate each command, checking bounds and walls, and count a cell the first time it is visited.", "O(h*w + length of commands)", "O(h*w)", [
    "Counting the start cell twice or not at all.",
    "Moving into a wall instead of counting the command as blocked.",
  ]),
  "sort-by-digit-sum": m("sorting", "Sort with a comparator on the pair (digit sum, value), so ties on the digit sum are broken by the number itself.", "O(n log n)", "O(n)", [
    "Forgetting the tie-break, which leaves equal digit sums in arbitrary order.",
    "A comparator that uses <= and is not a strict weak ordering.",
  ]),
  "median-and-rank": m("sorting", "Sort, take the element at index (n - 1) / 2, and count strictly smaller elements.", "O(n log n)", "O(n)", [
    "Counting elements <= the median, which is wrong with duplicates.",
    "Using n / 2 instead of (n - 1) / 2 for even n.",
  ]),
  "first-not-smaller": m("binary-search", "Binary search for the first position whose value is >= x; lower_bound does exactly this.", "O((n + q) log n)", "O(n)", [
    "Using upper_bound, which finds the first element strictly greater than x.",
    "Printing a 0-indexed position when the answer is 1-indexed.",
    "Scanning linearly for every query, which is O(n * q).",
  ]),
  "plate-stack-commands": m("stack", "Simulate with a stack: PUSH appends, POP removes the last element, TOP reads it, checking emptiness first.", "O(q)", "O(q)", [
    "Popping or reading the top of an empty stack.",
    "Reading a number after commands that do not have one.",
  ]),
  "balanced-brackets": m("stack", "Push opening brackets; each closing bracket must match the top of the stack, and the stack must end empty.", "O(|s|)", "O(|s|)", [
    "Reading the top of an empty stack when the string starts with a closing bracket.",
    "Forgetting that the stack must be empty at the end.",
    "Only counting brackets per type instead of checking their order.",
  ]),
  "service-desk-queue": m("queue", "Simulate a FIFO queue: ARRIVE pushes the name, SERVE pops the front, checking for an empty queue.", "O(q)", "O(q)", [
    "Serving from the back instead of the front.",
    "Reading the front of an empty queue.",
  ]),
  "first-repeated-value": m("set-map", "Keep a set of values seen so far; the first value already in the set is the answer.", "O(n log n)", "O(n)", [
    "Printing the value whose first occurrence is earliest, instead of the value whose second occurrence comes first.",
    "Forgetting to print -1 when nothing repeats.",
  ]),
  "most-frequent-word": m("set-map", "Count words in a map, then scan it in key order and replace the best only on a strictly larger count.", "O(n log n * L)", "O(n * L)", [
    "Replacing on equal counts, which picks the lexicographically largest word instead of the smallest.",
    "Sorting by count alone and ignoring the tie-break.",
  ]),
  "kth-largest-so-far": m("heap", "Keep the k largest values in a min-heap; after each arrival its top is the k-th largest.", "O(n log k)", "O(k)", [
    "Re-sorting the whole prefix after every number.",
    "Using a max-heap, whose top is the largest rather than the k-th largest.",
    "Printing a value before k numbers have arrived instead of -1.",
  ]),
  "shortest-job-first-finish": m("heap", "Sort by arrival, keep a min-heap of arrived jobs keyed by (duration, index), and jump the clock when the heap is empty.", "O(n log n)", "O(n)", [
    "Not jumping the clock forward when the machine is idle.",
    "Breaking duration ties arbitrarily instead of by input order.",
  ]),
  "longest-equal-run": m("arrays", "One pass keeping the length of the current run, resetting it to 1 when the value changes.", "O(n)", "O(1)", [
    "Starting the counter at 0, so a run of one element counts as 0.",
    "Forgetting to update the best after the final element.",
  ]),
  "equal-value-pairs": m("counting", "Count occurrences of each value; a value seen c times contributes c * (c - 1) / 2 pairs.", "O(n + max a)", "O(max a)", [
    "Checking every pair, which is O(n^2).",
    "Storing the answer in an int although it can reach about 3.2 * 10^9.",
  ]),
  "convert-to-base-b": m("math", "Repeatedly take n % b as the next digit and divide by b, then reverse the collected digits.", "O(log n)", "O(log n)", [
    "Printing the digits in the wrong order.",
    "Not handling n = 0, which must print 0.",
    "Printing 10 or more as a number instead of a letter.",
  ]),
  "range-sum-queries": m("prefix-sums", "Precompute p[i] as the sum of the first i elements; each query is p[r] - p[l - 1].", "O(n + q)", "O(n)", [
    "Summing the range for every query, which is O(n * q).",
    "Using an int for sums up to 2 * 10^14.",
    "Off-by-one with 1-indexed ranges: it is p[l - 1], not p[l].",
  ]),
  "pair-with-given-sum": m("two-pointers", "Sort, then walk two pointers inward: move the left pointer when the sum is too small, the right when it is too large.", "O(n log n)", "O(n)", [
    "Checking every pair, which is O(n^2).",
    "Letting both pointers land on the same element so one value is used twice.",
    "Overflowing int when adding two values near 10^9.",
  ]),
  "best-window-start": m("sliding-window", "Compute the first window sum, then slide by adding the new element and removing the one that leaves.", "O(n)", "O(n)", [
    "Recomputing every window from scratch, which is O(n * k).",
    "Updating the best on ties, which moves the answer to a later start.",
  ]),
  "one-sided-values": m("two-pointers", "Merge the two already sorted lists with two pointers, dropping values that occur in both.", "O(n + m)", "O(n + m)", [
    "Not skipping duplicates inside one array.",
    "Sorting or using a set although the input is already sorted.",
  ]),
  "closest-pair-sum": m("two-pointers", "After sorting, move the left pointer when the sum is below x and the right when above, tracking the best (distance, sum).", "O(n log n)", "O(n)", [
    "Ignoring the tie-break and printing the larger sum when distances are equal.",
    "Comparing sums instead of distances to x.",
  ]),
  "three-step-staircase": m("dp", "Every way ends with a step of 1, 2 or 3, so ways[i] = ways[i-1] + ways[i-2] + ways[i-3] with ways[0] = 1.", "O(n)", "O(n)", [
    "Plain recursion without memoisation, which is exponential.",
    "Reading ways[-1] for small i instead of treating missing terms as 0.",
  ]),
  "pascal-triangle-entry": m("dp", "Build the triangle row by row with C[i][j] = C[i-1][j-1] + C[i-1][j].", "O(n^2)", "O(n^2)", [
    "Using int, which overflows well before row 60.",
    "Forgetting the borders C[i][0] = C[i][i] = 1.",
  ]),
  "kth-char-of-expansion": m("binary-search", "Prefix sums of the block lengths are sorted; the k-th character is in the first block whose prefix sum is >= k.", "O((m + q) log m)", "O(m)", [
    "Building the expanded string, which can be 10^13 characters long.",
    "Using int for prefix sums that reach 2.5 * 10^13.",
  ]),
  "count-subsets-with-sum-forty": m("meet-in-the-middle", "Split the coins in half, list the 2^20 subset sums of each half, sort them, and count matching pairs with two pointers.", "O(2^(n/2) * n/2)", "O(2^(n/2))", [
    "Enumerating all 2^40 subsets.",
    "Trying a knapsack table when S reaches 4 * 10^10.",
    "Counting each pair once instead of multiplying the sizes of equal runs.",
  ]),
  "subsets-hitting-target": m("dp", "0/1 knapsack counting: dp[s] += dp[s - x] for each element x, iterating s downwards so x is used once.", "O(nS)", "O(S)", [
    "Iterating s upwards, which allows an element to be used several times.",
    "Not taking the result modulo the given prime.",
  ]),
  "cheapest-items-budget": m("greedy", "Sort prices ascending and buy greedily from the cheapest while the running total stays within the budget.", "O(n log n)", "O(n)", [
    "Picking items in input order instead of sorted order.",
    "Using int for sums that reach 5 * 10^13.",
  ]),
  "most-bookings": m("greedy", "Sort by end time and accept every interval that starts no earlier than the last accepted end.", "O(n log n)", "O(n)", [
    "Sorting by start time or by length, which is not optimal.",
    "Rejecting an interval that starts exactly when the previous one ends.",
  ]),
  "boats-to-cross": m("greedy", "Sort, then always send the heaviest person and pair them with the lightest if that fits.", "O(n log n)", "O(n)", [
    "Pairing greedily from the lightest without handling the heaviest first.",
    "Pairing two people whose total weight exceeds C.",
  ]),
  "fewest-notes-chain": m("greedy", "Because each denomination divides the next, take as many of the largest note as possible and continue with the remainder.", "O(k)", "O(k)", [
    "Assuming greedy works for any set of denominations; it relies on the divisibility chain.",
    "Using int for amounts up to 10^18.",
  ]),
  "largest-concatenation": m("greedy", "Sort the numbers as strings with the comparator a + b > b + a and concatenate.", "O(n log n * L)", "O(n * L)", [
    "Sorting by numeric value or by length.",
    "Printing 0000 instead of 0 when every number is 0.",
  ]),
  "count-tree-leaves": m("graphs", "Count the degree of each vertex while reading the edges; leaves are the vertices of degree 1.", "O(n)", "O(n)", [
    "Rooting the tree and special-casing vertex 1; a leaf is simply any vertex with exactly one edge.",
    "Building a full adjacency structure when degrees are enough.",
  ]),
  "busiest-junction": m("graphs", "Compute every degree while reading, then scan vertices in order and update only on a strictly larger degree.", "O(n + m)", "O(n)", [
    "Updating on ties, which picks the largest index instead of the smallest.",
    "Not handling m = 0, where the answer is vertex 1 with degree 0.",
  ]),
  "two-team-split": m("bfs", "Two-colour the graph with BFS from every unvisited vertex; an edge between equal colours means NO.", "O(n + m)", "O(n + m)", [
    "Starting the search only from vertex 1 and missing other components.",
    "Not checking edges to already coloured vertices.",
  ]),
  "hop-counts-from-hub": m("bfs", "Run BFS from vertex 1 on the directed graph; the first visit gives the shortest hop count.", "O(n + m)", "O(n + m)", [
    "Treating the links as undirected.",
    "Using DFS, which does not find shortest paths.",
    "Printing 0 instead of -1 for unreachable vertices.",
  ]),
  "count-islands-grid": m("graphs", "Scan the grid; at each unvisited land cell count one island and flood-fill its cells.", "O(n * m)", "O(n * m)", [
    "Deep recursion on a 600 x 600 grid, which overflows the call stack.",
    "Counting diagonal neighbours as connected.",
  ]),
  "shortest-path-in-grid": m("bfs", "Run BFS from the start cell over free neighbours; the first time the target is reached is the shortest distance.", "O(n * m)", "O(n * m)", [
    "Using DFS, which does not give shortest paths.",
    "Recursive search on a grid of 10^6 cells.",
    "Printing 0 instead of -1 when the target is unreachable.",
  ]),
  "neighbor-free-loot": m("dp", "best[i] = max(best[i-1], best[i-2] + a[i]): either skip the last house or take it and skip its neighbour.", "O(n)", "O(1)", [
    "Greedily taking the largest values, which can block better combinations.",
    "Using int for sums that reach 2.5 * 10^13.",
  ]),
  "fewest-coins": m("dp", "dp[v] is the fewest coins for amount v: the minimum over coins c of dp[v - c] + 1, with infinity for unreachable.", "O(n * x)", "O(x)", [
    "Taking the largest coin first, which fails for coins like 1, 3, 4.",
    "Recursion without memoisation, which is exponential.",
    "Treating an unreachable amount as 0 instead of printing -1.",
  ]),
  "grid-paths-around-rocks": m("dp", "ways[i][j] is the sum of the cell above and the cell to the left, or 0 for a rock.", "O(nm)", "O(nm)", [
    "Forgetting to reduce modulo the prime after each addition.",
    "Setting ways to 1 for the start cell even when it is a rock.",
  ]),
  "coin-combinations-count": m("dp", "Put the coin loop outside and the target loop inside: dp[t] += dp[t - c], so each combination is counted once.", "O(n T)", "O(T)", [
    "Putting the target loop outside, which counts ordered sequences instead of combinations.",
    "Forgetting dp[0] = 1.",
    "Not reducing modulo 1000000007.",
  ]),
};
