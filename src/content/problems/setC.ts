import { rng } from "./rng";
import type { ProblemSeed } from "./types";

type Spec = Omit<ProblemSeed, "timeLimitMs" | "memoryLimitMb" | "estimatedMinutes"> & { timeLimitMs?: number; estimatedMinutes?: number };

const P = (s: Spec): ProblemSeed => ({
  timeLimitMs: 1000,
  memoryLimitMb: 256,
  estimatedMinutes: s.difficulty === "newbie" ? 8 : s.difficulty === "easy" ? 15 : s.difficulty === "medium" ? 30 : s.difficulty === "hard" ? 50 : 75,
  ...s,
});

type Rng = ReturnType<typeof rng>;
/** Random string of n letters drawn from the first k lowercase letters. */
const rs = (r: Rng, n: number, k: number) => {
  let s = "";
  for (let i = 0; i < n; i++) s += String.fromCharCode(97 + r.int(0, k - 1));
  return s;
};
// ---------------------------------------------------------------- newbie

const cleanPalindrome = P({
  slug: "clean-palindrome-check",
  title: "Palindrome After Cleaning",
  difficulty: "newbie",
  rating: 800,
  tags: ["strings", "implementation", "two-pointers"],
  statement:
    "A line of text may contain letters, digits, spaces and punctuation. Ignore every character that is not a letter or a digit, and ignore the difference between upper and lower case. Decide whether the remaining sequence of characters reads the same forwards and backwards. An empty remaining sequence counts as a palindrome.",
  inputFormat: "One line of printable ASCII characters (it may contain spaces).",
  outputFormat: "Print YES if the cleaned text is a palindrome, otherwise NO.",
  constraints: "1 <= length of the line <= 1000",
  samples: [
    { input: "A man, a plan, a canal: Panama\n", output: "YES\n", explanation: "Cleaned: amanaplanacanalpanama." },
    { input: "race a car\n", output: "NO\n" },
  ],
  hints: [
    "Spaces and punctuation should not influence the answer, so first build a cleaned version of the text.",
    "Keep only characters for which isalnum is true and convert them to lower case, then compare with the reversed string (or use two pointers).",
    "Read the whole line with getline, because the text contains spaces.",
  ],
  editorial:
    "Filter the line to letters and digits, lower-case them, and compare the result with its reverse. An empty result is trivially a palindrome. Reading must use getline so that spaces are not treated as separators.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s, t;
    getline(cin, s);
    for (char c : s) if (isalnum((unsigned char)c)) t += (char)tolower((unsigned char)c);
    string r(t.rbegin(), t.rend());
    cout << (t == r ? "YES" : "NO") << "\\n";
}`,
  hidden: () => {
    const r = rng(3001);
    const t = ["a", "Ab", "No lemon, no melon", "!!!", "0P", "12321", "Was it a car or a cat I saw?", "ab ba", "ab, c", "Madam, I'm Adam"];
    const noisy = (core: string) => {
      let o = "";
      for (const ch of core) {
        if (r.int(0, 2) === 0 && /[a-z]/.test(ch)) o += ch.toUpperCase();
        else o += ch;
        if (r.int(0, 3) === 0) o += r.pick([" ", ",", ".", ";", ":", "!", "-", "?"]);
      }
      return o.trim();
    };
    const alnum = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 6; i++) {
      const half = Array.from({ length: r.int(5, 200) }, () => r.pick(alnum.split(""))).join("");
      const mid = r.int(0, 1) ? r.pick(alnum.split("")) : "";
      let core = half + mid + [...half].reverse().join("");
      if (i % 2 === 1) {
        const p = r.int(0, core.length - 1);
        const old = core[p]!;
        let nc = r.pick(alnum.split(""));
        while (nc === old) nc = r.pick(alnum.split(""));
        const mirror = core.length - 1 - p;
        if (mirror === p) core = core.slice(0, p) + nc + core.slice(p + 1);
        else core = core.slice(0, p) + nc + core.slice(p + 1);
      }
      t.push(noisy(core).slice(0, 1000));
    }
    return t.map((x) => `${x}\n`);
  },
});

const runLengthEncode = P({
  slug: "run-length-encode-string",
  title: "Run-Length Encoding",
  difficulty: "newbie",
  rating: 800,
  tags: ["strings", "implementation"],
  statement:
    "Compress a lowercase string by replacing every maximal block of equal consecutive letters with the letter followed by the length of the block, written in decimal. A block of length 1 is still written with its count, so `abb` becomes `a1b2`.",
  inputFormat: "One line containing the string s.",
  outputFormat: "Print the encoded string.",
  constraints: "1 <= |s| <= 100000, s consists of lowercase English letters",
  samples: [
    { input: "aaabccdddd\n", output: "a3b1c2d4\n" },
    { input: "z\n", output: "z1\n" },
  ],
  hints: [
    "Walk through the string and notice where the letter changes.",
    "Keep a counter for the current run; when the next character differs (or the string ends), output the letter and the counter.",
    "Counts can have several digits, so append them with to_string rather than as a single character.",
  ],
  editorial: "Scan with an index i; extend j while s[j] == s[i]; append s[i] and j - i; continue from j.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    cin >> s;
    string out;
    size_t i = 0;
    while (i < s.size()) {
        size_t j = i;
        while (j < s.size() && s[j] == s[i]) j++;
        out += s[i];
        out += to_string(j - i);
        i = j;
    }
    cout << out << "\\n";
}`,
  hidden: () => {
    const r = rng(3002);
    const runs = (total: number, maxRun: number, k: number) => {
      let s = "";
      while (s.length < total) s += String.fromCharCode(97 + r.int(0, k - 1)).repeat(r.int(1, maxRun));
      return s.slice(0, total);
    };
    return [
      "a",
      "ab",
      "aa",
      "a".repeat(100000),
      "ab".repeat(50000),
      "abcdefghijklmnopqrstuvwxyz",
      runs(100, 5, 3),
      runs(1000, 30, 26),
      runs(100000, 2000, 26),
      rs(r, 100000, 2),
      runs(5000, 9, 2),
      "z".repeat(99999) + "y",
    ].map((x) => `${x}\n`);
  },
});

const caesarShift = P({
  slug: "caesar-shift-text",
  title: "Caesar Shift",
  difficulty: "newbie",
  rating: 800,
  tags: ["strings", "implementation", "math"],
  statement:
    "Shift every letter of a text by k positions in the alphabet, wrapping around from z to a. Upper-case letters stay upper case and lower-case letters stay lower case. A negative k shifts backwards. Characters that are not letters (digits, spaces, punctuation) are copied unchanged.",
  inputFormat: "The first line contains the integer k. The second line contains the text.",
  outputFormat: "Print the shifted text on one line.",
  constraints: "-10^9 <= k <= 10^9\n1 <= length of the text <= 100000; the text contains printable ASCII characters and does not start or end with a space.",
  samples: [
    { input: "3\nHello, World!\n", output: "Khoor, Zruog!\n" },
    { input: "-1\nabc XYZ\n", output: "zab WXY\n" },
  ],
  hints: [
    "Shifting by 26 changes nothing, so only k modulo 26 matters.",
    "Normalize the shift to 0..25 with ((k % 26) + 26) % 26, then rotate each letter inside its own case range.",
    "Read the text with getline (it contains spaces) and test islower / isupper for each character.",
  ],
  editorial: "Compute s = ((k mod 26) + 26) mod 26. For a letter c with base 'a' or 'A', output base + (c - base + s) mod 26. Other characters are copied.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    long long k;
    cin >> k;
    string line;
    getline(cin, line);
    getline(cin, line);
    int s = (int)(((k % 26) + 26) % 26);
    for (char &c : line) {
        if (c >= 'a' && c <= 'z') c = (char)('a' + (c - 'a' + s) % 26);
        else if (c >= 'A' && c <= 'Z') c = (char)('A' + (c - 'A' + s) % 26);
    }
    cout << line << "\\n";
}`,
  hidden: () => {
    const r = rng(3003);
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.!?-";
    const text = (n: number) => {
      let s = "";
      for (let i = 0; i < n; i++) s += chars[r.int(0, chars.length - 1)];
      return s.trim() || "x";
    };
    const t: [number, string][] = [
      [0, "Same text"],
      [26, "Same text"],
      [1, "zZ aA"],
      [-1, "zZ aA"],
      [1000000000, "abcdefghijklmnopqrstuvwxyz"],
      [-1000000000, "ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
      [13, "Hello, World! 123"],
      [25, text(50)],
      [r.int(-1e9, 1e9), text(1000)],
      [r.int(-1e9, 1e9), text(100000)],
      [7, "a"],
    ];
    return t.map(([k, s]) => `${k}\n${s}\n`);
  },
});

// ---------------------------------------------------------------- easy

const anagramGroups = P({
  slug: "anagram-group-sizes",
  title: "Anagram Groups",
  difficulty: "easy",
  rating: 900,
  tags: ["strings", "hashing", "sorting"],
  statement:
    "Two words are anagrams if one can be obtained from the other by rearranging its letters. Anagram-ness splits n given words into groups: two words are in the same group exactly when they are anagrams. Equal words are anagrams of each other. Report how many groups there are and how many words the largest group contains.",
  inputFormat: "The first line contains n. The second line contains n words separated by spaces.",
  outputFormat: "Print two integers: the number of groups and the size of the largest group.",
  constraints: "1 <= n <= 20000\nEach word has 1 to 10 lowercase English letters.",
  samples: [{ input: "6\nlisten silent enlist google gogole cat\n", output: "3 3\n", explanation: "Groups: {listen, silent, enlist}, {google, gogole}, {cat}." }],
  hints: [
    "Find a representation that is identical for all words in the same group.",
    "Sorting the letters of a word gives such a canonical key; count how many words share each key with a map.",
    "Use std::map<string,int> (or sort the keys), then take the map size and the maximum value.",
  ],
  editorial: "Sort the letters of each word to get its key. Anagrams share keys and only anagrams do. Count keys in a map; the number of groups is the map size and the largest group is the max count.\n\nComplexity: O(n * L log L) with L <= 10.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    cin >> n;
    map<string, int> cnt;
    for (int i = 0; i < n; i++) {
        string w;
        cin >> w;
        sort(w.begin(), w.end());
        cnt[w]++;
    }
    int best = 0;
    for (auto &kv : cnt) best = max(best, kv.second);
    cout << cnt.size() << " " << best << "\\n";
}`,
  hidden: () => {
    const r = rng(3004);
    const mk = (n: number, bases: number, k: number, len: number) => {
      const bs = Array.from({ length: bases }, () => rs(r, r.int(1, len), k));
      const w: string[] = [];
      for (let i = 0; i < n; i++) w.push(r.shuffle([...r.pick(bs)]).join(""));
      return `${n}\n${w.join(" ")}\n`;
    };
    const rand = (n: number, k: number, len: number) => `${n}\n${Array.from({ length: n }, () => rs(r, r.int(1, len), k)).join(" ")}\n`;
    return [
      "1\na\n",
      "2\nab ba\n",
      "3\nab ab ab\n",
      "4\nabc abd bca dba\n",
      mk(1000, 20, 5, 6),
      mk(20000, 100, 26, 10),
      mk(20000, 5, 3, 10),
      rand(20000, 26, 10),
      rand(20000, 2, 10),
      rand(20000, 3, 4),
      `20000\n${Array.from({ length: 20000 }, () => "abcdefghij").join(" ")}\n`,
      mk(30000, 3000, 26, 10),
    ];
  },
});

