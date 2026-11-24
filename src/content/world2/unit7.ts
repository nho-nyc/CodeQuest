import { arrange, bug, fill, mc, predict, progh, tf } from "../builders";
import type { UnitSeed } from "../types";

const prefixProg = progh(
  ["vector"],
  "vector<int> a = {3, 1, 4, 1, 5};\nint n = a.size();\nvector<int> pre(n + 1, 0);\nfor (int i = 0; i < n; i++) pre[i + 1] = pre[i] + a[i];\nint l = 1, r = 3;\ncout << pre[r + 1] - pre[l];",
);
const twoPtrProg = progh(
  ["vector"],
  "vector<int> a = {1, 2, 4, 7, 11};\nint target = 9;\nint l = 0, r = (int)a.size() - 1;\nwhile (l < r) {\n    int s = a[l] + a[r];\n    if (s == target) {\n        cout << a[l] << \" \" << a[r];\n        break;\n    }\n    if (s < target) l++;\n    else r--;\n}",
);
const windowProg = progh(
  ["vector"],
  "vector<int> a = {2, 1, 5, 1, 3, 2};\nint k = 3;\nint sum = 0;\nfor (int i = 0; i < k; i++) sum += a[i];\nint best = sum;\nfor (int i = k; i < (int)a.size(); i++) {\n    sum += a[i] - a[i - k];\n    if (sum > best) best = sum;\n}\ncout << best;",
);

