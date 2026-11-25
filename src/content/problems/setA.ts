import { rng } from "./rng";
import type { ProblemSeed } from "./types";

type Spec = Omit<ProblemSeed, "timeLimitMs" | "memoryLimitMb" | "estimatedMinutes"> & { timeLimitMs?: number; estimatedMinutes?: number };

const P = (s: Spec): ProblemSeed => ({
  timeLimitMs: 1000,
  memoryLimitMb: 256,
  estimatedMinutes: s.difficulty === "newbie" ? 8 : s.difficulty === "easy" ? 15 : s.difficulty === "medium" ? 30 : 50,
  ...s,
});

/** T-case file: first line T, then each case on its own line(s). */
const multi = (cases: string[]) => `${cases.length}\n${cases.join("\n")}\n`;
const rangeStr = (n: number, f: (i: number) => string | number | bigint) => Array.from({ length: n }, (_, i) => f(i)).join(" ");

const PRIMES_M = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
const EXPS_M = [8, 4, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1];

// ---------------------------------------------------------------- newbie

const leapYearCount = P({
  slug: "leap-years-in-range",
  title: "Leap Years in a Range",
  difficulty: "easy",
  rating: 1000,
  tags: ["math", "implementation"],
  statement:
    "In the Gregorian calendar a year is a leap year if it is divisible by 4, except that years divisible by 100 are not leap years, unless they are also divisible by 400. Given two years a and b, count the leap years y with a <= y <= b.",
  inputFormat: "One line with two integers a and b.",
  outputFormat: "Print the number of leap years in the range [a, b].",
  constraints: "1 <= a <= b <= 10^9",
  samples: [
    { input: "2000 2000\n", output: "1\n", explanation: "2000 is divisible by 400, so it is a leap year." },
    { input: "1896 1904\n", output: "2\n", explanation: "1896 and 1904 are leap years, 1900 is not." },
  ],
  hints: [
    "Looping over up to 10^9 years is too slow in the worst case. Can you count leap years up to some year Y directly?",
    "The number of leap years in 1..Y is Y/4 - Y/100 + Y/400 (integer division). Use a prefix-style difference.",
    "Define f(Y) as that formula and print f(b) - f(a - 1).",
  ],
  editorial:
    "Multiples of 4 are leap candidates, multiples of 100 are removed and multiples of 400 are added back (inclusion-exclusion). So the count of leap years in 1..Y is f(Y) = Y/4 - Y/100 + Y/400, and the answer is f(b) - f(a-1).\n\nComplexity: O(1).",
  reference: `#include <iostream>
using namespace std;
long long f(long long y) { return y / 4 - y / 100 + y / 400; }
int main() {
    long long a, b;
    cin >> a >> b;
    cout << f(b) - f(a - 1) << "\\n";
}`,
  hidden: () => {
    const r = rng(101);
    const t = ["1 1", "1 3", "4 4", "100 100", "400 400", "1 1000000000", "999999999 1000000000", "1896 1904", "1900 2100"];
    for (let i = 0; i < 4; i++) {
      const a = r.int(1, 1e9);
      t.push(`${a} ${r.int(a, 1e9)}`);
    }
    return t.map((x) => `${x}\n`);
  },
});

const reverseNumber = P({
  slug: "reverse-the-digits",
  title: "Reverse the Digits",
  difficulty: "newbie",
  rating: 800,
  tags: ["math", "strings"],
  statement:
    "Given an integer n, write its decimal digits in reverse order and print the resulting integer. Leading zeros of the result are dropped (so 1200 becomes 21). A negative number keeps its minus sign in front.",
  inputFormat: "One line with the integer n.",
  outputFormat: "Print the reversed integer.",
  constraints: "-10^18 <= n <= 10^18",
  samples: [
    { input: "1200\n", output: "21\n" },
    { input: "-4560\n", output: "-654\n" },
    { input: "0\n", output: "0\n" },
  ],
  hints: [
    "Handle the sign separately from the digits.",
    "Extract digits with n % 10 and n / 10 repeatedly, building the reversed number; or work with the string form.",
    "Take the absolute value, reverse the string, strip leading zeros (keep at least one digit) and put back the sign.",
  ],
  editorial:
    "Convert |n| to a string, reverse it, remove leading zeros and print with the original sign. Since n is non-zero whenever the reversed value is non-zero, the case -0 never appears. The reversal of 10^18 is 1, so everything fits in 64 bits.\n\nComplexity: O(number of digits).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    long long n;
    cin >> n;
    bool neg = n < 0;
    string s = to_string(neg ? -n : n);
    reverse(s.begin(), s.end());
    size_t i = 0;
    while (i + 1 < s.size() && s[i] == '0') i++;
    s = s.substr(i);
    cout << (neg ? "-" : "") << s << "\\n";
}`,
  hidden: () => {
    const r = rng(102);
    const t = ["0", "5", "-5", "10", "-10", "1000000000000000000", "-1000000000000000000", "120030", "-9000000000000000", "999999999999999999"];
    for (let i = 0; i < 4; i++) t.push(`${r.big(-1000000000000000000n, 1000000000000000000n)}`);
    return t.map((x) => `${x}\n`);
  },
});

const multiplesGame = P({
  slug: "a-b-counting-game",
  title: "A-B Counting Game",
  difficulty: "newbie",
  rating: 800,
  tags: ["implementation", "math"],
  statement:
    "Players count from 1 to n. For each number i: if i is divisible by both a and b say `AB`; otherwise if it is divisible by a say `A`; otherwise if it is divisible by b say `B`; otherwise say the number i itself. Print everything that is said, in order.",
  inputFormat: "One line with three integers n, a and b.",
  outputFormat: "Print n space-separated tokens on one line.",
  constraints: "1 <= n <= 2000\n1 <= a, b <= 2000",
  samples: [{ input: "10 2 3\n", output: "1 A B A 5 AB 7 A B A\n" }],
  hints: [
    "Test the combined condition first, otherwise `AB` would never be printed.",
    "Use i % a == 0 and i % b == 0 in a for loop from 1 to n.",
    "Print a space before every token except the first.",
  ],
  editorial: "Loop i from 1 to n and check divisibility in the order: both, a only, b only, neither. Complexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, a, b;
    cin >> n >> a >> b;
    for (int i = 1; i <= n; i++) {
        if (i > 1) cout << " ";
        if (i % a == 0 && i % b == 0) cout << "AB";
        else if (i % a == 0) cout << "A";
        else if (i % b == 0) cout << "B";
        else cout << i;
    }
    cout << "\\n";
}`,
  hidden: () => ["1 1 1", "1 2 3", "2000 1 2000", "2000 2000 2000", "2000 7 7", "2000 3 5", "100 4 6", "2000 13 17", "50 1 1", "1999 2 3"].map((x) => `${x}\n`),
});

const clockAdd = P({
  slug: "clock-after-minutes",
  title: "Clock After Minutes",
  difficulty: "newbie",
  rating: 800,
  tags: ["math", "implementation"],
  statement:
    "A digital 24-hour clock shows the time hh:mm. After m more minutes pass, what does it show? The clock wraps around from 23:59 to 00:00 as many times as needed.",
  inputFormat: "One line: the time in the form hh:mm, a space, and the integer m.",
  outputFormat: "Print the new time in the form hh:mm with two digits for both parts.",
  constraints: "00 <= hh <= 23, 00 <= mm <= 59\n0 <= m <= 10^15",
  samples: [
    { input: "23:45 30\n", output: "00:15\n" },
    { input: "09:05 1440\n", output: "09:05\n", explanation: "Exactly one full day later." },
  ],
  hints: [
    "Convert the time to minutes since midnight.",
    "Add m and take the result modulo 1440 (minutes per day).",
    "Convert back using division and remainder by 60, and print with `%02d` style padding.",
  ],
  editorial: "Total minutes = (60*hh + mm + m) mod 1440. Then hours = total / 60 and minutes = total % 60, both padded to two digits. m needs a 64-bit type.\n\nComplexity: O(1).",
  reference: `#include <cstdio>
int main() {
    long long h, mi, m;
    scanf("%lld:%lld %lld", &h, &mi, &m);
    long long t = (h * 60 + mi + m) % 1440;
    printf("%02lld:%02lld\\n", t / 60, t % 60);
}`,
  hidden: () => {
    const r = rng(104);
    const pad = (x: number) => String(x).padStart(2, "0");
    const t = ["00:00 0", "23:59 1", "23:59 0", "12:00 720", "00:00 1000000000000000", "13:37 86399", "06:30 1439", "00:00 1440"];
    for (let i = 0; i < 4; i++) t.push(`${pad(r.int(0, 23))}:${pad(r.int(0, 59))} ${r.int(0, 1e15)}`);
    return t.map((x) => `${x}\n`);
  },
});