const kthCharExpansion = P({
  slug: "kth-char-of-expansion",
  title: "Letter at a Position in a Compressed String",
  difficulty: "easy",
  rating: 1100,
  tags: ["strings", "binary-search", "prefix-sums"],
  statement:
    "A long string is stored in run-length form: a list of m blocks, block i being a letter c_i repeated cnt_i times; the string is the concatenation of all blocks in order. Adjacent blocks may carry the same letter. Answer q queries: for a position k (1-based), which letter stands there?",
  inputFormat: "The first line contains m and q. Each of the next m lines contains a lowercase letter and the integer cnt_i. The last line contains q integers k_1 ... k_q.",
  outputFormat: "Print q lines, the i-th being the letter at position k_i.",
  constraints: "1 <= m, q <= 25000\n1 <= cnt_i <= 10^9\n1 <= k_i <= total length of the string (up to 2.5 * 10^13)",
  samples: [{ input: "3 4\na 2\nb 3\nc 1\n1 3 5 6\n", output: "a\nb\nb\nc\n", explanation: "The expanded string is aabbbc." }],
  hints: [
    "The expanded string is far too long to build, so work with the blocks only.",
    "Prefix sums of the counts are sorted; a query is a search for the first prefix sum >= k.",
    "Use 64-bit integers and std::lower_bound on the prefix array.",
  ],
  editorial: "Let P_i = cnt_1 + ... + cnt_i. The answer for k is the letter of the smallest i with P_i >= k, found by binary search.\n\nComplexity: O((m + q) log m).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int m, q;
    scanf("%d %d", &m, &q);
    vector<char> c(m);
    vector<long long> p(m);
    long long run = 0;
    for (int i = 0; i < m; i++) {
        char ch;
        long long cnt;
        scanf(" %c %lld", &ch, &cnt);
        c[i] = ch;
        run += cnt;
        p[i] = run;
    }
    while (q--) {
        long long k;
        scanf("%lld", &k);
        int i = (int)(lower_bound(p.begin(), p.end(), k) - p.begin());
        printf("%c\\n", c[i]);
    }
}`,
  hidden: () => {
    const r = rng(3005);
    const mk = (m: number, q: number, maxCnt: number) => {
      const rows: string[] = [];
      const pre: number[] = [];
      let tot = 0;
      for (let i = 0; i < m; i++) {
        const c = r.int(1, maxCnt);
        tot += c;
        pre.push(tot);
        rows.push(`${String.fromCharCode(97 + r.int(0, 25))} ${c}`);
      }
      const ks: number[] = [];
      for (let i = 0; i < q; i++) {
        const t = r.int(0, 3);
        if (t === 0) ks.push(r.int(1, tot));
        else if (t === 1) ks.push(pre[r.int(0, m - 1)]!);
        else if (t === 2) ks.push(Math.min(tot, pre[r.int(0, m - 1)]! + 1));
        else ks.push(r.int(1, Math.min(tot, 100)));
      }
      return `${m} ${q}\n${rows.join("\n")}\n${ks.join(" ")}\n`;
    };
    return [
      "1 1\na 1\n1\n",
      "1 3\nz 1000000000\n1 500000000 1000000000\n",
      "2 4\na 1\na 1\n1 2 1 2\n",
      "3 6\nx 1\ny 1\nz 1\n1 2 3 1 2 3\n",
      mk(5, 10, 3),
      mk(50, 100, 1000),
      mk(1000, 1000, 1000000000),
      mk(25000, 25000, 1000000000),
      mk(25000, 25000, 1),
      mk(25000, 20000, 1000000000),
      mk(200, 500, 1000000000),
      mk(10, 30, 5),
    ];
  },
});

const longestCommonPrefix = P({
  slug: "common-prefix-of-words",
  title: "Common Prefix of Many Words",
  difficulty: "easy",
  rating: 900,
  tags: ["strings", "implementation"],
  statement:
    "Given n lowercase words, find the longest string that is a prefix of every one of them. If the only common prefix is the empty string, print a single minus sign instead.",
  inputFormat: "The first line contains n. Each of the next n lines contains one word.",
  outputFormat: "Print the longest common prefix, or `-` if it is empty.",
  constraints: "1 <= n <= 10000\nEvery word is non-empty and consists of lowercase letters; the total length of all words is at most 200000.",
  samples: [
    { input: "3\nflower\nflow\nflight\n", output: "fl\n" },
    { input: "2\nabc\nxyz\n", output: "-\n" },
  ],
  hints: [
    "The common prefix can never be longer than the shortest word.",
    "Start with the first word as the candidate and shorten it against each next word, or compare column by column.",
    "Track the prefix length as an integer and stop as soon as a mismatch appears.",
  ],
  editorial: "Keep len = |w_1|. For each further word, reduce len to the length of the common prefix of the current prefix and that word. Print the first len characters of w_1, or `-` if len is 0. A single word is its own common prefix.\n\nComplexity: O(total length).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    cin >> n;
    string first;
    cin >> first;
    size_t len = first.size();
    for (int i = 1; i < n; i++) {
        string w;
        cin >> w;
        size_t j = 0;
        while (j < len && j < w.size() && w[j] == first[j]) j++;
        len = j;
    }
    if (len == 0) cout << "-\\n";
    else cout << first.substr(0, len) << "\\n";
}`,
  hidden: () => {
    const r = rng(3006);
    const mk = (n: number, pre: number, tail: number, k: number) => {
      const p = rs(r, pre, k);
      const w = Array.from({ length: n }, () => p + rs(r, r.int(1, tail), k));
      return `${n}\n${w.join("\n")}\n`;
    };
    return [
      "1\nabc\n",
      "2\na\nb\n",
      "2\nabc\nabc\n",
      "3\nabc\nab\nabcd\n",
      "3\nabc\nabd\nabx\n",
      mk(10, 5, 5, 3),
      mk(10000, 5, 15, 26),
      mk(10000, 0, 15, 26),
      `2\n${"a".repeat(100000)}\n${"a".repeat(99999)}b\n`,
      `2\n${"ab".repeat(50000)}\n${"ab".repeat(50000)}\n`,
      mk(1000, 100, 50, 2),
      mk(5000, 12, 20, 1),
    ];
  },
});

const firstUniqueChar = P({
  slug: "first-lonely-letter",
  title: "First Lonely Letter",
  difficulty: "easy",
  rating: 900,
  tags: ["strings", "frequency-counting"],
  statement:
    "A letter of a string is lonely if it appears in the whole string exactly once. Find the leftmost lonely letter and print its position (1-based). If no letter is lonely print -1.",
  inputFormat: "One line with the string s.",
  outputFormat: "Print the position, or -1.",
  constraints: "1 <= |s| <= 100000, lowercase English letters",
  samples: [
    { input: "swiss\n", output: "2\n", explanation: "s appears 3 times, w once, i once; w is the leftmost lonely letter." },
    { input: "aabb\n", output: "-1\n" },
  ],
  hints: [
    "Whether a letter is lonely depends on the whole string, not only on what you have seen so far.",
    "Count occurrences of each of the 26 letters first, then scan again for the first letter whose count is 1.",
    "Two passes with an array of size 26.",
  ],
  editorial: "Count letters in one pass; in a second pass return the first index i with count[s[i]] == 1, else -1.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    cin >> s;
    int cnt[26] = {0};
    for (char c : s) cnt[c - 'a']++;
    for (size_t i = 0; i < s.size(); i++) {
        if (cnt[s[i] - 'a'] == 1) {
            cout << i + 1 << "\\n";
            return 0;
        }
    }
    cout << -1 << "\\n";
}`,
  hidden: () => {
    const r = rng(3007);
    const dbl = (n: number) => {
      let s = "";
      for (let i = 0; i < n; i++) s += String.fromCharCode(97 + r.int(0, 25)).repeat(2);
      return s;
    };
    const lastLonely = "a".repeat(49999) + "b" + "a".repeat(49999) + "c";
    return [
      "a",
      "aa",
      "ab",
      "aab",
      "abcabc",
      "abcabcd",
      "z".repeat(100000),
      rs(r, 100000, 26),
      rs(r, 1000, 3),
      dbl(500),
      lastLonely.slice(0, 99999),
      dbl(100) + "q",
    ].map((x) => `${x}\n`);
  },
});

const smallestRotation = P({
  slug: "lexicographically-smallest-rotation",
  title: "Smallest Rotation",
  difficulty: "easy",
  rating: 1100,
  tags: ["strings", "implementation", "lexicographic"],
  statement:
    "A rotation of a string moves some number (possibly zero) of leading characters to the end: for example, rotations of `cab` are `cab`, `abc` and `bca`. Print the lexicographically smallest rotation of the given string.",
  inputFormat: "One line with the string s.",
  outputFormat: "Print the smallest rotation of s.",
  constraints: "1 <= |s| <= 3000, lowercase English letters",
  samples: [
    { input: "cabca\n", output: "abcac\n" },
    { input: "aaaa\n", output: "aaaa\n" },
  ],
  hints: [
    "There are only |s| different rotations.",
    "Build the rotation starting at every position and keep the smallest one; compare strings with the built-in operator <.",
    "A convenient trick: all rotations are substrings of s + s of length |s|.",
  ],
  editorial: "With t = s + s, the rotation starting at i is t.substr(i, n). Compare all n candidates and keep the minimum. With n <= 3000 this costs O(n^2), which is fast enough.\n\nComplexity: O(n^2).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    cin >> s;
    int n = (int)s.size();
    string t = s + s;
    string best = s;
    for (int i = 1; i < n; i++) {
        string c = t.substr(i, n);
        if (c < best) best = c;
    }
    cout << best << "\\n";
}`,
  hidden: () => {
    const r = rng(3008);
    return [
      "a",
      "ba",
      "bca",
      "abab",
      "baba",
      "z".repeat(3000),
      "b".repeat(2999) + "a",
      "a".repeat(2999) + "b",
      rs(r, 3000, 2),
      rs(r, 3000, 26),
      "ab".repeat(1000) + "b".repeat(0),
      "cab".repeat(900) + "ca",
      rs(r, 2000, 3),
    ].map((x) => `${x}\n`);
  },
});

