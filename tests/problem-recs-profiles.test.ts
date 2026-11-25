/** Learner-profile scenarios and regressions found by the Phase 2.1 audit. Pure, no database. */
import { describe, expect, it } from "vitest";
import { focusOfProblem, rankProblems, type Candidate, type Learner, type Rec } from "@/features/learning/problem-recs";
import type { ProblemMeta } from "@/content/problems/meta";

const meta = (primarySkill: string, extra: Partial<ProblemMeta> = {}): ProblemMeta => ({ primarySkill, approach: "A reviewed approach that is long enough.", timeComplexity: "O(n)", spaceComplexity: "O(1)", commonMistakes: ["A realistic common mistake text."], ...extra });
const c = (slug: string, tags: string[], rating: number, o: Partial<Candidate> = {}): Candidate => ({ slug, title: slug, difficulty: "easy", rating, tags, meta: null, solved: false, attempted: false, ...o });
const L = (o: Partial<Learner> = {}): Learner => ({ masteredUnits: new Set(), openUnits: new Set(), goalUnits: new Set(), solvedRatings: [], unitPractice: new Set(), ...o });
const titles = new Map([["arrays", "Arrays"], ["strings", "Strings"], ["sorting-searching", "Sorting and searching"], ["prefix-two-pointers", "Prefix sums and two pointers"], ["greedy", "Greedy"], ["set-map", "Set and map"]]);
const anchor = c("anchor", ["two-pointers", "sorting"], 1000, { meta: meta("two-pointers") });
const pool: Candidate[] = [
  c("tp1", ["two-pointers", "arrays"], 900, { meta: meta("two-pointers") }),
  c("tp2", ["two-pointers", "sorting"], 1000, { meta: meta("two-pointers") }),
  c("tp3", ["two-pointers"], 1100, { meta: meta("two-pointers") }),
  c("so1", ["sorting", "arrays"], 900, { meta: meta("sorting") }),
  c("so2", ["sorting"], 950, { meta: meta("sorting") }),
  c("ar1", ["arrays"], 850),
  c("ar2", ["arrays", "strings"], 800),
  c("gr1", ["greedy", "sorting"], 1000),
  c("hs1", ["hashing", "arrays"], 900),
];
const rank = (l: Learner, cs = pool, a = anchor, limit = 3): Rec[] => rankProblems(cs, l, focusOfProblem(a.tags, a.meta), a.slug, { limit, unitTitles: titles });
const everything = new Set(["arrays", "strings", "sorting-searching", "prefix-two-pointers", "greedy", "set-map"]);