const digitStaircase = P({
  slug: "digit-staircase",
  title: "Digit Staircase",
  difficulty: "newbie",
  rating: 800,
  tags: ["implementation", "loops"],
  statement:
    "Print a right-aligned staircase with n rows. Row i (1-indexed) consists of n - i spaces followed by i digits: the j-th digit is j mod 10, for j = 1..i. For example, row 11 ends with the digits 1234567890 1.",
  inputFormat: "One line with the integer n.",
  outputFormat: "Print n lines forming the staircase. Do not print trailing spaces.",
  constraints: "1 <= n <= 100",
  samples: [{ input: "4\n", output: "   1\n  12\n 123\n1234\n" }],
  hints: [
    "Each row has two parts: some spaces, then some digits.",
    "Use two inner loops per row: one printing n - i spaces, one printing j % 10 for j from 1 to i.",
    "Remember the digit after 9 is 0 (j % 10), and finish each row with a newline.",
  ],
  editorial: "Nested loops. Row i prints n-i spaces then the digits (j mod 10) for j=1..i. Complexity: O(n^2) output characters.",
  reference: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    for (int i = 1; i <= n; i++) {
        for (int k = 0; k < n - i; k++) cout << ' ';
        for (int j = 1; j <= i; j++) cout << j % 10;
        cout << "\\n";
    }
}`,
  hidden: () => [1, 2, 3, 9, 10, 11, 25, 50, 99, 100].map((x) => `${x}\n`),
});

const minMaxAbove = P({
  slug: "min-max-above-average",
  title: "Min, Max and Above Average",
  difficulty: "newbie",
  rating: 800,
  tags: ["arrays", "implementation"],
  statement:
    "Given n integers, print the smallest one, the largest one, and how many of them are strictly greater than the average of all n numbers. The average is the exact real value sum/n (it may be fractional).",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print three integers separated by spaces: the minimum, the maximum, and the count.",
  constraints: "1 <= n <= 50000\n-10^9 <= a_i <= 10^9",
  samples: [{ input: "5\n1 2 3 4 10\n", output: "1 10 1\n", explanation: "The sum is 20, the average is 4. Only 10 is strictly greater." }],
  hints: [
    "You need the sum first, then a second pass to count.",
    "Avoid floating point: a_i > sum / n is the same as a_i * n > sum.",
    "Use long long for the sum and for a_i * n (it reaches 5 * 10^13).",
  ],
  editorial: "Read the array while tracking min, max and sum. Then count elements with a_i * n > sum, which avoids rounding issues. Complexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<long long> a(n);
    long long s = 0;
    for (auto &x : a) { cin >> x; s += x; }
    long long mn = *min_element(a.begin(), a.end()), mx = *max_element(a.begin(), a.end());
    int c = 0;
    for (auto x : a) if (x * n > s) c++;
    cout << mn << " " << mx << " " << c << "\\n";
}`,
  hidden: () => {
    const r = rng(106);
    const mk = (n: number, lo: number, hi: number) => `${n}\n${rangeStr(n, () => r.int(lo, hi))}\n`;
    return ["1\n5\n", "1\n-1000000000\n", "2\n1 2\n", "3\n7 7 7\n", "4\n-1000000000 1000000000 -1000000000 1000000000\n", mk(10, -5, 5), mk(1000, -1e9, 1e9), mk(50000, -1e9, 1e9), mk(50000, 0, 3), `50000\n${rangeStr(50000, () => 1000000000)}\n`];
  },
});

const secondsToDhms = P({
  slug: "seconds-to-days-clock",
  title: "Seconds to Days and Clock",
  difficulty: "newbie",
  rating: 800,
  tags: ["math", "implementation"],
  statement:
    "A stopwatch has been running for s seconds. Print the number of whole days, followed by the remaining time as HH:MM:SS (each field with two digits).",
  inputFormat: "One line with the integer s.",
  outputFormat: "Print `D HH:MM:SS` where D is the number of whole days.",
  constraints: "0 <= s <= 10^12",
  samples: [
    { input: "3661\n", output: "0 01:01:01\n" },
    { input: "90061\n", output: "1 01:01:01\n" },
  ],
  hints: ["A day has 86400 seconds, an hour 3600, a minute 60.", "Peel off units with division and remainder, largest unit first.", "Print with zero-padding: `printf(\"%lld %02lld:%02lld:%02lld\")`. Use 64-bit integers."],
  editorial: "days = s / 86400, rem = s % 86400, hours = rem / 3600, minutes = rem % 3600 / 60, seconds = rem % 60. Complexity: O(1).",
  reference: `#include <cstdio>
int main() {
    long long s;
    scanf("%lld", &s);
    long long d = s / 86400, r = s % 86400;
    printf("%lld %02lld:%02lld:%02lld\\n", d, r / 3600, r % 3600 / 60, r % 60);
}`,
  hidden: () => {
    const r = rng(107);
    const t = ["0", "59", "60", "3599", "3600", "86399", "86400", "1000000000000", "999999999999", "172800"];
    for (let i = 0; i < 3; i++) t.push(`${r.int(0, 1e12)}`);
    return t.map((x) => `${x}\n`);
  },
});

const digitFrequency = P({
  slug: "digit-frequency-table",
  title: "Digit Frequency Table",
  difficulty: "newbie",
  rating: 800,
  tags: ["strings", "implementation"],
  statement: "You are given a huge non-negative integer written as a string of digits. For each digit d from 0 to 9, count how many times d occurs in it.",
  inputFormat: "One line containing the digits (no leading zeros unless the number is exactly 0).",
  outputFormat: "Print 10 integers separated by spaces: the counts of digits 0, 1, ..., 9.",
  constraints: "The string has between 1 and 100000 digits.",
  samples: [{ input: "1223334444\n", output: "0 1 2 3 4 0 0 0 0 0\n" }],
  hints: ["The number is too large for any integer type, so treat it as text.", "Keep an array of 10 counters indexed by the digit.", "For each character c do cnt[c - '0']++ and print the array at the end."],
  editorial: "Read the line as a string and increment cnt[c-'0'] for each character. Complexity: O(length).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    cin >> s;
    int cnt[10] = {0};
    for (char c : s) cnt[c - '0']++;
    for (int i = 0; i < 10; i++) cout << cnt[i] << (i < 9 ? " " : "\\n");
}`,
  hidden: () => {
    const r = rng(108);
    const rnd = (n: number, d: number) => r.int(1, 9) + Array.from({ length: n - 1 }, () => r.int(0, d)).join("");
    return ["0", "7", "10", "9876543210", "1" + "0".repeat(99999), "9".repeat(100000), rnd(100000, 9), rnd(100000, 2), rnd(5000, 9), "1000000007"].map((x) => `${x}\n`);
  },
});

// ---------------------------------------------------------------- easy

const baseConvert = P({
  slug: "convert-to-base-b",
  title: "Convert to Base B",
  difficulty: "easy",
  rating: 900,
  tags: ["math", "implementation"],
  statement:
    "Write the non-negative integer n in base b. Digits 0-9 are written as themselves and the digits 10 to 35 as the uppercase letters A to Z. Do not print leading zeros (n = 0 is printed as 0).",
  inputFormat: "One line with integers n and b.",
  outputFormat: "Print n written in base b.",
  constraints: "0 <= n <= 10^18\n2 <= b <= 36",
  samples: [
    { input: "255 16\n", output: "FF\n" },
    { input: "10 2\n", output: "1010\n" },
    { input: "0 7\n", output: "0\n" },
  ],
  hints: ["Repeatedly divide n by b; the remainders are the digits, from last to first.", "Collect remainders in a string and reverse it at the end.", "Map remainder r to the character \"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ\"[r]. Treat n = 0 separately."],
  editorial: "Standard base conversion: while n > 0 append digit n % b and set n /= b. Reverse the result. At most 60 digits for base 2. Complexity: O(log n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    unsigned long long n, b;
    cin >> n >> b;
    string D = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", s;
    if (n == 0) s = "0";
    while (n > 0) { s += D[n % b]; n /= b; }
    reverse(s.begin(), s.end());
    cout << s << "\\n";
}`,
  hidden: () => {
    const r = rng(109);
    const t = ["0 2", "1 2", "35 36", "36 36", "1000000000000000000 2", "1000000000000000000 36", "1000000000000000000 10", "255 16", "1295 36"];
    for (let i = 0; i < 4; i++) t.push(`${r.big(0n, 1000000000000000000n)} ${r.int(2, 36)}`);
    return t.map((x) => `${x}\n`);
  },
});

