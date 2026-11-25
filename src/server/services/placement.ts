import { randomInt } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { PLACEMENT_TYPES, SKILLS } from "@/content/placement";
import { grade, GradingError, responseSchema } from "@/features/learning/grader";
import type { PublicQuestion, QuestionType } from "@/features/learning/types";
import { getDb, schema } from "@/server/db/client";
import { ServiceError, toPublic } from "./lesson-run";
import { getLearningPath } from "./path";
import { diagnose, recommend, selectPlacement, seededRandom, type PoolQuestion, type Recommendation, type SkillDiagnosis, type SkillTally } from "./placement-logic";

/** An unfinished attempt older than this is abandoned and a fresh test is drawn. */
const ATTEMPT_TTL_MS = 2 * 60 * 60 * 1000;

type Q = typeof schema.lessonQuestions.$inferSelect;

/** Candidate questions: active questions of the lessons the skills cover (assessments are excluded by the lesson lists). */
async function loadPool(): Promise<Array<PoolQuestion & { row: Q }>> {
  const db = getDb();
  const rows = await db
    .select({ q: schema.lessonQuestions, lesson: schema.lessons.slug, unit: schema.units.slug })
    .from(schema.lessonQuestions)
    .innerJoin(schema.lessons, eq(schema.lessons.id, schema.lessonQuestions.lessonId))
    .innerJoin(schema.units, eq(schema.units.id, schema.lessons.unitId))
    .where(and(isNull(schema.lessonQuestions.deletedAt), isNull(schema.lessons.deletedAt), isNull(schema.units.deletedAt), eq(schema.lessons.published, true), eq(schema.lessons.kind, "lesson"), inArray(schema.lessonQuestions.type, [...PLACEMENT_TYPES])));
  return rows.map((r) => ({ id: r.q.id, unit: r.unit, lesson: r.lesson, type: r.q.type, row: r.q }));
}

export type PlacementStart = { attemptId: string; questions: Array<PublicQuestion & { skillId: string }> };

export async function startPlacement(userId: string, now = new Date()): Promise<PlacementStart> {
  const pool = await loadPool();
  const byId = new Map(pool.map((p) => [p.id, p.row]));
  return getDb().transaction(async (tx) => {
    await tx.select().from(schema.userStats).where(eq(schema.userStats.userId, userId)).for("update");
    const [open] = await tx.select().from(schema.placementAttempts).where(and(eq(schema.placementAttempts.userId, userId), isNull(schema.placementAttempts.finishedAt))).orderBy(desc(schema.placementAttempts.startedAt)).limit(1);
    if (open && now.getTime() - open.startedAt.getTime() < ATTEMPT_TTL_MS) {
      const rows = open.questionIds.map((id) => byId.get(id));
      // Resume only if every question still exists unchanged since the attempt started.
      if (rows.every((r): r is Q => !!r && r.updatedAt <= open.startedAt)) {
        return { attemptId: open.id, questions: rows.map((r, i) => ({ ...toPublic(r), skillId: open.skillIds[i]! })) };
      }
    }
    if (open) await tx.delete(schema.placementAttempts).where(eq(schema.placementAttempts.id, open.id));
    const picks = selectPlacement(pool, SKILLS, seededRandom(randomInt(1, 2 ** 31)));
    if (picks.length < 8) throw new ServiceError("The placement test is not available right now.", 409, "unavailable");
    const [row] = await tx.insert(schema.placementAttempts).values({ userId, questionIds: picks.map((p) => p.questionId), skillIds: picks.map((p) => p.skillId), startedAt: now }).returning({ id: schema.placementAttempts.id });
    return { attemptId: row!.id, questions: picks.map((p) => ({ ...toPublic(byId.get(p.questionId)!), skillId: p.skillId })) };
  });
}

export type PlacementResult = {
  attemptId: string;
  answered: number;
  total: number;
  skills: SkillDiagnosis[];
  recommendation: Recommendation;
  /** Questions that were wrong or skipped, with the explanation: it is advice, not a gate, so showing it is safe. */
  missed: Array<{ questionId: string; skillId: string; prompt: string; correctAnswer: string | null; explanation: string; unknown: boolean }>;
};

