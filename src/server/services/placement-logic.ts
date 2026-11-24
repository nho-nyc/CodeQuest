/**
 * Pure placement logic (no database): picking questions, classifying skills, and turning the result into a
 * recommendation over the prerequisite graph. The outcome is a provisional ESTIMATE from a handful of questions.
 */
import { PLACEMENT_TYPES, type SkillDef } from "@/content/placement";

export type PoolQuestion = { id: string; unit: string; lesson: string; type: string };
export type Pick = { questionId: string; skillId: string };

/** Deterministic PRNG (so a unit test, or one attempt, always draws the same questions). */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

/**
 * For each skill draw `count` questions from the lessons it covers, spreading over lessons first so one lesson does
 * not supply every question. Returned in skill order (the caller passes skills easiest first).
 */
export function selectPlacement(pool: PoolQuestion[], skills: SkillDef[], rand: () => number): Pick[] {
  const picks: Pick[] = [];
  const used = new Set<string>();
  for (const skill of skills) {
    const byLesson = new Map<string, PoolQuestion[]>();
    for (const q of pool) {
      if (used.has(q.id) || !(PLACEMENT_TYPES as readonly string[]).includes(q.type)) continue;
      const src = skill.sources.find((s) => s.unit === q.unit && (!s.lessons || s.lessons.includes(q.lesson)));
      if (!src) continue;
      const key = `${q.unit}/${q.lesson}`;
      byLesson.set(key, [...(byLesson.get(key) ?? []), q]);
    }
    const lists = [...byLesson.values()].map((l) => {
      const a = [...l];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j]!, a[i]!];
      }
      return a;
    });
    // visit lessons in a random order, one question per lesson per round
    for (let i = lists.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [lists[i], lists[j]] = [lists[j]!, lists[i]!];
    }
    let taken = 0;
    for (let round = 0; taken < skill.count; round++) {
      let any = false;
      for (const l of lists) {
        const q = l[round];
        if (q && taken < skill.count) {
          picks.push({ questionId: q.id, skillId: skill.id });
          used.add(q.id);
          taken++;
          any = true;
        }
      }
      if (!any) break;
    }
  }
  return picks;
}

export type SkillTally = { skillId: string; correct: number; unknown: number; total: number };
export type SkillLevel = "strong" | "developing" | "practice";
export type SkillDiagnosis = SkillTally & { title: string; level: SkillLevel; confidence: "low" | "medium"; score: number };

export const STRONG_AT = 0.75;
export const DEVELOPING_AT = 0.4;

/** Unknown ("I am not sure") counts as not correct, but is kept apart from wrong answers. */
export function classify(t: SkillTally): { level: SkillLevel; score: number; confidence: "low" | "medium" } {
  const score = t.total === 0 ? 0 : t.correct / t.total;
  const level: SkillLevel = score >= STRONG_AT ? "strong" : score >= DEVELOPING_AT ? "developing" : "practice";
  // One or two questions can never be high confidence: the estimate is always provisional.
  return { level, score, confidence: t.total >= 2 ? "medium" : "low" };
}

export function diagnose(tallies: SkillTally[], skills: SkillDef[]): SkillDiagnosis[] {
  const title = new Map(skills.map((s) => [s.id, s.title]));
  return tallies
    .filter((t) => t.total > 0)
    .map((t) => ({ ...t, title: title.get(t.skillId) ?? t.skillId, ...classify(t) }));
}

export type RecUnit = { id: string; slug: string; title: string; prerequisites: string[]; mastered: boolean };
export type PathAction = "skip-test" | "review" | "study";
export type PathStep = { unit: string; unitId: string; title: string; action: PathAction; reason: string; tested: boolean };
export type Recommendation = {
  /** First unit where learning (not just skipping) should begin; null when there is nothing left to recommend. */
  startUnit: string | null;
  /** Units to pass through, in curriculum order, ending with the first weak skill's unit. */
  steps: PathStep[];
  strong: string[];
  developing: string[];
  practice: string[];
  note: string;
};