const gcdLcmArray = P({
  slug: "gcd-and-lcm-of-array",
  title: "GCD and LCM of an Array",
  difficulty: "easy",
  rating: 1000,
  tags: ["number-theory", "math"],
  statement: "Given n positive integers, print the greatest common divisor and the least common multiple of all of them. The LCM is guaranteed not to exceed 10^18.",
  inputFormat: "The first line contains n. The second line contains n integers.",
  outputFormat: "Print the GCD and the LCM separated by a space.",
  constraints: "1 <= n <= 50000\n1 <= a_i <= 10^18\nThe LCM of the whole array is at most 10^18.",
  samples: [{ input: "3\n12 18 30\n", output: "6 180\n" }],
  hints: ["Both gcd and lcm can be accumulated one element at a time.", "lcm(x, y) = x / gcd(x, y) * y. Divide before multiplying.", "Use long long (std::gcd or your own Euclid). Start with g = 0 and l = 1."],
  editorial: "Fold over the array: g = gcd(g, a_i), l = l / gcd(l, a_i) * a_i. Since the final lcm is at most 10^18 and every partial lcm divides it, no intermediate value overflows when dividing first.\n\nComplexity: O(n log A).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    cin >> n;
    long long g = 0, l = 1;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        g = __gcd(g, x);
        l = l / __gcd(l, x) * x;
    }
    cout << g << " " << l << "\\n";
}`,
  hidden: () => {
    const r = rng(110);
    const val = (cap: number) => {
      let v = 1n;
      PRIMES_M.forEach((p, i) => {
        const e = r.int(0, Math.min(EXPS_M[i]!, cap));
        for (let k = 0; k < e; k++) v *= p;
      });
      return v;
    };
    const mk = (n: number, cap: number) => `${n}\n${rangeStr(n, () => val(cap))}\n`;
    const M = 897612484786617600n;
    return ["1\n1\n", "1\n1000000000000000000\n", "2\n1000000000000000000 1000000000000000000\n", "2\n6 35\n", `3\n${M} 1 ${M}\n`, mk(5, 8), mk(100, 1), mk(1000, 3), mk(50000, 1), mk(50000, 8), `50000\n${rangeStr(50000, () => 720720)}\n`, "3\n12 18 30\n"];
  },
});

const divisorCountQueries = P({
  slug: "divisor-count-queries",
  title: "Divisor Count Queries",
  difficulty: "easy",
  rating: 1100,
  tags: ["number-theory", "math"],
  statement: "For each of q queries, you are given an integer n. Print how many positive integers divide n.",
  inputFormat: "The first line contains q. The next q lines each contain one integer n.",
  outputFormat: "Print q lines: the number of divisors of each n, in order.",
  constraints: "1 <= q <= 50000\n1 <= n <= 10^6",
  samples: [{ input: "4\n1\n6\n12\n997\n", output: "1\n4\n6\n2\n" }],
  hints: ["Counting divisors separately for every query is possible but think about precomputing for all n up to 10^6 at once.", "A sieve-like loop: for every d, add 1 to every multiple of d. This is about n ln n steps.", "Fill an array cnt[1..10^6] once, then answer each query by lookup."],
  editorial: "For d from 1 to 10^6, for each multiple m of d do cnt[m]++. The total work is the harmonic sum, around 1.4 * 10^7. Each query is then O(1).\n\nComplexity: O(N log N + q).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    const int N = 1000000;
    vector<int> c(N + 1, 0);
    for (int d = 1; d <= N; d++) for (int m = d; m <= N; m += d) c[m]++;
    int q;
    scanf("%d", &q);
    while (q--) { int n; scanf("%d", &n); printf("%d\\n", c[n]); }
}`,
  hidden: () => {
    const r = rng(111);
    const mk = (q: number, lo: number, hi: number) => `${q}\n${Array.from({ length: q }, () => r.int(lo, hi)).join("\n")}\n`;
    return ["1\n1\n", "1\n1000000\n", "3\n720720 997920 1\n", mk(10, 1, 100), mk(1000, 1, 1e6), mk(50000, 1, 1e6), mk(50000, 900000, 1e6), mk(50000, 1, 50), `50000\n${Array(50000).fill(831600).join("\n")}\n`, "5\n2\n3\n4\n5\n6\n"];
  },
});

