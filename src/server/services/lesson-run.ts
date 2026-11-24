import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { getXpRules } from "./settings";
import { getDb, schema } from "@/server/db/client";
import { grade, GradingError, publicData, type QuestionResponse } from "@/features/learning/grader";
import type { PublicQuestion, QuestionType } from "@/features/learning/types";
import { XP_RULES, levelFromXp } from "@/features/gamification/xp";
import { recordActivity } from "./activity";
import { trackEngagement, type Reward } from "./engagement";
import { scheduleFirstReview } from "./reviews";
import { changeHearts, getHearts, type HeartsView } from "./hearts";
import { isLessonUnlocked } from "./path";
import { awardXp } from "./xp";

export class ServiceError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

export const toPublic = (q: typeof schema.lessonQuestions.$inferSelect): PublicQuestion => ({
  id: q.id,
  position: q.position,
  type: q.type as QuestionType,
  prompt: q.prompt,
  code: q.code,
  xp: q.xp,
  data: publicData(q.type as QuestionType, q.data),
});

async function activeQuestions(lessonId: string) {
  return getDb()
    .select()
    .from(schema.lessonQuestions)
    .where(and(eq(schema.lessonQuestions.lessonId, lessonId), isNull(schema.lessonQuestions.deletedAt)))
    .orderBy(asc(schema.lessonQuestions.position));
}

export type RunState = {
  runId: string;
  lesson: { id: string; title: string; xpReward: number; content: typeof schema.lessons.$inferSelect["content"] };
  total: number;
  mistakes: number;
  resumed: boolean;
  /** Questions not yet answered correctly in this run, in order. The answers are never included. */
  remaining: PublicQuestion[];
  alreadyCompleted: boolean;
  kind: "lesson" | "assessment" | "checkpoint";
  /** Assessments only: mistakes allowed before the attempt fails (hearts do not apply to them). */
  maxMistakes: number | null;
  /** Hearts only matter for a first-time lesson. Replays are unlimited practice. */
  hearts: HeartsView;
};

/** Start a lesson or resume the in-progress run (survives reloads and logout). */
export async function startOrResumeRun(userId: string, lessonId: string): Promise<RunState> {
  const db = getDb();
  const [lesson] = await db
    .select()
    .from(schema.lessons)
    .where(and(eq(schema.lessons.id, lessonId), eq(schema.lessons.published, true), isNull(schema.lessons.deletedAt)))
    .limit(1);
  if (!lesson) throw new ServiceError("Lesson not found", 404);
  if (!(await isLessonUnlocked(userId, lessonId))) throw new ServiceError("This lesson is locked", 403);

  let [run] = await db
    .select()
    .from(schema.lessonRuns)
    .where(and(eq(schema.lessonRuns.userId, userId), eq(schema.lessonRuns.lessonId, lessonId), eq(schema.lessonRuns.status, "in_progress")))
    .limit(1);
  let resumed = true;
  if (!run) {
    resumed = false;
    const inserted = await db
      .insert(schema.lessonRuns)
      .values({ userId, lessonId })
      .onConflictDoNothing()
      .returning();
    run =
      inserted[0] ??
      (
        await db
          .select()
          .from(schema.lessonRuns)
          .where(and(eq(schema.lessonRuns.userId, userId), eq(schema.lessonRuns.lessonId, lessonId), eq(schema.lessonRuns.status, "in_progress")))
          .limit(1)
      )[0]!;
  }

  const questions = await activeQuestions(lessonId);
  const answered = await db
    .select({ questionId: schema.userQuestionAttempts.questionId })
    .from(schema.userQuestionAttempts)
    .where(and(eq(schema.userQuestionAttempts.runId, run.id), eq(schema.userQuestionAttempts.isCorrect, true)));
  const done = new Set(answered.map((a) => a.questionId));
  const [prior] = await db
    .select({ n: schema.userLessonProgress.completions })
    .from(schema.userLessonProgress)
    .where(and(eq(schema.userLessonProgress.userId, userId), eq(schema.userLessonProgress.lessonId, lessonId)));

  return {
    runId: run.id,
    lesson: { id: lesson.id, title: lesson.title, xpReward: lesson.xpReward, content: lesson.content },
    total: questions.length,
    mistakes: run.mistakes,
    resumed: resumed && (done.size > 0 || run.mistakes > 0),
    remaining: questions.filter((q) => !done.has(q.id)).map(toPublic),
    alreadyCompleted: (prior?.n ?? 0) > 0,
    kind: lesson.kind === "assessment" || lesson.kind === "checkpoint" ? lesson.kind : "lesson",
    maxMistakes: lesson.kind === "assessment" ? allowedAssessmentMistakes(questions.length) : null,
    hearts: await getHearts(userId),
  };
}

