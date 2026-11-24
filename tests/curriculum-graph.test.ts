import { describe, expect, it } from "vitest";
import { WORLDS } from "@/content";
import { UNIT_META } from "@/content/curriculum-meta";
import { PROBLEMS } from "@/content/problems";
import { isLessonUnlockedIn, isUnitMastered, lockedReason, resolveGates, unitDepths, validateGraph, type GraphUnit } from "@/server/services/curriculum-graph";

const units = WORLDS.flatMap((w) => w.units);

describe("curriculum architecture", () => {
  it("unit slugs are globally unique and every unit has learning metadata", () => {
    expect(new Set(units.map((u) => u.slug)).size).toBe(units.length);
    for (const u of units) {
      const m = UNIT_META[u.slug];
      expect(m, u.slug).toBeTruthy();
      expect(m!.objectives.length, u.slug).toBeGreaterThanOrEqual(3);
      expect(m!.practice.length, u.slug).toBeGreaterThanOrEqual(2);
    }
    for (const slug of Object.keys(UNIT_META)) expect(units.some((u) => u.slug === slug), `meta for unknown unit ${slug}`).toBe(true);
  });
  it("the prerequisite graph is a DAG that only points backwards", () => {
    expect(validateGraph(units.map((u) => ({ slug: u.slug, prerequisites: UNIT_META[u.slug]!.prerequisites })))).toEqual([]);
    // only the very first unit may have no prerequisite
    const roots = units.filter((u) => UNIT_META[u.slug]!.prerequisites.length === 0);
    expect(roots.map((u) => u.slug)).toEqual(["getting-started"]);
  });
  it("practice slugs exist in the problem library", () => {
    const slugs = new Set(PROBLEMS.map((p) => p.slug));
    for (const u of units) for (const p of UNIT_META[u.slug]!.practice) expect(slugs.has(p), `${u.slug} -> ${p}`).toBe(true);
  });
  it("assessments are last in their unit; new units have a required assessment", () => {
    for (const u of units) {
      const kinds = u.lessons.map((l) => l.kind ?? "lesson");
      const idx = kinds.findIndex((k) => k !== "lesson");
      if (idx !== -1) expect(idx, u.slug).toBe(kinds.length - 1);
      expect(kinds.filter((k) => k !== "lesson").length).toBeLessThanOrEqual(1);
    }
    for (const slug of ["problem-solving", "prefix-two-pointers", "recursion", "backtracking", "greedy", "graph-traversal", "dp-intro"]) {
      const u = units.find((x) => x.slug === slug)!;
      const last = u.lessons[u.lessons.length - 1]!;
      expect(last.kind, slug).toBe("assessment");
      expect(new Set(last.questions.map((q) => q.type)).size, `${slug} assessment mixes question types`).toBeGreaterThanOrEqual(4);
    }
  });
  it("required topics are covered by the curriculum", () => {
    const lessonSlugs = new Set(units.flatMap((u) => u.lessons.map((l) => l.slug)));
    for (const s of ["brute-force", "prefix-sums", "two-pointers", "recursion-intro", "choose-explore-undo", "stack", "queue", "dfs", "bfs", "binary-search", "std-sort", "greedy-choice", "memoization", "tabulation"]) expect(lessonSlugs.has(s), s).toBe(true);
  });
});

// synthetic graph: a -> b -> d, a -> c -> d ; e (no prerequisites -> follows d)
const U = (slug: string, prerequisites: string[], lessonKinds: string[] = ["lesson", "lesson"]): GraphUnit => ({
  id: `u-${slug}`,
  slug,
  title: slug.toUpperCase(),
  prerequisites,
  lessons: lessonKinds.map((kind, i) => ({ id: `${slug}${i}`, kind })),
});
const G = [U("a", [], ["lesson", "lesson", "assessment"]), U("b", ["a"]), U("c", ["a"]), U("d", ["b", "c"]), U("e", [])];
const done = (...ids: string[]) => new Set(ids);