const primesInRange = P({
  slug: "primes-in-range-queries",
  title: "Primes in Range Queries",
  difficulty: "easy",
  rating: 1100,
  tags: ["number-theory", "prefix-sum"],
  statement: "For each query (l, r), count the prime numbers p with l <= p <= r.",
  inputFormat: "The first line contains q. Each of the next q lines contains l and r.",
  outputFormat: "Print q lines with the answers.",
  constraints: "1 <= q <= 50000\n1 <= l <= r <= 10^6",
  samples: [{ input: "3\n1 10\n11 20\n14 16\n", output: "4\n4\n0\n" }],
  hints: ["Primality testing per query is too slow; precompute for all numbers up to 10^6.", "Use the sieve of Eratosthenes, then a prefix count of primes.", "Answer = pi[r] - pi[l-1], where pi[x] counts primes <= x."],
  editorial: "Sieve primes up to 10^6 in O(N log log N), build prefix counts pi[], and answer each query in O(1) as pi[r] - pi[l-1].\n\nComplexity: O(N log log N + q).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    const int N = 1000000;
    vector<char> comp(N + 1, 0);
    vector<int> pi(N + 1, 0);
    comp[0] = comp[1] = 1;
    for (long long i = 2; i * i <= N; i++) if (!comp[i]) for (long long j = i * i; j <= N; j += i) comp[j] = 1;
    for (int i = 1; i <= N; i++) pi[i] = pi[i - 1] + !comp[i];
    int q;
    scanf("%d", &q);
    while (q--) { int l, r; scanf("%d %d", &l, &r); printf("%d\\n", pi[r] - pi[l - 1]); }
}`,
  hidden: () => {
    const r = rng(112);
    const mk = (q: number, f: () => [number, number]) => `${q}\n${Array.from({ length: q }, () => f().join(" ")).join("\n")}\n`;
    const any = (): [number, number] => {
      const a = r.int(1, 1e6);
      return [a, r.int(a, 1e6)];
    };
    const small = (): [number, number] => {
      const a = r.int(1, 100);
      return [a, r.int(a, 100)];
    };
    return ["1\n1 1\n", "1\n2 2\n", "1\n1 1000000\n", "1\n999983 999983\n", "2\n999984 1000000\n1 2\n", mk(100, small), mk(5000, any), mk(50000, any), mk(50000, small), mk(50000, () => [1, r.int(1, 1e6)])];
  },
});

const modPow = P({
  slug: "modular-powers-batch",
  title: "Modular Powers Batch",
  difficulty: "easy",
  rating: 1200,
  tags: ["math", "number-theory"],
  statement: "For each test case compute a^b mod m, i.e. the remainder when a multiplied by itself b times is divided by m.",
  inputFormat: "The first line contains t. Each of the next t lines contains a, b and m.",
  outputFormat: "Print t lines, each with the answer to one test case.",
  constraints: "1 <= t <= 5000\n0 <= a <= 10^18\n1 <= b <= 10^18\n1 <= m <= 10^9",
  samples: [{ input: "3\n2 10 1000\n3 200 13\n5 1 1\n", output: "24\n9\n0\n" }],
  hints: ["b is far too large for a loop of b multiplications.", "Fast exponentiation: square the base and halve the exponent, multiplying into the result when the current bit of b is 1.", "Reduce a mod m first and take modulo after each multiplication. Products stay below 10^18, so long long suffices."],
  editorial: "Binary exponentiation: result = 1 % m; while b > 0: if b is odd, result = result * base % m; base = base * base % m; b >>= 1. After reducing a mod m every product is below 10^18. Starting with 1 % m handles m = 1.\n\nComplexity: O(t log b).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int t;
    scanf("%d", &t);
    while (t--) {
        unsigned long long a, b, m;
        scanf("%llu %llu %llu", &a, &b, &m);
        unsigned long long r = 1 % m;
        a %= m;
        while (b) {
            if (b & 1) r = r * a % m;
            a = a * a % m;
            b >>= 1;
        }
        printf("%llu\\n", r);
    }
}`,
  hidden: () => {
    const r = rng(113);
    const E = 1000000000000000000n;
    const rnd = () => `${r.big(0n, E)} ${r.big(1n, E)} ${r.int(1, 1e9)}`;
    const small = [ "0 1 5", "0 1000000000000000000 1", "1000000000000000000 1000000000000000000 1000000000", "7 1 2", "2 1000000000000000000 999999937", "10 100 1", "999999999 999999999 999999999", "123456789 987654321 1000000000"];
    const t1 = multi(small);
    const t2 = multi(Array.from({ length: 5000 }, rnd));
    const t3 = multi(Array.from({ length: 5000 }, () => `${r.int(0, 20)} ${r.int(1, 40)} ${r.int(1, 100)}`));
    return [t1, t2, t3, multi(Array.from({ length: 2000 }, rnd)), multi(Array.from({ length: 5000 }, () => `${r.big(0n, E)} ${E} 999999937`)), multi(["5 3 1", "2 10 1000"]), multi(Array.from({ length: 300 }, rnd)), multi(Array.from({ length: 1 }, rnd))];
  },
});

const dayOfWeek = P({
  slug: "weekday-of-date",
  title: "Weekday of a Date",
  difficulty: "easy",
  rating: 1200,
  tags: ["implementation", "math"],
  statement:
    "Using the Gregorian calendar rules for leap years (extended backwards to year 1), determine the day of the week for each given date. It is known that 1 January 2000 was a Saturday.",
  inputFormat: "The first line contains t. Each of the next t lines contains a valid date as three integers y, m, d (year, month 1-12, day).",
  outputFormat: "For each date print one line with the full English weekday name: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday or Sunday.",
  constraints: "1 <= t <= 20000\n1 <= y <= 9999\nAll dates are valid.",
  samples: [{ input: "3\n2000 1 1\n2026 11 21\n1999 12 31\n", output: "Saturday\nSaturday\nFriday\n" }],
  hints: ["If you can count the days between a date and a fixed reference date, the weekday follows from the remainder modulo 7.", "Count days as: 365 per year plus leap days (y/4 - y/100 + y/400 of the previous years) plus the days in the earlier months of this year plus d.", "Compute the absolute day number N for every date, compute the same for 2000-01-01, and use (N - N0) mod 7 to index a table starting at Saturday."],
  editorial: "Define days(y, m, d) = 365*(y-1) + L(y-1) + (days in months before m, counting February as 29 in a leap year) + d, where L(x) = x/4 - x/100 + x/400. The weekday is (days(y,m,d) - days(2000,1,1)) mod 7 offset from Saturday.\n\nComplexity: O(t).",
  reference: `#include <bits/stdc++.h>
using namespace std;
bool leap(int y) { return y % 4 == 0 && (y % 100 != 0 || y % 400 == 0); }
long long days(int y, int m, int d) {
    static const int ml[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    long long p = y - 1;
    long long r = 365 * p + p / 4 - p / 100 + p / 400;
    for (int i = 0; i < m - 1; i++) r += ml[i] + (i == 1 && leap(y));
    return r + d;
}
int main() {
    const char *names[] = {"Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"};
    long long base = days(2000, 1, 1);
    int t;
    scanf("%d", &t);
    while (t--) {
        int y, m, d;
        scanf("%d %d %d", &y, &m, &d);
        long long x = ((days(y, m, d) - base) % 7 + 7) % 7;
        puts(names[x]);
    }
}`,
  hidden: () => {
    const r = rng(114);
    const ml = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const leap = (y: number) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    const date = (y: number) => {
      const m = r.int(1, 12);
      return `${y} ${m} ${r.int(1, ml[m - 1]! + (m === 2 && leap(y) ? 1 : 0))}`;
    };
    const edge = ["1 1 1", "9999 12 31", "1900 2 28", "1900 3 1", "2000 2 29", "2000 3 1", "2100 3 1", "1600 2 29", "2024 2 29", "1970 1 1"];
    return [
      multi(edge),
      multi(Array.from({ length: 200 }, () => date(r.int(1, 9999)))),
      multi(Array.from({ length: 20000 }, () => date(r.int(1, 9999)))),
      multi(Array.from({ length: 20000 }, () => date(r.int(1900, 2100)))),
      multi(["2026 11 21"]),
      multi(Array.from({ length: 366 }, (_, i) => { const d = new Date(Date.UTC(2000, 0, 1 + i)); return `${d.getUTCFullYear()} ${d.getUTCMonth() + 1} ${d.getUTCDate()}`; })),
      multi(Array.from({ length: 5000 }, () => date(r.pick([1700, 1800, 1900, 2000, 2100, 400, 800, 4, 100])))),
      multi(["1 1 1", "4 2 29", "100 2 28", "400 12 31"]),
    ];
  },
});

