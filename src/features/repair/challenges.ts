/**
 * Algorithm Repair Workshop: the PUBLIC side of each challenge. Everything here may be shipped to the browser:
 * the statement, the flawed program, the visible sample tests and links. Hidden tests, the reference solution,
 * hints and the reflection live in src/server/repair and are only ever sent by the server, one request at a time.
 */
export type Sample = { input: string; expected: string; label: string };

/** What the learner sees after a successful repair (or an explicit reveal). Delivered by the server, never bundled. */
export type Reflection = {
  wasWrong: string;
  whyFailed: string;
  whatChanged: string;
  edgeCase: string;
  complexity: string;
  reinforce: string;
};

export type RepairChallenge = {
  id: string;
  /** The Counterexample Lab investigation about the same flaw. */
  labId: string;
  title: string;
  kind: string;
  objective: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  /** What the flawed program tries to do, in words. */
  approach: string;
  seems: string;
  flawedCode: string;
  samples: Sample[];
  timeLimitMs: number;
  memoryLimitMb: number;
  /** Visualizer that illustrates the underlying technique, when there is one. */
  visualizer: "two-pointers" | "sliding-window" | null;
  /** Existing curriculum lessons that teach the concept, by exact unit and lesson title (a test checks they exist). */
  learn: Array<{ unit: string; lesson: string }>;
};

export const TIME_LIMIT_MS = 2000;
export const MEMORY_LIMIT_MB = 256;

const COINS_CODE = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<int> coins(n);
    for (int &c : coins) cin >> c;

    sort(coins.rbegin(), coins.rend());   // biggest coin first
    int used = 0;
    for (int c : coins) {
        used += m / c;                    // take as many as fit
        m %= c;
    }
    cout << (m == 0 ? used : -1) << "\\n";
    return 0;
}
`;

const KADANE_CODE = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;

    long long best = 0, cur = 0;
    for (int i = 0; i < n; i++) {
        cur = max(0LL, cur + a[i]);       // never let the running sum go below 0
        best = max(best, cur);
    }
    cout << best << "\\n";
    return 0;
}
`;

const POINTERS_CODE = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long target;
    cin >> n >> target;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;

    int l = 0, r = n - 1;
    while (l < r) {
        long long s = a[l] + a[r];
        if (s == target) { cout << "YES\\n"; return 0; }
        if (s < target) l++;              // sum too small: move the left pointer up
        else r--;                         // sum too big: move the right pointer down
    }
    cout << "NO\\n";
    return 0;
}
`;

const WINDOW_CODE = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long k;
    cin >> n >> k;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;

    int l = 0, best = 0;
    long long sum = 0;
    for (int r = 0; r < n; r++) {
        sum += a[r];
        while (sum > k && l <= r) {       // too big: shrink from the left
            sum -= a[l];
            l++;
        }
        best = max(best, r - l + 1);
    }
    cout << best << "\\n";
    return 0;
}
`;

