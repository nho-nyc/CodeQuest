import { arrange, bug, fill, mc, predict, prog, tf } from "../builders";
import type { UnitSeed } from "../types";

const factPre = "long long fact(int n) {\n    if (n <= 1) return 1;\n    return n * fact(n - 1);\n}";
const countdownPre = "void countdown(int n) {\n    if (n == 0) return;\n    cout << n << \" \";\n    countdown(n - 1);\n    cout << n << \" \";\n}";
const powPre = "long long power(long long x, int n) {\n    if (n == 0) return 1;\n    long long half = power(x, n / 2);\n    if (n % 2 == 0) return half * half;\n    return half * half * x;\n}";
const fibPre = "int calls = 0;\nint fib(int n) {\n    calls++;\n    if (n <= 1) return n;\n    return fib(n - 1) + fib(n - 2);\n}";

export const w4unit1: UnitSeed = {
  slug: "recursion",
  title: "Recursion",
  description: "Solve a problem by solving a smaller copy of it. Learn base cases, the call stack and when recursion gets expensive.",
  icon: "Repeat2",
  lessons: [
    {
      slug: "base-case-and-call-stack",
      title: "Base Case and the Call Stack",
      summary: "How a function that calls itself starts, stops and unwinds.",
      content: {
        concept: "A recursive function calls itself on a smaller input. It must have a base case: an input small enough to answer directly, which stops the calls.",
        explanation: [
          "Every recursive function has two parts: a base case (when to stop) and a recursive case (reduce the problem and call yourself).",
          "Example: n! = n * (n - 1)!, and 1! = 1. The base case is n <= 1; the recursive case is n * fact(n - 1).",
          "Dry run of fact(3): fact(3) waits for fact(2), which waits for fact(1). fact(1) returns 1. Then fact(2) returns 2 * 1 = 2, and fact(3) returns 3 * 2 = 6.",
          "The waiting calls are kept on the call stack, one frame per call. Frames are released when a call returns. The stack has limited memory: roughly 10^5 or more nested calls can crash the program with a stack overflow.",
          "Code before the recursive call runs on the way down; code after it runs on the way back up. countdown(3) below prints 3 2 1 and then 1 2 3, because the second cout runs as each call returns.",
          "If there is no base case, or the input does not get smaller, the calls never stop and the program crashes.",
        ],
        syntax: "int f(int n) {\n    if (n == 0) return 0;      // base case\n    return n + f(n - 1);       // smaller problem\n}",
        example: { code: prog("cout << fact(5);", factPre), output: "120", note: "5 * 4 * 3 * 2 * 1" },
        commonMistakes: ["Forgetting the base case, which causes infinite recursion and a crash.", "Calling with an input that does not get smaller (for example fact(n) inside fact(n)).", "Expecting the code after the recursive call to run before it."],
      },
      questions: [
        predict(prog("cout << fact(5);", factPre), ["120", "24", "15", "720"], 0, "5! = 120."),
        predict(prog("countdown(3);", countdownPre), ["3 2 1 1 2 3", "3 2 1", "1 2 3 3 2 1", "3 3 2 2 1 1"], 0, "The first cout runs going down (3 2 1); the second runs as the calls return (1 2 3)."),
        fill("Complete the base case so that sum(0) returns 0.", "int sum(int n) {\n    if (n == ___) return 0;\n    return n + sum(n - 1);\n}", ["0"], "sum(n) = n + sum(n - 1) must stop at 0."),
        bug(
          "What happens when this function is called with sum(3)?",
          "int sum(int n) {\n    return n + sum(n - 1);\n}",
          ["It never stops: there is no base case, so the stack overflows", "It returns 6", "It returns 3", "It fails to compile"],
          0,
          "Without a base case the calls go sum(3), sum(2), sum(1), sum(0), sum(-1)... until memory runs out.",
        ),
        arrange("Arrange the lines of a recursive function that returns 1 + 2 + ... + n.", ["int sum(int n) {", "    if (n == 0) return 0;", "    return n + sum(n - 1);", "}"], "Base case first, then the recursive case on a smaller input."),
        mc("What is stored on the call stack for each active recursive call?", ["That call's parameters and local variables", "Only the final answer", "The whole program", "Nothing"], 0, "Each call has its own frame, so n in one call is independent of n in another."),
        tf("In countdown, the second cout runs after the recursive call returns.", true, "Code after the recursive call runs while unwinding."),
      ],
    },
    {
      slug: "thinking-recursively",
      title: "Thinking Recursively and Its Cost",
      summary: "Split into smaller problems, and notice when recursion repeats work.",
      content: {
        concept: "To design a recursive solution, assume the function already works for smaller inputs and ask how to build the answer for this input from them.",
        explanation: [
          "Template: (1) what is the smallest input and its answer? (2) how does the answer for n depend on the answer for something smaller?",
          "Fast power: x^n = (x^(n/2))^2 for even n, and one more factor x for odd n. The input halves each time, so computing 2^10 needs only about log2(10) calls instead of 10 multiplications.",
          "Fibonacci: fib(n) = fib(n - 1) + fib(n - 2), fib(0) = 0, fib(1) = 1. It is short, but each call makes two calls. Count the calls: fib(5) makes 15 calls in total, and fib(30) makes over two million, because the same values (fib(3), fib(2) ...) are recomputed again and again.",
          "When recursion computes the same input many times, the fix is to remember answers. That idea is called memoization and is the start of dynamic programming (see the last unit of this world).",
          "Recursion depth also matters: a recursion that goes n levels deep for n = 10^6 is likely to overflow the stack. Use a loop instead.",
        ],
        syntax: "long long power(long long x, int n) {\n    if (n == 0) return 1;\n    long long half = power(x, n / 2);\n    return (n % 2 == 0) ? half * half : half * half * x;\n}",
        example: { code: prog("cout << power(2, 10);", powPre), output: "1024", note: "Only 5 calls: n = 10, 5, 2, 1, 0." },
        commonMistakes: ["Writing power(x, n / 2) * power(x, n / 2), which makes two calls and loses the speed-up. Store the result in a variable.", "Using plain recursive Fibonacci for n above about 40.", "Recursing 10^6 levels deep."],
      },
      questions: [
        predict(prog("cout << power(2, 10);", powPre), ["1024", "512", "100", "2048"], 0, "2^10 = 1024."),
        predict(prog("cout << fib(6);", fibPre), ["8", "13", "5", "6"], 0, "fib: 0 1 1 2 3 5 8, so fib(6) = 8."),
        predict(prog("fib(5);\ncout << calls;", fibPre), ["15", "5", "8", "10"], 0, "Calls: fib(5) makes 15 calls because subproblems repeat."),
        bug(
          "This fast power is no faster than a plain loop. Why?",
          "long long power(long long x, int n) {\n    if (n == 0) return 1;\n    if (n % 2 == 0) return power(x, n / 2) * power(x, n / 2);\n    return power(x, n / 2) * power(x, n / 2) * x;\n}",
          ["It calls power(x, n / 2) twice, so the work does not shrink", "n / 2 is wrong", "The base case is missing", "x must be a double"],
          0,
          "Store the half result once. Two calls per level mean the total number of calls is about n again.",
        ),
        fill("Complete the recursive case: the sum of a[i..n-1] is a[i] plus the sum of the rest.", "int total(int a[], int i, int n) {\n    if (i == n) return 0;\n    return a[i] + total(a, ___, n);\n}", ["i + 1", "i+1"], "The smaller problem starts one position later."),
        mc("Why is plain recursive Fibonacci slow for n = 40?", ["It recomputes the same subproblems many times", "Recursion is always slow", "int is too small", "It uses a loop inside"], 0, "The recursion tree contains the same fib(k) calls repeatedly."),
        tf("A recursion that nests 10^6 calls deep is safe because each call is small.", false, "Even small frames add up and can overflow the call stack. Use a loop."),
      ],
    },
    {
      slug: "recursion-assessment",
      kind: "assessment",
      title: "Assessment: Recursion",
      summary: "Trace calls, find missing base cases and judge when recursion is too costly.",
      content: {
        concept: "This checkpoint covers base cases, the call stack, recursive thinking and its cost.",
        explanation: ["Trace by hand: write each call and what it returns.", "No topics beyond this unit are needed."],
        commonMistakes: ["Forgetting that code after the recursive call runs while returning."],
      },
      questions: [
        predict(prog("cout << g(4);", "int g(int n) {\n    if (n <= 1) return 1;\n    return g(n - 1) + g(n - 2);\n}"), ["5", "3", "8", "4"], 0, "g(1)=g(0)=1, g(2)=2, g(3)=3, g(4)=5."),
        predict(prog("show(3);", "void show(int n) {\n    if (n == 0) return;\n    show(n - 1);\n    cout << n << \" \";\n}"), ["1 2 3", "3 2 1", "3 2 1 0", "0 1 2 3"], 0, "The print comes after the recursive call, so the smallest n prints first."),
        predict(prog("cout << h(13);", "int h(int n) {\n    if (n == 0) return 0;\n    return n % 10 + h(n / 10);\n}"), ["4", "13", "3", "1"], 0, "h(13) = 3 + h(1) = 3 + 1 + h(0) = 4."),
        bug(
          "This should return 1 + 2 + ... + n but crashes for n = 5. Why?",
          "int sum(int n) {\n    if (n == 0) return 0;\n    return n + sum(n + 1);\n}",
          ["The argument grows (n + 1), so it never reaches the base case", "The base case should be n == 1", "It should return n * sum(n - 1)", "int is too small"],
          0,
          "The recursive call must go toward the base case: sum(n - 1).",
        ),
        fill("Fill the blank so that count(n) returns the number of digits of n (n >= 1).", "int count(int n) {\n    if (n < 10) return 1;\n    return 1 + count(n / ___);\n}", ["10"], "Dividing by 10 removes the last digit."),
        arrange("Arrange the lines to print n, n-1, ..., 1 using recursion.", ["void down(int n) {", "    if (n == 0) return;", "    cout << n << \" \";", "    down(n - 1);", "}"], "Stop at 0, print, then recurse on n - 1."),
        mc("Which fix makes the plain recursive Fibonacci fast for n = 50?", ["Remember (memoize) each computed value", "Use long long for the return type", "Declare the function inline", "Pass n by reference"], 0, "The slowness comes from solving the same fib(k) repeatedly. long long only prevents overflow."),
        mc("A recursive function processes a string of length 10^6, going one character deeper each call. What is the main danger?", ["Stack overflow: 10^6 nested calls", "Time limit: recursion is always O(n^2)", "Wrong answer: recursion cannot read strings", "Nothing: recursion is as safe as a loop"], 0, "Each call keeps a stack frame until it returns, so very deep recursion can crash. The same work as a loop uses constant stack."),
      ],
    },
  ],
};