const letterDiamond = P({
  slug: "letter-diamond",
  title: "Letter Diamond",
  difficulty: "easy",
  rating: 900,
  tags: ["implementation", "strings"],
  statement:
    "Print a diamond with 2n - 1 rows. Row i for i = 1..n has n - i leading spaces followed by the letters A, B, ..., up to the i-th letter of the alphabet and then back down to A (for instance row 3 is ABCBA). Rows n+1..2n-1 mirror the first n-1 rows in reverse order.",
  inputFormat: "One line with the integer n.",
  outputFormat: "Print the diamond, one row per line, without trailing spaces.",
  constraints: "1 <= n <= 26",
  samples: [{ input: "3\n", output: "  A\n ABA\nABCBA\n ABA\n  A\n" }],
  hints: ["Write a function that prints a single row given its index.", "Row i: n - i spaces, letters 'A'..'A'+i-1 ascending, then letters 'A'+i-2 down to 'A'.", "Print rows 1..n and then rows n-1 down to 1."],
  editorial: "A helper prints the row for index i; the main loop calls it for i = 1..n then n-1..1. Complexity: O(n^2).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int n;
void row(int i) {
    string s(n - i, ' ');
    for (int j = 0; j < i; j++) s += char('A' + j);
    for (int j = i - 2; j >= 0; j--) s += char('A' + j);
    cout << s << "\\n";
}
int main() {
    cin >> n;
    for (int i = 1; i <= n; i++) row(i);
    for (int i = n - 1; i >= 1; i--) row(i);
}`,
  hidden: () => [1, 2, 3, 4, 5, 8, 13, 20, 25, 26].map((x) => `${x}\n`),
});

const persistence = P({
  slug: "multiplicative-persistence",
  title: "Multiplicative Persistence",
  difficulty: "easy",
  rating: 1000,
  tags: ["math", "implementation", "simulation"],
  statement:
    "Take a number and replace it with the product of its decimal digits. Repeat until the number has a single digit. The number of replacements performed is called its persistence. For example 39 -> 27 -> 14 -> 4 has persistence 3. For each query number print its persistence (a single-digit number has persistence 0).",
  inputFormat: "The first line contains q. Each of the next q lines contains one integer n.",
  outputFormat: "Print q lines with the persistence of each number.",
  constraints: "1 <= q <= 20000\n0 <= n <= 10^18",
  samples: [{ input: "3\n39\n999\n7\n", output: "3\n4\n0\n" }],
  hints: ["Simulate the process directly: the number shrinks very fast.", "A while loop: while n >= 10, multiply its digits (n % 10, n / 10) and count.", "After one step the value is at most 9^18 which fits in long long; any digit 0 makes the product 0."],
  editorial: "Direct simulation. After the first step the number is much smaller, and the persistence is tiny (well below 20 for every n in range), so each query costs about a few hundred operations.\n\nComplexity: O(q * digits * steps).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int q;
    scanf("%d", &q);
    while (q--) {
        unsigned long long n;
        scanf("%llu", &n);
        int steps = 0;
        while (n >= 10) {
            unsigned long long p = 1;
            while (n) { p *= n % 10; n /= 10; }
            n = p;
            steps++;
        }
        printf("%d\\n", steps);
    }
}`,
  hidden: () => {
    const r = rng(116);
    const mk = (q: number, f: () => string | number | bigint) => `${q}\n${Array.from({ length: q }, f).join("\n")}\n`;
    return [
      "5\n0\n9\n10\n99\n1000000000000000000\n",
      "4\n277777788888899\n999999999999999999\n25\n679\n",
      mk(100, () => r.int(0, 100)),
      mk(2000, () => r.int(0, 1e9)),
      mk(20000, () => r.big(0n, 1000000000000000000n)),
      mk(20000, () => r.int(0, 100000)),
      mk(20000, () => 1 + Array.from({ length: 17 }, () => r.int(1, 9)).join("")),
      mk(20000, () => r.int(1, 9) + Array.from({ length: r.int(1, 17) }, () => r.pick([2, 3, 4, 6, 7, 8, 9])).join("")),
    ];
  },
});

// ---------------------------------------------------------------- medium

const digitSumCount = P({
  slug: "count-numbers-with-digit-sum",
  title: "Count Numbers With Digit Sum",
  difficulty: "medium",
  rating: 1700,
  tags: ["dp", "math"],
  statement: "For each query (N, S), count the integers x with 1 <= x <= N whose decimal digits add up to exactly S.",
  inputFormat: "The first line contains t. Each of the next t lines contains N and S.",
  outputFormat: "Print t lines with the counts.",
  constraints: "1 <= t <= 1000\n1 <= N <= 10^18\n1 <= S <= 162",
  samples: [{ input: "2\n100 1\n20 2\n", output: "3\n3\n", explanation: "For N=100, S=1: 1, 10, 100. For N=20, S=2: 2, 11, 20." }],
  hints: ["Think about counting numbers digit by digit from the most significant side.", "Precompute ways[len][s] = number of digit strings of length len (leading zeros allowed) with digit sum s.", "Walk through the digits of N: at each position try every smaller digit, add ways[remaining][S - used - digit], then continue with N's own digit. Finally add 1 if N itself has digit sum S."],
  editorial: "Let ways[l][s] be the number of strings of l digits with sum s: ways[l][s] = sum over d=0..9 of ways[l-1][s-d]. Counting numbers in [0, N] with sum S: for position i with digit c_i, and used sum u for the prefix, every smaller digit d < c_i leaves a free suffix of length r, adding ways[r][S-u-d]. Then fix digit c_i and continue. At the end count N itself if u = S. Zero is never counted because S >= 1. All counts are below 10^18.\n\nComplexity: O(19*10*t + precomputation).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
ll w[20][200];
int main() {
    w[0][0] = 1;
    for (int l = 1; l < 20; l++) for (int s = 0; s < 200; s++) for (int d = 0; d <= 9 && d <= s; d++) w[l][s] += w[l - 1][s - d];
    int t;
    cin >> t;
    while (t--) {
        string N;
        int S;
        cin >> N >> S;
        int L = N.size(), used = 0;
        ll ans = 0;
        for (int i = 0; i < L; i++) {
            int c = N[i] - '0', r = L - 1 - i;
            for (int d = 0; d < c; d++) {
                int need = S - used - d;
                if (need >= 0 && need < 200) ans += w[r][need];
            }
            used += c;
        }
        if (used == S) ans++;
        cout << ans << "\\n";
    }
}`,
  hidden: () => {
    const r = rng(117);
    const E = 1000000000000000000n;
    const q = (n: bigint | number, s: number) => `${n} ${s}`;
    return [
      multi([q(1, 1), q(9, 9), q(10, 1), q(100, 1), q(20, 2), q(E, 1), q(E, 162), q(999999999999999999n, 162), q(999999999999999999n, 81), q(E, 100)]),
      multi(Array.from({ length: 1000 }, () => q(r.big(1n, E), r.int(1, 162)))),
      multi(Array.from({ length: 1000 }, () => q(r.big(1n, E), r.int(60, 100)))),
      multi(Array.from({ length: 1000 }, () => q(r.int(1, 1000), r.int(1, 27)))),
      multi(Array.from({ length: 1000 }, () => q(r.big(1n, E), r.int(1, 20)))),
      multi(Array.from({ length: 1000 }, () => q(r.big(100000000000000000n, E), r.int(1, 162)))),
      multi(["1 1", "1 2", "1000000000 1", "1000000000 9", "123456789 45", "123456789 46", "987654321987654321 90", "10 10", "11 2", "5 5"]),
    ];
  },
});

const coprimePairs = P({
  slug: "coprime-pairs-up-to-n",
  title: "Coprime Pairs Up To N",
  difficulty: "medium",
  rating: 1500,
  tags: ["number-theory", "prefix-sum", "math"],
  statement: "For each query n, count pairs (i, j) with 1 <= i < j <= n and gcd(i, j) = 1.",
  inputFormat: "The first line contains q. Each of the next q lines contains n.",
  outputFormat: "Print q lines with the number of coprime pairs.",
  constraints: "1 <= q <= 50000\n1 <= n <= 10^6",
  samples: [{ input: "3\n1\n2\n5\n", output: "0\n1\n9\n", explanation: "For n=5 there are 10 pairs and only (2,4) is not coprime." }],
  hints: ["Fix the larger element j. How many i < j are coprime to j?", "That count is Euler's totient phi(j). So the answer is phi(2) + ... + phi(n).", "Compute phi for all numbers up to 10^6 with a sieve, build prefix sums (long long) and answer in O(1)."],
  editorial: "The number of i in [1, j-1] with gcd(i, j) = 1 equals phi(j) for j >= 2. So the answer for n is the prefix sum of phi over 2..n. Compute phi with a sieve: initialize phi[i] = i, and for each prime p multiply phi of its multiples by (1 - 1/p), i.e. phi[m] -= phi[m] / p. The answer reaches about 3 * 10^11, so use long long.\n\nComplexity: O(N log log N + q).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    const int N = 1000000;
    vector<int> phi(N + 1);
    for (int i = 0; i <= N; i++) phi[i] = i;
    for (int p = 2; p <= N; p++) if (phi[p] == p) for (int m = p; m <= N; m += p) phi[m] -= phi[m] / p;
    vector<long long> pre(N + 1, 0);
    for (int i = 2; i <= N; i++) pre[i] = pre[i - 1] + phi[i];
    int q;
    scanf("%d", &q);
    while (q--) { int n; scanf("%d", &n); printf("%lld\\n", pre[n]); }
}`,
  hidden: () => {
    const r = rng(118);
    const mk = (q: number, lo: number, hi: number) => `${q}\n${Array.from({ length: q }, () => r.int(lo, hi)).join("\n")}\n`;
    return ["1\n1\n", "1\n1000000\n", "4\n2\n3\n4\n6\n", mk(10, 1, 20), mk(1000, 1, 1e6), mk(50000, 1, 1e6), mk(50000, 1, 1000), mk(50000, 999000, 1e6), `50000\n${Array(50000).fill(1000000).join("\n")}\n`];
  },
});