describe("learner profiles", () => {
  it("brand-new learner: three explainable suggestions, review items name unlockable-later units, nothing claims Ready", () => {
    const out = rank(L());
    expect(out).toHaveLength(3);
    expect(out.every((r) => r.category !== "ready")).toBe(true);
    for (const r of out.filter((x) => x.category === "review")) {
      expect(r.reviewUnits.length).toBeGreaterThan(0);
      expect(r.reason).toContain(r.reviewUnits[0]!.title);
      expect(r.reviewUnits.every((u) => u.open === false)).toBe(true);
    }
  });

  it("placement learner: goal units that are open make Review items actionable and rank them higher", () => {
    const open = rank(L({ openUnits: new Set(["prefix-two-pointers", "sorting-searching", "arrays"]), goalUnits: new Set(["prefix-two-pointers"]) }));
    const locked = rank(L());
    expect(open[0]!.score).toBeGreaterThan(locked[0]!.score);
    expect(open[0]!.reviewUnits.some((u) => u.open)).toBe(true);
  });

  it("learner with several mastered units: Ready items appear and lead", () => {
    const out = rank(L({ masteredUnits: everything, solvedRatings: [800, 900, 1000] }));
    expect(out[0]!.category).toBe("ready");
    expect(out.some((r) => r.category === "review")).toBe(false);
  });

  it("learner with many solved problems: solved ones never return, others still fill the list", () => {
    const solved = pool.map((p) => (["tp1", "tp2", "so1"].includes(p.slug) ? { ...p, solved: true } : p));
    const out = rank(L({ masteredUnits: everything, solvedRatings: [900, 1000, 1000] }), solved);
    expect(out.map((r) => r.slug).some((s) => ["tp1", "tp2", "so1"].includes(s))).toBe(false);
    expect(out).toHaveLength(3);
  });

  it("attempted but unsolved problems rank above identical untouched ones, but never above clearly better fits", () => {
    const l = L({ masteredUnits: everything });
    const cs = [c("tried", ["two-pointers"], 1000, { meta: meta("two-pointers"), attempted: true }), c("fresh", ["two-pointers"], 1000, { meta: meta("two-pointers") }), c("bestfit", ["two-pointers"], 1000, { meta: meta("two-pointers"), attempted: true })];
    expect(rank(l, cs).map((r) => r.slug)).toEqual(["bestfit", "tried", "fresh"]);
    const far = [c("tried-far", ["two-pointers"], 1400, { meta: meta("two-pointers"), attempted: true }), c("near", ["two-pointers"], 1000, { meta: meta("two-pointers") })];
    expect(rank(l, far)[0]!.slug).toBe("near");
  });

  it("incomplete metadata: derived and missing items appear, honestly labelled, and are not buried by metadata coverage", () => {
    const l = L({ masteredUnits: everything });
    const cs = [c("explicit", ["two-pointers"], 1000, { meta: meta("two-pointers") }), c("derived", ["two-pointers", "arrays"], 1000), c("missing", ["arrays", "geometry"], 1000)];
    const out = rank(l, cs);
    const d = out.find((r) => r.slug === "derived")!;
    expect(d.category).toBe("related");
    expect(d.reason).toContain("topic tags");
    // reviewed metadata is a modest advantage only: an unreviewed problem that fits the level much better still wins
    const far = rank(l, [c("explicit-far", ["two-pointers"], 1450, { meta: meta("two-pointers") }), c("derived-fit", ["two-pointers"], 1000)]);
    expect(far[0]!.slug).toBe("derived-fit");
  });

  it("mastered skills that do not overlap the current problem: Review first names the real gap, not mastered units", () => {
    const l = L({ masteredUnits: new Set(["strings", "set-map"]) });
    const out = rank(l);
    for (const r of out) for (const u of r.reviewUnits) expect(["strings", "set-map"]).not.toContain(u.slug);
  });

  it("broad solved ratings: target follows the median, not the extremes", () => {
    const l = L({ masteredUnits: everything, solvedRatings: [400, 450, 1500, 1600, 1650] }); // median 1500 -> target 1600
    const cs = [c("easy", ["two-pointers"], 800, { meta: meta("two-pointers") }), c("fit", ["two-pointers"], 1600, { meta: meta("two-pointers") })];
    expect(rank(l, cs).map((r) => r.slug)).toEqual(["fit"]); // 800 is outside the window of a 1600 target
  });
});

