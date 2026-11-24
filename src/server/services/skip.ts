import { randomInt } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { grade, GradingError, responseSchema } from "@/features/learning/grader";
import type { PublicQuestion, QuestionType } from "@/features/learning/types";
import { getDb, schema } from "@/server/db/client";
import { ServiceError, toPublic } from "./lesson-run";

/** Questions per test, the share that must be right, and the wait after a failed attempt. */
export const SKIP_QUESTIONS = 10;
export const SKIP_MIN_POOL = 6;
export const SKIP_PASS_RATIO = 0.8;
export const SKIP_COOLDOWN_MS = 30 * 60 * 1000;
/** An unfinished attempt older than this is abandoned and a fresh test is drawn. */
const ATTEMPT_TTL_MS = 60 * 60 * 1000;

export type SkipStatus =
  | { state: "passed" }
  | { state: "done"; reason: "All lessons in this unit are already completed." }
  | { state: "unavailable"; reason: string }
  | { state: "cooldown"; until: Date }
  | { state: "ready"; questions: number; needed: number };

type Q = typeof schema.lessonQuestions.$inferSelect;

async function loadUnit(unitId: string) {
  const db = getDb();
  const [unit] = await db
    .select({ unit: schema.units, world: schema.worlds })
    .from(schema.units)
    .innerJoin(schema.worlds, eq(schema.worlds.id, schema.units.worldId))
    .where(and(eq(schema.units.id, unitId), eq(schema.units.published, true), isNull(schema.units.deletedAt), eq(schema.worlds.published, true), isNull(schema.worlds.deletedAt)));
  if (!unit) throw new ServiceError("Unit not found", 404);
  const lessons = await db.select().from(schema.lessons).where(and(eq(schema.lessons.unitId, unitId), eq(schema.lessons.published, true), isNull(schema.lessons.deletedAt))).orderBy(asc(schema.lessons.position));
  const questions = lessons.length
    ? await db.select().from(schema.lessonQuestions).where(and(inArray(schema.lessonQuestions.lessonId, lessons.map((l) => l.id)), isNull(schema.lessonQuestions.deletedAt)))
    : [];
  return { unit: unit.unit, lessons, questions };
}

export async function getSkipStatus(userId: string, unitId: string, now = new Date()): Promise<SkipStatus> {
  const db = getDb();
  const { lessons, questions } = await loadUnit(unitId);
  const attempts = await db.select().from(schema.skipAttempts).where(and(eq(schema.skipAttempts.userId, userId), eq(schema.skipAttempts.unitId, unitId))).orderBy(desc(schema.skipAttempts.startedAt));
  if (attempts.some((a) => a.passed)) return { state: "passed" };
  const progress = await db.select({ lessonId: schema.userLessonProgress.lessonId, completions: schema.userLessonProgress.completions }).from(schema.userLessonProgress).where(eq(schema.userLessonProgress.userId, userId));
  const done = new Set(progress.filter((p) => p.completions > 0).map((p) => p.lessonId));
  if (lessons.length > 0 && lessons.every((l) => done.has(l.id))) return { state: "done", reason: "All lessons in this unit are already completed." };
  if (questions.length < SKIP_MIN_POOL) return { state: "unavailable", reason: "This unit has too few questions for a skip test." };
  const lastFailed = attempts.find((a) => a.finishedAt && !a.passed);
  if (lastFailed?.finishedAt) {
    const until = new Date(lastFailed.finishedAt.getTime() + SKIP_COOLDOWN_MS);
    if (until > now) return { state: "cooldown", until };
  }
  const total = Math.min(SKIP_QUESTIONS, questions.length);
  return { state: "ready", questions: total, needed: Math.ceil(total * SKIP_PASS_RATIO) };
}