const FRI_REF = `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
ll days(ll y, int m, int d) {
    y -= m <= 2;
    ll era = y / 400;
    ll yoe = y - era * 400;
    ll doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
    ll doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return era * 146097 + doe - 719468;
}
ll f(ll Y) {
    ll full = Y / 400, rem = Y % 400;
    ll res = full * 688;
    for (int y = 1; y <= rem; y++)
        for (int m = 1; m <= 12; m++) {
            ll z = days(y, m, 13);
            if (((z % 7) + 7 + 4) % 7 == 5) res++;
        }
    return res;
}
int main() {
    int t;
    scanf("%d", &t);
    while (t--) {
        ll a, b;
        scanf("%lld %lld", &a, &b);
        printf("%lld\\n", f(b) - f(a - 1));
    }
}`;

const fridayThirteenths = P({
  slug: "friday-the-thirteenths",
  title: "Friday the Thirteenths",
  difficulty: "medium",
  rating: 1400,
  tags: ["math", "implementation", "simulation"],
  statement:
    "Using the Gregorian calendar (leap year rules extended to all years >= 1), count how many Fridays fall on the 13th day of a month in the years from y1 to y2 inclusive. Hint: the Gregorian calendar repeats exactly every 400 years.",
  inputFormat: "The first line contains t. Each of the next t lines contains y1 and y2.",
  outputFormat: "Print t lines with the answers.",
  constraints: "1 <= t <= 1000\n1 <= y1 <= y2 <= 10^12",
  samples: [{ input: "2\n2026 2026\n1 400\n", output: "3\n688\n", explanation: "In 2026 the 13ths of February, March and November are Fridays. Every 400-year cycle has 688 of them." }],
  hints: ["Years up to 10^12 are too many to simulate one by one.", "The weekday pattern of the calendar repeats every 400 years (146097 days, an exact multiple of 7).", "Let f(Y) count Friday 13ths in years 1..Y: full cycles contribute 688 each and the leftover Y mod 400 years are simulated directly. Answer f(y2) - f(y1-1)."],
  editorial: "Since 146097 = 7 * 20871, the calendar and weekdays repeat every 400 years. Count the Friday 13ths in one cycle by brute force (688), then f(Y) = (Y / 400) * 688 + (count in years 1..Y mod 400), because shifting by whole cycles does not change weekdays. The answer is f(y2) - f(y1 - 1). Use a days-from-civil formula to find the weekday.\n\nComplexity: O(t * 400 * 12).",
  reference: FRI_REF,
  hidden: () => {
    const r = rng(119);
    const E = 1_000_000_000_000;
    const rnd = (hi: number) => {
      const a = r.int(1, hi);
      return `${a} ${r.int(a, hi)}`;
    };
    return [
      multi(["1 1", "13 13", "1 400", "401 800", "1 1000000000000", "1000000000000 1000000000000", "2000 2000", "2026 2026", "1999 2001", "1 399"]),
      multi(Array.from({ length: 1000 }, () => rnd(E))),
      multi(Array.from({ length: 1000 }, () => rnd(3000))),
      multi(Array.from({ length: 1000 }, () => rnd(400))),
      multi(Array.from({ length: 1000 }, () => rnd(1e9))),
      multi(["1900 2100", "2024 2024", "2023 2023", "1 4", "2100 2100", "400 400", "500 1000", "1 1000000000"]),
    ];
  },
});

const handsOverlap = P({
  slug: "clock-hands-overlap",
  title: "Clock Hands Overlap",
  difficulty: "medium",
  rating: 1300,
  tags: ["math", "implementation"],
  statement:
    "On an analog 12-hour clock the hour hand and the minute hand move continuously. They point in exactly the same direction at 12:00, a bit after 1:05, and so on (22 times per day). Time is measured in minutes since midnight. For each query, you are given the starting minute s of the day (0 <= s < 1440) and a duration L. Count the moments t, with s <= t <= s + L (t real, in minutes), at which the two hands overlap. The clock keeps running past midnight.",
  inputFormat: "The first line contains t. Each of the next t lines contains s and L.",
  outputFormat: "Print t lines with the counts.",
  constraints: "1 <= t <= 5000\n0 <= s < 1440\n0 <= L <= 10^18",
  samples: [{ input: "2\n0 720\n60 5\n", output: "12\n0\n", explanation: "From 0 to 720 minutes the hands overlap at k * 720/11 for k = 0..11. Between minutes 60 and 65 they have not met yet (the overlap is at about 65.45)." }],
  hints: ["Work out when the hands overlap: the minute hand turns 6 degrees per minute, the hour hand 0.5 degrees per minute.", "They coincide when 5.5 * t is a multiple of 360, that is at t = 720 * k / 11 for integer k >= 0.", "Count integers k with 11*s <= 720*k <= 11*(s+L): floor(11(s+L)/720) - ceil(11s/720) + 1. Use 128-bit integers, since 11 * 10^18 overflows long long."],
  editorial: "Angle of the minute hand: 6t; hour hand: 0.5t (both from the 12 position at midnight). They overlap when 5.5t is a multiple of 360, so t = 720k/11. Count k with s <= 720k/11 <= s + L, i.e. 11s <= 720k <= 11(s+L). The count is floor(11(s+L)/720) - ceil(11s/720) + 1, which is never negative. Use __int128 for the product.\n\nComplexity: O(1) per query.",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef __int128 LL;
int main() {
    int t;
    scanf("%d", &t);
    while (t--) {
        long long s, L;
        scanf("%lld %lld", &s, &L);
        LL hi = (LL)11 * ((LL)s + L) / 720;
        LL lo = ((LL)11 * s + 719) / 720;
        long long ans = (long long)(hi - lo + 1);
        printf("%lld\\n", ans);
    }
}`,
  hidden: () => {
    const r = rng(120);
    const E = 1000000000000000000n;
    const rnd = (hi: bigint) => `${r.int(0, 1439)} ${r.big(0n, hi)}`;
    return [
      multi(["0 0", "0 720", "60 5", "60 6", "1439 1", "720 0", "0 65", "0 66", "1439 1000000000000000000", "5 1000000000000000000"]),
      multi(Array.from({ length: 5000 }, () => rnd(E))),
      multi(Array.from({ length: 5000 }, () => rnd(100n))),
      multi(Array.from({ length: 5000 }, () => rnd(5000n))),
      multi(Array.from({ length: 5000 }, () => rnd(1000000000n))),
      multi(["0 1440", "0 2880", "1 1439", "1000 100000", "65 1", "66 0"]),
    ];
  },
});

const factorialZerosBase = P({
  slug: "factorial-trailing-zeros-base",
  title: "Factorial Trailing Zeros in Base B",
  difficulty: "medium",
  rating: 1600,
  tags: ["number-theory", "math"],
  statement: "For each test case, write n! (n factorial) in base b. How many zeros does it end with?",
  inputFormat: "The first line contains t. Each of the next t lines contains n and b.",
  outputFormat: "Print t lines with the number of trailing zeros of n! in base b.",
  constraints: "1 <= t <= 1000\n1 <= n <= 10^18\n2 <= b <= 10^12",
  samples: [{ input: "3\n10 10\n100 12\n5 7\n", output: "2\n48\n0\n", explanation: "10! = 3628800 ends with two zeros. 12 = 2^2 * 3, and 100! contains 2^97 and 3^48, giving min(97/2, 48) = 48." }],
  hints: ["The number of trailing zeros in base b is the largest k with b^k dividing n!.", "Factor b = p1^e1 * ... * pm^em. Then k = min over i of floor(v_{pi}(n!) / ei).", "v_p(n!) = n/p + n/p^2 + ... (Legendre). Factor b by trial division using primes up to 10^6; whatever remains above 1 is a single prime with exponent 1."],
  editorial: "b^k | n! iff for every prime power p^e in b, e*k <= v_p(n!). Compute v_p(n!) with Legendre's formula by repeatedly dividing n by p. Factor b by trial division with a sieve of primes up to 10^6; after removing them the remainder is 1 or a prime (since b <= 10^12). The answer is the minimum over primes of v_p / e.\n\nComplexity: O(t * (pi(10^6) + log n * #primes)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    const int N = 1000000;
    vector<char> comp(N + 1, 0);
    vector<int> pr;
    for (int i = 2; i <= N; i++) {
        if (!comp[i]) { pr.push_back(i); for (ll j = (ll)i * i; j <= N; j += i) comp[j] = 1; }
    }
    int t;
    scanf("%d", &t);
    while (t--) {
        ll n, b;
        scanf("%lld %lld", &n, &b);
        vector<pair<ll, int>> f;
        for (int p : pr) {
            if ((ll)p * p > b) break;
            if (b % p == 0) { int e = 0; while (b % p == 0) { b /= p; e++; } f.push_back({p, e}); }
        }
        if (b > 1) f.push_back({b, 1});
        ll best = LLONG_MAX;
        for (auto &pe : f) {
            ll p = pe.first, v = 0, m = n;
            while (m) { m /= p; v += m; }
            best = min(best, v / pe.second);
        }
        printf("%lld\\n", best);
    }
}`,
  hidden: () => {
    const r = rng(121);
    const E = 1000000000000000000n;
    const rnd = () => `${r.big(1n, E)} ${r.int(2, 1e12)}`;
    return [
      multi(["1 2", "10 10", "100 12", "5 7", "1000000000000000000 2", "1000000000000000000 1000000000000", "1000000000000000000 999999999989", "999999 999983", "1000000 999983", "1000000000000000000 720720"]),
      multi(Array.from({ length: 1000 }, rnd)),
      multi(Array.from({ length: 1000 }, () => `${r.big(1n, E)} ${r.int(2, 1000)}`)),
      multi(Array.from({ length: 1000 }, () => `${r.int(1, 1e7)} ${r.int(2, 1e6)}`)),
      multi(Array.from({ length: 1000 }, () => `${r.big(1n, E)} ${r.pick([999999999989, 999966000289, 549755813888, 762939453125, 1000000000000, 735134400, 2, 6, 30])}`)),
      multi(["20 6", "25 25", "50 100", "3 2", "2 3", "4 6"]),
    ];
  },
});

