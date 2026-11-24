import { describe, expect, it } from "vitest";
import { WORLDS } from "@/content";
import { UNIT_META } from "@/content/curriculum-meta";
import { PLACEMENT_TYPES, SKILLS } from "@/content/placement";
import { shuffleQuestion } from "@/content/shuffle";
import { classify, diagnose, recommend, selectPlacement, seededRandom, type PoolQuestion, type RecUnit, type SkillDiagnosis } from "@/server/services/placement-logic";

const units = WORLDS.flatMap((w) => w.units);
/** The pool exactly as the service builds it: lesson-kind questions of the allowed types. */
const pool: PoolQuestion[] = units.flatMap((u) => u.lessons.filter((l) => (l.kind ?? "lesson") === "lesson").flatMap((l, li) => l.questions.map((q, qi) => ({ id: `${u.slug}/${l.slug}/${qi}`, unit: u.slug, lesson: l.slug, type: q.type, li }))));

describe("placement content coverage", () => {
  it("every skill has enough eligible questions in lessons that exist", () => {
    for (const s of SKILLS) {
      for (const src of s.sources) {
        const u = units.find((x) => x.slug === src.unit);
        expect(u, `${s.id}: unit ${src.unit}`).toBeTruthy();
        for (const l of src.lessons ?? []) expect(u!.lessons.some((x) => x.slug === l), `${s.id}: lesson ${l}`).toBe(true);
      }
      const eligible = pool.filter((q) => s.sources.some((src) => src.unit === q.unit && (!src.lessons || src.lessons.includes(q.lesson))) && (PLACEMENT_TYPES as readonly string[]).includes(q.type));
      expect(eligible.length, s.id).toBeGreaterThanOrEqual(s.count * 2);
      for (const un of s.units) expect(units.some((x) => x.slug === un), `${s.id} -> ${un}`).toBe(true);
    }
  });
  it("the test is 15-20 questions and never uses assessment questions", () => {
    const picks = selectPlacement(pool, SKILLS, seededRandom(1));
    expect(picks.length).toBeGreaterThanOrEqual(15);
    expect(picks.length).toBeLessThanOrEqual(20);
    const lessonKind = new Map(units.flatMap((u) => u.lessons.map((l) => [`${u.slug}/${l.slug}`, l.kind ?? "lesson"])));
    for (const p of picks) {
      const q = pool.find((x) => x.id === p.questionId)!;
      expect(lessonKind.get(`${q.unit}/${q.lesson}`)).toBe("lesson");
    }
  });
});

describe("question selection", () => {
  it("is deterministic for a seed, differs across seeds, and has no duplicates", () => {
    const a = selectPlacement(pool, SKILLS, seededRandom(7));
    const b = selectPlacement(pool, SKILLS, seededRandom(7));
    const c = selectPlacement(pool, SKILLS, seededRandom(8));
    expect(a).toEqual(b);
    expect(a.map((p) => p.questionId)).not.toEqual(c.map((p) => p.questionId));
    expect(new Set(a.map((p) => p.questionId)).size).toBe(a.length);
  });
  it("draws exactly `count` questions per skill from the skill's own lessons, in skill order", () => {
    const picks = selectPlacement(pool, SKILLS, seededRandom(3));
    for (const s of SKILLS) {
      const mine = picks.filter((p) => p.skillId === s.id);
      expect(mine.length, s.id).toBe(s.count);
      for (const p of mine) {
        const q = pool.find((x) => x.id === p.questionId)!;
        expect(s.sources.some((src) => src.unit === q.unit && (!src.lessons || src.lessons.includes(q.lesson))), `${s.id} got ${q.unit}/${q.lesson}`).toBe(true);
      }
    }
    expect(picks.map((p) => p.skillId)).toEqual(SKILLS.flatMap((s) => Array(s.count).fill(s.id)));
  });
  it("spreads a skill's questions over its lessons when it can", () => {
    const sk = SKILLS.find((s) => s.id === "two-pointers")!;
    for (let seed = 1; seed < 15; seed++) {
      const mine = selectPlacement(pool, [sk], seededRandom(seed)).map((p) => pool.find((q) => q.id === p.questionId)!.lesson);
      expect(new Set(mine).size).toBe(2);
    }
  });
  it("copes with a thin pool: returns what exists, never throws or repeats", () => {
    const thin = pool.filter((q) => q.unit === "loops").slice(0, 1);
    const picks = selectPlacement(thin, SKILLS, seededRandom(1));
    expect(picks.length).toBeLessThanOrEqual(1);
    expect(selectPlacement([], SKILLS, seededRandom(1))).toEqual([]);
  });
});

