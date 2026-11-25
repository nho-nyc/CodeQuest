import { describe, expect, it } from "vitest";
import { PROBLEMS } from "@/content/problems";
import { canonicalTags } from "@/content/problems/tags";
import { PROBLEM_META } from "@/content/problems/meta-data";
import { editorialTimeComplexity, KNOWN_UNITS, normComplexity, parseProblemMeta, prerequisiteUnits, validateMeta, TAG_TO_UNIT, type ProblemMeta } from "@/content/problems/meta";
import { HINT_LEVELS, validateHints } from "@/content/problems/hints";
import { buildProblemMeta } from "@/features/admin/problem-meta-form";
import { UNIT_META } from "@/content/curriculum-meta";

const good: ProblemMeta = {
  primarySkill: "prefix-sums",
  approach: "Precompute prefix sums and answer each query as a difference.",
  timeComplexity: "O(n + q)",
  spaceComplexity: "O(n)",
  commonMistakes: ["Summing the range for every query, which is O(n * q).", "Using int for sums that reach 10^14."],
};
const tags = ["prefix-sums", "arrays"];
const bySlug = new Map(PROBLEMS.map((p) => [p.slug, p]));

describe("problem metadata: validation", () => {
  it("accepts a complete entry, no metadata, and an empty object", () => {
    expect(validateMeta(good, { tags })).toEqual([]);
    expect(validateMeta(null, { tags })).toEqual([]);
    expect(validateMeta(undefined, { tags })).toEqual([]);
    expect(validateMeta({}, { tags })).toEqual([]);
  });
  it("rejects a primary skill that is not one of the tags", () => {
    expect(validateMeta({ ...good, primarySkill: "dp" }, { tags }).join()).toContain("must be one of the tags");
    expect(validateMeta({ ...good, primarySkill: "" }, { tags }).join()).toContain("primarySkill is required");
  });
  it("rejects malformed complexity strings and bad approach / mistakes", () => {
    expect(validateMeta({ ...good, timeComplexity: "fast" }, { tags }).join()).toContain("timeComplexity");
    expect(validateMeta({ ...good, spaceComplexity: "O(n" }, { tags }).join()).toContain("spaceComplexity");
    expect(validateMeta({ ...good, approach: "short" }, { tags }).join()).toContain("approach");
    expect(validateMeta({ ...good, commonMistakes: [] }, { tags }).join()).toContain("1-4 common mistakes");
    expect(validateMeta({ ...good, commonMistakes: ["a", "b"] }, { tags }).join()).toContain("15-220");
    expect(validateMeta({ ...good, commonMistakes: Array.from({ length: 5 }, (_, i) => `a reasonably long mistake number ${i}`) }, { tags }).join()).toContain("1-4 common mistakes");
    const dup = "the very same mistake twice over";
    expect(validateMeta({ ...good, commonMistakes: [dup, dup] }, { tags }).join()).toContain("distinct");
  });
  it("accepts nested complexity such as O((n + q) log n)", () => {
    expect(validateMeta({ ...good, timeComplexity: "O((n + q) log n)" }, { tags })).toEqual([]);
    expect(validateMeta({ ...good, timeComplexity: "O(2^(n/2) * n/2)" }, { tags })).toEqual([]);
  });
  it("validates prerequisite units", () => {
    expect(validateMeta({ ...good, prerequisites: ["arrays", "loops"] }, { tags })).toEqual([]);
    expect(validateMeta({ ...good, prerequisites: ["no-such-unit"] }, { tags }).join()).toContain("not a curriculum unit");
    expect(validateMeta({ ...good, prerequisites: ["arrays", "arrays"] }, { tags }).join()).toContain("distinct");
    expect(validateMeta({ ...good, prerequisites: ["arrays", "loops", "strings", "vectors"] }, { tags }).join()).toContain("at most 3");
  });
  it("rejects unknown fields", () => {
    expect(validateMeta({ ...good, difficulty: "hard" } as ProblemMeta, { tags }).join()).toContain('unknown metadata field "difficulty"');
  });
});