const lastSurvivor = P({
  slug: "last-survivor-every-second",
  title: "Last Survivor Eliminating Every Second",
  difficulty: "medium",
  rating: 1400,
  tags: ["math", "simulation"],
  statement:
    "n people stand in a circle, numbered 1 to n in order. Starting with person 1, they count off: person 1 is skipped, person 2 is eliminated, person 3 is skipped, person 4 is eliminated, and so on around the circle (the count continues past the end of the circle with the survivors, with the person right after the one just eliminated being skipped next). This goes on until one person is left. Who survives?",
  inputFormat: "The first line contains t. Each of the next t lines contains one integer n.",
  outputFormat: "Print t lines with the number of the surviving person.",
  constraints: "1 <= t <= 5000\n1 <= n <= 10^18",
  samples: [{ input: "3\n1\n5\n6\n", output: "1\n3\n5\n", explanation: "n=5: out 2, out 4, then 1 is skipped and 5 ... after removing 2 and 4 the circle is 5, 1, 3 with 5 skipped, 1 eliminated, then 3 is skipped and 5 is eliminated; person 3 survives." }],
  hints: ["Simulate a small n by hand (or code) and write out the answers for n = 1..16.", "After the first pass over the circle, about half the people are gone and the problem restarts with a smaller circle. Compare the answers with the powers of two.", "If 2^m is the largest power of two not exceeding n, the survivor is 2 * (n - 2^m) + 1."],
  editorial: "Let J(n) be the survivor. If n is even, after the first pass exactly the odd-numbered people remain, and the next to be skipped is person 1 again, so J(2k) = 2 J(k) - 1. If n is odd, person 1 is eliminated right after the first pass finishes (n is skipped, 1 is eliminated), the circle restarts at person 3: J(2k+1) = 2 J(k) + 1. Solving gives J(n) = 2 (n - 2^m) + 1 where 2^m is the largest power of two <= n: write n in binary and rotate the leading 1 to the end.\n\nComplexity: O(1) per query.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int t;
    scanf("%d", &t);
    while (t--) {
        unsigned long long n;
        scanf("%llu", &n);
        unsigned long long p = 1ULL << (63 - __builtin_clzll(n));
        printf("%llu\\n", 2 * (n - p) + 1);
    }
}`,
  hidden: () => {
    const r = rng(122);
    const E = 1000000000000000000n;
    return [
      multi(["1", "2", "3", "4", "5", "6", "7", "8", "1000000000000000000", "576460752303423488"]),
      multi(Array.from({ length: 5000 }, () => `${r.big(1n, E)}`)),
      multi(Array.from({ length: 5000 }, () => `${r.int(1, 1000)}`)),
      multi(Array.from({ length: 62 }, (_, i) => `${2n ** BigInt(i)}`)),
      multi(Array.from({ length: 62 }, (_, i) => `${2n ** BigInt(i) - 1n}`).slice(1)),
      multi(Array.from({ length: 5000 }, () => `${r.big(1n, 1000000n)}`)),
      multi(Array.from({ length: 60 }, (_, i) => `${2n ** BigInt(i) + 1n}`)),
      multi(["41", "100", "999999999999999999"]),
    ];
  },
});

// ---------------------------------------------------------------- hard

const gcdGridSum = P({
  slug: "gcd-grid-sum-queries",
  title: "GCD Grid Sum Queries",
  difficulty: "hard",
  rating: 1900,
  tags: ["number-theory", "math", "prefix-sum"],
  statement: "For each query n, compute the sum of gcd(i, j) over all pairs (i, j) with 1 <= i <= n and 1 <= j <= n (ordered pairs, including i = j).",
  inputFormat: "The first line contains q. Each of the next q lines contains one integer n.",
  outputFormat: "Print q lines with the sums.",
  constraints: "1 <= q <= 50000\n1 <= n <= 10^6",
  samples: [{ input: "3\n1\n2\n3\n", output: "1\n5\n12\n", explanation: "n=2: gcd(1,1)+gcd(1,2)+gcd(2,1)+gcd(2,2) = 1+1+1+2 = 5." }],
  hints: ["Try grouping the pairs by the larger element j: define S(j) = sum of gcd(i, j) for i = 1..j.", "S(j) = sum over d dividing j of d * phi(j / d), since exactly phi(j/d) values of i have gcd(i, j) = d. Compute S for all j with a harmonic-sum loop.", "The full grid sum is 2 * (S(1) + ... + S(n)) - n(n+1)/2, because off-diagonal pairs are counted twice and the diagonal pairs (j, j) contribute sum of j. Prefix-sum S and answer queries in O(1)."],
  editorial: "For fixed j, the number of i in [1, j] with gcd(i, j) = d is phi(j/d) when d | j. Hence S(j) = sum_{d | j} d * phi(j / d). Compute phi by a sieve, then for each d and each k add d * phi(k) to S(d * k): O(N log N) in total. The grid sum is G(n) = 2 * sum_{j<=n} S(j) - sum_{j<=n} j, because the pairs with i < j and i > j are symmetric and the diagonal contributes gcd(j, j) = j once. G(10^6) is about 4 * 10^12, which fits in long long. Naively looping over n per query would take 5 * 10^10 steps, too slow.\n\nComplexity: O(N log N + q).",
  timeLimitMs: 2000,
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    const int N = 1000000;
    vector<int> phi(N + 1);
    for (int i = 0; i <= N; i++) phi[i] = i;
    for (int p = 2; p <= N; p++) if (phi[p] == p) for (int m = p; m <= N; m += p) phi[m] -= phi[m] / p;
    vector<ll> S(N + 1, 0);
    for (int d = 1; d <= N; d++) for (int k = 1; (ll)d * k <= N; k++) S[d * k] += (ll)d * phi[k];
    vector<ll> pre(N + 1, 0);
    for (int i = 1; i <= N; i++) pre[i] = pre[i - 1] + S[i];
    int q;
    scanf("%d", &q);
    while (q--) { ll n; scanf("%lld", &n); printf("%lld\\n", 2 * pre[n] - n * (n + 1) / 2); }
}`,
  hidden: () => {
    const r = rng(123);
    const mk = (q: number, lo: number, hi: number) => `${q}\n${Array.from({ length: q }, () => r.int(lo, hi)).join("\n")}\n`;
    return ["1\n1\n", "1\n1000000\n", "5\n1\n2\n3\n4\n5\n", mk(20, 1, 30), mk(1000, 1, 1e6), mk(50000, 1, 1e6), mk(50000, 990000, 1e6), mk(50000, 1, 5000), `50000\n${Array(50000).fill(999983).join("\n")}\n`];
  },
});