/**
 * Walk the prerequisite graph from the first weak skill: every not-yet-mastered unit needed to reach it becomes a
 * step. Units whose skills look strong are offered as skip tests (the existing, explicit mechanism); weak or
 * untested ones are to be studied. Nothing is unlocked or marked as done here: unlocking stays with the normal rules.
 */
export function recommend(diagnosis: SkillDiagnosis[], skills: SkillDef[], units: RecUnit[]): Recommendation {
  const order = new Map(units.map((u, i) => [u.slug, i]));
  const bySlug = new Map(units.map((u) => [u.slug, u]));
  const skillUnits = new Map(skills.map((s) => [s.id, s.units.filter((u) => bySlug.has(u))]));
  const tested = diagnosis.filter((d) => (skillUnits.get(d.skillId) ?? []).length > 0);
  const firstUnitIdx = (id: string) => Math.min(...(skillUnits.get(id) ?? []).map((u) => order.get(u) ?? 1e9));
  const ordered = [...tested].sort((a, b) => firstUnitIdx(a.skillId) - firstUnitIdx(b.skillId));
  const titles = (lv: SkillLevel) => ordered.filter((d) => d.level === lv).map((d) => d.title);
  const base = { strong: titles("strong"), developing: titles("developing"), practice: titles("practice") };

  const weak = ordered.find((d) => d.level !== "strong");
  const unmastered = (slug: string) => bySlug.has(slug) && !bySlug.get(slug)!.mastered;
  // the weak skill's earliest unit that is not mastered yet (mastered units are simply replayed if the learner wants)
  const target = weak ? (skillUnits.get(weak.skillId) ?? []).filter(unmastered).sort((a, b) => order.get(a)! - order.get(b)!)[0] : undefined;
  let goal = target;
  let note = "";
  if (!weak) {
    goal = units.find((u) => !u.mastered)?.slug;
    note = goal ? "Your answers look strong across the tested skills. The next unit you have not mastered is a good place to continue; you can try the skip test on units you already know." : "You have mastered every unit that exists so far.";
  } else if (!target) {
    goal = units.find((u) => !u.mastered)?.slug;
    note = `You have already completed the units for ${weak.title}. Replaying those lessons is free practice; otherwise continue with the next unit.`;
  }
  if (!goal) return { startUnit: null, steps: [], ...base, note: note || "Nothing left to recommend." };

  // closure of prerequisites that are not mastered
  const need = new Set<string>();
  const visit = (slug: string) => {
    if (need.has(slug) || !bySlug.has(slug)) return;
    if (bySlug.get(slug)!.mastered) return;
    need.add(slug);
    for (const p of bySlug.get(slug)!.prerequisites) visit(p);
  };
  visit(goal);
  const covering = (slug: string) => ordered.filter((d) => (skillUnits.get(d.skillId) ?? []).includes(slug));
  const steps: PathStep[] = [...need]
    .sort((a, b) => order.get(a)! - order.get(b)!)
    .map((slug) => {
      const cov = covering(slug);
      const u = bySlug.get(slug)!;
      if (cov.length === 0) return { unit: slug, unitId: u.id, title: u.title, action: "study" as const, reason: "Not covered by the test, so it is needed on the way.", tested: false };
      if (cov.some((d) => d.level === "practice")) return { unit: slug, unitId: u.id, title: u.title, action: "study" as const, reason: `${cov.find((d) => d.level === "practice")!.title}: needs practice.`, tested: true };
      if (cov.some((d) => d.level === "developing")) return { unit: slug, unitId: u.id, title: u.title, action: "review" as const, reason: `${cov.find((d) => d.level === "developing")!.title}: still developing.`, tested: true };
      return { unit: slug, unitId: u.id, title: u.title, action: "skip-test" as const, reason: "Your answers look strong; a skip test can confirm it.", tested: true };
    });
  const start = steps.find((s) => s.action !== "skip-test") ?? steps[steps.length - 1];
  return { startUnit: start?.unit ?? goal, steps, ...base, note };
}
