import { arrange, bug, fill, mc, predict, progh, tf } from "../builders";
import type { UnitSeed } from "../types";

const subsetsPre = "vector<int> a = {1, 2, 3};\nint target = 3, ways = 0;\nvoid go(int i, int sum) {\n    if (i == (int)a.size()) {\n        if (sum == target) ways++;\n        return;\n    }\n    go(i + 1, sum);\n    go(i + 1, sum + a[i]);\n}";
const permPre = "int n = 3;\nvector<int> cur;\nvector<bool> used(4, false);\nvoid go() {\n    if ((int)cur.size() == n) {\n        for (int x : cur) cout << x;\n        cout << \" \";\n        return;\n    }\n    for (int v = 1; v <= n; v++) {\n        if (used[v]) continue;\n        used[v] = true;\n        cur.push_back(v);\n        go();\n        cur.pop_back();\n        used[v] = false;\n    }\n}";
const prunePre = "vector<int> a = {2, 3, 5, 7};\nint target = 7, ways = 0, calls = 0;\nvoid go(int i, int sum) {\n    calls++;\n    if (sum > target) return;\n    if (i == (int)a.size()) {\n        if (sum == target) ways++;\n        return;\n    }\n    go(i + 1, sum);\n    go(i + 1, sum + a[i]);\n}";