describe("prerequisite unlock logic", () => {
  it("opens the first unit and keeps the rest closed", () => {
    const gates = resolveGates(G, done());
    expect(gates.get("u-a")!.open).toBe(true);
    expect(gates.get("u-b")!.open).toBe(false);
    expect(isLessonUnlockedIn(G, done(), "a0")).toBe(true);
    expect(isLessonUnlockedIn(G, done(), "a1")).toBe(false); // lessons inside a unit stay sequential
    expect(isLessonUnlockedIn(G, done(), "b0")).toBe(false);
  });
  it("the assessment gates dependents: lessons alone are not enough", () => {
    expect(isUnitMastered(G[0]!, done("a0", "a1"))).toBe(false);
    expect(isLessonUnlockedIn(G, done("a0", "a1"), "b0")).toBe(false);
    expect(isLessonUnlockedIn(G, done("a0", "a1"), "a2")).toBe(true);
    expect(isLessonUnlockedIn(G, done("a0", "a1", "a2"), "b0")).toBe(true);
  });
  it("sibling units open in parallel, and a join unit needs both branches", () => {
    const d = done("a0", "a1", "a2");
    expect(isLessonUnlockedIn(G, d, "c0")).toBe(true); // c does not need b
    expect(isLessonUnlockedIn(G, new Set([...d, "b0", "b1"]), "d0")).toBe(false);
    expect(isLessonUnlockedIn(G, new Set([...d, "b0", "b1", "c0", "c1"]), "d0")).toBe(true);
  });
  it("explains why a unit is locked", () => {
    const gate = resolveGates(G, done("a0", "a1", "a2", "b0", "b1")).get("u-d")!;
    expect(lockedReason(G, gate)).toMatch(/C/);
    expect(lockedReason(G, gate)).not.toMatch(/\bB\b/);
    expect(lockedReason(G, resolveGates(G, done()).get("u-a")!)).toBeNull();
  });
  it("a unit without declared prerequisites depends on the unit before it", () => {
    const gates = resolveGates(G, done());
    expect(gates.get("u-e")!.prerequisiteIds).toEqual(["u-d"]);
  });
  it("optional checkpoints never gate anything and unlock after the required lessons", () => {
    const H = [U("x", [], ["lesson", "checkpoint"]), U("y", ["x"])];
    expect(isLessonUnlockedIn(H, done("x0"), "y0")).toBe(true);
    expect(isUnitMastered(H[0]!, done("x0"))).toBe(true);
    expect(isLessonUnlockedIn(H, done(), "x1")).toBe(false);
    expect(isLessonUnlockedIn(H, done("x0"), "x1")).toBe(true);
  });
  it("ignores unknown prerequisite slugs instead of locking forever", () => {
    const J = [U("p", []), U("q", ["ghost"])];
    expect(resolveGates(J, done()).get("u-q")!.prerequisiteIds).toEqual(["u-p"]);
  });
  it("validateGraph reports unknown, forward and cyclic references", () => {
    expect(validateGraph([{ slug: "a", prerequisites: ["b"] }, { slug: "b", prerequisites: ["a"] }]).length).toBeGreaterThan(0);
    expect(validateGraph([{ slug: "a", prerequisites: ["zzz"] }]).length).toBe(1);
    expect(validateGraph([{ slug: "a", prerequisites: [] }, { slug: "b", prerequisites: ["a"] }])).toEqual([]);
  });
  it("lays units out by prerequisite depth", () => {
    const m = unitDepths([{ slug: "a", prerequisites: [] }, { slug: "b", prerequisites: [{ slug: "a" }] }, { slug: "c", prerequisites: [{ slug: "a" }, { slug: "b" }] }]);
    expect([m.get("a"), m.get("b"), m.get("c")]).toEqual([0, 1, 2]);
  });
  it("existing learners keep access: a user who completed all earlier units can open every unit", () => {
    // simulate legacy progress: everything before each unit in curriculum order is done
    const all: GraphUnit[] = units.map((u) => ({ id: u.slug, slug: u.slug, title: u.title, prerequisites: UNIT_META[u.slug]!.prerequisites, lessons: u.lessons.map((l) => ({ id: `${u.slug}/${l.slug}`, kind: l.kind ?? "lesson" })) }));
    const completed = new Set<string>();
    for (const u of all) {
      expect(resolveGates(all, completed).get(u.id)!.open, u.slug).toBe(true);
      for (const l of u.lessons) completed.add(l.id);
    }
  });
});