const vigenere = P({
  slug: "vigenere-cipher-transform",
  title: "Vigenere Cipher",
  difficulty: "easy",
  rating: 1200,
  tags: ["strings", "implementation", "cipher"],
  statement:
    "The Vigenere cipher uses a lowercase key. Letters of the text are numbered 1, 2, 3, ... in order of appearance, ignoring every non-letter character. The i-th letter is shifted by the value of the key letter at position ((i - 1) mod |key|) (a = 0, b = 1, ..., z = 25): forward for encryption (E), backward for decryption (D), wrapping around the alphabet. Upper-case letters stay upper case. Non-letters are copied unchanged and do not consume key letters.",
  inputFormat: "The first line contains a mode letter (E or D) and the key, separated by a space. The second line contains the text.",
  outputFormat: "Print the transformed text.",
  constraints: "1 <= |key| <= 100, key consists of lowercase letters\n1 <= |text| <= 100000, printable ASCII, no leading or trailing space",
  samples: [
    { input: "E ab\nabc\n", output: "acc\n" },
    { input: "D ab\nBcd!\n", output: "Bbd!\n" },
  ],
  hints: [
    "Only letters advance the key position, so keep a separate counter for letters.",
    "Shift = key[counter % |key|] - 'a'. For decryption use 26 - shift.",
    "Handle upper and lower case with their own base character; copy everything else untouched.",
  ],
  editorial: "Iterate over the text with a letter counter j. For a letter with base b ('a' or 'A') and shift s = key[j mod |key|] - 'a' (or 26 - s when decrypting), output b + (c - b + s) mod 26 and increment j. Non-letters are printed as they are.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    char mode;
    string key, text;
    cin >> mode >> key;
    getline(cin, text);
    getline(cin, text);
    size_t j = 0;
    for (char &c : text) {
        char base;
        if (c >= 'a' && c <= 'z') base = 'a';
        else if (c >= 'A' && c <= 'Z') base = 'A';
        else continue;
        int s = key[j % key.size()] - 'a';
        j++;
        if (mode == 'D') s = (26 - s) % 26;
        c = (char)(base + (c - base + s) % 26);
    }
    cout << text << "\\n";
}`,
  hidden: () => {
    const r = rng(3009);
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.!?-";
    const text = (n: number) => {
      let s = "";
      for (let i = 0; i < n; i++) s += chars[r.int(0, chars.length - 1)];
      return s.trim() || "x";
    };
    const t: [string, string, string][] = [
      ["E", "a", "Hello"],
      ["E", "z", "Hello, World"],
      ["D", "z", "Gdkkn, Vnqkc"],
      ["E", "abc", "a b c d e f g"],
      ["D", "abc", "a b c d e f g"],
      ["E", "lemon", "Attack at dawn!"],
      ["D", "lemon", "Lxfopv ef rnhr!"],
      ["E", rs(r, 100, 26), text(500)],
      ["D", rs(r, 100, 26), text(500)],
      ["E", rs(r, 7, 26), text(100000)],
      ["D", rs(r, 1, 26), text(100000)],
      ["E", "zzzzzzzzzz", "ZZZZZ zzzzz 12345"],
    ];
    return t.map(([m, k, s]) => `${m} ${k}\n${s}\n`);
  },
});

// ---------------------------------------------------------------- medium

const patternOccurrences = P({
  slug: "overlapping-pattern-occurrences",
  title: "Pattern Occurrences",
  difficulty: "medium",
  rating: 1300,
  tags: ["strings", "kmp", "prefix-function"],
  statement:
    "Count how many times a pattern p occurs in a text t as a contiguous substring. Occurrences may overlap, so `aa` occurs 4 times in `aaaaa`. Also report the 1-based starting position of the last occurrence.",
  inputFormat: "The first line contains the text t. The second line contains the pattern p.",
  outputFormat: "Print two integers: the number of occurrences and the starting position of the last one (or -1 if there are none).",
  constraints: "1 <= |p| <= |t| <= 300000 and |p| <= 100000; lowercase English letters",
  samples: [
    { input: "aaaaa\naa\n", output: "4 4\n" },
    { input: "abc\nd\n", output: "0 -1\n" },
  ],
  hints: [
    "Comparing p against every position costs O(|t| * |p|), which is too slow for texts like aaaa...a.",
    "The prefix function (failure function) of p + '#' + t reveals every position where the prefix function equals |p|.",
    "Compute pi over the concatenation; whenever pi[i] == |p|, an occurrence ends at i, starting at i - 2|p|.",
  ],
  editorial: "Build s = p + '#' + t and compute the prefix function. An index i in the t-part with pi[i] = |p| marks an occurrence ending at that position. Count them and remember the last start. Overlaps are handled naturally.\n\nComplexity: O(|t| + |p|).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string t, p;
    cin >> t >> p;
    string s = p + "#" + t;
    int n = (int)s.size(), m = (int)p.size();
    vector<int> pi(n, 0);
    for (int i = 1; i < n; i++) {
        int k = pi[i - 1];
        while (k > 0 && s[i] != s[k]) k = pi[k - 1];
        if (s[i] == s[k]) k++;
        pi[i] = k;
    }
    long long cnt = 0, last = -1;
    for (int i = m + 1; i < n; i++) {
        if (pi[i] == m) {
            cnt++;
            last = i - 2 * m + 1;
        }
    }
    cout << cnt << " " << last << "\\n";
}`,
  hidden: () => {
    const r = rng(3010);
    const plant = (n: number, p: string, times: number, k: number) => {
      const arr = rs(r, n, k).split("");
      for (let i = 0; i < times; i++) {
        const pos = r.int(0, n - p.length);
        for (let j = 0; j < p.length; j++) arr[pos + j] = p[j]!;
      }
      return arr.join("");
    };
    const pa = rs(r, 5, 2);
    return [
      "a\na",
      "ab\nb",
      "abab\nab",
      "abcabcabc\nabcabc",
      `${"a".repeat(300000)}\n${"a".repeat(100000)}`,
      `${"a".repeat(300000)}\n${"a".repeat(99999)}b`,
      `${"ab".repeat(100000)}\n${"ab".repeat(30000)}`,
      `${plant(2000, pa, 50, 2)}\n${pa}`,
      `${rs(r, 50000, 2)}\n${rs(r, 10, 2)}`,
      `${rs(r, 20000, 26)}\n${rs(r, 3, 26)}`,
      `${"a".repeat(20000)}b${"a".repeat(20000)}\n${"a".repeat(1000)}`,
      `${"abaab".repeat(8000)}\nabaababaab`,
    ].map((x) => `${x}\n`);
  },
});

const allBorders = P({
  slug: "all-borders-of-string",
  title: "All Borders",
  difficulty: "medium",
  rating: 1300,
  tags: ["strings", "prefix-function", "kmp"],
  statement:
    "A border of a string s is a non-empty proper prefix of s that is also a suffix of s (it must be shorter than s itself). For example, `abacaba` has borders `a` and `aba`. List the lengths of all borders in increasing order.",
  inputFormat: "One line with the string s.",
  outputFormat: "Print k, the number of borders. If k > 0, print on the next line the k border lengths in increasing order separated by spaces.",
  constraints: "1 <= |s| <= 200000, lowercase English letters",
  samples: [
    { input: "abacaba\n", output: "2\n1 3\n" },
    { input: "abc\n", output: "0\n" },
  ],
  hints: [
    "Checking every length with direct comparison is quadratic.",
    "The prefix function gives the longest border pi[n-1]. The next-longest border is the longest border of that border.",
    "Follow the chain len = pi[n-1], pi[len-1], ... until 0, collecting lengths, then reverse.",
  ],
  editorial: "Compute the prefix function. Every border of s is a border of the longest border, so the chain n -> pi[n-1] -> pi[pi[n-1]-1] -> ... enumerates all of them in decreasing order. Reverse it for the required order.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    cin >> s;
    int n = (int)s.size();
    vector<int> pi(n, 0);
    for (int i = 1; i < n; i++) {
        int k = pi[i - 1];
        while (k > 0 && s[i] != s[k]) k = pi[k - 1];
        if (s[i] == s[k]) k++;
        pi[i] = k;
    }
    vector<int> b;
    for (int k = pi[n - 1]; k > 0; k = pi[k - 1]) b.push_back(k);
    reverse(b.begin(), b.end());
    printf("%d\\n", (int)b.size());
    if (!b.empty()) {
        for (size_t i = 0; i < b.size(); i++) printf(i ? " %d" : "%d", b[i]);
        printf("\\n");
    }
}`,
  hidden: () => {
    const r = rng(3011);
    const fib = (() => {
      let a = "a";
      let b = "ab";
      while (b.length < 250000) [a, b] = [b, b + a];
      return b;
    })();
    const x = rs(r, 100, 3);
    return [
      "a",
      "aa",
      "ab",
      "aba",
      "a".repeat(200000),
      "ab".repeat(150000),
      "ab".repeat(100000) + "a",
      fib,
      rs(r, 200000, 26),
      x.repeat(1000) + x.slice(0, 37),
      rs(r, 200000, 2),
      "abcab" + "abcab".repeat(1000) + "ab",
    ].map((s) => `${s}\n`);
  },
});

const repeatingPrefixes = P({
  slug: "repeating-prefix-count",
  title: "Perfect-Power Prefixes",
  difficulty: "medium",
  rating: 1400,
  tags: ["strings", "prefix-function", "periodicity"],
  statement:
    "Call a non-empty string a perfect power if it equals some string u written k >= 2 times in a row (so `abab` = (ab)^2 and `aaa` = a^3, but `aba` is not). Count how many of the prefixes of s (lengths 1 to |s|) are perfect powers.",
  inputFormat: "One line with the string s.",
  outputFormat: "Print the number of prefixes that are perfect powers.",
  constraints: "1 <= |s| <= 300000, lowercase English letters",
  samples: [
    { input: "abababc\n", output: "2\n", explanation: "The prefixes abab and ababab qualify." },
    { input: "aaaa\n", output: "3\n", explanation: "aa, aaa and aaaa." },
  ],
  hints: [
    "A prefix of length i is built from a repeated block exactly when it has a period p that divides i with p < i.",
    "The shortest period of a prefix of length i is i - pi[i-1], where pi is the prefix function.",
    "Count i with pi[i-1] > 0 and i % (i - pi[i-1]) == 0.",
  ],
  editorial: "For a prefix of length i, the smallest period is p = i - pi[i-1]. The prefix is a perfect power exactly if p divides i and p < i, i.e. pi[i-1] > 0 and i % p == 0. (If any block length works, the smallest period divides it.) Count such i.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    cin >> s;
    int n = (int)s.size();
    vector<int> pi(n, 0);
    for (int i = 1; i < n; i++) {
        int k = pi[i - 1];
        while (k > 0 && s[i] != s[k]) k = pi[k - 1];
        if (s[i] == s[k]) k++;
        pi[i] = k;
    }
    int cnt = 0;
    for (int i = 1; i <= n; i++) {
        int p = i - pi[i - 1];
        if (pi[i - 1] > 0 && i % p == 0) cnt++;
    }
    printf("%d\\n", cnt);
}`,
  hidden: () => {
    const r = rng(3012);
    const x = rs(r, 7, 2);
    return [
      "a",
      "aa",
      "ab",
      "abab",
      "abcabcabcab",
      "a".repeat(300000),
      "ab".repeat(150000),
      x.repeat(40000),
      rs(r, 300000, 26),
      rs(r, 100000, 2),
      "abaab".repeat(60000),
      "a".repeat(1000) + "b" + "a".repeat(1000) + "b",
    ].map((s) => `${s}\n`);
  },
});