describe("problem metadata: reading stored values (missing / invalid handling)", () => {
  it("returns null for missing, empty, malformed or invalid data and never throws", () => {
    for (const raw of [null, undefined, {}, [], "text", 42, { primarySkill: "dp" }, { ...good, timeComplexity: "nope" }]) expect(parseProblemMeta(raw, tags)).toBeNull();
  });
  it("returns the metadata when it is valid", () => {
    expect(parseProblemMeta(good, tags)).toEqual(good);
  });
});

describe("problem metadata: prerequisites", () => {
  it("derives units from tags, primary skill first, deduplicated and capped at 3", () => {
    expect(prerequisiteUnits(["arrays", "prefix-sums"], null)).toEqual(["arrays", "prefix-two-pointers"]);
    expect(prerequisiteUnits(["two-pointers", "sliding-window", "prefix-sums"], null)).toEqual(["prefix-two-pointers"]);
    expect(prerequisiteUnits(["arrays", "strings", "sorting", "dp", "greedy"], null)).toHaveLength(3);
    expect(prerequisiteUnits(["arrays", "dp"], { ...good, primarySkill: "dp" })[0]).toBe("dp-intro");
  });
  it("gives nothing for topics beyond the curriculum or no tags", () => {
    expect(prerequisiteUnits([], null)).toEqual([]);
    expect(prerequisiteUnits(["fenwick-tree", "geometry", "implementation"], null)).toEqual([]);
  });
  it("prefers an explicit list and drops unknown units", () => {
    expect(prerequisiteUnits(["dp"], { ...good, prerequisites: ["arrays", "ghost-unit"] })).toEqual(["arrays"]);
  });
  it("only ever maps to real curriculum units", () => {
    for (const u of Object.values(TAG_TO_UNIT)) expect(KNOWN_UNITS.has(u), u).toBe(true);
    for (const p of PROBLEMS) for (const u of prerequisiteUnits(p.tags, PROBLEM_META[p.slug] ?? null)) expect(KNOWN_UNITS.has(u), `${p.slug} -> ${u}`).toBe(true);
  });
});

describe("authored metadata is consistent with the problem bank", () => {
  it("every entry belongs to a real problem and validates against its tags", () => {
    for (const [slug, meta] of Object.entries(PROBLEM_META)) {
      const p = bySlug.get(slug);
      expect(p, `unknown problem ${slug}`).toBeDefined();
      expect(validateMeta(meta, { tags: p!.tags }), slug).toEqual([]);
    }
  });
  it("states the same time complexity as the editorial", () => {
    for (const [slug, meta] of Object.entries(PROBLEM_META)) {
      const ed = bySlug.get(slug)!.editorial;
      expect(normComplexity(ed).includes(normComplexity(meta.timeComplexity!)), `${slug}: meta ${meta.timeComplexity} vs editorial ${editorialTimeComplexity(ed)}`).toBe(true);
    }
  });
  it("covers every curriculum practice problem except the trivial first one", () => {
    const practice = new Set(Object.values(UNIT_META).flatMap((u) => u.practice));
    for (const s of practice) if (s !== "hello-coder") expect(PROBLEM_META[s], `missing metadata for ${s}`).toBeDefined();
  });
  it("is hand-written: no two entries share the same approach sentence", () => {
    const approaches = Object.values(PROBLEM_META).map((m) => m.approach);
    expect(new Set(approaches).size).toBe(approaches.length);
  });
});