/** Draw `n` questions spread evenly over the lessons (round robin), in random order inside each lesson. */
export function drawQuestions(byLesson: Q[][], n: number, rand: (max: number) => number = randomInt): Q[] {
  const pools = byLesson.map((qs) => {
    const a = [...qs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  });
  const picked: Q[] = [];
  for (let round = 0; picked.length < n; round++) {
    let any = false;
    for (const p of pools) {
      const q = p[round];
      if (q && picked.length < n) {
        picked.push(q);
        any = true;
      }
    }
    if (!any) break;
  }
  // Shuffle the final order so lesson order does not give away structure.
  for (let i = picked.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [picked[i], picked[j]] = [picked[j]!, picked[i]!];
  }
  return picked;
}

export type SkipStart = { attemptId: string; needed: number; questions: PublicQuestion[] };

export async function startSkipTest(userId: string, unitId: string, now = new Date()): Promise<SkipStart> {
  const status = await getSkipStatus(userId, unitId, now);
  if (status.state === "passed") throw new ServiceError("You already skipped this unit", 409, "already_passed");
  if (status.state === "done") throw new ServiceError(status.reason, 409, "already_done");
  if (status.state === "unavailable") throw new ServiceError(status.reason, 409, "unavailable");
  if (status.state === "cooldown") throw new ServiceError(`You can try again at ${status.until.toISOString()}`, 429, "cooldown");
  const { lessons, questions } = await loadUnit(unitId);
  const byId = new Map(questions.map((q) => [q.id, q]));
  return getDb().transaction(async (tx) => {
    // One test at a time per learner and unit: lock the user's stats row as a mutex.
    await tx.select().from(schema.userStats).where(eq(schema.userStats.userId, userId)).for("update");
    const [open] = await tx.select().from(schema.skipAttempts).where(and(eq(schema.skipAttempts.userId, userId), eq(schema.skipAttempts.unitId, unitId), isNull(schema.skipAttempts.finishedAt))).orderBy(desc(schema.skipAttempts.startedAt)).limit(1);
    if (open && now.getTime() - open.startedAt.getTime() < ATTEMPT_TTL_MS) {
      const qs = open.questionIds.map((id) => byId.get(id)).filter((q): q is Q => !!q);
      const edited = qs.some((q) => q.updatedAt > open.startedAt);
      if (qs.length === open.questionIds.length && !edited) return { attemptId: open.id, needed: Math.ceil(open.total * SKIP_PASS_RATIO), questions: qs.map(toPublic) };
    }
    // An unfinished attempt that is stale or was invalidated by a content edit is discarded (it never counted as a failure).
    if (open) await tx.delete(schema.skipAttempts).where(eq(schema.skipAttempts.id, open.id));
    const picked = drawQuestions(lessons.map((l) => questions.filter((q) => q.lessonId === l.id)), SKIP_QUESTIONS);
    const [row] = await tx.insert(schema.skipAttempts).values({ userId, unitId, questionIds: picked.map((q) => q.id), total: picked.length, startedAt: now }).returning({ id: schema.skipAttempts.id });
    return { attemptId: row!.id, needed: Math.ceil(picked.length * SKIP_PASS_RATIO), questions: picked.map(toPublic) };
  });
}

export type SkipResult = {
  passed: boolean;
  score: number;
  total: number;
  needed: number;
  retryAt: Date | null;
  /** Per question. Explanations are only included when the test was passed, so a failed test cannot be used to read the answer key. */
  review: Array<{ questionId: string; correct: boolean; explanation: string | null; correctAnswer: string | null }>;
};

export async function submitSkipTest(userId: string, attemptId: string, answers: Record<string, unknown>, now = new Date()): Promise<SkipResult> {
  return getDb().transaction(async (tx) => {
    await tx.select().from(schema.userStats).where(eq(schema.userStats.userId, userId)).for("update");
    const [attempt] = await tx.select().from(schema.skipAttempts).where(and(eq(schema.skipAttempts.id, attemptId), eq(schema.skipAttempts.userId, userId))).for("update");
    if (!attempt) throw new ServiceError("Test not found", 404);
    if (attempt.finishedAt) throw new ServiceError("This test was already submitted", 409, "already_submitted");
    const qs = await tx.select().from(schema.lessonQuestions).where(inArray(schema.lessonQuestions.id, attempt.questionIds));
    const byId = new Map(qs.map((q) => [q.id, q]));
    if (qs.some((q) => q.updatedAt > attempt.startedAt)) {
      // (The stale attempt is replaced by a fresh one the next time the learner starts the test.)
      throw new ServiceError("This test was updated while you were taking it. Please start it again.", 409, "content_updated");
    }
    const review: SkipResult["review"] = [];
    let score = 0;
    for (const id of attempt.questionIds) {
      const q = byId.get(id);
      let correct = false;
      let correctAnswer: string | null = null;
      if (q) {
        const parsed = responseSchema.safeParse(answers[id]);
        if (parsed.success) {
          try {
            const r = grade(q.type as QuestionType, q.data, q.answer, parsed.data);
            correct = r.correct;
            correctAnswer = r.correctAnswer;
          } catch (e) {
            // A response of the wrong shape for this question type is simply a wrong answer.
            if (!(e instanceof GradingError) && !(e instanceof Error && e.name === "ZodError")) throw e;
          }
        }
      }
      if (correct) score++;
      review.push({ questionId: id, correct, explanation: q?.explanation ?? null, correctAnswer });
    }
    const total = attempt.total;
    const needed = Math.ceil(total * SKIP_PASS_RATIO);
    const passed = score >= needed;
    await tx.update(schema.skipAttempts).set({ finishedAt: now, score, passed }).where(eq(schema.skipAttempts.id, attemptId));
    return {
      passed,
      score,
      total,
      needed,
      retryAt: passed ? null : new Date(now.getTime() + SKIP_COOLDOWN_MS),
      review: review.map((r) => (passed ? r : { ...r, explanation: null, correctAnswer: null })),
    };
  });
}

/** Ids of units this learner has skipped. */
export async function skippedUnitIds(userId: string): Promise<Set<string>> {
  const rows = await getDb().select({ unitId: schema.skipAttempts.unitId }).from(schema.skipAttempts).where(and(eq(schema.skipAttempts.userId, userId), eq(schema.skipAttempts.passed, true)));
  return new Set(rows.map((r) => r.unitId));
}