const countPalSubstrings = P({
  slug: "count-palindromic-substrings",
  title: "Count Palindromic Substrings",
  difficulty: "medium",
  rating: 1500,
  tags: ["strings", "manacher", "palindromes"],
  statement:
    "Count the substrings of s that are palindromes. Substrings are counted by position: the same text occurring at different places is counted each time, and a single character is a palindrome.",
  inputFormat: "One line with the string s.",
  outputFormat: "Print the number of palindromic substrings.",
  constraints: "1 <= |s| <= 200000, lowercase English letters",
  samples: [
    { input: "aaa\n", output: "6\n" },
    { input: "abacaba\n", output: "12\n" },
  ],
  hints: [
    "Expanding around each center is quadratic for strings like aaaa...a. Try to reuse information from palindromes you already found.",
    "Manacher's algorithm computes, for every center, the radius of the longest palindrome in total linear time; the radius equals the number of palindromes with that center.",
    "Compute d1 (odd lengths) and d2 (even lengths) and sum them; use a 64-bit result.",
  ],
  editorial: "Manacher: maintain the rightmost palindrome [l, r]; for a new center i inside it, start from the mirrored radius min(d[l + r - i], r - i) and expand. d1[i] is the number of odd palindromes centered at i, d2[i] the number of even ones centered between i-1 and i. The answer is the sum of all of them (up to about 4.5 * 10^10).\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    cin >> s;
    int n = (int)s.size();
    vector<int> d1(n), d2(n);
    for (int i = 0, l = 0, r = -1; i < n; i++) {
        int k = (i > r) ? 1 : min(d1[l + r - i], r - i + 1);
        while (i - k >= 0 && i + k < n && s[i - k] == s[i + k]) k++;
        d1[i] = k--;
        if (i + k > r) { l = i - k; r = i + k; }
    }
    for (int i = 0, l = 0, r = -1; i < n; i++) {
        int k = (i > r) ? 0 : min(d2[l + r - i + 1], r - i + 1);
        while (i - k - 1 >= 0 && i + k < n && s[i - k - 1] == s[i + k]) k++;
        d2[i] = k--;
        if (i + k > r) { l = i - k - 1; r = i + k; }
    }
    long long ans = 0;
    for (int i = 0; i < n; i++) ans += d1[i] + d2[i];
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(3013);
    const pal = (n: number) => {
      const h = rs(r, n >> 1, 2);
      return h + (n & 1 ? "a" : "") + [...h].reverse().join("");
    };
    return [
      "a",
      "ab",
      "aa",
      "abba",
      "a".repeat(200000),
      "ab".repeat(150000),
      rs(r, 200000, 26),
      rs(r, 200000, 2),
      pal(200000),
      "a".repeat(150000) + "b" + "a".repeat(149999),
      "abc".repeat(1000),
      rs(r, 5000, 1) + rs(r, 5000, 2),
    ].map((s) => `${s}\n`);
  },
});

const expressionMod = P({
  slug: "evaluate-expression-mod",
  title: "Evaluate the Expression",
  difficulty: "medium",
  rating: 1500,
  tags: ["strings", "parsing", "stack", "expression"],
  statement:
    "Evaluate an arithmetic expression built from non-negative integers, the binary operators + - *, the unary minus, and parentheses. Multiplication binds tighter than addition and subtraction, binary operators of equal priority are applied left to right, and unary minus binds tightest of all (so -2*3 = (-2)*3 and 2*-3 is allowed). The expression contains no spaces. Print the value modulo 1000000007, written as a number between 0 and 1000000006.",
  inputFormat: "One line containing the expression.",
  outputFormat: "Print the value of the expression modulo 1000000007 in the range [0, 1000000006].",
  constraints: "1 <= length <= 30000\nEvery integer in the expression has at most 18 digits. The expression is syntactically valid.",
  samples: [
    { input: "1+2*3\n", output: "7\n" },
    { input: "-(2+3)*4\n", output: "999999987\n", explanation: "The value is -20, which is 1000000007 - 20 modulo 1000000007." },
    { input: "(1+2)*(3-5)\n", output: "1000000001\n" },
  ],
  hints: [
    "Think about the grammar: an expression is a sum of terms, a term is a product of factors, a factor is a number, a parenthesized expression, or a minus sign followed by a factor.",
    "Recursive descent with three functions (expr, term, factor) mirrors the grammar exactly; keep every intermediate value reduced modulo p.",
    "Reduce big integers digit by digit modulo p, and add p before the final % p so negative values become non-negative.",
  ],
  editorial: "Parse with recursive descent: expr = term (('+'|'-') term)*; term = factor ('*' factor)*; factor = number | '(' expr ')' | '-' factor. All arithmetic is done modulo 10^9+7 (+, -, * are ring operations so the remainder of the true value is obtained). Nesting depth is at most about 15000, which is safe for the recursion.\n\nComplexity: O(length).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const ll MOD = 1000000007LL;
string s;
size_t pos = 0;
ll expr();
ll factor() {
    if (s[pos] == '-') {
        pos++;
        ll v = factor();
        return (MOD - v) % MOD;
    }
    if (s[pos] == '(') {
        pos++;
        ll v = expr();
        pos++;
        return v;
    }
    ll v = 0;
    while (pos < s.size() && isdigit((unsigned char)s[pos])) {
        v = (v * 10 + (s[pos] - '0')) % MOD;
        pos++;
    }
    return v;
}
ll term() {
    ll v = factor();
    while (pos < s.size() && s[pos] == '*') {
        pos++;
        v = v * factor() % MOD;
    }
    return v;
}
ll expr() {
    ll v = term();
    while (pos < s.size() && (s[pos] == '+' || s[pos] == '-')) {
        char op = s[pos++];
        ll w = term();
        if (op == '+') v = (v + w) % MOD;
        else v = (v - w + MOD) % MOD;
    }
    return v;
}
int main() {
    cin >> s;
    cout << expr() << "\\n";
}`,
  hidden: () => {
    const r = rng(3014);
    const num = (maxLen: number) => {
      const len = r.int(1, Math.min(maxLen, 18));
      if (len === 1) return String(r.int(0, 9));
      return String(r.int(1, 9)) + Array.from({ length: len - 1 }, () => r.int(0, 9)).join("");
    };
    const g = (budget: number): string => {
      if (budget <= 3) return num(budget);
      const t = r.int(0, 99);
      if (t < 45) {
        const left = r.int(1, budget - 2);
        const right = budget - 1 - left;
        return g(left) + r.pick(["+", "-", "*"]) + g(right);
      }
      if (t < 70) return `(${g(budget - 2)})`;
      if (t < 85) return `-${g(budget - 1)}`;
      return num(budget);
    };
    const chain = (op: string, n: number) => Array.from({ length: n }, () => num(18)).join(op);
    return [
      "0",
      "-0",
      "--5",
      "2*-3+4",
      "123456789012345678*987654321098765432",
      `${"(".repeat(14000)}7${")".repeat(14000)}`,
      `${"-(".repeat(7000)}5${")".repeat(7000)}`,
      g(200),
      g(5000),
      g(30000),
      chain("*", 1400),
      chain("+", 1400) + "-" + chain("-", 600),
      g(30000),
    ].map((x) => `${x.slice(0, 30000)}\n`);
  },
});

const longestValidBrackets = P({
  slug: "longest-wellformed-bracket-run",
  title: "Longest Well-Formed Bracket Run",
  difficulty: "medium",
  rating: 1600,
  tags: ["strings", "stack", "dp", "brackets"],
  statement:
    "A string over the six characters ( ) [ ] { } is well-formed if it is empty, or it is A B for well-formed A and B, or it is (A), [A] or {A} for a well-formed A. Among all contiguous substrings of s that are non-empty and well-formed, find the greatest length L, and count how many substrings (counted by position) have length exactly L. If s has no non-empty well-formed substring, print `0 0`.",
  inputFormat: "One line with the string s.",
  outputFormat: "Print two integers: L and the number of well-formed substrings of length L.",
  constraints: "1 <= |s| <= 200000",
  samples: [
    { input: "()[]{}\n", output: "6 1\n" },
    { input: "([)]()\n", output: "2 1\n" },
    { input: "(((\n", output: "0 0\n" },
  ],
  hints: [
    "A well-formed substring cannot span a closing bracket that has no matching partner. Think about what such a bracket does to everything before it.",
    "Let best[i] be the length of the longest well-formed substring ending at i. Keep a stack of positions of unmatched opening brackets.",
    "On a closing bracket matching the stack top j, best[i] = (i - j + 1) + best[j - 1]. On a mismatch or an empty stack, clear the stack and set best[i] = 0. Then take the max and count how often it occurs.",
  ],
  editorial: "Scan with a stack of opening positions. When s[i] closes the bracket at the top j, a well-formed block [j, i] appears, and it can be glued to the best block ending at j-1, so best[i] = i - j + 1 + best[j-1]. Otherwise nothing can cross i, so the stack is emptied and best[i] = 0. Distinct positions of equal maximal best[i] give distinct substrings (they end at different indices and, for each end index, the longest one is the only candidate for the maximum).\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    cin >> s;
    int n = (int)s.size();
    vector<int> best(n, 0), st;
    auto open = [](char c) { return c == '(' || c == '[' || c == '{'; };
    auto match = [](char a, char b) { return (a == '(' && b == ')') || (a == '[' && b == ']') || (a == '{' && b == '}'); };
    for (int i = 0; i < n; i++) {
        if (open(s[i])) {
            st.push_back(i);
        } else if (!st.empty() && match(s[st.back()], s[i])) {
            int j = st.back();
            st.pop_back();
            best[i] = i - j + 1 + (j > 0 ? best[j - 1] : 0);
        } else {
            st.clear();
        }
    }
    int L = 0;
    long long cnt = 0;
    for (int i = 0; i < n; i++) {
        if (best[i] > L) { L = best[i]; cnt = 1; }
        else if (best[i] == L && L > 0) cnt++;
    }
    printf("%d %lld\\n", L, cnt);
}`,
  hidden: () => {
    const r = rng(3015);
    const O = ["(", "[", "{"];
    const C = [")", "]", "}"];
    const balanced = (n: number, openBias: number) => {
      const st: number[] = [];
      let o = "";
      for (let i = 0; i < n; i++) {
        const remaining = n - i;
        if (st.length >= remaining) o += C[st.pop()!];
        else if (st.length === 0 || r.int(0, 99) < openBias) {
          const k = r.int(0, 2);
          st.push(k);
          o += O[k];
        } else o += C[st.pop()!];
      }
      return o;
    };
    const corrupt = (s: string, k: number) => {
      const a = s.split("");
      for (let i = 0; i < k; i++) a[r.int(0, a.length - 1)] = r.pick([...O, ...C]);
      return a.join("");
    };
    return [
      "(",
      ")(",
      "()()",
      "(()",
      "())",
      "([{)]}",
      balanced(200000, 50),
      corrupt(balanced(200000, 50), 40),
      corrupt(balanced(200000, 50), 4000),
      "()".repeat(150000),
      "(".repeat(150000) + ")".repeat(150000),
      corrupt(balanced(1000, 60), 3),
      Array.from({ length: 200000 }, () => r.pick([...O, ...C])).join(""),
      "()".repeat(1000) + "(" + "[]".repeat(1000) + ")" + "]" + "{}".repeat(1000),
    ].map((s) => `${s}\n`);
  },
});