export type AnswerResult = {
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  mistakes: number;
  hearts: HeartsView;
};

async function isFirstTime(userId: string, lessonId: string): Promise<boolean> {
  const [prior] = await getDb()
    .select({ n: schema.userLessonProgress.completions })
    .from(schema.userLessonProgress)
    .where(and(eq(schema.userLessonProgress.userId, userId), eq(schema.userLessonProgress.lessonId, lessonId)));
  return (prior?.n ?? 0) === 0;
}

export async function answerQuestion(userId: string, runId: string, questionId: string, response: QuestionResponse): Promise<AnswerResult> {
  const db = getDb();
  const [run] = await db
    .select()
    .from(schema.lessonRuns)
    .where(and(eq(schema.lessonRuns.id, runId), eq(schema.lessonRuns.userId, userId)))
    .limit(1);
  if (!run) throw new ServiceError("Run not found", 404);
  if (run.status !== "in_progress") throw new ServiceError("This lesson run is already finished", 409);

  const [q] = await db
    .select()
    .from(schema.lessonQuestions)
    .where(and(eq(schema.lessonQuestions.id, questionId), eq(schema.lessonQuestions.lessonId, run.lessonId), isNull(schema.lessonQuestions.deletedAt)))
    .limit(1);
  if (!q) throw new ServiceError("Question not found", 404);

  // Hearts: only a first-time lesson costs hearts. With none left the learner cannot answer, but nothing is lost:
  // the run and every correct answer stay saved and can be continued when a heart is back.
  // Assessments have their own consequence (a pass threshold), so they neither cost hearts nor need them.
  const [lessonRow] = await db.select({ kind: schema.lessons.kind }).from(schema.lessons).where(eq(schema.lessons.id, run.lessonId)).limit(1);
  const firstTime = lessonRow?.kind !== "assessment" && (await isFirstTime(userId, run.lessonId));
  const heartsNow = await getHearts(userId);
  if (firstTime && heartsNow.hearts === 0) throw new ServiceError("You are out of hearts. Your progress is saved.", 409, "out_of_hearts");

  let result;
  try {
    result = grade(q.type as QuestionType, q.data, q.answer, response);
  } catch (e) {
    if (e instanceof GradingError) throw new ServiceError("Invalid answer format", 400);
    throw e;
  }

  // Already answered correctly in this run: do not record again (keeps mistakes/attempt counts honest).
  const [already] = await db
    .select({ id: schema.userQuestionAttempts.id })
    .from(schema.userQuestionAttempts)
    .where(and(eq(schema.userQuestionAttempts.runId, runId), eq(schema.userQuestionAttempts.questionId, questionId), eq(schema.userQuestionAttempts.isCorrect, true)))
    .limit(1);
  if (already) return { correct: result.correct, correctAnswer: result.correctAnswer, explanation: q.explanation, mistakes: run.mistakes, hearts: heartsNow };

  let mistakes = run.mistakes;
  let hearts = heartsNow;
  await db.transaction(async (tx) => {
    await tx.insert(schema.userQuestionAttempts).values({ runId, userId, questionId, isCorrect: result.correct, response });
    // A question answered correctly enters the learner's spaced-repetition schedule (first time only).
    if (result.correct) await scheduleFirstReview(tx, userId, questionId, new Date());
    if (!result.correct) {
      const [u] = await tx
        .update(schema.lessonRuns)
        .set({ mistakes: sql`${schema.lessonRuns.mistakes} + 1` })
        .where(eq(schema.lessonRuns.id, runId))
        .returning({ mistakes: schema.lessonRuns.mistakes });
      mistakes = u!.mistakes;
      if (firstTime) hearts = await changeHearts(tx, userId, -1);
    }
  });
  return { correct: result.correct, correctAnswer: result.correctAnswer, explanation: q.explanation, mistakes, hearts };
}

