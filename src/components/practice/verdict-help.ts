/** Beginner-friendly explanations of judge verdicts. Static, rule-based text: it does not look at hidden tests or user code. */
export type VerdictHelp = { meaning: string; tips: string[] };

export const VERDICT_HELP: Record<string, VerdictHelp> = {
  wrong_answer: {
    meaning: "Your program ran, but its output differs from the expected output on at least one hidden test.",
    tips: [
      "Run the samples with Run first, and compare your output with the expected output character by character (spaces and line breaks count).",
      "Try tiny inputs yourself: n = 1, all numbers equal, negative numbers, the largest allowed values.",
      "Check integer overflow: sums and products of large numbers need long long.",
      "Check that every variable is initialised and that arrays are cleared between test cases.",
      "Re-read the statement: did you print exactly the requested format (YES/NO case, separators, order)?",
    ],
  },
  time_limit_exceeded: {
    meaning: "Your program was correct on the tests it finished, but it took longer than the time limit on one test.",
    tips: [
      "Count operations: about 10^8 simple steps per second is a safe estimate. Compare with the constraints (n up to 2*10^5 rules out O(n^2)).",
      "Look for nested loops that could become one pass (prefix sums, two pointers, sorting + binary search).",
      "Use fast input: ios::sync_with_stdio(false); cin.tie(nullptr); and print with '\\n' instead of endl.",
      "Avoid copying large vectors or strings: pass them by reference.",
      "An infinite loop also shows up as Time Limit Exceeded. Check your loop conditions.",
    ],
  },
  runtime_error: {
    meaning: "Your program crashed or exited with an error while running.",
    tips: [
      "Out-of-range index: a[i] with i < 0 or i >= size is the most common cause. Check your loop bounds.",
      "Division or modulo by zero.",
      "Very deep recursion can overflow the stack. Consider an iterative version.",
      "Reading more numbers than the input contains, or a vector used before it has a size.",
      "main must return 0 and must not call exit with a non-zero code.",
    ],
  },
  memory_limit_exceeded: {
    meaning: "Your program used more memory than allowed.",
    tips: [
      "Check array sizes against the constraints. An int array of 10^8 elements needs about 400 MB.",
      "Use vector<int> instead of vector<long long> when values fit, and avoid storing data you do not need.",
      "An unbounded loop that keeps push_back-ing also runs out of memory.",
    ],
  },
  compilation_error: {
    meaning: "The compiler could not build your program, so nothing was run.",
    tips: [
      "Read the FIRST error message only. Later errors are often side effects of the first one.",
      "The line number in the message is where the compiler noticed the problem; the mistake may be on the line above (a missing ';' or '}').",
      "Make sure you include the headers you use (#include <bits/stdc++.h> covers most of them).",
    ],
  },
  internal_error: {
    meaning: "The judge itself had a problem. This is not a verdict on your solution.",
    tips: ["Try submitting again in a moment. Your attempt was not counted against you."],
  },
};

/** Plain-language hints for the most common g++ messages. Returns at most 3 relevant lines. */
export function explainCompileOutput(output: string): string[] {
  const rules: Array<[RegExp, string]> = [
    [/was not declared in this scope|not declared/i, "A name is used before it is declared, or it is misspelled (C++ is case-sensitive). Also check that the right #include is present."],
    [/expected ['`‘]?;['’]?/i, "A semicolon ';' is missing, usually at the end of the line above the reported one."],
    [/expected ['`‘]?\}['’]?|expected declaration before ['`‘]?\}/i, "Braces do not match: a '{' is missing its '}' or there is one '}' too many."],
    [/no match for ['`‘]?operator(>>|<<)/i, "You are reading or printing something that cin/cout cannot handle with >> or <<. Check the type of the variable."],
    [/invalid conversion|cannot convert/i, "You are using a value of one type where another type is required. Check the variable types."],
    [/does not name a type/i, "The compiler does not know this type. Add the missing #include or check the spelling (for example vector needs #include <vector>)."],
    [/undefined reference to ['`‘]?main/i, "The program has no main() function."],
    [/ISO C\+\+ forbids|variable-sized object/i, "Array sizes must be constants. Use a constant size or a vector."],
  ];
  const out: string[] = [];
  for (const [re, text] of rules) if (re.test(output) && out.length < 3) out.push(text);
  return out;
}
