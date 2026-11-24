import { arrange, bug, fill, match, mc, predict, progh, tf } from "../builders";
import type { UnitSeed } from "../types";

const pairsProg = progh(
  ["vector"],
  "vector<int> a = {1, 5, 3, 3};\nint k = 6;\nint count = 0;\nfor (int i = 0; i < (int)a.size(); i++) {\n    for (int j = i + 1; j < (int)a.size(); j++) {\n        if (a[i] + a[j] == k) count++;\n    }\n}\ncout << count;",
);

export const w2unit6: UnitSeed = {
  slug: "problem-solving",
  title: "Problem Solving and Brute Force",
  description: "A repeatable way to attack a problem: try everything first, then count the cost and decide if it is fast enough.",
  icon: "Search",
  lessons: [
    {
      slug: "brute-force",
      title: "Brute Force: Try Every Candidate",
      summary: "Turn a problem into 'visit every candidate and check it'.",
      content: {
        concept: "Brute force means trying every possible answer and checking each one. It is the safest first idea: easy to get right, and later it is the reference you compare faster solutions against.",
        explanation: [
          "Step 1: restate the problem in your own words and solve a tiny example by hand. If you cannot do it by hand, you cannot code it yet.",
          "Step 2: ask 'what are all the candidates?' Every pair of positions? Every number from 1 to n? Every contiguous piece of the array?",
          "Step 3: write a loop that visits each candidate, and an if that checks whether it is valid.",
          "Step 4: keep an answer variable (a counter, or a best-so-far value) and update it inside the check.",
          "Worked problem: count pairs of positions i < j with a[i] + a[j] == k. Candidates are all pairs, so use two nested loops. Starting j at i + 1 means each pair is visited once and an element is never paired with itself.",
          "Dry run for a = {1, 5, 3, 3}, k = 6: (1,5)=6 yes, (1,3)=4 no, (1,3)=4 no, (5,3)=8 no, (5,3)=8 no, (3,3)=6 yes. Count = 2.",
          "Brute force is a complete answer whenever the input is small. When it is too slow, the next lesson shows how to notice that and improve it.",
        ],
        syntax: "for (int i = 0; i < n; i++)\n    for (int j = i + 1; j < n; j++)\n        if (/* the pair is valid */) count++;",
        example: { code: pairsProg, output: "2", note: "Two pairs add up to 6: (1,5) and the two 3s." },
        commonMistakes: ["Starting j at 0, which pairs an element with itself and counts every pair twice.", "Skipping the hand example, then not knowing what the right answer should be.", "Forgetting to reset the counter or best-so-far before the loops."],
      },
      questions: [
        predict(pairsProg, ["2", "3", "4", "1"], 0, "Only (1,5) and the pair of 3s sum to 6."),
        predict(
          progh(["vector"], "vector<int> a = {4, 2, 7, 1};\nint best = 0;\nfor (int i = 0; i < 4; i++)\n    for (int j = i + 1; j < 4; j++)\n        if (a[i] + a[j] > best) best = a[i] + a[j];\ncout << best;"),
          ["11", "9", "6", "13"],
          0,
          "The largest pair sum is 4 + 7 = 11. best keeps the highest value seen so far.",
        ),
        bug(
          "This code should count pairs i < j with a[i] == a[j]. What is wrong?",
          "int count = 0;\nfor (int i = 0; i < n; i++)\n    for (int j = i; j < n; j++)\n        if (a[i] == a[j]) count++;",
          ["j starts at i, so every element is paired with itself", "The loops must go down, not up", "count must be a double", "The if needs an else"],
          0,
          "When j == i, a[i] == a[j] is always true, so n extra pairs are counted. Start j at i + 1.",
        ),
        fill("Complete the inner loop so that each pair (i, j) is visited exactly once.", progh(["vector"], "int n = 4;\nfor (int i = 0; i < n; i++)\n    for (int j = ___; j < n; j++)\n        cout << i << j << \" \";"), ["i + 1", "i+1"], "Starting at i + 1 gives i < j, so no pair repeats and none pairs with itself."),
        arrange("Arrange the lines that count how many divisors n has by trying every candidate from 1 to n.", ["int count = 0;", "for (int d = 1; d <= n; d++) {", "    if (n % d == 0) count++;", "}", "cout << count;"], "Candidates are 1..n, the check is n % d == 0, and count collects the valid ones."),
        mc("A problem asks: 'is there a pair of positions with a[i] + a[j] == k?' What are the candidates in a brute-force solution?", ["Every pair of positions", "Every single element", "Only the largest element", "Every number from 1 to k"], 0, "The answer is described by two positions, so you try all pairs."),
        tf("A brute-force solution that is correct but slow is still useful.", true, "It is a baseline for testing faster ideas and is enough when the input is small."),
      ],
    },
    {
      slug: "will-it-be-fast-enough",
      title: "Counting Steps: Will It Be Fast Enough?",
      summary: "Estimate the number of steps from the constraints and spot repeated work.",
      content: {
        concept: "Before coding an idea, estimate how many basic steps it needs. A computer does very roughly 10^8 simple steps per second, so a 1-second limit allows about 10^8 steps.",
        explanation: [
          "Count steps by looking at loops. One loop over n items is about n steps. Two nested loops over n are about n * n steps. A loop that halves the range each time takes about log2(n) steps.",
          "Match the input size to a plan: n up to 20 allows trying every subset (2^n); up to 500 allows three nested loops (n^3); up to 5000 allows two nested loops (n^2); up to 10^6 needs about n or n log n; up to 10^9 needs a formula or log n.",
          "Worked example: n = 100000 and a brute force over all pairs needs about 5 * 10^9 steps. At 10^8 steps per second that is around 50 seconds, far over a 1 second limit. You need a better idea.",
          "The best way to find a better idea is to look for repeated work. If you recompute the same quantity again and again (for instance the sum of a range), store it once and reuse it. The next unit does exactly this with prefix sums.",
          "Counts can be large. The number of pairs among 100000 items is about 5 * 10^9, which does not fit in a 32-bit int. Use long long for counters that may exceed about 2 * 10^9.",
          "The earlier lessons on nested loops and on estimating from constraints go deeper into complexity notation. Here the goal is the habit: estimate first, code second.",
        ],
        syntax: "long long steps = 0;\nfor (int i = 0; i < n; i++)\n    for (int j = i + 1; j < n; j++)\n        steps++;",
        example: { code: progh(["vector"], "int n = 5;\nlong long steps = 0;\nfor (int i = 0; i < n; i++)\n    for (int j = i + 1; j < n; j++)\n        steps++;\ncout << steps;"), output: "10", note: "n * (n - 1) / 2 = 10 pairs." },
        commonMistakes: ["Coding first and discovering later that the solution is hundreds of times too slow.", "Using int for a count of pairs when n can be 10^5.", "Forgetting that a hidden loop (such as erasing from the front of a vector) also costs steps."],
      },
      questions: [
        predict(progh(["vector"], "int n = 5;\nlong long steps = 0;\nfor (int i = 0; i < n; i++)\n    for (int j = i + 1; j < n; j++)\n        steps++;\ncout << steps;"), ["10", "25", "20", "5"], 0, "The inner loop runs 4 + 3 + 2 + 1 + 0 = 10 times."),
        predict(progh(["vector"], "int n = 4;\nint steps = 0;\nfor (int i = 0; i < n; i++)\n    for (int j = 0; j < n; j++)\n        steps++;\ncout << steps;"), ["16", "12", "8", "4"], 0, "Two full nested loops run n * n = 16 times."),
        mc("n = 100000 and the time limit is 1 second. Which plan is realistic?", ["About n log n steps", "About n squared steps", "About n cubed steps", "About 2 to the power n steps"], 0, "n log n is about 1.7 million steps. n squared is 10^10, which is far too slow."),
        mc("n = 20 and you want the best subset. Which plan can work?", ["Try all 2^n subsets", "Only an O(log n) formula works", "It is impossible", "Try n^5 steps"], 0, "2^20 is about one million, which is fast."),
        match("Match each input size with the plan that normally fits a 1 second limit.", [["n = 20", "try all subsets"], ["n = 5000", "two nested loops"], ["n = 1000000", "one pass or n log n"], ["n = 10^9", "formula or log n"]], "Guess the step count from n and keep it under about 10^8."),
        bug(
          "n can be 100000. The code counts pairs i < j. Why can it give a wrong answer?",
          "int n = 100000;\nint pairs = 0;\nfor (int i = 0; i < n; i++)\n    for (int j = i + 1; j < n; j++)\n        pairs++;",
          ["pairs is an int and the real count (about 5 * 10^9) overflows it", "j must start at 0", "The loops should use <=", "pairs needs to be a char"],
          0,
          "An int holds up to about 2.1 * 10^9. Use long long. (This code is also too slow: n^2 / 2 steps. Estimating first would have caught it.)",
        ),
        tf("If your idea needs 10^10 steps and the limit is 1 second, you should optimise the idea before coding it.", true, "About 10^8 steps per second is the usual budget, so 10^10 steps would take around 100 seconds."),
      ],
    },
    {
      slug: "problem-solving-assessment",
      kind: "assessment",
      title: "Assessment: Problem Solving",
      summary: "Show that you can plan, trace, debug and judge a brute-force solution.",
      content: {
        concept: "This checkpoint covers the two lessons in this unit: designing a brute force and estimating whether it is fast enough.",
        explanation: [
          "You will trace code, spot bugs, complete code, arrange a solution and make a decision from constraints.",
          "Nothing here needs anything beyond loops, arrays and what you just learned. Work the small examples by hand first.",
        ],
        commonMistakes: ["Starting j at the wrong index.", "Estimating steps without looking at the constraint on n."],
      },
      questions: [
        predict(progh(["vector"], "vector<int> a = {2, 4, 6, 3};\nint count = 0;\nfor (int i = 0; i < 4; i++)\n    for (int j = i + 1; j < 4; j++)\n        if ((a[i] + a[j]) % 2 == 0) count++;\ncout << count;"), ["3", "6", "2", "4"], 0, "Even sums come from two even numbers: (2,4), (2,6), (4,6). Pairs with 3 have odd sums."),
        predict(progh(["vector"], "vector<int> a = {3, 8, 2, 9};\nint best = 0;\nfor (int i = 0; i < 4; i++)\n    for (int j = i + 1; j < 4; j++)\n        if (a[j] - a[i] > best) best = a[j] - a[i];\ncout << best;"), ["7", "6", "8", "1"], 0, "The biggest increase from an earlier to a later element is 2 to 9 = 7."),
        bug(
          "The program should print the largest a[j] - a[i] with i < j, or 0 if none is positive. What goes wrong?",
          "int best = 1000000;\nfor (int i = 0; i < n; i++)\n    for (int j = i + 1; j < n; j++)\n        if (a[j] - a[i] > best) best = a[j] - a[i];",
          ["best starts too large, so the condition is never true", "j must start at 0", "The subtraction should be a[i] - a[j]", "A third loop is needed"],
          0,
          "To keep a maximum, start from a very small value (or 0 here). A huge starting best is never beaten.",
        ),
        fill("Fill the blank so the loop tries every candidate number from 2 to n - 1 as a divisor.", progh(["vector"], "int n = 12, divisors = 0;\nfor (int d = 2; d ___ n; d++)\n    if (n % d == 0) divisors++;\ncout << divisors;"), ["<"], "d should stop before n, so the condition is d < n. For n = 12 the divisors 2, 3, 4, 6 give 4."),
        arrange("Arrange the lines to count pairs i < j where a[i] == a[j].", ["long long count = 0;", "for (int i = 0; i < n; i++)", "    for (int j = i + 1; j < n; j++)", "        if (a[i] == a[j]) count++;", "cout << count;"], "Use a long long counter, visit each pair once, check equality, then print."),
        mc("n = 3000 and a brute force checks every pair once. Is it fast enough for 1 second?", ["Yes: about 4.5 million steps, far below 10^8", "No: 4.5 million steps is already too many", "No: checking pairs needs about n^3 steps", "No: about 10^10 steps"], 0, "3000 * 2999 / 2 is about 4.5 million. The budget is about 10^8 steps per second, so this is fast; n^3 would only apply to triples."),
        mc("n = 200000 and a brute force checks every pair. What should you do?", ["Look for repeated work and a faster idea", "Submit it; computers are fast", "Change int to long long to speed it up", "Compile with -O2 and submit"], 0, "About 2 * 10^10 steps is far too many. long long fixes overflow, not speed, and optimisation flags give a small constant factor, not a 200x speed-up."),
        tf("If a brute force passes all the sample tests, it will also pass the time limit.", false, "Samples are tiny. Time depends on the real constraints: always estimate the steps for the largest n."),
      ],
    },
  ],
};
