import { describe, expect, it } from "vitest";
import { MAX_PER_SKILL, MAX_RATING_GAP, focusOfGoals, focusOfProblem, rankProblems, reliabilityOf, targetFor, type Candidate, type Learner } from "@/features/learning/problem-recs";
import type { ProblemMeta } from "@/content/problems/meta";

const meta = (primarySkill: string, extra: Partial<ProblemMeta> = {}): ProblemMeta => ({ primarySkill, approach: "A reviewed approach that is long enough.", timeComplexity: "O(n)", spaceComplexity: "O(1)", commonMistakes: ["A realistic common mistake text."], ...extra });
const cand = (slug: string, tags: string[], rating: number, o: Partial<Candidate> = {}): Candidate => ({ slug, title: slug, difficulty: "easy", rating, tags, meta: null, solved: false, attempted: false, ...o });
const learner = (o: Partial<Learner> = {}): Learner => ({ masteredUnits: new Set(["arrays", "strings"]), openUnits: new Set(), goalUnits: new Set(), solvedRatings: [800], unitPractice: new Set(), ...o });
const titles = new Map([["prefix-two-pointers", "Prefix sums and two pointers"], ["arrays", "Arrays"], ["sorting-searching", "Sorting and searching"]]);
const focus = focusOfProblem(["prefix-sums", "arrays"], meta("prefix-sums"))!;
const run = (cs: Candidate[], l = learner(), o = {}) => rankProblems(cs, l, focus, "anchor", { unitTitles: titles, ...o });