export type CompletionSummary = {
  xpGained: number;
  breakdown: Array<{ label: string; xp: number }>;
  perfect: boolean;
  repeat: boolean;
  totalXp: number;
  level: { before: number; after: number; title: string; leveledUp: boolean };
  streak: { current: number; extended: boolean };
  /** Quests completed and achievements unlocked by this lesson (their XP is included in xpGained). */
  rewards: Reward[];
  heartsEarned: number;
  hearts: HeartsView;
};

/** A unit assessment is passed with at most this share of the questions answered wrongly on the first try (minimum 1 slip). */
export const ASSESSMENT_MAX_MISTAKE_RATIO = 0.25;
export const allowedAssessmentMistakes = (total: number) => Math.max(1, Math.floor(total * ASSESSMENT_MAX_MISTAKE_RATIO));

/**
 * Assessments are not "retry until it clicks": too many mistakes fail the attempt. The run is abandoned (outside the
 * completion transaction, so it persists) and the next visit starts a fresh run. Nothing is credited for a failed attempt.
 */
async function enforceAssessmentThreshold(userId: string, runId: string) {
  const db = getDb();
  const [run] = await db.select().from(schema.lessonRuns).where(and(eq(schema.lessonRuns.id, runId), eq(schema.lessonRuns.userId, userId))).limit(1);
  if (!run || run.status !== "in_progress") return;
  const [lesson] = await db.select({ kind: schema.lessons.kind }).from(schema.lessons).where(eq(schema.lessons.id, run.lessonId)).limit(1);
  if (lesson?.kind !== "assessment") return;
  const [q] = await db.select({ n: count() }).from(schema.lessonQuestions).where(and(eq(schema.lessonQuestions.lessonId, run.lessonId), isNull(schema.lessonQuestions.deletedAt)));
  const allowed = allowedAssessmentMistakes(Number(q?.n ?? 0));
  if (run.mistakes <= allowed) return;
  await db.update(schema.lessonRuns).set({ status: "abandoned" }).where(eq(schema.lessonRuns.id, runId));
  throw new ServiceError(`Not passed: ${run.mistakes} mistakes, at most ${allowed} allowed. Review the unit and try again.`, 409, "assessment_failed");
}