export const w4unit2: UnitSeed = {
  slug: "backtracking",
  title: "Backtracking",
  description: "Build answers one choice at a time, explore, undo the choice and try the next one.",
  icon: "GitBranch",
  lessons: [
    {
      slug: "choose-explore-undo",
      title: "Choose, Explore, Undo",
      summary: "Generate every subset by deciding take or skip for each element.",
      content: {
        concept: "Backtracking builds a solution step by step. At each step you choose an option, recursively explore what follows, and then undo the choice so the next option starts from a clean state.",
        explanation: [
          "Many problems ask for all arrangements, or whether one exists: subsets, permutations, placements. Backtracking is a brute force written as recursion.",
          "Subsets of {1, 2, 3}: for each element decide 'skip it' or 'take it'. That gives 2 * 2 * 2 = 8 subsets. The recursive function go(i, sum) considers element i and calls itself for i + 1 twice, once per decision.",
          "When i reaches the end, one complete subset has been decided: check it (here: does the sum equal the target?).",
          "Dry run for target 3 on {1, 2, 3}: subsets with sum 3 are {3} and {1, 2}. Two ways.",
          "'Undo' matters when you keep a shared structure such as a vector cur. After exploring with cur.push_back(x), call cur.pop_back() so the other branch does not see x. Passing the sum as a parameter, as here, undoes itself automatically.",
          "The number of subsets is 2^n, so this works for n up to about 20 to 25 only.",
        ],
        syntax: "void go(int i, int sum) {\n    if (i == n) { /* check */ return; }\n    go(i + 1, sum);          // skip\n    go(i + 1, sum + a[i]);   // take\n}",
        example: { code: progh(["vector"], "go(0, 0);\ncout << ways;", subsetsPre), output: "2", note: "{3} and {1, 2} sum to 3." },
        commonMistakes: ["Forgetting to undo a change to a shared vector or array.", "Missing the base case at i == n.", "Expecting it to scale to n = 100: 2^100 steps is impossible."],
      },
      questions: [
        predict(progh(["vector"], "go(0, 0);\ncout << ways;", subsetsPre), ["2", "3", "4", "1"], 0, "Only {3} and {1,2} have sum 3."),
        predict(progh(["vector"], "go(0);", "vector<int> cur;\nvoid go(int i) {\n    if (i == 2) {\n        cout << cur.size() << \" \";\n        return;\n    }\n    go(i + 1);\n    cur.push_back(i);\n    go(i + 1);\n    cur.pop_back();\n}"), ["0 1 1 2", "0 1 2", "2 1 1 0", "0 0 1 1"], 0, "Subsets of 2 items in order: skip,skip -> 0; skip,take -> 1; take,skip -> 1; take,take -> 2."),
        mc("How many subsets does a set of 5 elements have?", ["32", "10", "25", "120"], 0, "Each element is taken or skipped: 2^5 = 32."),
        bug(
          "After running go(0), cur still contains values from earlier branches. What is missing?",
          "void go(int i) {\n    if (i == n) { print(cur); return; }\n    cur.push_back(a[i]);\n    go(i + 1);\n    go(i + 1);\n}",
          ["cur.pop_back() after the first recursive call (undo the choice)", "A second base case", "A loop around go", "Nothing; it is correct"],
          0,
          "The 'skip' branch must not see a[i]. Remove it again after exploring the 'take' branch.",
        ),
        fill("Complete the 'take' branch so that the sum includes element i.", progh(["vector"], "go(0, 0);\ncout << total;", "vector<int> a = {1, 2, 3};\nint n = 3, total = 0;\nvoid go(int i, int sum) {\n    if (i == n) { total += sum; return; }\n    go(i + 1, sum);\n    go(i + 1, sum + ___);\n}"), ["a[i]"], "Taking element i adds a[i] to the running sum."),
        arrange("Arrange the lines of the choose-explore-undo pattern.", ["cur.push_back(x);", "go(i + 1);", "cur.pop_back();"], "Choose, explore, undo."),
        tf("Backtracking over all subsets is practical for n = 20 but not for n = 60.", true, "2^20 is about a million; 2^60 is far beyond any time limit."),
      ],
    },
    {
      slug: "permutations-and-pruning",
      title: "Permutations and Pruning",
      summary: "Try every order with a used[] array, and cut branches that cannot succeed.",
      content: {
        concept: "Pruning means stopping a branch as soon as you can tell it cannot lead to a valid answer. It keeps backtracking fast.",
        explanation: [
          "Permutations of 1..n: at each position try every value that is not used yet. Mark it used, recurse, then unmark it (undo). For n = 3 the order printed is 123 132 213 231 312 321.",
          "There are n! permutations (6 for n = 3, 40320 for n = 8). This is fine up to n about 9 or 10.",
          "Pruning example: count subsets of positive numbers with sum exactly target. As soon as the running sum exceeds target, no choice below can fix it (all numbers are positive), so return immediately.",
          "Take {2, 3, 5, 7} with target 7. Valid subsets: {2, 5} and {7}. The pruned search makes fewer calls than the plain one, but the answer is the same.",
          "Safe pruning never removes a valid answer. Ask: 'could any completion of this partial choice still succeed?' If the answer is no, stop.",
        ],
        syntax: "for (int v = 1; v <= n; v++) {\n    if (used[v]) continue;\n    used[v] = true; cur.push_back(v);\n    go();\n    cur.pop_back(); used[v] = false;\n}",
        example: { code: progh(["vector"], "go();", permPre), output: "123 132 213 231 312 321", note: "All 6 orders in lexicographic order." },
        commonMistakes: ["Forgetting to reset used[v] = false (undo), so later branches miss values.", "Pruning with a rule that can discard valid answers (for example when negative numbers are allowed).", "Trying permutations for n = 15."],
      },
      questions: [
        predict(progh(["vector"], "go();", permPre), ["123 132 213 231 312 321", "123 132 213 231 321 312", "321 312 231 213 132 123", "123 213 312 132 231 321"], 0, "The loop tries values in increasing order, so permutations come out in lexicographic order."),
        predict(progh(["vector"], "go(0, 0);\ncout << ways;", prunePre), ["2", "3", "1", "4"], 0, "{2,5} and {7} both sum to 7."),
        predict(progh(["vector"], "go(0, 0);\ncout << (calls < 31 ? \"pruned\" : \"full\");", prunePre), ["pruned", "full", "0", "error"], 0, "A full search would make 31 calls (1 + 2 + 4 + 8 + 16); pruning skips some, so calls < 31."),
        mc("How many permutations of 4 distinct values are there?", ["24", "16", "8", "4"], 0, "4! = 24."),
        bug(
          "The generated permutations stop after the first one. What is missing?",
          "for (int v = 1; v <= n; v++) {\n    if (used[v]) continue;\n    used[v] = true;\n    cur.push_back(v);\n    go();\n    cur.pop_back();\n}",
          ["used[v] = false after the recursive call", "A break after go()", "Starting v at 0", "A global counter"],
          0,
          "Without un-marking, every value stays used forever.",
        ),
        fill("Fill the pruning check: stop when the running sum already exceeds the target (all values are positive).", progh(["vector"], "go(0, 0);\ncout << ways;", "vector<int> a = {2, 3, 5};\nint target = 5, ways = 0;\nvoid go(int i, int sum) {\n    if (sum ___ target) return;\n    if (i == 3) { if (sum == target) ways++; return; }\n    go(i + 1, sum);\n    go(i + 1, sum + a[i]);\n}"), [">"], "Adding positive numbers can only increase the sum."),
        tf("Pruning must never discard a branch that could still contain a valid answer.", true, "Otherwise the search gives wrong answers."),
      ],
    },
    {
      slug: "backtracking-assessment",
      kind: "assessment",
      title: "Assessment: Backtracking",
      summary: "Trace a search, spot a missing undo and choose when backtracking is feasible.",
      content: {
        concept: "This checkpoint covers choose-explore-undo, permutations and pruning.",
        explanation: ["Count branches carefully; a few small cases by hand are enough.", "Only this unit and recursion are needed."],
        commonMistakes: ["Forgetting the undo step."],
      },
      questions: [
        predict(progh(["vector"], "go(0);\ncout << cnt;", "int cnt = 0;\nvoid go(int i) {\n    if (i == 3) { cnt++; return; }\n    go(i + 1);\n    go(i + 1);\n}"), ["8", "6", "3", "4"], 0, "Two choices at each of 3 levels: 2^3 = 8 leaves."),
        predict(progh(["vector"], "go();\ncout << cnt;", "int n = 3;\nvector<int> cur;\nvector<bool> used(4, false);\nint cnt = 0;\nvoid go() {\n    if ((int)cur.size() == n) { if (cur[0] < cur[2]) cnt++; return; }\n    for (int v = 1; v <= n; v++) {\n        if (used[v]) continue;\n        used[v] = true; cur.push_back(v);\n        go();\n        cur.pop_back(); used[v] = false;\n    }\n}"), ["3", "2", "6", "4"], 0, "Of the 6 permutations, those with first < last are 123, 132, 231: 3."),
        bug(
          "The program should print all subsets, but each printed subset keeps growing with items from earlier branches. What is wrong?",
          "void go(int i) {\n    if (i == n) { print(cur); return; }\n    go(i + 1);\n    cur.push_back(a[i]);\n    go(i + 1);\n}",
          ["The element is never removed after the take branch (no pop_back)", "go(i + 1) is called twice", "The base case is wrong", "print must be called first"],
          0,
          "After exploring with a[i] in cur, remove it.",
        ),
        fill("Fill the blank: all numbers are positive and you want subsets with sum exactly S. Prune when the sum is above S.", progh(["vector"], "go(0, 0);\ncout << ways;", "vector<int> a = {4, 1, 3};\nint S = 4, ways = 0;\nvoid go(int i, int sum) {\n    if (sum ___ S) return;\n    if (i == 3) { if (sum == S) ways++; return; }\n    go(i + 1, sum);\n    go(i + 1, sum + a[i]);\n}"), [">"], "A sum above S can never come back down with positive numbers."),
        arrange("Arrange a permutation search loop body (choose, explore, undo).", ["used[v] = true;", "cur.push_back(v);", "go();", "cur.pop_back();", "used[v] = false;"], "Mark, add, recurse, remove, unmark."),
        mc("You need all subsets of n = 22 elements that satisfy a condition. Is backtracking feasible?", ["Yes, about 4 million subsets", "No, 22! permutations", "No, 2^100 subsets", "Impossible to say"], 0, "2^22 is about 4.2 million; each check is cheap."),
        mc("You need all orderings of n = 14 distinct items. Is checking them all feasible in 1 second?", ["No, 14! is about 8.7 * 10^10", "Yes, 14 steps", "Yes, 2^14 steps", "Yes, 14^2 steps"], 0, "14! is far above 10^8."),
        tf("In choose-explore-undo, 'undo' restores shared state so the next choice starts clean.", true, "That is exactly its purpose."),
      ],
    },
  ],
};