describe("audit regressions", () => {
  it("a focus problem without reviewed metadata never produces Ready (its first tag is only a guess)", () => {
    const unreviewed = c("a2", ["two-pointers", "sorting"], 1000);
    const out = rankProblems(pool, L({ masteredUnits: everything }), focusOfProblem(unreviewed.tags, null), "a2", { unitTitles: titles });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.category !== "ready")).toBe(true);
  });

  it("estimated prerequisites are worth less than explicit ones", () => {
    const l = L({ masteredUnits: everything });
    const ex = rank(l, [c("x", ["two-pointers"], 1000, { meta: meta("two-pointers") })])[0]!;
    const de = rank(l, [c("x", ["two-pointers"], 1000)])[0]!;
    expect(ex.score).toBeGreaterThan(de.score);
  });

  it("goal bonus applies only to actionable Review items, and never to Ready items", () => {
    const l = L({ masteredUnits: everything, goalUnits: new Set(["greedy"]) });
    const ready = rank(L({ masteredUnits: everything }), [c("x", ["two-pointers"], 1000, { meta: meta("two-pointers") })])[0]!;
    const withGoal = rank(l, [c("x", ["two-pointers"], 1000, { meta: meta("two-pointers") })])[0]!;
    expect(withGoal.score).toBe(ready.score);
  });

  it("fills up to three Review suggestions when nothing else exists", () => {
    const cs = ["a", "b", "c", "d"].map((s) => c(s, ["two-pointers"], 1000, { meta: meta("two-pointers") }));
    const out = rank(L(), cs);
    expect(out).toHaveLength(3);
    expect(out.every((r) => r.category === "review")).toBe(true);
  });

  it("never returns duplicates, and output is sorted by score", () => {
    const out = rank(L({ masteredUnits: new Set(["arrays"]) }), pool, anchor, 6);
    expect(new Set(out.map((r) => r.slug)).size).toBe(out.length);
    for (let i = 1; i < out.length; i++) expect(out[i - 1]!.score).toBeGreaterThanOrEqual(out[i]!.score);
  });

  it("one-skill pools are still filled (cap is a preference, not a limit)", () => {
    const cs = Array.from({ length: 5 }, (_, i) => c(`t${i}`, ["two-pointers"], 1000, { meta: meta("two-pointers") }));
    expect(rank(L({ masteredUnits: everything }), cs)).toHaveLength(3);
  });
});

describe("audit regressions (human review findings)", () => {
  const mastered = L({ masteredUnits: everything });
  it("generic tags (implementation, math, ...) never make a problem relevant", () => {
    const a = c("a", ["arrays", "implementation"], 800, { meta: meta("arrays") });
    const cs = [c("only-generic", ["strings", "implementation"], 800), c("real", ["arrays"], 800, { meta: meta("arrays") })];
    expect(rankProblems(cs, mastered, focusOfProblem(a.tags, a.meta), "a").map((r) => r.slug)).toEqual(["real"]);
    expect(focusOfProblem(["implementation", "strings"], null)!.primary).toBe("strings"); // the guess skips generic tags
  });

  it("without a reviewed focus, no candidate gets the main-skill bonus; a problem sharing more skills wins", () => {
    const f = focusOfProblem(["strings", "stack"], null)!;
    const cs = [c("one", ["strings"], 1000, { meta: meta("strings") }), c("both", ["stack", "strings"], 1000, { meta: meta("stack") })];
    expect(rankProblems(cs, L({ masteredUnits: new Set([...everything, "stack-queue"]) }), f, "x").map((r) => r.slug)).toEqual(["both", "one"]);
  });

  it("reviewed metadata without a prerequisite list only claims its primary skill's unit (grids is not a graph prerequisite)", () => {
    const f = focusOfProblem(["dp"], meta("dp"))!;
    const g = c("grid-dp", ["dp", "grids"], 1000, { meta: meta("dp") });
    const out = rankProblems([g], L({ masteredUnits: new Set(["arrays"]) }), f, "x", { unitTitles: new Map([["dp-intro", "Intro to DP"], ["graph-traversal", "Graph Traversal"]]) });
    expect(out[0]!.reviewUnits.map((u) => u.slug)).toEqual(["dp-intro"]);
    // an explicit list is still honoured in full
    const e = c("e", ["dp", "grids"], 1000, { meta: meta("dp", { prerequisites: ["dp-intro", "graph-traversal"] }) });
    expect(rankProblems([e], L(), f, "x")[0]!.reviewUnits.map((u) => u.slug)).toEqual(["dp-intro", "graph-traversal"]);
  });

  it("a Review item about an unrelated unit gets no 'actionable' bonus and ranks below on-topic related practice", () => {
    const f = focusOfProblem(["strings"], meta("strings"))!;
    const l = L({ masteredUnits: new Set(["strings"]), openUnits: new Set(["greedy"]) });
    const cs = [c("tangent", ["strings", "greedy"], 1000), c("ontopic", ["strings"], 1000, { meta: meta("strings") })];
    expect(rankProblems(cs, l, f, "x").map((r) => r.slug)).toEqual(["ontopic", "tangent"]);
  });
});