export const w2unit7: UnitSeed = {
  slug: "prefix-two-pointers",
  title: "Prefix Sums and Two Pointers",
  description: "Two classic ways to remove repeated work: precompute running totals, and walk two positions through an array.",
  icon: "Ruler",
  lessons: [
    {
      slug: "prefix-sums",
      title: "Prefix Sums: Range Sums in O(1)",
      summary: "Precompute running totals so any range sum is one subtraction.",
      content: {
        concept: "A prefix sum array stores the total of the first i elements. With it, the sum of any range is the difference of two stored values, so each query costs O(1) after O(n) preparation.",
        explanation: [
          "The problem: you have an array and many questions 'what is the sum of a[l..r]?'. Looping for every question costs O(n) each, so q questions cost O(n * q). With n = q = 10^5 that is 10^10 steps.",
          "The idea: build pre of size n + 1 where pre[0] = 0 and pre[i + 1] = pre[i] + a[i]. Then pre[i] is the sum of the first i elements.",
          "The sum of a[l..r] (0-indexed, both ends included) is pre[r + 1] - pre[l]. The big total includes everything up to r; subtracting pre[l] removes everything before l.",
          "Dry run for a = {3, 1, 4, 1, 5}: pre = {0, 3, 4, 8, 9, 14}. For l = 1, r = 3: pre[4] - pre[1] = 9 - 3 = 6, and indeed 1 + 4 + 1 = 6.",
          "Building takes O(n) once. Every query is then O(1). Total O(n + q).",
          "Use long long for pre when the total can exceed about 2 * 10^9.",
        ],
        syntax: "vector<long long> pre(n + 1, 0);\nfor (int i = 0; i < n; i++) pre[i + 1] = pre[i] + a[i];\n// sum of a[l..r] = pre[r + 1] - pre[l]",
        example: { code: prefixProg, output: "6", note: "Sum of a[1..3] = 1 + 4 + 1." },
        commonMistakes: ["Making pre the same size as a and losing the leading 0 (so a range starting at index 0 breaks).", "Writing pre[r] - pre[l], which leaves out a[r].", "Using int when sums can be huge."],
      },
      questions: [
        predict(prefixProg, ["6", "5", "9", "4"], 0, "pre[4] - pre[1] = 9 - 3 = 6."),
        predict(progh(["vector"], "vector<int> a = {2, 2, 2, 2};\nvector<int> pre(5, 0);\nfor (int i = 0; i < 4; i++) pre[i + 1] = pre[i] + a[i];\ncout << pre[4] << \" \" << pre[2];"), ["8 4", "8 2", "4 8", "6 4"], 0, "pre holds 0 2 4 6 8, so pre[4] = 8 and pre[2] = 4."),
        fill("Complete the formula for the sum of a[l..r] (both included).", progh(["vector"], "vector<int> pre = {0, 3, 4, 8, 9, 14};\nint l = 2, r = 4;\ncout << pre[___] - pre[l];"), ["r + 1", "r+1"], "The range includes r, so use pre[r + 1]. Here 14 - 4 = 10 (4 + 1 + 5)."),
        bug(
          "This should print the sum of a[l..r] using the prefix array pre. What is wrong?",
          "cout << pre[r] - pre[l];",
          ["It leaves out a[r]; it should be pre[r + 1] - pre[l]", "It should add instead of subtract", "pre must be sorted first", "l and r must be swapped"],
          0,
          "pre[r] is the sum of the first r elements, which stops before a[r].",
        ),
        arrange("Arrange the lines that build a prefix sum array from a vector a of size n.", ["vector<long long> pre(n + 1, 0);", "for (int i = 0; i < n; i++) {", "    pre[i + 1] = pre[i] + a[i];", "}"], "Start with pre[0] = 0 and extend one element at a time."),
        mc("n = 100000 and q = 100000 range-sum questions. What is the cost with prefix sums?", ["About n + q steps", "About n * q steps", "About n squared steps", "About 2^n steps"], 0, "One O(n) build and q O(1) queries."),
        tf("The prefix array needs n + 1 entries so that pre[0] can be 0.", true, "pre[0] = 0 is the sum of zero elements and lets ranges starting at index 0 work."),
      ],
    },
    {
      slug: "two-pointers",
      title: "Two Pointers on a Sorted Array",
      summary: "Move a left and a right pointer towards each other instead of checking every pair.",
      content: {
        concept: "Two pointers keep two positions in an array and move them using a rule, so that a problem that would check all pairs is solved in a single pass.",
        explanation: [
          "Problem: given a SORTED array and a target, is there a pair with a[l] + a[r] == target? Brute force checks all pairs: O(n^2).",
          "Put l at the start and r at the end. Look at s = a[l] + a[r]. If s equals the target you are done.",
          "If s is too small, the only way to increase it is to move l right (the next value is larger or equal). If s is too big, move r left. You never have to look back, because the discarded value cannot be part of an answer.",
          "Dry run for a = {1, 2, 4, 7, 11}, target 9: l=0,r=4: 1+11=12 too big, r-- . 1+7=8 too small, l++. 2+7=9 found.",
          "Every step moves a pointer, so the loop runs at most n times: O(n).",
          "This only works because the array is sorted. If it is not, sort it first (O(n log n)) or use another method.",
        ],
        syntax: "int l = 0, r = n - 1;\nwhile (l < r) {\n    int s = a[l] + a[r];\n    if (s == target) { /* found */ break; }\n    if (s < target) l++; else r--;\n}",
        example: { code: twoPtrProg, output: "2 7", note: "1 + 11 and 1 + 7 are rejected; 2 + 7 matches." },
        commonMistakes: ["Using it on an unsorted array.", "Forgetting to move a pointer in some branch, which loops forever.", "Using l <= r, which lets one element pair with itself."],
      },
      questions: [
        predict(twoPtrProg, ["2 7", "1 7", "4 7", "1 11"], 0, "The pointers visit (1,11), (1,7), (2,7); only the last sums to 9."),
        predict(progh(["vector"], "vector<int> a = {1, 3, 5, 8};\nint l = 0, r = 3, steps = 0;\nwhile (l < r) {\n    steps++;\n    if (a[l] + a[r] < 10) l++;\n    else r--;\n}\ncout << steps;"), ["3", "2", "4", "1"], 0, "The loop moves a pointer each time until they meet: 3 moves for 4 elements."),
        mc("Why can the left pointer move right when a[l] + a[r] is too small?", ["Everything paired with a[l] up to r is also too small, because the array is sorted", "Because the array is unsorted", "Because r is always larger", "It cannot; both must move"], 0, "a[r] is the largest value still in play; if even that is too small with a[l], a[l] cannot be part of an answer."),
        bug(
          "The loop should stop when the pointers meet. What is the bug?",
          "while (l <= r) {\n    int s = a[l] + a[r];\n    if (s == target) { found = true; break; }\n    if (s < target) l++; else r--;\n}",
          ["l <= r lets an element be paired with itself when l == r", "The if must be an else", "found must be a pointer", "r must start at n"],
          0,
          "When l == r the 'pair' is one element used twice. Use l < r.",
        ),
        fill("Complete the code to move the correct pointer when the sum is too big.", progh(["vector"], "int l = 0, r = 4;\nint s = 12, target = 9;\nif (s > target) ___;\ncout << r;"), ["r--"], "A sum that is too big needs a smaller right value, so move r left."),
        mc("What is the running time of the two-pointer pair search on a sorted array of n values?", ["O(n)", "O(n^2)", "O(log n)", "O(n^3)"], 0, "Each step moves one pointer inward, so at most n steps."),
        tf("Two pointers on this problem requires the array to be sorted.", true, "The decision to move l or r relies on sorted order."),
      ],
    },
    {
      slug: "sliding-window",
      title: "Sliding Window",
      summary: "Slide a window across the array, adding the new element and removing the old one.",
      content: {
        concept: "A sliding window keeps the answer for a contiguous block and updates it as the block moves by one position, instead of recomputing the whole block.",
        explanation: [
          "Problem: find the largest sum of k consecutive elements. Brute force sums k values for each of n - k + 1 starting points: O(n * k).",
          "Slide instead. Compute the first window's sum once. To move one step right, add the new element a[i] and subtract the element that left, a[i - k].",
          "Dry run for a = {2, 1, 5, 1, 3, 2}, k = 3: windows have sums 8, 7, 9, 6. The largest is 9.",
          "Each element is added once and removed once, so the whole thing is O(n).",
          "A window can also grow and shrink (two pointers l and r that both only move right). For example, to find the longest block of positive numbers with sum at most S: extend r, add a[r]; while the sum is above S, subtract a[l] and move l. Each pointer moves at most n times.",
          "Always decide first what the window holds (a sum, a count) and which update happens when an element enters or leaves.",
        ],
        syntax: "sum += a[i] - a[i - k];  // slide: new in, old out",
        example: { code: windowProg, output: "9", note: "The window 5, 1, 3 has the largest sum." },
        commonMistakes: ["Forgetting to initialise the first window before sliding.", "Subtracting the wrong element (it is a[i - k], not a[i - k + 1]).", "Resetting the sum to 0 for each window, which loses the O(n) speed."],
      },
      questions: [
        predict(windowProg, ["9", "8", "7", "6"], 0, "The window sums are 8, 7, 9, 6; the maximum is 9."),
        predict(progh(["vector"], "vector<int> a = {1, 2, 3, 4, 5};\nint k = 2, sum = 0;\nfor (int i = 0; i < k; i++) sum += a[i];\nfor (int i = k; i < 5; i++) sum += a[i] - a[i - k];\ncout << sum;"), ["9", "7", "5", "12"], 0, "After the last slide the window is {4, 5}, sum 9."),
        fill("Complete the update that slides a window of size k one step to the right.", progh(["vector"], "vector<int> a = {2, 1, 5, 1, 3, 2};\nint k = 3, sum = 8, i = 3;\nsum += a[i] - a[___];\ncout << sum;"), ["i - k", "i-k"], "The element leaving the window is k positions behind the new one. 8 + 1 - 2 = 7."),
        bug(
          "This should print the largest sum of k consecutive values, but it is slow for large n and k. Why?",
          "for (int i = 0; i + k <= n; i++) {\n    int sum = 0;\n    for (int j = i; j < i + k; j++) sum += a[j];\n    best = max(best, sum);\n}",
          ["It re-adds k elements for every window instead of sliding (O(n * k))", "It reads outside the array", "max cannot be used on ints", "i must start at k"],
          0,
          "Each window recomputes its sum from scratch. A sliding window updates it in O(1).",
        ),
        arrange("Arrange the lines of the sliding step for i from k to n - 1.", ["for (int i = k; i < n; i++) {", "    sum += a[i] - a[i - k];", "    best = max(best, sum);", "}"], "Update the window sum, then compare with the best so far."),
        mc("n = 10^5 and k = 5 * 10^4. Which approach is fast enough?", ["Sliding window, O(n)", "Re-summing each window, about 2.5 * 10^9 steps", "Trying every subarray", "Sorting first"], 0, "Sliding touches each element a constant number of times."),
        tf("In a sliding window of fixed size k, each element is added once and removed once.", true, "That is why the total work is O(n)."),
      ],
    },
    {
      slug: "prefix-two-pointers-assessment",
      kind: "assessment",
      title: "Assessment: Prefix Sums and Two Pointers",
      summary: "Trace, debug, complete and choose between prefix sums, two pointers and a window.",
      content: {
        concept: "This checkpoint covers prefix sums, two pointers and sliding windows.",
        explanation: [
          "For each question first decide which technique fits, then do a small example by hand.",
          "You only need vectors, loops and the three lessons in this unit.",
        ],
        commonMistakes: ["Off-by-one in prefix formulas.", "Using two pointers on unsorted data."],
      },
      questions: [
        predict(progh(["vector"], "vector<int> a = {5, 2, 6, 1};\nvector<int> pre(5, 0);\nfor (int i = 0; i < 4; i++) pre[i + 1] = pre[i] + a[i];\ncout << pre[3] - pre[1] << \" \" << pre[4];"), ["8 14", "8 13", "7 14", "13 8"], 0, "pre = 0 5 7 13 14. pre[3] - pre[1] = 8 and pre[4] = 14."),
        predict(progh(["vector"], "vector<int> a = {1, 4, 6, 9};\nint l = 0, r = 3, target = 10;\nwhile (l < r) {\n    int s = a[l] + a[r];\n    if (s == target) break;\n    if (s < target) l++;\n    else r--;\n}\ncout << l << \" \" << r;"), ["0 3", "1 2", "0 2", "1 3"], 0, "1 + 9 = 10 immediately, so the pointers stay at 0 and 3."),
        predict(progh(["vector"], "vector<int> a = {4, 1, 1, 6, 2};\nint k = 2, sum = 0, best = 0;\nfor (int i = 0; i < 5; i++) {\n    sum += a[i];\n    if (i >= k) sum -= a[i - k];\n    if (i >= k - 1) best = max(best, sum);\n}\ncout << best;"), ["7", "5", "8", "6"], 2, "The windows of size 2 are {4,1}=5, {1,1}=2, {1,6}=7 and {6,2}=8. The maximum is 8."),
        bug(
          "A learner builds pre with size n and pre[i] = pre[i - 1] + a[i], starting the loop at i = 1, then answers sum(l..r) as pre[r] - pre[l - 1]. For which query does it crash or fail?",
          "vector<long long> pre(n);\npre[0] = a[0];\nfor (int i = 1; i < n; i++) pre[i] = pre[i - 1] + a[i];\n// sum of a[l..r]:\ncout << pre[r] - pre[l - 1];",
          ["Any query with l = 0, because pre[-1] does not exist", "Any query with r = n - 1", "Queries where l == r", "Only when all values are positive"],
          0,
          "Without the extra leading 0 you must special-case l = 0. The pre[n + 1] layout avoids this.",
        ),
        fill("Complete the code to answer sum(l..r) with a prefix array pre of size n + 1.", progh(["vector"], "vector<int> pre = {0, 2, 5, 6, 12};\nint l = 1, r = 2;\ncout << pre[r + 1] ___ pre[l];"), ["-"], "Subtract the part before l. 6 - 2 = 4 (3 + 1)."),
        arrange("Arrange the lines of a two-pointer search on a sorted array for a pair that sums to target.", ["int l = 0, r = n - 1;", "while (l < r) {", "    int s = a[l] + a[r];", "    if (s == target) break;", "    if (s < target) l++;", "    else r--;", "}"], "Initialise, loop while the pointers are apart, compare, then move the right pointer."),
        mc("The array is NOT sorted, n = 10^5, and you must answer 10^5 range-sum questions. Which fits best?", ["Prefix sums", "Two pointers", "Sorting then binary search", "Trying all pairs"], 0, "Range sums need no order; prefix sums answer each in O(1)."),
        mc("You must find the largest sum of 4 consecutive values in an array of size 10^6. Which is the right plan?", ["Sliding window", "Prefix sums on every pair", "Two nested loops over all pairs", "Recursion"], 0, "A fixed-size window slides in O(n)."),
      ],
    },
  ],
};