export const REPAIR_CHALLENGES: RepairChallenge[] = [
  {
    id: "greedy-coins",
    labId: "greedy-coins",
    title: "Fewest coins",
    kind: "Greedy failure",
    objective: "See why the locally best choice is not always globally best, and repair the algorithm with dynamic programming.",
    statement: "You have n kinds of coins, each available in unlimited quantity. Find the smallest number of coins whose values add up to exactly m, or report -1 if that is impossible.",
    inputFormat: "The first line has n and m. The second line has the n coin values.",
    outputFormat: "One integer: the smallest number of coins, or -1.",
    constraints: "1 ≤ n ≤ 50, 1 ≤ m ≤ 10 000, 1 ≤ each coin ≤ 1 000.",
    approach: "Take the biggest coin as many times as it fits, then the next biggest, and so on. If something is left over, the answer is -1.",
    seems: "Using big coins first uses the fewest coins for everyday coin systems like 1, 5, 10, 25, so it is easy to believe it always works.",
    flawedCode: COINS_CODE,
    samples: [
      { label: "Sample 1", input: "3 13\n1 5 10\n", expected: "4" },
      { label: "Sample 2", input: "2 7\n2 4\n", expected: "-1" },
      { label: "Sample 3", input: "3 6\n1 3 4\n", expected: "2" },
    ],
    timeLimitMs: TIME_LIMIT_MS,
    memoryLimitMb: MEMORY_LIMIT_MB,
    visualizer: null,
    learn: [{ unit: "Greedy Algorithms", lesson: "The Greedy Choice (and When It Fails)" }, { unit: "Dynamic Programming: First Steps", lesson: "Tabulation: Fill a Table Bottom-Up" }],
  },
  {
    id: "max-subarray-boundary",
    labId: "max-subarray-boundary",
    title: "Best stretch of numbers",
    kind: "Boundary failure",
    objective: "Find the wrong starting value hiding in a familiar loop, and repair it so all-negative inputs work.",
    statement: "Given n integers, find the largest sum of a contiguous, non-empty block of them.",
    inputFormat: "The first line has n. The second line has the n integers.",
    outputFormat: "One integer: the largest block sum.",
    constraints: "1 ≤ n ≤ 100 000, −10^9 ≤ each value ≤ 10^9.",
    approach: "Keep a running sum. If it ever drops below zero, restart it from zero, because a negative prefix can only hurt. Remember the largest running sum seen.",
    seems: "Restarting when the running sum goes negative is exactly the idea behind Kadane's algorithm, and it gives the right answer on arrays that contain positive numbers.",
    flawedCode: KADANE_CODE,
    samples: [
      { label: "Sample 1", input: "5\n2 -1 3 -4 5\n", expected: "5" },
      { label: "Sample 2", input: "1\n7\n", expected: "7" },
      { label: "Sample 3", input: "4\n-3 -1 -2 -5\n", expected: "-1" },
    ],
    timeLimitMs: TIME_LIMIT_MS,
    memoryLimitMb: MEMORY_LIMIT_MB,
    visualizer: null,
    learn: [{ unit: "Prefix Sums and Two Pointers", lesson: "Prefix Sums: Range Sums in O(1)" }, { unit: "Dynamic Programming: First Steps", lesson: "Tabulation: Fill a Table Bottom-Up" }],
  },
  {
    id: "two-pointers-unsorted",
    labId: "two-pointers-unsorted",
    title: "Two numbers that add up",
    kind: "Broken precondition",
    objective: "Recognise the precondition behind two pointers (sorted order), and repair the program so the pointer moves are justified.",
    statement: "Given n integers and a target t, decide whether two different positions i ≠ j exist with a[i] + a[j] = t. Print YES or NO.",
    inputFormat: "The first line has n and t. The second line has the n integers, in any order.",
    outputFormat: "YES if such a pair exists, otherwise NO. You do not need to say which positions.",
    constraints: "2 ≤ n ≤ 100 000, −10^9 ≤ each value ≤ 10^9, −2·10^9 ≤ t ≤ 2·10^9.",
    approach: "Put one pointer at each end. If the pair is too small move the left pointer right, if it is too big move the right pointer left.",
    seems: "Moving a pointer to fix the sum feels logical, and the method is fast: it looks at each element once.",
    flawedCode: POINTERS_CODE,
    samples: [
      { label: "Sample 1", input: "5 12\n1 3 4 8 9\n", expected: "YES" },
      { label: "Sample 2", input: "2 10\n5 5\n", expected: "YES" },
      { label: "Sample 3", input: "3 4\n1 3 2\n", expected: "YES" },
    ],
    timeLimitMs: TIME_LIMIT_MS,
    memoryLimitMb: MEMORY_LIMIT_MB,
    visualizer: "two-pointers",
    learn: [{ unit: "Prefix Sums and Two Pointers", lesson: "Two Pointers on a Sorted Array" }],
  },
  {
    id: "window-negatives",
    labId: "window-negatives",
    title: "Longest cheap stretch",
    kind: "Broken assumption",
    objective: "See why shrinking a window only works when values are non-negative, and repair the program with a method that does not rely on it.",
    statement: "Given n integers and a limit K, find the length of the longest contiguous block whose sum is at most K. Print 0 if no block qualifies.",
    inputFormat: "The first line has n and K. The second line has the n integers.",
    outputFormat: "One integer: the length of the longest valid block, or 0.",
    constraints: "1 ≤ n ≤ 2 000, −10^6 ≤ each value ≤ 10^6, −10^9 ≤ K ≤ 10^9.",
    approach: "Grow a window to the right. Whenever its sum is more than K, shrink it from the left until the sum fits again, and remember the longest window.",
    seems: "This is the standard sliding window and it is correct for positive numbers: shrinking always lowers the sum and growing always raises it.",
    flawedCode: WINDOW_CODE,
    samples: [
      { label: "Sample 1", input: "5 5\n2 1 3 1 2\n", expected: "3" },
      { label: "Sample 2", input: "3 1\n5 6 7\n", expected: "0" },
      { label: "Sample 3", input: "3 0\n0 1 -1\n", expected: "3" },
    ],
    timeLimitMs: TIME_LIMIT_MS,
    memoryLimitMb: MEMORY_LIMIT_MB,
    visualizer: "sliding-window",
    learn: [{ unit: "Prefix Sums and Two Pointers", lesson: "Sliding Window" }],
  },
];

export const REPAIR_BY_ID: Record<string, RepairChallenge> = Object.fromEntries(REPAIR_CHALLENGES.map((c) => [c.id, c]));
export const isRepairId = (s: unknown): s is string => typeof s === "string" && Object.prototype.hasOwnProperty.call(REPAIR_BY_ID, s);