export async function completeRun(userId: string, runId: string): Promise<CompletionSummary> {
  const db = getDb();
  await enforceAssessmentThreshold(userId, runId);
  return db.transaction(async (tx) => {
    // Serialise concurrent completions for this user.
    const [stats] = await tx.select().from(schema.userStats).where(eq(schema.userStats.userId, userId)).for("update");
    const [user] = await tx.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
    if (!stats || !user) throw new ServiceError("User not found", 404);

    const [run] = await tx
      .select()
      .from(schema.lessonRuns)
      .where(and(eq(schema.lessonRuns.id, runId), eq(schema.lessonRuns.userId, userId)))
      .for("update");
    if (!run) throw new ServiceError("Run not found", 404);

    const levelBefore = levelFromXp(stats.totalXp);
    if (run.status === "completed") {
      // Idempotent replay (double click / retry): report without granting anything again.
      return {
        xpGained: 0,
        breakdown: [],
        perfect: run.mistakes === 0,
        repeat: true,
        totalXp: stats.totalXp,
        level: { before: levelBefore.level, after: levelBefore.level, title: levelBefore.title, leveledUp: false },
        streak: { current: stats.currentStreak, extended: false },
        rewards: [],
        heartsEarned: 0,
        hearts: await getHearts(userId),
      };
    }
    if (run.status !== "in_progress") throw new ServiceError("This lesson run was abandoned", 409);

    const questions = await tx
      .select({ id: schema.lessonQuestions.id })
      .from(schema.lessonQuestions)
      .where(and(eq(schema.lessonQuestions.lessonId, run.lessonId), isNull(schema.lessonQuestions.deletedAt)));
    const correct = await tx
      .select({ questionId: schema.userQuestionAttempts.questionId })
      .from(schema.userQuestionAttempts)
      .where(and(eq(schema.userQuestionAttempts.runId, runId), eq(schema.userQuestionAttempts.isCorrect, true)));
    const done = new Set(correct.map((c) => c.questionId));
    if (!questions.every((q) => done.has(q.id))) throw new ServiceError("Not all questions are answered correctly yet", 409);

    const [attempts] = await tx.select({ n: count() }).from(schema.userQuestionAttempts).where(eq(schema.userQuestionAttempts.runId, runId));

    const [progress] = await tx
      .select()
      .from(schema.userLessonProgress)
      .where(and(eq(schema.userLessonProgress.userId, userId), eq(schema.userLessonProgress.lessonId, run.lessonId)))
      .for("update");
    const firstTime = !progress || progress.completions === 0;
    const perfect = run.mistakes === 0;
    const now = new Date();

    const breakdown: Array<{ label: string; xp: number }> = [];
    const ref = { refType: "lesson", refId: run.lessonId, userId } as const;
    const [lesson] = await tx.select().from(schema.lessons).where(eq(schema.lessons.id, run.lessonId)).limit(1);
    const rules = await getXpRules();
    const base = lesson?.xpReward ?? XP_RULES.lessonComplete;
    if (firstTime && (await awardXp(tx, { ...ref, amount: base, reason: "lesson_complete", idempotencyKey: `lesson:${run.lessonId}:complete` }))) {
      breakdown.push({ label: "Lesson complete", xp: base });
    }
    if (perfect && !progress?.perfected && (await awardXp(tx, { ...ref, amount: rules.perfectBonus, reason: "lesson_perfect", idempotencyKey: `lesson:${run.lessonId}:perfect` }))) {
      breakdown.push({ label: "Perfect lesson", xp: rules.perfectBonus });
    }

    const act = await recordActivity(tx, {
      userId,
      timezone: user.timezone,
      stats,
      now,
      baseXp: breakdown.reduce((sum, b) => sum + b.xp, 0),
      lessons: 1,
      questions: attempts?.n ?? 0,
    });
    if (act.bonus) breakdown.push(act.bonus);
    const learnXp = breakdown.reduce((sum, b) => sum + b.xp, 0);

    if (firstTime) {
      await tx
        .update(schema.userStats)
        .set({ lessonsCompleted: sql`${schema.userStats.lessonsCompleted} + 1` })
        .where(eq(schema.userStats.userId, userId));
    }

    if (progress) {
      await tx
        .update(schema.userLessonProgress)
        .set({
          completions: progress.completions + 1,
          bestMistakes: Math.min(progress.bestMistakes ?? run.mistakes, run.mistakes),
          perfected: progress.perfected || perfect,
          firstCompletedAt: progress.firstCompletedAt ?? now,
          lastCompletedAt: now,
        })
        .where(eq(schema.userLessonProgress.id, progress.id));
    } else {
      await tx.insert(schema.userLessonProgress).values({
        userId,
        lessonId: run.lessonId,
        completions: 1,
        bestMistakes: run.mistakes,
        perfected: perfect,
        firstCompletedAt: now,
        lastCompletedAt: now,
      });
    }

    // Review earns a heart back: replaying a lesson you already finished is how you refill (spec 8.4).
    let heartsEarned = 0;
    let heartsView: HeartsView;
    if (!firstTime) {
      const before = await getHearts(userId, now);
      heartsView = await changeHearts(tx, userId, 1, now);
      heartsEarned = heartsView.hearts > before.hearts ? 1 : 0;
    } else heartsView = await getHearts(userId, now);

    // Questions answered correctly in a replay count as "review" for quests.
    const reviewQuestions = firstTime ? 0 : questions.length;
    const eng = await trackEngagement(tx, {
      userId,
      timezone: user.timezone,
      day: act.day,
      now,
      xpBefore: stats.totalXp,
      event: { lessons: 1, perfect_lessons: perfect ? 1 : 0, xp: learnXp, review_questions: reviewQuestions },
    });
    for (const r of eng.rewards) breakdown.push({ label: `${r.kind === "quest" ? "Quest" : "Achievement"}: ${r.title}`, xp: r.xp });
    const xpGained = breakdown.reduce((sum, b) => sum + b.xp, 0);

    await tx
      .update(schema.lessonRuns)
      .set({ status: "completed", completedAt: now, xpAwarded: xpGained })
      .where(eq(schema.lessonRuns.id, runId));

    const [after] = await tx.select({ totalXp: schema.userStats.totalXp }).from(schema.userStats).where(eq(schema.userStats.userId, userId));
    const levelAfter = levelFromXp(after!.totalXp);
    return {
      xpGained,
      breakdown,
      perfect,
      repeat: !firstTime,
      totalXp: after!.totalXp,
      level: { before: levelBefore.level, after: levelAfter.level, title: levelAfter.title, leveledUp: levelAfter.level > levelBefore.level },
      streak: act.streak,
      rewards: eng.rewards,
      heartsEarned,
      hearts: heartsView,
    };
  });
}