/** Recommendation depends on the learner's CURRENT progress, so it is recomputed whenever the result is shown. */
export async function recommendationFor(userId: string, skills: SkillDiagnosis[]): Promise<Recommendation> {
  const path = await getLearningPath(userId);
  const units = path.filter((w) => w.playable).flatMap((w) => w.units).map((u) => ({ id: u.id, slug: u.slug, title: u.title, prerequisites: u.prerequisites.map((p) => p.slug), mastered: u.mastered }));
  return recommend(skills, SKILLS, units);
}

export async function submitPlacement(userId: string, attemptId: string, answers: Record<string, unknown>, now = new Date()): Promise<PlacementResult> {
  const db = getDb();
  const attempt = await db.transaction(async (tx) => {
    await tx.select().from(schema.userStats).where(eq(schema.userStats.userId, userId)).for("update");
    const [a] = await tx.select().from(schema.placementAttempts).where(and(eq(schema.placementAttempts.id, attemptId), eq(schema.placementAttempts.userId, userId))).for("update");
    if (!a) throw new ServiceError("Test not found", 404);
    if (a.finishedAt) throw new ServiceError("This test was already submitted", 409, "already_submitted");
    const qs = await tx.select().from(schema.lessonQuestions).where(inArray(schema.lessonQuestions.id, a.questionIds));
    const byId = new Map(qs.map((q) => [q.id, q]));
    if (qs.some((q) => q.updatedAt > a.startedAt)) throw new ServiceError("This test was updated while you were taking it. Please start it again.", 409, "content_updated");
    const tallies = new Map<string, SkillTally>();
    const missed: PlacementResult["missed"] = [];
    let answered = 0;
    a.questionIds.forEach((id, i) => {
      const skillId = a.skillIds[i]!;
      const t = tallies.get(skillId) ?? { skillId, correct: 0, unknown: 0, total: 0 };
      t.total++;
      const q = byId.get(id);
      let correct = false;
      let correctAnswer: string | null = null;
      const given = answers[id];
      const parsed = given === null || given === undefined ? null : responseSchema.safeParse(given);
      if (q && parsed?.success) {
        answered++;
        try {
          const r = grade(q.type as QuestionType, q.data, q.answer, parsed.data);
          correct = r.correct;
          correctAnswer = r.correctAnswer;
        } catch (e) {
          if (!(e instanceof GradingError) && !(e instanceof Error && e.name === "ZodError")) throw e;
        }
      }
      if (correct) t.correct++;
      else if (!parsed?.success) t.unknown++;
      tallies.set(skillId, t);
      if (q && !correct) missed.push({ questionId: id, skillId, prompt: q.prompt, correctAnswer, explanation: q.explanation, unknown: !parsed?.success });
    });
    const result = [...tallies.values()];
    await tx.update(schema.placementAttempts).set({ finishedAt: now, result }).where(eq(schema.placementAttempts.id, attemptId));
    return { result, missed, answered, total: a.questionIds.length };
  });
  const skills = diagnose(attempt.result, SKILLS);
  return { attemptId, answered: attempt.answered, total: attempt.total, skills, recommendation: await recommendationFor(userId, skills), missed: attempt.missed };
}

/** Latest finished attempt, with a fresh recommendation. */
export async function latestPlacement(userId: string): Promise<(Pick<PlacementResult, "attemptId" | "skills" | "recommendation"> & { finishedAt: Date }) | null> {
  const rows = await getDb().select().from(schema.placementAttempts).where(eq(schema.placementAttempts.userId, userId)).orderBy(desc(schema.placementAttempts.startedAt)).limit(10);
  const done = rows.find((r) => r.finishedAt && r.result);
  if (!done) return null;
  const skills = diagnose(done.result!, SKILLS);
  return { attemptId: done.id, finishedAt: done.finishedAt!, skills, recommendation: await recommendationFor(userId, skills) };
}

/** Diagnosis of the latest finished attempt only (no curriculum lookup), for callers that already hold the learning path. */
export async function latestPlacementSkills(userId: string): Promise<SkillDiagnosis[] | null> {
  const rows = await getDb().select({ result: schema.placementAttempts.result, finishedAt: schema.placementAttempts.finishedAt }).from(schema.placementAttempts).where(eq(schema.placementAttempts.userId, userId)).orderBy(desc(schema.placementAttempts.startedAt)).limit(10);
  const done = rows.find((r) => r.finishedAt && r.result);
  return done ? diagnose(done.result!, SKILLS) : null;
}
