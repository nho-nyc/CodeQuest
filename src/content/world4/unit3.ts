import { arrange, bug, fill, mc, predict, progh, tf } from "../builders";
import type { UnitSeed } from "../types";

const coinBody = "int amount = 63, coins = 0;\nint denom[] = {25, 10, 5, 1};\nfor (int d : denom) {\n    coins += amount / d;\n    amount %= d;\n}\ncout << coins;";
const schedPre = "int pick(vector<pair<int,int>> iv) {\n    // pair = (end, start)\n    sort(iv.begin(), iv.end());\n    int count = 0, lastEnd = -1;\n    for (auto [e, s] : iv) {\n        if (s >= lastEnd) {\n            count++;\n            lastEnd = e;\n        }\n    }\n    return count;\n}";
const schedBody = "vector<pair<int,int>> iv = {{3, 1}, {5, 2}, {6, 4}, {7, 5}, {8, 6}};\ncout << pick(iv);";

export const w4unit3: UnitSeed = {
  slug: "greedy",
  title: "Greedy Algorithms",
  description: "Make the best local choice at each step, and learn how to tell when that is actually correct.",
  icon: "Zap",
  lessons: [
    {
      slug: "greedy-choice",
      title: "The Greedy Choice (and When It Fails)",
      summary: "Take the best option now; check with a counterexample before trusting it.",
      content: {
        concept: "A greedy algorithm builds an answer by repeatedly taking the option that looks best right now and never reconsidering. It is simple and fast, but only correct for some problems.",
        explanation: [
          "Example: pay 63 with the fewest coins using values 25, 10, 5, 1. Take as many 25s as fit (2), then 10s (1), then 5s (0), then 1s (3). That is 6 coins, and it is optimal.",
          "The same greedy idea FAILS for coins {1, 3, 4} and amount 6. Greedy takes 4 + 1 + 1 = 3 coins, but 3 + 3 = 2 coins is better. One counterexample is enough to show a greedy rule is wrong.",
          "So never trust a greedy rule just because it feels natural. Ask: 'why can taking the best-looking option never hurt?' Typical reasons: any better solution can be changed to use my choice without getting worse (an exchange argument), or the choices do not interfere with each other.",
          "Practical habit: invent a greedy rule, try to break it on small cases (or compare it with a brute force), and only then code it.",
          "When greedy fails, the problem usually needs dynamic programming, which you meet at the end of this world.",
        ],
        syntax: "for (int d : denominations_largest_first) {\n    coins += amount / d;\n    amount %= d;\n}",
        example: { code: progh(["vector"], coinBody), output: "6", note: "25 + 25 + 10 + 1 + 1 + 1" },
        commonMistakes: ["Assuming greedy is correct without testing small counterexamples.", "Greedy with coins in the wrong order (the loop must go from largest to smallest).", "Using greedy for coin systems like {1, 3, 4}."],
      },
      questions: [
        predict(progh(["vector"], coinBody), ["6", "7", "5", "8"], 0, "2 x 25 + 1 x 10 + 0 x 5 + 3 x 1 = 6 coins."),
        predict(progh(["vector"], "int amount = 6, coins = 0;\nint denom[] = {4, 3, 1};\nfor (int d : denom) {\n    coins += amount / d;\n    amount %= d;\n}\ncout << coins;"), ["3", "2", "4", "1"], 0, "Greedy takes 4, then 1, then 1: three coins, even though 3 + 3 uses only two."),
        mc("Coins {1, 3, 4}, amount 6. What is the optimal number of coins?", ["2", "3", "4", "6"], 0, "3 + 3 = 6 uses two coins."),
        mc("What does one counterexample show about a greedy rule?", ["The rule is not correct in general", "The rule is correct but slow", "The input was invalid", "Nothing"], 0, "A rule that fails even once is not a valid algorithm for the whole problem."),
        bug(
          "This greedy coin code should try the largest coin first, but gives too many coins. Why?",
          "int denom[] = {1, 5, 10, 25};\nfor (int d : denom) {\n    coins += amount / d;\n    amount %= d;\n}",
          ["It starts with the smallest coin, so 1 takes the whole amount", "amount %= d is wrong", "coins should be a double", "The loop needs an else"],
          0,
          "Greedy must try the largest value first. With 1 first, amount / 1 takes everything.",
        ),
        fill("Complete the line that removes the value covered by the d-coins from amount.", progh(["vector"], "int amount = 63, coins = 0;\nint d = 25;\ncoins += amount / d;\namount ___ d;\ncout << coins << \" \" << amount;"), ["%="], "amount %= d keeps the remainder after using as many d-coins as possible."),
        tf("If a greedy rule works on every example you try, it is guaranteed to be correct.", false, "Examples do not prove it. You need a reason (such as an exchange argument) or a brute-force comparison."),
      ],
    },
    {
      slug: "sort-then-greedy",
      title: "Sort, Then Be Greedy: Choosing Intervals",
      summary: "Pick the most non-overlapping intervals by always taking the one that ends first.",
      content: {
        concept: "Many greedy solutions first sort the data so that the best choice is always at a known place, then sweep once.",
        explanation: [
          "Problem: you have events with start and end times and can attend one at a time. Maximise the number of events attended (an event may start exactly when the previous ends).",
          "Greedy rule: sort by END time and repeatedly take the event that ends earliest among those that start after the last chosen event ends. Finishing early leaves the most room for the rest.",
          "Why it is safe: in any best answer, replace the first event by the one that ends earliest. It ends no later, so everything after it still fits. The answer is no worse.",
          "Dry run on (start,end) = (1,3) (2,5) (4,6) (5,7) (6,8). Sorted by end they stay in this order. Take (1,3), lastEnd = 3. (2,5) starts at 2 < 3: skip. (4,6) starts at 4 >= 3: take, lastEnd = 6. (5,7) starts at 5 < 6: skip. (6,8) starts at 6 >= 6: take. Answer 3.",
          "Storing pairs as (end, start) makes sort() order them by end automatically. Cost: O(n log n) for the sort plus O(n) for the sweep.",
          "Sorting by START time instead is wrong: one very long event that starts first would block many short ones.",
        ],
        syntax: "sort(iv.begin(), iv.end());            // pair = (end, start)\nfor (auto [e, s] : iv)\n    if (s >= lastEnd) { count++; lastEnd = e; }",
        example: { code: progh(["vector", "algorithm", "utility"], schedBody, schedPre), output: "3", note: "Events chosen: (1,3), (4,6), (6,8)." },
        commonMistakes: ["Sorting by start time or by length (both have counterexamples).", "Using s > lastEnd when touching events are allowed.", "Forgetting to initialise lastEnd below every start."],
      },
      questions: [
        predict(progh(["vector", "algorithm", "utility"], schedBody, schedPre), ["3", "2", "4", "5"], 0, "The earliest-end rule picks (1,3), (4,6) and (6,8)."),
        predict(progh(["vector", "algorithm", "utility"], "vector<pair<int,int>> iv = {{10, 0}, {2, 1}, {4, 3}};\ncout << pick(iv);", schedPre), ["2", "1", "3", "0"], 0, "Sorted by end: (2,1), (4,3), (10,0). The long event (0..10) loses; (1,2) and (3,4) fit together."),
        mc("Which sort order makes the interval greedy correct?", ["By end time", "By start time", "By length", "Randomly"], 0, "Ending earliest leaves the most room for future events."),
        bug(
          "Events are (start,end). This sorts by start and reports 1 for (0,10), (1,2), (3,4), where the best is 2. Why does it fail?",
          "sort(iv.begin(), iv.end());   // pair = (start, end)\n// then take an event if start >= lastEnd",
          ["The long event that starts first is taken and blocks the short ones", "sort is not stable", "lastEnd should be 1", "The pairs need three values"],
          0,
          "Starting first does not mean finishing early. Sort by end.",
        ),
        fill("Complete the condition: take the event only if it does not overlap the last chosen one (touching is allowed).", progh(["vector"], "int s = 4, e = 6, lastEnd = 4, count = 0;\nif (s ___ lastEnd) {\n    count++;\n    lastEnd = e;\n}\ncout << count;"), [">="], "An event starting at lastEnd or later fits."),
        arrange("Arrange the lines of the sweep after sorting by end.", ["int count = 0, lastEnd = -1;", "for (auto [e, s] : iv) {", "    if (s >= lastEnd) {", "        count++;", "        lastEnd = e;", "    }", "}"], "Initialise, loop, check for overlap, take and update."),
        tf("Sorting costs O(n log n), so the whole interval greedy runs in O(n log n).", true, "The sweep itself is O(n)."),
      ],
    },
    {
      slug: "greedy-assessment",
      kind: "assessment",
      title: "Assessment: Greedy",
      summary: "Decide when greedy is valid, trace it and fix it.",
      content: {
        concept: "This checkpoint covers the greedy choice, counterexamples and sorting before a sweep.",
        explanation: ["Try small counterexamples when unsure.", "No other topics are needed."],
        commonMistakes: ["Trusting a greedy rule without testing it."],
      },
      questions: [
        predict(progh(["vector"], "int amount = 41, coins = 0;\nint denom[] = {25, 10, 5, 1};\nfor (int d : denom) {\n    coins += amount / d;\n    amount %= d;\n}\ncout << coins;"), ["4", "5", "3", "6"], 0, "25 + 10 + 5 + 1 = 4 coins."),
        predict(progh(["vector", "algorithm", "utility"], "vector<pair<int,int>> iv = {{4, 1}, {3, 2}, {6, 4}, {9, 5}};\ncout << pick(iv);", schedPre), ["2", "3", "1", "4"], 0, "Sorted by end: (3,2), (4,1), (6,4), (9,5). Take (3,2); (4,1) starts 1 < 3 skip; take (6,4); (9,5) starts 5 < 6 skip. Answer 2."),
        predict(progh(["vector", "algorithm"], "vector<int> a = {5, 1, 4, 2};\nsort(a.begin(), a.end());\nint total = 0, budget = 7, items = 0;\nfor (int x : a) {\n    if (total + x > budget) break;\n    total += x;\n    items++;\n}\ncout << items;"), ["3", "2", "4", "1"], 0, "Sorted 1 2 4 5: 1+2+4 = 7 fits, adding 5 does not. Three items."),
        bug(
          "The goal is to buy as many items as possible with a budget. What makes this greedy wrong?",
          "// items not sorted\nfor (int x : a) {\n    if (total + x > budget) break;\n    total += x;\n    items++;\n}",
          ["The prices must be sorted ascending first so the cheapest are taken", "break should be continue", "budget must be a vector", "items should be a char"],
          0,
          "Taking cheapest first maximises the count; without sorting you take whatever comes first.",
        ),
        mc("Coins {1, 6, 10}, amount 12. What does 'largest coin first' give, and is it optimal?", ["10 + 1 + 1 = 3 coins, not optimal (6 + 6 = 2)", "6 + 6 = 2 coins, optimal", "10 + 1 + 1 = 3 coins, optimal", "12 coins"], 0, "A counterexample: greedy is not valid for this coin system."),
        fill("To choose as many non-overlapping events as possible, sort by ___ time.", "// sort events by ___ time", ["end", "finish"], "Earliest finish first leaves the most room."),
        arrange("Arrange the lines of greedy 'most items within budget'.", ["sort(a.begin(), a.end());", "for (int x : a) {", "    if (total + x > budget) break;", "    total += x;", "    items++;", "}"], "Sort ascending, then take items while they fit."),
        mc("n = 10^5 events: sort by end time, then one sweep. What is the total running time?", ["O(n log n)", "O(n)", "O(n^2)", "O(2^n)"], 0, "The sort costs O(n log n) and dominates the O(n) sweep."),
      ],
    },
  ],
};
