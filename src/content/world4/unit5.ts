import { arrange, bug, fill, mc, predict, progh, tf } from "../builders";
import type { UnitSeed } from "../types";

const memoPre = "vector<long long> memo(60, -1);\nint calls = 0;\nlong long ways(int n) {\n    calls++;\n    if (n <= 1) return 1;\n    if (memo[n] != -1) return memo[n];\n    return memo[n] = ways(n - 1) + ways(n - 2);\n}";
const coinBody = "int coins[] = {1, 3, 4};\nint amount = 6;\nvector<int> dp(amount + 1, 1000000);\ndp[0] = 0;\nfor (int x = 1; x <= amount; x++)\n    for (int c : coins)\n        if (c <= x && dp[x - c] + 1 < dp[x])\n            dp[x] = dp[x - c] + 1;\ncout << dp[amount];";

export const w4unit5: UnitSeed = {
  slug: "dp-intro",
  title: "Dynamic Programming: First Steps",
  description: "Stop recomputing: remember subproblem answers with memoization, or fill a table bottom-up.",
  icon: "Grid3x3",
  lessons: [
    {
      slug: "memoization",
      title: "Memoization: Remember Answers",
      summary: "Add a cache to a recursive solution so each subproblem is solved once.",
      content: {
        concept: "Dynamic programming (DP) solves a problem by combining answers to overlapping subproblems and solving each subproblem only once. Memoization does it top-down: recursion plus a cache.",
        explanation: [
          "Staircase problem: you can climb 1 or 2 steps at a time. ways(n) = number of ways to reach step n. The last move was either from n - 1 or from n - 2, so ways(n) = ways(n - 1) + ways(n - 2), with ways(0) = ways(1) = 1.",
          "Plain recursion recomputes ways(3), ways(2) ... many times (the same blow-up you saw with Fibonacci).",
          "Memoization: keep memo[n], initialised to -1 ('not computed'). On entry, if memo[n] is set return it; otherwise compute, store, return.",
          "Dry run: ways(5) = ways(4) + ways(3). Values: ways(0..5) = 1 1 2 3 5 8. So ways(5) = 8, and ways(10) = 89.",
          "Four questions to design a DP: (1) What is the STATE (what does ways(n) mean)? (2) What is the TRANSITION (how does it depend on smaller states)? (3) What are the BASE cases? (4) Which state is the final ANSWER?",
          "With memoization there are only n + 1 distinct states, each computed once in O(1): total O(n), instead of exponential.",
          "Use long long: counts grow quickly.",
        ],
        syntax: "long long f(int n) {\n    if (n <= 1) return 1;\n    if (memo[n] != -1) return memo[n];\n    return memo[n] = f(n - 1) + f(n - 2);\n}",
        example: { code: progh(["vector"], "cout << ways(10);", memoPre), output: "89", note: "Each value is computed once and reused." },
        commonMistakes: ["Using 0 as 'not computed' when 0 is a valid answer.", "Forgetting to store the result before returning.", "An int memo where values overflow."],
      },
      questions: [
        predict(progh(["vector"], "cout << ways(10);", memoPre), ["89", "55", "144", "34"], 0, "ways: 1 1 2 3 5 8 13 21 34 55 89."),
        predict(progh(["vector"], "ways(10);\ncout << calls;", memoPre), ["19", "10", "177", "89"], 0, "With the cache, each of the 11 states is expanded once; 19 calls in total (versus 177 without memoization)."),
        mc("What does the memo array prevent?", ["Solving the same subproblem again", "Integer overflow", "Compile errors", "Reading input"], 0, "It stores each answer the first time it is computed."),
        bug(
          "This memoized function is still slow. Why?",
          "long long ways(int n) {\n    if (n <= 1) return 1;\n    if (memo[n] != -1) return memo[n];\n    long long r = ways(n - 1) + ways(n - 2);\n    return r;\n}",
          ["The result is never stored in memo[n]", "The base case is wrong", "n must be long long", "memo must be a set"],
          0,
          "Add memo[n] = r before returning, otherwise the cache is never filled.",
        ),
        fill("Complete the cache check.", progh(["vector"], "vector<long long> memo(3, -1);\nint n = 2;\nif (memo[n] != ___) cout << \"cached\";\nelse cout << \"compute\";"), ["-1"], "-1 means 'not computed yet'."),
        arrange("Arrange the lines of a memoized function.", ["long long ways(int n) {", "    if (n <= 1) return 1;", "    if (memo[n] != -1) return memo[n];", "    return memo[n] = ways(n - 1) + ways(n - 2);", "}"], "Base case, cache check, compute and store."),
        tf("With memoization, the staircase function runs in O(n).", true, "n + 1 states, each computed once with O(1) work."),
      ],
    },
    {
      slug: "tabulation",
      title: "Tabulation: Fill a Table Bottom-Up",
      summary: "Compute small answers first in a loop, and solve the coin problem greedy could not.",
      content: {
        concept: "Tabulation is DP without recursion: create a table dp, fill the base cases, then compute each entry from entries that are already filled.",
        explanation: [
          "Minimum coins problem: with coins {1, 3, 4}, what is the fewest coins to make amount 6? Greedy fails here (4 + 1 + 1 = 3 coins). DP gets it right.",
          "State: dp[x] = fewest coins to make exactly x. Base: dp[0] = 0. Transition: for each coin c <= x, dp[x] = min(dp[x], dp[x - c] + 1). Start every other entry at a huge value meaning 'not reachable'.",
          "Dry run: dp[0]=0; dp[1]=1; dp[2]=2; dp[3]=1 (coin 3); dp[4]=1 (coin 4); dp[5]=2 (4+1); dp[6]=2 (3+3). Answer 2.",
          "Order matters: when computing dp[x], every dp[x - c] is smaller, so it is already known. Loop x upward from 1.",
          "Cost: amount * (number of coins) steps. For amount 10^5 and 10 coins that is 10^6.",
          "Tabulation and memoization compute the same states; choose the one you find easier. Tabulation avoids deep recursion.",
        ],
        syntax: "vector<int> dp(amount + 1, INF);\ndp[0] = 0;\nfor (int x = 1; x <= amount; x++)\n    for (int c : coins)\n        if (c <= x) dp[x] = min(dp[x], dp[x - c] + 1);",
        example: { code: progh(["vector"], coinBody), output: "2", note: "3 + 3, which greedy misses." },
        commonMistakes: ["Starting dp at 0 instead of 'infinity' for min problems.", "Forgetting the check c <= x (negative index).", "Adding 1 to INF and overflowing: use a large but safe INF such as 10^9 with long long or 10^6 here."],
      },
      questions: [
        predict(progh(["vector"], coinBody), ["2", "3", "4", "6"], 0, "dp[6] = dp[3] + 1 = 2."),
        predict(progh(["vector"], "int coins[] = {1, 3, 4};\nint amount = 6;\nvector<int> dp(amount + 1, 1000000);\ndp[0] = 0;\nfor (int x = 1; x <= amount; x++)\n    for (int c : coins)\n        if (c <= x && dp[x - c] + 1 < dp[x])\n            dp[x] = dp[x - c] + 1;\ncout << dp[5] << \" \" << dp[4];"), ["2 1", "1 2", "2 2", "3 1"], 0, "dp[5] = 2 (4 + 1) and dp[4] = 1."),
        mc("In the coin DP, what does dp[x] mean?", ["The fewest coins that make exactly x", "The largest coin at most x", "The number of coins in the input", "x squared"], 0, "Define the state precisely before writing the transition."),
        bug(
          "This DP always prints 0. What is the bug?",
          "vector<int> dp(amount + 1, 0);\nfor (int x = 1; x <= amount; x++)\n    for (int c : coins)\n        if (c <= x) dp[x] = min(dp[x], dp[x - c] + 1);",
          ["dp starts at 0 for every entry, so min never improves; it should start at a large value", "The loop should go downward", "coins must be sorted", "min is not available"],
          0,
          "For a minimum, unreachable states must start at 'infinity'.",
        ),
        fill("Complete the transition.", progh(["vector", "algorithm"], "vector<int> dp = {0, 1000000, 1000000};\nint x = 1, c = 1;\ndp[x] = min(dp[x], dp[x - c] + ___);\ncout << dp[x];"), ["1"], "Using one more coin c adds 1 to the count."),
        arrange("Arrange the lines of the tabulated coin DP.", ["vector<int> dp(amount + 1, 1000000);", "dp[0] = 0;", "for (int x = 1; x <= amount; x++)", "    for (int c : coins)", "        if (c <= x) dp[x] = min(dp[x], dp[x - c] + 1);"], "Initialise, set the base, then fill upward."),
        tf("Greedy gives the optimal answer for coins {1, 3, 4} and amount 6.", false, "Greedy gives 3 coins; the DP finds 2."),
      ],
    },
    {
      slug: "dp-intro-assessment",
      kind: "assessment",
      title: "Assessment: Dynamic Programming Basics",
      summary: "Define states, trace a table, find bugs and decide when DP is needed.",
      content: {
        concept: "This checkpoint covers memoization, tabulation and the four DP design questions.",
        explanation: ["Write the state, transition and base case before coding.", "Only this unit, recursion and greedy are needed."],
        commonMistakes: ["Not defining what a state means."],
      },
      questions: [
        predict(progh(["vector"], "vector<long long> dp(8, 0);\ndp[0] = 1;\ndp[1] = 1;\nfor (int i = 2; i < 8; i++) dp[i] = dp[i - 1] + dp[i - 2];\ncout << dp[7];"), ["21", "13", "34", "8"], 0, "dp: 1 1 2 3 5 8 13 21."),
        predict(progh(["vector"], "int a[] = {3, 7, 2};\nvector<int> best(4, 0);\nfor (int i = 1; i <= 3; i++) {\n    int take = a[i - 1] + (i >= 2 ? best[i - 2] : 0);\n    best[i] = max(best[i - 1], take);\n}\ncout << best[3];"), ["7", "10", "5", "12"], 0, "best[1]=3, best[2]=7, best[3]=max(7, 2+3)=7."),
        bug(
          "The recursive function is correct but takes forever for n = 45. What is the standard fix?",
          "long long f(int n) {\n    if (n <= 1) return 1;\n    return f(n - 1) + f(n - 2);\n}",
          ["Memoize: store f(n) in an array and reuse it", "Use unsigned long long for the result", "Make n a reference parameter", "Start the recursion at n - 2"],
          0,
          "Overlapping subproblems are recomputed exponentially often.",
        ),
        fill("Fill the base case of the minimum-coins DP.", progh(["vector"], "vector<int> dp(4, 1000000);\ndp[___] = 0;\ncout << dp[0];"), ["0"], "Zero coins make the amount 0."),
        arrange("Arrange the memoization pattern.", ["if (memo[n] != -1) return memo[n];", "long long r = f(n - 1) + f(n - 2);", "memo[n] = r;", "return r;"], "Check the cache, compute, store, return."),
        mc("Which problem is the best sign you need DP rather than greedy?", ["Greedy fails on a small counterexample and subproblems overlap", "The problem asks for a minimum or maximum", "The answer is a single number", "The input is a sorted array"], 0, "Overlapping subproblems and a failing greedy rule point to DP."),
        mc("Which four things should you define when designing a DP?", ["State, transition, base case, final answer", "Variables, loops, conditions, functions", "Input, output, time, memory", "State, loop bound, array size, answer"], 0, "That checklist turns a vague idea into code."),
        mc("Coin DP with amount 10^5 and 10 coin values. Roughly how many steps?", ["About 10^6 (amount * coins)", "About 10^10 (amount squared)", "About 10 (the number of coins)", "About 2^100000 (all combinations)"], 0, "Each of the 10^5 table entries tries each of the 10 coins once."),
      ],
    },
  ],
};