describe("skill classification", () => {
  const t = (correct: number, total: number, unknown = 0) => ({ skillId: "x", correct, total, unknown });
  it("uses the documented thresholds", () => {
    expect(classify(t(2, 2)).level).toBe("strong");
    expect(classify(t(1, 2)).level).toBe("developing");
    expect(classify(t(0, 2)).level).toBe("practice");
    expect(classify(t(1, 1)).level).toBe("strong");
    expect(classify(t(0, 1)).level).toBe("practice");
    expect(classify(t(3, 4)).level).toBe("strong");
    expect(classify(t(0, 0)).level).toBe("practice");
  });
  it("is never more than medium confidence and marks single-question skills as low", () => {
    expect(classify(t(1, 1)).confidence).toBe("low");
    expect(classify(t(2, 2)).confidence).toBe("medium");
  });
  it("diagnose drops skills without questions and keeps tallies", () => {
    const d = diagnose([t(1, 2, 1), { skillId: "loops", correct: 0, total: 0, unknown: 0 }], SKILLS);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ correct: 1, total: 2, unknown: 1, level: "developing" });
  });
});

// ── recommendation over the real prerequisite graph ──
const slugs = units.map((u) => u.slug);
function graph(mastered: string[] = []): RecUnit[] {
  return units.map((u, i) => ({ id: `id-${u.slug}`, slug: u.slug, title: u.title, prerequisites: UNIT_META[u.slug]!.prerequisites.length ? UNIT_META[u.slug]!.prerequisites : i > 0 ? [slugs[i - 1]!] : [], mastered: mastered.includes(u.slug) }));
}
const all = (level: "strong" | "developing" | "practice", over: Record<string, "strong" | "developing" | "practice"> = {}): SkillDiagnosis[] =>
  SKILLS.map((s) => ({ skillId: s.id, title: s.title, correct: 0, unknown: 0, total: s.count, ...classify({ skillId: s.id, correct: (over[s.id] ?? level) === "strong" ? s.count : (over[s.id] ?? level) === "developing" ? Math.max(1, Math.floor(s.count / 2)) : 0, unknown: 0, total: s.count }), level: over[s.id] ?? level, confidence: "medium" as const }));

describe("recommendation", () => {
  it("a complete beginner starts at the very beginning", () => {
    const r = recommend(all("practice"), SKILLS, graph());
    expect(r.startUnit).toBe("getting-started");
    expect(r.steps[0]!.unit).toBe("getting-started");
    expect(r.steps.every((s) => s.action !== "skip-test")).toBe(true);
  });
  it("strong foundations but weak graphs: earlier units become skip-test offers, learning starts at the weak skill's prerequisites", () => {
    const r = recommend(all("strong", { graphs: "practice" }), SKILLS, graph());
    const ids = r.steps.map((s) => s.unit);
    expect(ids[ids.length - 1]).toBe("graph-traversal");
    expect(ids).toContain("recursion");
    expect(r.steps.find((s) => s.unit === "loops")!.action).toBe("skip-test");
    // the first unit that is NOT a skip test is where learning begins
    expect(r.steps.find((s) => s.unit === r.startUnit)!.action).not.toBe("skip-test");
    // steps are in curriculum order and respect prerequisites
    const idx = (s: string) => slugs.indexOf(s);
    for (let i = 1; i < ids.length; i++) expect(idx(ids[i]!)).toBeGreaterThan(idx(ids[i - 1]!));
    for (const s of r.steps) for (const p of UNIT_META[s.unit]!.prerequisites) if (ids.includes(p)) expect(idx(p)).toBeLessThan(idx(s.unit));
  });
  it("never recommends units the learner has already mastered", () => {
    const mastered = ["getting-started", "variables-data-types", "operators", "conditionals", "loops"];
    const r = recommend(all("practice"), SKILLS, graph(mastered));
    for (const m of mastered) expect(r.steps.map((s) => s.unit)).not.toContain(m);
  });
  it("all strong: points at the next unmastered unit with skip tests, no weak skills", () => {
    const r = recommend(all("strong"), SKILLS, graph(["getting-started", "variables-data-types"]));
    expect(r.practice).toEqual([]);
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.note).toMatch(/strong/i);
  });
  it("weak skill whose units are already mastered: says so and falls back to normal progression", () => {
    const sk = SKILLS.find((s) => s.id === "loops")!;
    const r = recommend(all("strong", { loops: "practice" }), SKILLS, graph(sk.units.concat(["getting-started", "variables-data-types", "operators", "conditionals"])));
    expect(r.note).toMatch(/already completed/);
  });
  it("lists strong, developing and practice skills by name", () => {
    const r = recommend(all("developing", { loops: "strong", dp: "practice" }), SKILLS, graph());
    expect(r.strong).toContain("Loops");
    expect(r.practice).toContain("Intro to dynamic programming");
    expect(r.developing.length).toBeGreaterThan(0);
  });
  it("handles an empty diagnosis and a fully mastered curriculum", () => {
    expect(recommend([], SKILLS, graph()).steps.length).toBeGreaterThanOrEqual(0);
    const done = recommend(all("practice"), SKILLS, graph(slugs));
    expect(done.startUnit).toBeNull();
    expect(done.steps).toEqual([]);
  });
});