const decimalCycle = P({
  slug: "decimal-expansion-cycle",
  title: "Decimal Expansion Cycle",
  difficulty: "hard",
  rating: 2100,
  tags: ["number-theory", "math"],
  statement:
    "The fraction 1/n has a decimal expansion that is either finite or eventually periodic. Write it as 0.(prefix)(cycle)(cycle)... where the prefix is the shortest possible non-repeating part and the cycle is the shortest possible repeating block. For each n print the length of the prefix and the length of the cycle. A finite expansion has cycle length 0 (e.g. 1/8 = 0.125 has prefix length 3). For n = 1 both are 0.",
  inputFormat: "The first line contains t. Each of the next t lines contains one integer n.",
  outputFormat: "Print t lines, each with two integers: the prefix length and the cycle length.",
  constraints: "1 <= t <= 200\n1 <= n <= 10^12",
  samples: [{ input: "4\n7\n12\n8\n1\n", output: "0 6\n2 1\n3 0\n0 0\n", explanation: "1/7 = 0.(142857). 1/12 = 0.08(3). 1/8 = 0.125. 1/1 = 1." }],
  timeLimitMs: 2000,
  hints: ["Write n = 2^a * 5^b * m with m coprime to 10. What do the factors 2 and 5 contribute?", "The prefix length is max(a, b). The cycle length is the multiplicative order of 10 modulo m (0 if m = 1).", "The order divides phi(m). Factor m by trial division with primes up to 10^6, build phi(m), factor it too (using the factorizations of p - 1), then divide out each prime q of phi(m) from the candidate order while 10^(order/q) mod m stays 1. Use 128-bit modular multiplication."],
  editorial: "1/n = 1/(2^a 5^b m). Multiplying by 10^max(a,b) makes the denominator m, so the non-repeating prefix has length max(a, b), and the period is the smallest k with 10^k = 1 (mod m), the multiplicative order of 10 modulo m. If m = 1 there is no cycle. The order divides phi(m). Factor m with a sieve of primes up to 10^6 (the leftover is prime since m <= 10^12), compute phi(m) = product p^(e-1)(p-1), and factor phi(m) by combining the prime factors of each p - 1 (again by trial division) with p for every e > 1. Start with ord = phi(m) and for each prime q of phi(m) while q | ord and 10^(ord/q) = 1 (mod m), set ord /= q. Modular multiplication uses __int128.\n\nComplexity: O(t * pi(10^6) * (number of distinct primes)).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef unsigned long long ull;
vector<int> pr;
vector<pair<ll, int>> fac(ll n) {
    vector<pair<ll, int>> f;
    for (int p : pr) {
        if ((ll)p * p > n) break;
        if (n % p == 0) { int e = 0; while (n % p == 0) { n /= p; e++; } f.push_back({p, e}); }
    }
    if (n > 1) f.push_back({n, 1});
    return f;
}
ll pw(ll b, ll e, ll m) {
    ll r = 1 % m;
    b %= m;
    while (e) {
        if (e & 1) r = (ll)((__int128)r * b % m);
        b = (ll)((__int128)b * b % m);
        e >>= 1;
    }
    return r;
}
int main() {
    const int N = 1000000;
    vector<char> comp(N + 1, 0);
    for (int i = 2; i <= N; i++) {
        if (!comp[i]) { pr.push_back(i); for (ll j = (ll)i * i; j <= N; j += i) comp[j] = 1; }
    }
    int t;
    scanf("%d", &t);
    while (t--) {
        ll n;
        scanf("%lld", &n);
        int a = 0, b = 0;
        while (n % 2 == 0) { n /= 2; a++; }
        while (n % 5 == 0) { n /= 5; b++; }
        int pre = max(a, b);
        if (n == 1) { printf("%d 0\\n", pre); continue; }
        auto f = fac(n);
        ll phi = 1;
        set<ll> qs;
        for (auto &pe : f) {
            ll p = pe.first;
            for (int i = 1; i < pe.second; i++) phi *= p;
            phi *= (p - 1);
            if (pe.second > 1) qs.insert(p);
            for (auto &x : fac(p - 1)) qs.insert(x.first);
        }
        ll ord = phi;
        for (ll q : qs) while (ord % q == 0 && pw(10, ord / q, n) == 1) ord /= q;
        printf("%d %lld\\n", pre, ord);
    }
}`,
  hidden: () => {
    const r = rng(124);
    const E = 1_000_000_000_000;
    const big = [999999999989, 999966000289, 549755813888, 762939453125, 1000000000000, 999999999999, 1000000007, 998244353, 999983 * 999979, 1000003 * 999999, 3 * 3 * 3 * 7 * 11 * 13 * 37, 999999000000];
    return [
      multi(["1", "2", "3", "7", "8", "12", "13", "21", "99", "101", "999", "27", "37", "41", "271"]),
      multi(big.map(String)),
      multi(Array.from({ length: 200 }, () => `${r.int(1, E)}`)),
      multi(Array.from({ length: 200 }, () => `${r.int(1, 1e6)}`)),
      multi(Array.from({ length: 200 }, () => `${r.int(E - 1000, E)}`)),
      multi(Array.from({ length: 200 }, () => `${r.pick([2, 5, 10, 4, 25, 3, 9, 81, 6, 7]) * r.int(1, 1e5)}`)),
      multi(Array.from({ length: 100 }, (_, i) => `${i + 1}`)),
      multi(Array.from({ length: 200 }, () => `${r.int(1, 1e9) * r.pick([1, 3, 7, 11, 13, 101])}`)),
    ];
  },
});

export const problems: ProblemSeed[] = [
  leapYearCount,
  reverseNumber,
  multiplesGame,
  clockAdd,
  digitStaircase,
  minMaxAbove,
  secondsToDhms,
  digitFrequency,
  baseConvert,
  gcdLcmArray,
  divisorCountQueries,
  primesInRange,
  modPow,
  dayOfWeek,
  letterDiamond,
  persistence,
  digitSumCount,
  coprimePairs,
  fridayThirteenths,
  handsOverlap,
  factorialZerosBase,
  lastSurvivor,
  gcdGridSum,
  decimalCycle,
];