const distinctSubstringsSmall = P({
  slug: "distinct-substring-count-small",
  title: "Distinct Substrings",
  difficulty: "medium",
  rating: 1400,
  tags: ["strings", "prefix-function", "counting"],
  statement:
    "Count the distinct non-empty substrings of a string s. Two substrings are the same if they consist of the same characters, regardless of where they occur. For example `aab` has 5 distinct substrings: a, b, aa, ab, aab.",
  inputFormat: "One line with the string s.",
  outputFormat: "Print the number of distinct non-empty substrings.",
  constraints: "1 <= |s| <= 4000, lowercase English letters",
  samples: [
    { input: "aab\n", output: "5\n" },
    { input: "abab\n", output: "7\n" },
  ],
  hints: [
    "Storing all substrings in a set needs about n^2/2 strings of average length n/3, far too much for n = 4000.",
    "Add characters one at a time and count how many NEW substrings (suffixes of the current prefix) appear.",
    "For the prefix t of length k, the new substrings are k minus the length of the longest suffix of t that occurred earlier. That equals the maximum of the prefix function of reversed t.",
  ],
  editorial: "When extending t by one character, the only candidates for new substrings are the suffixes of the new t. A suffix is new unless it already occurred earlier in t, and if a suffix is old so are all its shorter suffixes. So the number of new substrings is |t| - L, where L is the longest suffix of t occurring elsewhere in t. In the reversed string this is the longest prefix occurring again at a later position, which is the maximum value of the prefix function. Summing over all prefixes costs O(n^2).\n\nComplexity: O(n^2) time, O(n) memory.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    cin >> s;
    int n = (int)s.size();
    long long ans = 0;
    vector<int> pi(n);
    for (int k = 1; k <= n; k++) {
        string r(s.rbegin() + (n - k), s.rend());
        int mx = 0;
        pi[0] = 0;
        for (int i = 1; i < k; i++) {
            int q = pi[i - 1];
            while (q > 0 && r[i] != r[q]) q = pi[q - 1];
            if (r[i] == r[q]) q++;
            pi[i] = q;
            mx = max(mx, q);
        }
        ans += k - mx;
    }
    printf("%lld\\n", ans);
}`,
  hidden: () => {
    const r = rng(3016);
    return [
      "a",
      "ab",
      "aaaa",
      "abcabc",
      "a".repeat(4000),
      rs(r, 4000, 26),
      rs(r, 4000, 2),
      "ab".repeat(2000),
      rs(r, 4000, 3),
      "abc".repeat(1333) + "a",
      rs(r, 100, 2),
      "a".repeat(2000) + "b" + "a".repeat(1999),
    ].map((s) => `${s}\n`);
  },
});

const substringEquality = P({
  slug: "substring-equality-queries",
  title: "Are These Substrings Equal?",
  difficulty: "medium",
  rating: 1500,
  tags: ["strings", "hashing", "queries"],
  statement:
    "You are given a string s and q queries. Each query gives two segments [l1, r1] and [l2, r2] (1-based, inclusive). Print YES if the substrings s[l1..r1] and s[l2..r2] are identical strings, and NO otherwise (including when their lengths differ).",
  inputFormat: "The first line contains n and q. The second line contains the string s. Each of the next q lines contains l1 r1 l2 r2.",
  outputFormat: "Print q lines, each YES or NO.",
  constraints: "1 <= n <= 60000\n1 <= q <= 10000\n1 <= l1 <= r1 <= n and 1 <= l2 <= r2 <= n\ns consists of lowercase English letters.",
  samples: [{ input: "6 3\nababab\n1 2 3 4\n1 3 2 4\n1 2 1 3\n", output: "YES\nNO\nNO\n" }],
  hints: [
    "Comparing characters directly costs O(length) per query, which can be 10^5 each time.",
    "A polynomial hash of every prefix lets you obtain the hash of any substring in O(1).",
    "hash(l, r) = (H[r] - H[l-1] * B^(r-l+1)) mod M. Use two moduli (or a 61-bit one) to make accidental collisions negligible, and compare lengths first.",
  ],
  editorial: "Precompute prefix hashes H[i] = H[i-1] * B + s[i] and powers of B modulo two primes. A substring hash is H[r] - H[l-1] * B^(len). Two substrings are equal iff the lengths agree and both hashes agree (with overwhelming probability, with two moduli and fixed bases here).\n\nComplexity: O(n + q).",
  reference: `#include <bits/stdc++.h>
using namespace std;
typedef unsigned long long ull;
typedef long long ll;
const ll M1 = 600000007LL, M2 = 998244353LL;
const ll B1 = 911382323LL, B2 = 972663749LL;
int main() {
    int n, q;
    scanf("%d %d", &n, &q);
    static char buf[100005];
    scanf("%s", buf);
    vector<ll> h1(n + 1, 0), h2(n + 1, 0), p1(n + 1, 1), p2(n + 1, 1);
    for (int i = 0; i < n; i++) {
        h1[i + 1] = (h1[i] * B1 + buf[i]) % M1;
        h2[i + 1] = (h2[i] * B2 + buf[i]) % M2;
        p1[i + 1] = p1[i] * B1 % M1;
        p2[i + 1] = p2[i] * B2 % M2;
    }
    auto get1 = [&](int l, int r) { return ((h1[r] - h1[l - 1] * p1[r - l + 1]) % M1 + M1) % M1; };
    auto get2 = [&](int l, int r) { return ((h2[r] - h2[l - 1] * p2[r - l + 1]) % M2 + M2) % M2; };
    while (q--) {
        int a, b, c, d;
        scanf("%d %d %d %d", &a, &b, &c, &d);
        bool ok = (b - a == d - c) && get1(a, b) == get1(c, d) && get2(a, b) == get2(c, d);
        puts(ok ? "YES" : "NO");
    }
}`,
  hidden: () => {
    const r = rng(3017);
    const mk = (n: number, q: number, period: number, mut: number, k: number) => {
      const blk = rs(r, period, k);
      const arr = blk.repeat(Math.ceil(n / period)).slice(0, n).split("");
      for (let i = 0; i < mut; i++) arr[r.int(0, n - 1)] = String.fromCharCode(97 + r.int(0, k - 1));
      const s = arr.join("");
      const qs: string[] = [];
      for (let i = 0; i < q; i++) {
        const t = r.int(0, 3);
        if (t === 0) {
          const a = r.int(1, n);
          const b = r.int(a, n);
          const c = r.int(1, n);
          const d = r.int(c, n);
          qs.push(`${a} ${b} ${c} ${d}`);
        } else {
          const l1 = r.int(1, n);
          const j = r.int(0, Math.max(0, Math.floor((n - l1) / period)));
          const l2 = Math.min(n, l1 + j * period);
          const maxLen = n - Math.max(l1, l2) + 1;
          const len = t === 3 ? r.int(1, Math.min(maxLen, 30)) : r.int(1, maxLen);
          qs.push(`${l1} ${l1 + len - 1} ${l2} ${l2 + len - 1}`);
        }
      }
      return `${n} ${q}\n${s}\n${qs.join("\n")}\n`;
    };
    return [
      "1 1\na\n1 1 1 1\n",
      "2 2\nab\n1 1 2 2\n1 2 1 2\n",
      "5 3\naaaaa\n1 2 4 5\n1 3 2 4\n1 5 1 4\n",
      mk(20, 30, 3, 0, 2),
      mk(100, 200, 4, 1, 3),
      mk(60000, 10000, 7, 3, 26),
      mk(60000, 10000, 1, 0, 1),
      mk(60000, 10000, 2, 1, 2),
      mk(60000, 10000, 100, 0, 26),
      mk(5000, 5000, 5, 5, 2),
      mk(60000, 4000, 12345, 0, 26),
    ];
  },
});

const prefixOccurrences = P({
  slug: "prefix-occurrence-counts",
  title: "How Often Does Each Prefix Occur?",
  difficulty: "medium",
  rating: 1600,
  tags: ["strings", "prefix-function", "counting"],
  statement:
    "For every k from 1 to |s|, let occ(k) be the number of positions at which the prefix s[1..k] occurs as a substring of s (overlapping occurrences all count, and the prefix itself counts as one occurrence). Print occ(1), occ(2), ..., occ(|s|).",
  inputFormat: "One line with the string s.",
  outputFormat: "Print |s| integers separated by spaces.",
  constraints: "1 <= |s| <= 300000, lowercase English letters",
  samples: [{ input: "ababa\n", output: "3 2 2 1 1\n", explanation: "a occurs 3 times, ab and aba twice, abab and ababa once." }],
  hints: [
    "Counting every prefix separately with a string search is quadratic overall.",
    "Each position i is the end of an occurrence of the prefix of length pi[i], and then of pi[pi[i]-1], and so on along the failure chain.",
    "Add 1 to cnt[pi[i]] for every i, then push counts down the chain from long to short: for k = n..1, cnt[pi[k-1]] += cnt[k]. The answer is cnt[k] + 1.",
  ],
  editorial: "Every occurrence of a prefix of length k that ends at position i corresponds to k lying on the failure chain of i (the chain i -> pi[i] -> ...). Mark cnt[pi[i]]++ for each i, then, going from long to short, add cnt[k] to cnt[pi[k-1]] (every occurrence of the longer prefix contains an occurrence of the shorter border). Finally occ(k) = cnt[k] + 1 for the prefix's own occurrence.\n\nComplexity: O(n).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    cin >> s;
    int n = (int)s.size();
    vector<int> pi(n, 0);
    for (int i = 1; i < n; i++) {
        int k = pi[i - 1];
        while (k > 0 && s[i] != s[k]) k = pi[k - 1];
        if (s[i] == s[k]) k++;
        pi[i] = k;
    }
    vector<long long> cnt(n + 1, 0);
    for (int i = 0; i < n; i++) cnt[pi[i]]++;
    for (int k = n; k >= 1; k--) cnt[pi[k - 1]] += cnt[k];
    string out;
    for (int k = 1; k <= n; k++) {
        out += to_string(cnt[k] + 1);
        out += (k == n ? '\\n' : ' ');
    }
    fputs(out.c_str(), stdout);
}`,
  hidden: () => {
    const r = rng(3018);
    return [
      "a",
      "ab",
      "aa",
      "abcabcab",
      "a".repeat(300000),
      "ab".repeat(150000),
      rs(r, 300000, 26),
      rs(r, 300000, 2),
      rs(r, 100, 2),
      "abaab".repeat(60000),
      "a".repeat(1000) + "b" + "a".repeat(2000),
      rs(r, 2000, 1) + rs(r, 5, 3),
    ].map((s) => `${s}\n`);
  },
});