describe("problem recommendations", () => {
  it("is deterministic and independent of input order", () => {
    const cs = [cand("a", ["prefix-sums"], 900, { meta: meta("prefix-sums") }), cand("b", ["prefix-sums"], 900, { meta: meta("prefix-sums") }), cand("c", ["arrays"], 850)];
    const l = learner({ masteredUnits: new Set(["prefix-two-pointers", "arrays"]) });
    const one = run(cs, l);
    expect(run([...cs].reverse(), l)).toEqual(one);
    expect(run(cs, l)).toEqual(one);
    expect(one.map((r) => r.slug)).toEqual(["a", "b", "c"]); // equal scores break by slug
  });

  it("separates explicit, derived and missing metadata", () => {
    expect(reliabilityOf(cand("x", ["prefix-sums"], 900, { meta: meta("prefix-sums") }))).toBe("explicit");
    expect(reliabilityOf(cand("x", ["prefix-sums"], 900))).toBe("derived");
    expect(reliabilityOf(cand("x", ["geometry"], 900))).toBe("missing");
  });

  it("marks a problem Ready only when its explicit primary skill matches and prerequisites are mastered", () => {
    const l = learner({ masteredUnits: new Set(["prefix-two-pointers", "arrays"]) });
    const [r] = run([cand("p", ["prefix-sums", "arrays"], 900, { meta: meta("prefix-sums") })], l);
    expect(r!.category).toBe("ready");
    expect(r!.reviewUnits).toEqual([]);
  });

  it("marks Review first and names exactly the missing units", () => {
    const [r] = run([cand("p", ["prefix-sums", "arrays"], 900, { meta: meta("prefix-sums") })]);
    expect(r!.category).toBe("review");
    expect(r!.reviewUnits).toEqual([{ slug: "prefix-two-pointers", title: "Prefix sums and two pointers" }]);
    expect(r!.reason).toContain("Prefix sums and two pointers");
    expect(r!.reason).not.toContain("Arrays"); // mastered units are not listed
  });

  it("honours an explicit prerequisite list over tag derivation", () => {
    const [r] = run([cand("p", ["prefix-sums"], 900, { meta: meta("prefix-sums", { prerequisites: ["sorting-searching"] }) })]);
    expect(r!.reviewUnits.map((u) => u.slug)).toEqual(["sorting-searching"]);
  });

  it("never calls a merely related skill a prerequisite", () => {
    const [r] = run([cand("p", ["arrays"], 850, { meta: meta("arrays") })]);
    expect(r!.category).toBe("related");
    expect(r!.reason).toMatch(/not a prerequisite/);
    expect(r!.reviewUnits).toEqual([]);
  });

  it("derived metadata can say Review but is never Ready, and says it is estimated", () => {
    const l = learner({ masteredUnits: new Set(["prefix-two-pointers", "arrays"]) });
    expect(run([cand("d", ["prefix-sums"], 900)], l)[0]!.category).toBe("related");
    const [rev] = run([cand("d", ["prefix-sums"], 900)]);
    expect(rev!.category).toBe("review");
    expect(rev!.reason).toContain("estimated");
    expect(rev!.reliability).toBe("derived");
  });

  it("missing metadata with no mapped tag claims no readiness", () => {
    const f = focusOfProblem(["geometry"], null)!;
    const [r] = rankProblems([cand("m", ["geometry"], 850)], learner(), f, "anchor");
    expect(r!.category).toBe("related");
    expect(r!.reliability).toBe("missing");
    expect(r!.reason).toMatch(/unknown/);
  });

  it("excludes solved problems, the viewed problem and recent ones", () => {
    const cs = [cand("s", ["prefix-sums"], 900, { solved: true }), cand("anchor", ["prefix-sums"], 900), cand("r", ["prefix-sums"], 900), cand("ok", ["prefix-sums"], 900)];
    expect(run(cs, learner(), { recentSlugs: new Set(["r"]) }).map((x) => x.slug)).toEqual(["ok"]);
  });

  it("does not recommend by tag alone: no shared skill or out-of-range difficulty is dropped", () => {
    const cs = [cand("none", ["graphs"], 900), cand("hard", ["prefix-sums"], 800 + 100 + MAX_RATING_GAP + 1), cand("fit", ["prefix-sums"], 900)];
    expect(run(cs).map((x) => x.slug)).toEqual(["fit"]);
  });

  it("prefers problems near the target difficulty", () => {
    const l = learner({ solvedRatings: [1000, 1000, 1000], masteredUnits: new Set(["prefix-two-pointers", "arrays"]) }); // target 1100
    const cs = [cand("far", ["prefix-sums"], 700, { meta: meta("prefix-sums") }), cand("near", ["prefix-sums"], 1100, { meta: meta("prefix-sums") })];
    expect(rankProblems(cs, l, focus, "anchor").map((r) => r.slug)).toEqual(["near", "far"]);
    expect(targetFor([])).toBe(800);
    expect(targetFor([900, 1000, 1200])).toBe(1100);
  });

  it("ranks Ready above Review, and secondary-skill matches below primary matches", () => {
    const l = learner({ masteredUnits: new Set(["prefix-two-pointers", "arrays"]) });
    const cs = [cand("sec", ["arrays"], 900, { meta: meta("arrays") }), cand("prim", ["prefix-sums"], 900, { meta: meta("prefix-sums") })];
    expect(rankProblems(cs, l, focus, "anchor").map((r) => r.slug)).toEqual(["prim", "sec"]);
  });

  it("keeps variety: caps per skill and at most one Review", () => {
    const l = learner({ masteredUnits: new Set(["prefix-two-pointers", "arrays"]) });
    const many = Array.from({ length: 6 }, (_, i) => cand(`p${i}`, ["prefix-sums"], 900, { meta: meta("prefix-sums") }));
    const out = rankProblems([...many, cand("a1", ["arrays"], 880, { meta: meta("arrays") })], l, focus, "anchor", { limit: 4 });
    expect(out.filter((r) => r.skill === "prefix-sums").length).toBeLessThanOrEqual(MAX_PER_SKILL);
    const revs = run([cand("x", ["prefix-sums"], 900, { meta: meta("prefix-sums") }), cand("y", ["prefix-sums"], 905, { meta: meta("prefix-sums") })]);
    expect(revs.filter((r) => r.category === "review")).toHaveLength(1);
  });

  it("learning goals and unit practice raise the score; attempted problems get a small bump", () => {
    const base = run([cand("p", ["prefix-sums"], 900)])[0]!.score;
    expect(run([cand("p", ["prefix-sums"], 900)], learner({ goalUnits: new Set(["prefix-two-pointers"]) }))[0]!.score).toBeGreaterThan(base);
    expect(run([cand("p", ["prefix-sums"], 900)], learner({ unitPractice: new Set(["p"]) }))[0]!.score).toBeGreaterThan(base);
    expect(run([cand("p", ["prefix-sums"], 900, { attempted: true })])[0]!.score).toBeGreaterThan(base);
  });

  it("legacy learners with no progress data still get safe, honest suggestions", () => {
    const empty: Learner = { masteredUnits: new Set(), openUnits: new Set(), goalUnits: new Set(), solvedRatings: [], unitPractice: new Set() };
    const out = rankProblems([cand("p", ["prefix-sums"], 850, { meta: meta("prefix-sums") })], empty, focus, "anchor", { unitTitles: titles });
    expect(out[0]!.category).toBe("review");
  });

  it("returns nothing (so callers fall back to related problems) without a focus or candidates", () => {
    expect(rankProblems([cand("p", ["prefix-sums"], 900)], learner(), null, null)).toEqual([]);
    expect(run([])).toEqual([]);
    expect(focusOfProblem([], null)).toBeNull();
    expect(focusOfGoals(new Set(["dp-intro"]))?.primary).toBe("dp");
    expect(focusOfGoals(new Set())).toBeNull();
  });

  it("does not mutate its inputs", () => {
    const cs = [cand("b", ["prefix-sums"], 900), cand("a", ["prefix-sums"], 900)];
    const l = learner();
    const before = JSON.stringify([cs, [...l.masteredUnits]]);
    run(cs, l);
    expect(JSON.stringify([cs, [...l.masteredUnits]])).toBe(before);
  });
});
