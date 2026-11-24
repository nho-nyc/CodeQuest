/**
 * Integration tests against a REAL PostgreSQL database (no mocks).
 * Requires TEST_DATABASE_URL pointing at an empty database. Skipped otherwise.
 *   TEST_DATABASE_URL=postgresql://user:pw@localhost:5432/codequest_test npm test
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("lesson engine (real database)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let svc: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schema: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orm: any;
  let userId: string;
  let lessonIds: string[];

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const { execFileSync } = await import("node:child_process");
    const env = { ...process.env, DATABASE_URL: url };
    execFileSync("npx", ["tsx", "scripts/migrate.ts"], { env, stdio: "pipe" });
    execFileSync("npx", ["tsx", "scripts/seed.ts"], { env, stdio: "pipe" });
    orm = await import("drizzle-orm");
    ({ getDb: db, schema } = await import("@/server/db/client"));
    svc = { run: await import("@/server/services/lesson-run"), path: await import("@/server/services/path") };
    const handle = db();
    await handle.execute(orm.sql`TRUNCATE users CASCADE`);
    // These tests are about the lesson engine's own XP rules; quest/achievement rewards are covered in gamification.test.ts.
    await handle.execute(orm.sql`update daily_quests set active = false`);
    await handle.execute(orm.sql`update achievements set active = false`);
    const [u] = await handle.insert(schema.users).values({ email: "t@example.com", username: "tester", passwordHash: "x", displayName: "Tester", timezone: "UTC" }).returning();
    userId = u.id;
    await handle.insert(schema.userStats).values({ userId });
    const cur = await svc.path.loadCurriculum();
    lessonIds = svc.path.lessonSequence(cur);
  });
  afterAll(async () => {
    const { getPool } = await import("@/server/db/client");
    await getPool().end();
  });

  async function correctResponse(questionId: string) {
    const [q] = await db().select().from(schema.lessonQuestions).where(orm.eq(schema.lessonQuestions.id, questionId));
    const a = q.answer as Record<string, unknown>;
    if ("index" in a) return { index: a.index as number };
    if ("accepted" in a) return { text: (a.accepted as string[])[0]! };
    if ("order" in a) return { order: a.order as number[] };
    return { pairs: a.pairs as number[] };
  }
  const xp = async () => (await db().select().from(schema.userStats).where(orm.eq(schema.userStats.userId, userId)))[0];

  it("locks lessons that come after the first uncompleted one", async () => {
    await expect(svc.run.startOrResumeRun(userId, lessonIds[1]!)).rejects.toMatchObject({ status: 403 });
  });

  it("never sends answers to the client", async () => {
    const run = await svc.run.startOrResumeRun(userId, lessonIds[0]!);
    const json = JSON.stringify(run.remaining);
    expect(json).not.toContain('"answer"');
    expect(json).not.toContain('"accepted"');
    expect(json).not.toContain('"explanation"');
    expect(run.remaining.length).toBeGreaterThanOrEqual(5);
  });

  it("cannot complete before every question is correct", async () => {
    const run = await svc.run.startOrResumeRun(userId, lessonIds[0]!);
    await expect(svc.run.completeRun(userId, run.runId)).rejects.toMatchObject({ status: 409 });
    expect((await xp()).totalXp).toBe(0);
  });

  it("grades, resumes after a mistake, and awards XP exactly once", async () => {
    let run = await svc.run.startOrResumeRun(userId, lessonIds[0]!);
    const [first, ...rest] = run.remaining;

    // wrong answer first (index 99 is never valid)
    const wrong = await svc.run.answerQuestion(userId, run.runId, first.id, first.type === "fill_blank" ? { text: "zzz" } : first.type === "arrange_code" ? { order: [0, 0] } : first.type === "match_concept" ? { pairs: [9, 9] } : { index: 19 });
    expect(wrong.correct).toBe(false);
    expect(wrong.mistakes).toBe(1);

    // "reload": resume returns the same run and still all questions remaining
    run = await svc.run.startOrResumeRun(userId, lessonIds[0]!);
    expect(run.resumed).toBe(true);
    expect(run.remaining.length).toBe(rest.length + 1);

    for (const q of run.remaining) {
      const r = await svc.run.answerQuestion(userId, run.runId, q.id, await correctResponse(q.id));
      expect(r.correct).toBe(true);
    }
    const done = await svc.run.completeRun(userId, run.runId);
    expect(done.perfect).toBe(false);
    expect(done.xpGained).toBe(20); // lesson + first streak day has no milestone
    expect(done.streak).toEqual({ current: 1, extended: true });
    expect((await xp()).totalXp).toBe(20);

    // double submit is idempotent
    const again = await svc.run.completeRun(userId, run.runId);
    expect(again.xpGained).toBe(0);
    expect((await xp()).totalXp).toBe(20);
  });

  it("gives the perfect bonus once, via a perfect replay, and no XP for further repeats", async () => {
    const play = async () => {
      const run = await svc.run.startOrResumeRun(userId, lessonIds[0]!);
      for (const q of run.remaining) await svc.run.answerQuestion(userId, run.runId, q.id, await correctResponse(q.id));
      return svc.run.completeRun(userId, run.runId);
    };
    const perfect = await play();
    expect(perfect.perfect).toBe(true);
    expect(perfect.repeat).toBe(true);
    expect(perfect.xpGained).toBe(10);
    expect((await xp()).totalXp).toBe(30);
    const spam = await play();
    expect(spam.xpGained).toBe(0);
    expect((await xp()).totalXp).toBe(30);
  });

  it("keeps the XP cache equal to the ledger sum", async () => {
    const rows = await db().execute(orm.sql`select coalesce(sum(amount),0)::int as s from xp_transactions where user_id = ${userId}`);
    expect(rows.rows[0].s).toBe((await xp()).totalXp);
  });

  it("unlocks the next lesson after completion, and streak stays 1 on the same day", async () => {
    const run = await svc.run.startOrResumeRun(userId, lessonIds[1]!);
    expect(run.remaining.length).toBeGreaterThan(0);
    expect((await xp()).currentStreak).toBe(1);
    const path = await svc.path.getLearningPath(userId);
    const w1 = path[0];
    expect(w1.units[0].lessons[0].state).toBe("perfected");
    expect(w1.units[0].lessons[1].state).toBe("in_progress");
    expect(w1.units[0].lessons[2].state).toBe("locked");
    expect(path.find((w: { slug: string }) => w.slug === "dynamic-programming").playable).toBe(false);
  });

  it("rejects answers for another user's run", async () => {
    const [other] = await db().insert(schema.users).values({ email: "o@example.com", username: "other", passwordHash: "x", displayName: "Other" }).returning();
    await db().insert(schema.userStats).values({ userId: other.id });
    const run = await svc.run.startOrResumeRun(userId, lessonIds[1]!);
    await expect(svc.run.answerQuestion(other.id, run.runId, run.remaining[0].id, { index: 0 })).rejects.toMatchObject({ status: 404 });
  });
});