// ---------------------------------------------------------------- hard

const distinctPalindromes = P({
  slug: "distinct-palindromic-substrings",
  title: "Distinct Palindromic Substrings",
  difficulty: "hard",
  rating: 1900,
  tags: ["strings", "palindromes", "eertree", "data-structures"],
  statement:
    "Count the distinct palindromic substrings of s, that is, the number of different strings that are palindromes and occur in s as a contiguous substring. For `aabaa` the answer is 5: a, b, aa, aba, aabaa.",
  inputFormat: "One line with the string s.",
  outputFormat: "Print the number of distinct palindromic substrings.",
  constraints: "1 <= |s| <= 200000, lowercase English letters",
  timeLimitMs: 1500,
  samples: [
    { input: "aabaa\n", output: "5\n" },
    { input: "abc\n", output: "3\n" },
  ],
  hints: [
    "A string of length n has fewer than n distinct palindromic substrings. That bound suggests a structure with O(n) nodes.",
    "A palindromic tree (eertree) has one node per distinct palindrome. Adding a character creates at most one new node.",
    "To add s[i]: from the longest palindromic suffix, follow suffix links until s[i - len - 1] == s[i]; create the node if missing and find its suffix link by repeating the walk from the link of the found node.",
  ],
  editorial: "Maintain an eertree with two roots (length -1 and 0). For each new character, walk from the node of the longest palindromic suffix of the previous prefix via suffix links to the first palindrome P with s[i - |P| - 1] == s[i]; the new longest suffix palindrome is c P c. If that node does not exist, create it and compute its suffix link by walking again from link(P). At most one new palindrome appears per character, so the answer is the number of nodes minus the two roots.\n\nComplexity: O(n) amortized (O(26 n) memory for transitions).",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s;
    cin >> s;
    int n = (int)s.size();
    vector<array<int, 26>> nxt(n + 2);
    vector<int> len(n + 2), link(n + 2);
    for (auto &a : nxt) a.fill(0);
    len[0] = -1; link[0] = 0;
    len[1] = 0; link[1] = 0;
    int cnt = 2, last = 1;
    for (int i = 0; i < n; i++) {
        int c = s[i] - 'a';
        int cur = last;
        while (true) {
            int l = len[cur];
            if (i - l - 1 >= 0 && s[i - l - 1] == s[i]) break;
            cur = link[cur];
        }
        if (!nxt[cur][c]) {
            int v = cnt++;
            len[v] = len[cur] + 2;
            if (len[v] == 1) {
                link[v] = 1;
            } else {
                int w = link[cur];
                while (true) {
                    int l = len[w];
                    if (i - l - 1 >= 0 && s[i - l - 1] == s[i]) break;
                    w = link[w];
                }
                link[v] = nxt[w][c];
            }
            nxt[cur][c] = v;
        }
        last = nxt[cur][c];
    }
    printf("%d\\n", cnt - 2);
}`,
  hidden: () => {
    const r = rng(3019);
    const pal = (n: number, k: number) => {
      const h = rs(r, n >> 1, k);
      return h + (n & 1 ? "a" : "") + [...h].reverse().join("");
    };
    return [
      "a",
      "ab",
      "aaaa",
      "abacaba",
      "a".repeat(200000),
      "ab".repeat(100000),
      rs(r, 200000, 26),
      rs(r, 200000, 2),
      pal(200000, 2),
      pal(200000, 26),
      "abc".repeat(60000),
      rs(r, 3000, 3),
      "a".repeat(1000) + "b" + "a".repeat(1000),
    ].map((s) => `${s}\n`);
  },
});

const wildcardMatches = P({
  slug: "wildcard-pattern-matches",
  title: "Matching with Wildcards",
  difficulty: "hard",
  rating: 2000,
  tags: ["strings", "bitset", "pattern-matching"],
  statement:
    "A pattern consists of lowercase letters and the wildcard `?`, which matches any single letter. The pattern matches the text at position i if for every j the pattern character j is `?` or equals text character i + j. Count the positions of the text where the pattern matches and print the first of them (1-based), or -1 if there is none.",
  inputFormat: "The first line contains the text t. The second line contains the pattern p.",
  outputFormat: "Print two integers: the number of matching positions and the first one (or -1).",
  constraints: "1 <= |p| <= |t| <= 100000, the text uses lowercase letters, the pattern uses lowercase letters and `?`.",
  timeLimitMs: 2000,
  samples: [
    { input: "abcabc\na?c\n", output: "2 1\n" },
    { input: "aaaa\nab\n", output: "0 -1\n" },
  ],
  hints: [
    "Plain KMP does not work with wildcards, and comparing every alignment takes O(|t| * |p|) = 10^10 in the worst case.",
    "Keep, for each letter, the set of text positions holding it as a bitset. A pattern letter at index j keeps only alignments i where text[i + j] is that letter, which is the letter's bitset shifted by j.",
    "Start with a bitset of all-ones alignments; for each non-wildcard pattern character c at index j do R &= (B[c] >> j). Finally only alignments 0..n-m are valid. This costs |p| * |t| / 64 word operations.",
  ],
  editorial: "Let B[c] have bit i set iff t[i] = c. Alignment i is good iff for all non-wildcard j: B[p[j]][i + j] = 1, i.e. i is set in (B[p[j]] >> j). Intersect these shifted bitsets: R &= B[c] >> j. Alignments beyond n - m are discarded. The work is |p| * (|t| / 64) = about 7.8 * 10^7 word operations for the maximum input. (An FFT-based approach also works.)\n\nComplexity: O(|p| * |t| / 64).",
  reference: `#include <bits/stdc++.h>
using namespace std;
const int N = 100000;
static bitset<N> B[26];
int main() {
    string t, p;
    cin >> t >> p;
    int n = (int)t.size(), m = (int)p.size();
    for (int i = 0; i < n; i++) B[t[i] - 'a'][i] = 1;
    bitset<N> R;
    R.set();
    for (int j = 0; j < m; j++) {
        if (p[j] == '?') continue;
        R &= (B[p[j] - 'a'] >> j);
    }
    long long cnt = 0, first = -1;
    for (int i = 0; i + m <= n; i++) {
        if (R[i]) {
            cnt++;
            if (first < 0) first = i + 1;
        }
    }
    cout << cnt << " " << first << "\\n";
}`,
  hidden: () => {
    const r = rng(3020);
    const withQ = (p: string, frac: number) => [...p].map((c) => (r.int(0, 99) < frac ? "?" : c)).join("");
    const t1 = rs(r, 100000, 2);
    return [
      "a\na",
      "ab\n??",
      "abab\n?b",
      `${"a".repeat(100000)}\n${"a".repeat(50000)}`,
      `${"a".repeat(100000)}\n${"?".repeat(100000)}`,
      `${"a".repeat(100000)}\n${"a".repeat(49999)}b`,
      `${t1}\n${withQ(t1.slice(1000, 1000 + 50000), 40)}`,
      `${rs(r, 100000, 2)}\n${withQ(rs(r, 30000, 2), 85)}`,
      `${rs(r, 100000, 3)}\n${withQ(rs(r, 8, 3), 25)}`,
      `${"ab".repeat(50000)}\n${withQ("ab".repeat(20000), 50)}`,
      `${rs(r, 2000, 2)}\n${withQ(rs(r, 5, 2), 20)}`,
      `${rs(r, 100000, 26)}\n${rs(r, 1, 26)}`,
    ];
  },
});

// ---------------------------------------------------------------- more hard / expert

const almostMatching = P({
  slug: "almost-matching-occurrences",
  title: "Almost Matching Occurrences",
  difficulty: "hard",
  rating: 1800,
  tags: ["strings", "z-function", "pattern-matching"],
  timeLimitMs: 1000,
  statement:
    "You are given a text t and a pattern p. For a position i (1 <= i <= |t| - |p| + 1) look at the window of |p| characters of t starting at i. The window matches the pattern exactly if all |p| characters agree, and it matches almost if it differs from the pattern in at most one position. Count the windows that match exactly and the windows that match almost (an exact match also counts as an almost match).",
  inputFormat: "The first line contains the text t. The second line contains the pattern p.",
  outputFormat: "Print two integers: the number of exact matching windows and the number of almost matching windows.",
  constraints: "1 <= |p| <= |t| <= 100000, both strings consist of lowercase English letters.",
  samples: [
    { input: "abcabc\nabd\n", output: "0 2\n", explanation: "Windows abc (position 1) and abc (position 4) differ from abd in exactly one position." },
    { input: "aaaa\naa\n", output: "3 3\n" },
  ],
  hints: [
    "Checking every window character by character costs O(|t| * |p|). Think about how many leading characters of a window agree with the pattern, and how many trailing ones do.",
    "If the first l characters of a window agree with p and the mismatch is at index l, the window is almost matching exactly when the remaining |p| - l - 1 characters also agree. Both quantities come from the Z-function: one on p + '#' + t, one on the reversed strings.",
    "Compute pre[i] = longest common prefix of t[i..] and p, and suf[i] = longest common suffix of the window ending at i + |p| - 1 and p. A window is exact if pre[i] = |p|, and almost if pre[i] + 1 + suf[i] >= |p|.",
  ],
  editorial:
    "For the window starting at i let l = pre[i] be the length of the longest common prefix with p, and r = suf[i] the longest common suffix. If l = |p| the window is exact. Otherwise the first mismatch is at index l, and the window has at most one mismatch iff everything after that index agrees, i.e. r >= |p| - l - 1. Both arrays are produced by the Z-function, pre[] on p#t and suf[] on the same construction applied to the reversed strings.\n\nComplexity: O(|t| + |p|).",
  reference: `#include <bits/stdc++.h>
using namespace std;
vector<int> zf(const string& s) {
    int n = (int)s.size();
    vector<int> z(n, 0);
    for (int i = 1, l = 0, r = 0; i < n; i++) {
        if (i < r) z[i] = min(r - i, z[i - l]);
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
        if (i + z[i] > r) { l = i; r = i + z[i]; }
    }
    return z;
}
int main() {
    string t, p;
    cin >> t >> p;
    int n = (int)t.size(), m = (int)p.size();
    vector<int> zp = zf(p + "#" + t);
    string rt(t.rbegin(), t.rend()), rp(p.rbegin(), p.rend());
    vector<int> zr = zf(rp + "#" + rt);
    long long exact = 0, near = 0;
    for (int i = 0; i + m <= n; i++) {
        int l = zp[m + 1 + i];
        if (l >= m) { exact++; near++; continue; }
        int r = zr[m + 1 + (n - i - m)];
        if (l + 1 + r >= m) near++;
    }
    cout << exact << " " << near << "\\n";
}`,
  hidden: () => {
    const r = rng(3101);
    const flip = (s: string, k: number, kk: number) => {
      const a = [...s];
      for (let i = 0; i < k; i++) a[r.int(0, a.length - 1)] = String.fromCharCode(97 + r.int(0, kk - 1));
      return a.join("");
    };
    const t1 = rs(r, 100000, 2);
    const t2 = rs(r, 100000, 26);
    const p3 = rs(r, 40000, 1);
    return [
      "a\nb\n",
      "ab\nba\n",
      "abcabc\nxyz\n",
      "aaaaa\naaa\n",
      "abababab\nabab\n",
      `${"a".repeat(100000)}\n${"a".repeat(50000)}\n`,
      `${"a".repeat(100000)}\n${"a".repeat(30000)}b${"a".repeat(19999)}\n`,
      `${"ab".repeat(50000)}\n${"ab".repeat(10000)}\n`,
      `${"a".repeat(50000)}b${"a".repeat(49999)}\n${"a".repeat(1000)}\n`,
      `${t1}\n${flip(t1.slice(500, 30500), 1, 2)}\n`,
      `${t1}\n${rs(r, 12, 2)}\n`,
      `${t2}\n${t2.slice(70000, 100000)}\n`,
      `${t2}\n${flip(t2.slice(10, 20), 1, 26)}\n`,
      `${p3}${rs(r, 1, 2)}${p3}\n${p3}\n`,
      `${rs(r, 100000, 3)}\n${rs(r, 5, 3)}\n`,
    ];
  },
});

const sharedSubstring = P({
  slug: "longest-shared-substring",
  title: "Longest Shared Substring",
  difficulty: "hard",
  rating: 1900,
  tags: ["strings", "suffix-automaton"],
  timeLimitMs: 1000,
  statement:
    "Two strings s and t are given. A substring is a block of consecutive characters. Find the length of the longest string that occurs as a substring of both s and t. If the strings have no letter in common, the answer is 0.",
  inputFormat: "The first line contains s. The second line contains t.",
  outputFormat: "Print a single integer: the length of the longest common substring.",
  constraints: "1 <= |s|, |t| <= 60000, both strings consist of lowercase English letters.",
  samples: [
    { input: "abcab\nbcabd\n", output: "4\n", explanation: "bcab occurs in both strings." },
    { input: "aaa\nbbb\n", output: "0\n" },
  ],
  hints: [
    "A quadratic table over both strings is far too large for 10^5 characters. Can the length be searched with a yes/no check, or can t be scanned while keeping the best current match?",
    "A suffix automaton of s lets you walk t character by character: keep the current state and the length of the matched suffix of the processed part of t that is also a substring of s.",
    "On a missing transition follow suffix links, resetting the length to the length of the state you land on. On a transition, move and add 1. The answer is the maximum length seen. (Alternatively: binary search on the length with hashing.)",
  ],
  editorial:
    "Build the suffix automaton of s. Process t left to right maintaining (v, l): the longest suffix of the processed part of t that is a substring of s has length l and corresponds to state v. For the next character c: while v has no transition on c and v is not the root, set v = link(v) and l = len(v). If a transition exists, go along it and increment l. Track the maximum l.\n\nEach step is amortised constant, so the total is O(|s| * sigma + |t|) with sigma = 26 (the automaton has at most 2|s| states). Binary search over the answer with polynomial hashes is an alternative.\n\nComplexity: O(|s| + |t|).",
  reference: `#include <bits/stdc++.h>
using namespace std;
struct St { int len, link; int nx[26]; };
int main() {
    string s, t;
    cin >> s >> t;
    vector<St> st;
    st.reserve(2 * s.size() + 2);
    auto mk = [&](int len) {
        St x;
        x.len = len;
        x.link = -1;
        memset(x.nx, -1, sizeof x.nx);
        st.push_back(x);
        return (int)st.size() - 1;
    };
    mk(0);
    int last = 0;
    for (char ch : s) {
        int c = ch - 'a';
        int cur = mk(st[last].len + 1);
        int p = last;
        while (p != -1 && st[p].nx[c] == -1) { st[p].nx[c] = cur; p = st[p].link; }
        if (p == -1) st[cur].link = 0;
        else {
            int q = st[p].nx[c];
            if (st[p].len + 1 == st[q].len) st[cur].link = q;
            else {
                int cl = mk(st[p].len + 1);
                memcpy(st[cl].nx, st[q].nx, sizeof st[q].nx);
                st[cl].link = st[q].link;
                while (p != -1 && st[p].nx[c] == q) { st[p].nx[c] = cl; p = st[p].link; }
                st[q].link = st[cur].link = cl;
            }
        }
        last = cur;
    }
    int v = 0, l = 0, best = 0;
    for (char ch : t) {
        int c = ch - 'a';
        while (v != 0 && st[v].nx[c] == -1) { v = st[v].link; l = st[v].len; }
        if (st[v].nx[c] != -1) { v = st[v].nx[c]; l++; }
        best = max(best, l);
    }
    cout << best << "\\n";
}`,
  hidden: () => {
    const r = rng(3102);
    const common = rs(r, 5000, 26);
    return [
      "a\na\n",
      "a\nb\n",
      "abc\ncba\n",
      `${"a".repeat(60000)}\n${"a".repeat(60000)}\n`,
      `${"a".repeat(60000)}\n${"a".repeat(47777)}b\n`,
      `${"ab".repeat(30000)}\n${"ba".repeat(30000)}\n`,
      `${rs(r, 60000, 26)}\n${rs(r, 60000, 26)}\n`,
      `${rs(r, 60000, 2)}\n${rs(r, 60000, 2)}\n`,
      `${rs(r, 24000, 26)}${common}${rs(r, 31000, 26)}\n${rs(r, 36000, 26)}${common}${rs(r, 21000, 26)}\n`,
      `${"a".repeat(30000)}\n${"b".repeat(60000)}\n`,
      `${rs(r, 60000, 3)}\n${rs(r, 3, 3)}\n`,
      `${"abc".repeat(20000)}\n${"cab".repeat(20000)}\n`,
      `${rs(r, 60000, 4)}\n${rs(r, 60000, 4)}\n`,
    ];
  },
});

const kthDistinct = P({
  slug: "kth-distinct-substring",
  title: "K-th Distinct Substring",
  difficulty: "hard",
  rating: 2100,
  tags: ["strings", "suffix-automaton", "lexicographic"],
  timeLimitMs: 1000,
  statement:
    "Consider all distinct non-empty substrings of a string s, listed in lexicographic order. A string that is a proper prefix of another one comes before it (so a < ab < b). Given k, print the k-th string of this list. If s has fewer than k distinct non-empty substrings, print -1.",
  inputFormat: "The first line contains s. The second line contains the integer k.",
  outputFormat: "Print the k-th distinct substring, or -1 if it does not exist.",
  constraints: "1 <= |s| <= 100000, s consists of lowercase English letters.\n1 <= k <= 10^10",
  samples: [
    { input: "abab\n5\n", output: "b\n", explanation: "The distinct substrings in order are a, ab, aba, abab, b, ba, bab." },
    { input: "aa\n3\n", output: "-1\n", explanation: "Only a and aa exist." },
  ],
  hints: [
    "There can be about 5 * 10^9 distinct substrings, so you cannot list them. Count how many substrings start with each possible next letter instead.",
    "In the suffix automaton of s, every distinct substring corresponds to exactly one path from the root. Let paths[v] be the number of paths starting at v (counting the empty one); compute it over states in decreasing order of len.",
    "Walk from the root: for letters a..z with transition to u, if k <= paths[u] choose this letter, subtract 1 (the string ending here) and continue from u when k is still positive; otherwise subtract paths[u] and try the next letter.",
  ],
  editorial:
    "Build the suffix automaton of s. Distinct substrings are in bijection with non-empty paths from the root. Let paths[v] = 1 + sum of paths[u] over transitions v -> u; it counts the empty continuation plus every extension. The total number of distinct substrings is paths[root] - 1. To find the k-th string lexicographically descend from the root: for each letter in increasing order with transition to u, the strings that start (at the current depth) with this letter number paths[u]; if k <= paths[u] we take the letter and, since the string ending right here is the smallest among them, decrement k and stop when it becomes 0; otherwise subtract paths[u] and try the next letter.\n\nThe counts reach about 5 * 10^9, so 64-bit integers are needed. Complexity: O(|s| * 26 + answer length).",
  reference: `#include <bits/stdc++.h>
using namespace std;
struct St { int len, link; int nx[26]; };
int main() {
    string s;
    long long k;
    cin >> s >> k;
    vector<St> st;
    st.reserve(2 * s.size() + 2);
    auto mk = [&](int len) {
        St x;
        x.len = len;
        x.link = -1;
        memset(x.nx, -1, sizeof x.nx);
        st.push_back(x);
        return (int)st.size() - 1;
    };
    mk(0);
    int last = 0;
    for (char ch : s) {
        int c = ch - 'a';
        int cur = mk(st[last].len + 1);
        int p = last;
        while (p != -1 && st[p].nx[c] == -1) { st[p].nx[c] = cur; p = st[p].link; }
        if (p == -1) st[cur].link = 0;
        else {
            int q = st[p].nx[c];
            if (st[p].len + 1 == st[q].len) st[cur].link = q;
            else {
                int cl = mk(st[p].len + 1);
                memcpy(st[cl].nx, st[q].nx, sizeof st[q].nx);
                st[cl].link = st[q].link;
                while (p != -1 && st[p].nx[c] == q) { st[p].nx[c] = cl; p = st[p].link; }
                st[q].link = st[cur].link = cl;
            }
        }
        last = cur;
    }
    int m = (int)st.size();
    vector<int> order(m), cnt(s.size() + 2, 0);
    for (int i = 0; i < m; i++) cnt[st[i].len]++;
    for (size_t i = 1; i < cnt.size(); i++) cnt[i] += cnt[i - 1];
    for (int i = m - 1; i >= 0; i--) order[--cnt[st[i].len]] = i;
    vector<long long> paths(m, 1);
    for (int i = m - 1; i >= 0; i--) {
        int v = order[i];
        for (int c = 0; c < 26; c++)
            if (st[v].nx[c] != -1) paths[v] += paths[st[v].nx[c]];
    }
    if (k > paths[0] - 1) { cout << -1 << "\\n"; return 0; }
    string ans;
    int v = 0;
    while (true) {
        for (int c = 0; c < 26; c++) {
            int to = st[v].nx[c];
            if (to == -1) continue;
            if (k <= paths[to]) {
                ans += char('a' + c);
                k--;
                v = to;
                break;
            }
            k -= paths[to];
        }
        if (k == 0) break;
    }
    cout << ans << "\\n";
}`,
  hidden: () => {
    const r = rng(3103);
    const s26 = rs(r, 100000, 26);
    const s2 = rs(r, 100000, 2);
    return [
      "a\n1\n",
      "a\n2\n",
      "abab\n7\n",
      "abab\n8\n",
      "ba\n1\n",
      "ba\n3\n",
      `${"a".repeat(100000)}\n100000\n`,
      `${"a".repeat(100000)}\n100001\n`,
      `${"ab".repeat(50000)}\n123456\n`,
      `${s26}\n1\n`,
      `${s26}\n4999950000\n`,
      `${s26}\n2500000000\n`,
      `${s26}\n10000000000\n`,
      `${s2}\n1234567890\n`,
      `${s2}\n3000000000\n`,
    ];
  },
});

const minPalFactor = P({
  slug: "fewest-palindrome-pieces",
  title: "Fewest Palindrome Pieces",
  difficulty: "expert",
  rating: 2500,
  tags: ["strings", "palindromes", "dp", "eertree"],
  timeLimitMs: 2000,
  estimatedMinutes: 90,
  statement:
    "Cut a string s into consecutive pieces so that every piece is a palindrome (reads the same forwards and backwards). Find the minimum possible number of pieces. A single character is a palindrome, so a cut into pieces always exists.",
  inputFormat: "One line containing the string s.",
  outputFormat: "Print the minimum number of pieces.",
  constraints: "1 <= |s| <= 150000, s consists of lowercase English letters.",
  samples: [
    { input: "aab\n", output: "2\n", explanation: "aa | b" },
    { input: "abacaba\n", output: "1\n" },
    { input: "abc\n", output: "3\n" },
  ],
  hints: [
    "Let dp[i] be the answer for the first i characters: dp[i] = 1 + min dp[j] over palindromic suffixes s[j+1..i]. With O(n) palindromic suffixes per position the direct DP is O(n^2) on strings like aaaa.",
    "The palindromic suffixes of a prefix split into O(log n) groups, each an arithmetic progression of lengths (consecutive ones differ by the same amount). Build the palindromic tree and give each node a diff and a series link.",
    "For each group keep series_ans[v] = min dp over the group's start positions. It can be updated from series_ans[link[v]] computed at position i - diff[v], because the group shifts by diff[v]. Per position iterate v = last, slink[v], slink[slink[v]], ... and take dp[i] = min(series_ans[v] + 1).",
  ],
  editorial:
    "Let dp[i] = minimal pieces for the prefix of length i, dp[0] = 0, and dp[i] = 1 + min dp[i - len] over palindromic suffixes of length len. Build the palindromic tree (eertree) online. For a node v define diff[v] = len[v] - len[link[v]] and the series link slink[v] = link[v] if diff[v] != diff[link[v]], else slink[link[v]]. The palindromic suffixes of any prefix form O(log n) series, each an arithmetic progression of lengths with common difference diff.\n\nFor node v at position i, define series_ans[v] = min dp[i - len[u]] over the members u of its series (v, link[v], ... down to but excluding slink[v]). Because the series of link[v] at position i - diff[v] covered exactly the same start points except the newest one, series_ans[v] = min(dp[i - len[slink[v]] - diff[v]], series_ans[link[v]]) when diff[v] = diff[link[v]], else just the first term. Then dp[i] = 1 + min series_ans[v] over the O(log n) series heads.\n\nComplexity: O(n log n) time, O(26 n) memory for the tree transitions.",
  reference: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string str;
    cin >> str;
    int n = (int)str.size();
    string s = "#" + str;
    vector<array<int, 26>> to(n + 3);
    vector<int> len(n + 3), link(n + 3), diff(n + 3, 0), slink(n + 3, 0), sans(n + 3, 0);
    for (auto& a : to) a.fill(0);
    int cnt = 2, last = 1;
    len[0] = -1; link[0] = 0;
    len[1] = 0; link[1] = 0;
    vector<int> dp(n + 1, INT_MAX);
    dp[0] = 0;
    for (int i = 1; i <= n; i++) {
        int c = s[i] - 'a';
        int cur = last;
        while (i - 1 - len[cur] < 1 || s[i - 1 - len[cur]] != s[i]) cur = link[cur];
        if (!to[cur][c]) {
            int v = cnt++;
            len[v] = len[cur] + 2;
            if (len[v] == 1) link[v] = 1;
            else {
                int p = link[cur];
                while (i - 1 - len[p] < 1 || s[i - 1 - len[p]] != s[i]) p = link[p];
                link[v] = to[p][c];
            }
            to[cur][c] = v;
            diff[v] = len[v] - len[link[v]];
            slink[v] = (diff[v] == diff[link[v]]) ? slink[link[v]] : link[v];
        }
        last = to[cur][c];
        for (int v = last; len[v] > 0; v = slink[v]) {
            sans[v] = dp[i - (len[slink[v]] + diff[v])];
            if (diff[v] == diff[link[v]]) sans[v] = min(sans[v], sans[link[v]]);
            dp[i] = min(dp[i], sans[v] + 1);
        }
    }
    cout << dp[n] << "\\n";
}`,
  hidden: () => {
    const r = rng(3104);
    const joinPal = (total: number, maxHalf: number, k: number) => {
      let s = "";
      while (s.length < total) {
        const h = rs(r, r.int(1, maxHalf), k);
        const rev = [...h].reverse().join("");
        s += r.int(0, 1) ? h + rev : h + rev.slice(1);
      }
      return s.slice(0, total);
    };
    const fib = (n: number) => {
      let a = "a";
      let b = "ab";
      while (b.length < n) [a, b] = [b, b + a];
      return b.slice(0, n);
    };
    return [
      "a\n",
      "ab\n",
      "abcabcabc\n",
      `${"a".repeat(150000)}\n`,
      `${"a".repeat(75000)}b${"a".repeat(74999)}\n`,
      `${"ab".repeat(75000)}\n`,
      `${rs(r, 150000, 26)}\n`,
      `${rs(r, 150000, 2)}\n`,
      `${rs(r, 150000, 3)}\n`,
      `${fib(150000)}\n`,
      `${joinPal(150000, 6, 2)}\n`,
      `${joinPal(150000, 40, 3)}\n`,
      `${"abc".repeat(50000)}\n`,
    ];
  },
});

export const problems: ProblemSeed[] = [
  cleanPalindrome,
  runLengthEncode,
  caesarShift,
  anagramGroups,
  kthCharExpansion,
  longestCommonPrefix,
  firstUniqueChar,
  smallestRotation,
  vigenere,
  patternOccurrences,
  allBorders,
  repeatingPrefixes,
  countPalSubstrings,
  expressionMod,
  longestValidBrackets,
  distinctSubstringsSmall,
  substringEquality,
  prefixOccurrences,
  distinctPalindromes,
  wildcardMatches,
  almostMatching,
  sharedSubstring,
  kthDistinct,
  minPalFactor,
];
