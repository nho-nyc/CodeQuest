# Recommendation engine: human review (Phase 2.1)

Method: the engine was run on the local 206-problem bank for a learner who has mastered Arrays, Strings, Sorting and Searching, Stack and Queue, Set and Map and Prefix Sums and Two Pointers, has Greedy and Graph Traversal open, and has solved problems rated 800, 900 and 1000 (target 1000). Each result was judged by reading the problems' tags and metadata, not by counting overlapping tags. Verdicts are the reviewer's judgement of "would a teacher suggest this as a next step".

## Bugs this review found (all fixed, each with a regression test)
1. Generic tags (`implementation`, `math`, `simulation`, `counting`, `constructive`, `data-structures`) made unrelated problems "relevant" (e.g. a strings problem suggested for an arrays problem).
2. When the current problem had no reviewed metadata, its first tag was treated as the main skill, giving a guessed "main skill" bonus and a possible misleading "Ready".
3. Reviewed metadata without a prerequisite list inherited every tag's unit, so a DP-on-grid problem claimed "Review Graph Traversal first". Now only the primary skill's unit is claimed.
4. A Review item about a unit unrelated to the skill being practised (Greedy while practising strings) outranked on-topic related practice because of the "actionable" bonus.
Earlier in the gate (pure-ranking audit): sparse lists (116 of 206 problems had fewer than 3 suggestions for a new learner), a learning-goal bonus that could only ever apply to Review items, and a metadata-coverage bonus.

## Samples (17)
| Current (rating, metadata) | Recommended -> category | Reason shown | Appropriate? | Notes |
|---|---|---|---|---|
| running-record-highs (800, explicit arrays) | longest-equal-run, min-max-above-average, reverse-the-array -> Ready | Practises arrays, units finished | Yes | Same skill, similar level. |
| hop-counts-from-hub (1000, explicit bfs) | two-team-split, count-islands-grid, shortest-path-in-grid -> Review first | Review Graph Traversal first | Yes | Learner has not mastered the unit that BFS problems build on. shortest-path-in-grid (1500) is at the edge of the window. |
| closest-pair-sum (1100, explicit two-pointers) | one-sided-values, pair-with-given-sum -> Ready; median-and-rank -> Related | Practises two-pointers / also uses sorting | Yes | Good progression 900 -> 1200. |
| coin-combinations-count (1200, explicit dp) | neighbor-free-loot, grid-paths-around-rocks, pascal-triangle-entry -> Review first | Review Intro to DP first | Yes | Before fix 3 it also said "and Graph Traversal" for the grid problem, which was misleading. |
| next-greater-to-the-right (1000, none) | balanced-brackets, plate-stack-commands -> Related; min-bracket-insertions -> Review (derived) | also uses stack; Greedy "estimated from its topics" | Mostly | Two good stack follow-ups. The third's Greedy prerequisite is a tag-based estimate and is labelled so. |
| digit-frequency-table (800, none) | balanced-brackets, kth-char-of-expansion, most-frequent-word -> Related | also uses strings | Acceptable | Related, honestly labelled; 1100-rated items are a stretch from an 800 but within the window. |
| lexicographically-smallest-rotation (1100, none) | same three strings problems -> Related | also uses strings | Acceptable | Easier than the current problem; fine as practice. |
| lru-cache-replay (1300, none) | most-frequent-word, first-repeated-value, covered-length-timeline -> Related | also uses set-map | Yes | Hash-map practice at a lower level, sensible. |
| cheapest-route-cost (1400, none) | hop-counts-from-hub, two-team-split, count-islands-grid -> Review first | Review Graph Traversal first | Yes | Correct: shortest paths need traversal first. |
| range-product-ratio-queries (1400, none) | best-window-start, range-sum-queries -> Related; primes-in-range-queries -> Related (derived) | also uses prefix-sums / number-theory | Yes | Prefix sums is the transferable skill here. |
| window-minimum-sum (1400, none) | best-window-start, window-maximum-total, limited-spread-segment -> Related | also uses sliding-window | Yes | |
| evaluate-expression-mod (1500, none) | balanced-brackets, kth-char-of-expansion, next-greater-to-the-right -> Related | also uses strings / stack | Mostly | balanced-brackets is ideal; kth-char-of-expansion shares only "strings". |
| smallest-array-k-adjacent-swaps (1500, none) | min-bracket-insertions, cheapest-items-budget, meeting-rooms-needed -> Review first | Review Greedy first | Yes | Greedy unit is open for this learner; two of three prerequisites are estimates and say so. |
| kth-smallest-pair-sum (1900, none) | closest-pair-sum, kth-char-of-expansion, one-sided-values -> Related | also uses two-pointers / binary-search | Yes | Suggestions are far easier than the 1900 problem: they follow the learner's level, not the problem's. |
| largest-ones-rectangle (2000, none) | next-greater-to-the-right -> Related; rotate-grid-quarter-turns -> Related (missing); count-islands-grid -> Review | monotonic-stack / matrices | Mostly | The monotonic stack suggestion is the right prerequisite skill. The grid-traversal item is only loosely linked. |
| range-minimum-with-position (1300, none) | (none: only generic tags) -> falls back to Related problems list | | Yes | Honest empty state instead of weak matches. |
| two-diagonal-sums (800, explicit matrices) | rotate-grid-quarter-turns, spiral-walk-matrix -> Related (readiness unknown); heaviest-rectangle-window -> Related (derived) | shares matrices; prerequisites not mapped | Yes | Honest: no curriculum unit covers matrices. |

## Misleading prerequisite inferences still possible
- Derived (tag-estimated) prerequisites: e.g. a stack problem tagged greedy asks to review Greedy. They are labelled "estimated from its topics" and score less than explicit ones.
- `TAG_TO_UNIT` maps grids/trees/shortest-path to Graph Traversal. That mapping still shows up in the page's "Good to know first" line, which is Phase 1 behaviour and was not changed.