describe("hints", () => {
  it("every problem in the bank has exactly 3 well-formed, distinct hints", () => {
    for (const p of PROBLEMS) expect(validateHints(p.hints), p.slug).toEqual([]);
  });
  it("exposes three progressive levels", () => {
    expect(HINT_LEVELS.map((h) => h.level)).toEqual([1, 2, 3]);
  });
  it("rejects the wrong number, too-short, duplicated and code-filled hints", () => {
    const ok = ["think about what changes between neighbours", "a sliding window keeps a running total", "add the new element and drop the old one"];
    expect(validateHints(ok)).toEqual([]);
    expect(validateHints(ok.slice(0, 2))).toEqual(["exactly 3 hints are required"]);
    expect(validateHints(["short", ok[1]!, ok[2]!]).join()).toContain("too short");
    expect(validateHints([ok[0]!, ok[0]!, ok[2]!]).join()).toContain("different");
    expect(validateHints(["x".repeat(701), ok[1]!, ok[2]!]).join()).toContain("too long");
    expect(validateHints(["```cpp\nfor (int i = 0; i < n; i++) {}\n```", ok[1]!, ok[2]!]).join()).toContain("hint 1 should not contain code");
    expect(validateHints([ok[0]!, "#include <bits/stdc++.h> then loop forever", ok[2]!]).join()).toContain("hint 2");
    expect(validateHints([ok[0]!, ok[1]!, "for (int i = 0; i < n; i++) sum += a[i]; is the whole loop"])).toEqual([]); // implementation hints may show a line of code
  });
});

describe("existing problems stay compatible", () => {
  it("keeps unique slugs, canonical tags, valid difficulty bands and consistent samples", () => {
    expect(new Set(PROBLEMS.map((p) => p.slug)).size).toBe(PROBLEMS.length);
    const bands: Record<string, [number, number]> = { newbie: [800, 1000], easy: [800, 1300], medium: [1200, 1800], hard: [1600, 2300], expert: [2000, 3500] };
    for (const p of PROBLEMS) {
      expect(canonicalTags(p.tags), p.slug).toEqual(p.tags);
      expect(p.tags.length, p.slug).toBeGreaterThanOrEqual(1);
      expect(p.tags.length, p.slug).toBeLessThanOrEqual(5);
      const [lo, hi] = bands[p.difficulty]!;
      expect(p.rating >= lo && p.rating <= hi, `${p.slug}: ${p.difficulty} ${p.rating}`).toBe(true);
      expect(p.samples.length, p.slug).toBeGreaterThan(0);
    }
  });
  it("does not tag a problem 'sorting' when its reference never sorts and the input is already sorted or counted", () => {
    for (const slug of ["one-sided-values", "equal-value-pairs"]) expect(bySlug.get(slug)!.tags, slug).not.toContain("sorting");
  });
  it("the curriculum's practice lists point at problems whose topics match the unit", () => {
    const practice = UNIT_META["recursion"]!.practice;
    expect(practice).not.toContain("kth-char-of-expansion"); // prefix sums + binary search, not recursion
    expect(UNIT_META["prefix-two-pointers"]!.practice).toContain("kth-char-of-expansion");
    expect(UNIT_META["backtracking"]!.practice).not.toContain("independent-sets-of-size-k"); // a rated-1900 tree DP
    for (const u of Object.values(UNIT_META)) expect(u.practice.length).toBeGreaterThanOrEqual(2);
  });
});

describe("admin metadata form", () => {
  const form = { primarySkill: "prefix-sums", approach: good.approach, timeComplexity: "O(n + q)", spaceComplexity: "O(n)", commonMistakes: "First mistake that is long enough\nSecond mistake that is long enough\n\n", prerequisites: "arrays, loops" };
  it("treats a fully blank form as no metadata", () => {
    expect(buildProblemMeta({}, tags)).toEqual({ meta: {}, errors: [] });
    expect(buildProblemMeta({ primarySkill: " ", commonMistakes: "\n\n" }, tags)).toEqual({ meta: {}, errors: [] });
  });
  it("builds metadata from one-per-line mistakes and comma separated prerequisites", () => {
    const r = buildProblemMeta(form, tags);
    expect(r.errors).toEqual([]);
    expect(r.meta.commonMistakes).toEqual(["First mistake that is long enough", "Second mistake that is long enough"]);
    expect(r.meta.prerequisites).toEqual(["arrays", "loops"]);
  });
  it("refuses a half-filled form so a partial entry never reaches learners", () => {
    expect(buildProblemMeta({ primarySkill: "prefix-sums" }, tags).errors.length).toBeGreaterThan(0);
    expect(buildProblemMeta({ ...form, primarySkill: "geometry" }, tags).errors.join()).toContain("must be one of the tags");
  });
});