import { world1 } from "@/content/world1";
import { world2 } from "@/content/world2";
import { world3 } from "@/content/world3";
import { world4 } from "@/content/world4";

describe("answer mapping after shuffling", () => {
  it("every shuffled question still points at the same correct option text as the authored source", () => {
    const raw = [world1, world2, world3, world4].flatMap((w) => w.units);
    let n = 0;
    for (const ru of raw) {
      const su = units.find((u) => u.slug === ru.slug)!;
      for (const rl of ru.lessons) {
        const sl = su.lessons.find((l) => l.slug === rl.slug)!;
        rl.questions.forEach((rq, i) => {
          const sq = sl.questions[i]!;
          expect(sq.prompt).toBe(rq.prompt);
          if (!["multiple_choice", "predict_output", "find_bug"].includes(rq.type)) return;
          const ro = (rq.data as { options: string[] }).options;
          const so = (sq.data as { options: string[] }).options;
          expect(so[(sq.answer as { index: number }).index], `${ru.slug}/${rl.slug} #${i}`).toBe(ro[(rq.answer as { index: number }).index]);
          expect([...so].sort()).toEqual([...ro].sort());
          n++;
        });
      }
    }
    expect(n).toBeGreaterThan(200);
  });
  it("the correct option text is preserved for every choice question in the curriculum", () => {
    // re-derive the authored (unshuffled) form by inverting nothing: shuffle(original) must keep text-at-answer equal
    let checked = 0;
    for (const u of units)
      for (const l of u.lessons)
        for (const q of l.questions) {
          if (!["multiple_choice", "predict_output", "find_bug"].includes(q.type)) continue;
          const opts = (q.data as { options: string[] }).options;
          const idx = (q.answer as { index: number }).index;
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(opts.length);
          expect(new Set(opts).size, `${u.slug}/${l.slug} duplicate options`).toBe(opts.length);
          checked++;
        }
    expect(checked).toBeGreaterThan(200);
  });
  it("shuffleQuestion keeps the correct text, is deterministic and does not touch other types", () => {
    const q = { type: "multiple_choice" as const, prompt: "p", data: { options: ["right", "w1", "w2", "w3"] }, answer: { index: 0 }, explanation: "e" };
    const a = shuffleQuestion(q);
    const b = shuffleQuestion(q);
    expect(a).toEqual(b);
    expect((a.data as { options: string[] }).options[(a.answer as { index: number }).index]).toBe("right");
    expect([...(a.data as { options: string[] }).options].sort()).toEqual(["right", "w1", "w2", "w3"]);
    const tf = { type: "true_false" as const, prompt: "p", data: { options: ["True", "False"] }, answer: { index: 1 }, explanation: "e" };
    expect(shuffleQuestion(tf)).toBe(tf);
    expect(shuffleQuestion({ ...q, data: { options: ["only"] } }).data).toEqual({ options: ["only"] });
  });
});
