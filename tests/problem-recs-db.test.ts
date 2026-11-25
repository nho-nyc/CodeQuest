/** Recommendations through the real service layer. They must be read-only. Requires TEST_DATABASE_URL. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("skill-aware recommendations (real database)", () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let rec: any, db: any, schema: any, orm: any, probs: any;
  let userId: string;
  const snapshot = async () => ({
    stats: (await db().select().from(schema.userStats).where(orm.eq(schema.userStats.userId, userId)))[0],
    lessons: await db().select().from(schema.userLessonProgress).where(orm.eq(schema.userLessonProgress.userId, userId)),
    problems: await db().select().from(schema.userProblemProgress).where(orm.eq(schema.userProblemProgress.userId, userId)),
    xp: await db().select().from(schema.xpTransactions).where(orm.eq(schema.xpTransactions.userId, userId)),
    skips: await db().select().from(schema.skipAttempts).where(orm.eq(schema.skipAttempts.userId, userId)),
  });
  const reason = (r: any) => `${r.slug}:${r.category}`;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const { execFileSync } = await import("node:child_process");
    const env = { ...process.env, DATABASE_URL: url };
    execFileSync("npx", ["tsx", "scripts/migrate.ts"], { env, stdio: "pipe" });
    execFileSync("npx", ["tsx", "scripts/seed.ts"], { env, stdio: "pipe" });
    orm = await import("drizzle-orm");
    ({ getDb: db, schema } = await import("@/server/db/client"));
    rec = await import("@/server/services/recommendations");
    probs = await import("@/server/services/problems");
    await db().execute(orm.sql`TRUNCATE users, problems CASCADE`);
    const base = { statement: "x", inputFormat: "x", outputFormat: "x", constraints: "x", difficulty: "easy", rating: 900, timeLimitMs: 500, memoryLimitMb: 256, samples: [{ input: "1\n", output: "1\n" }], hints: ["aaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbb", "cccccccccccccccccccc"], editorial: "ED", referenceSolution: "REF" };
    const meta = (primarySkill: string) => ({ primarySkill, approach: "A reviewed approach that is long enough.", timeComplexity: "O(n)", spaceComplexity: "O(1)", commonMistakes: ["A realistic common mistake text."] });
    await db().insert(schema.problems).values([
      { ...base, slug: "r-anchor", title: "Anchor", tags: ["prefix-sums", "arrays"], meta: meta("prefix-sums") },
      { ...base, slug: "r-p1", title: "P1", tags: ["prefix-sums", "arrays"], meta: meta("prefix-sums") },
      { ...base, slug: "r-p2", title: "P2", tags: ["prefix-sums"], meta: meta("prefix-sums") },
      { ...base, slug: "r-a1", title: "A1", tags: ["arrays"], meta: meta("arrays") },
      { ...base, slug: "r-d1", title: "D1", tags: ["prefix-sums", "arrays"] },
      { ...base, slug: "r-m1", title: "M1", tags: ["arrays", "geometry"] },
      { ...base, slug: "r-far", title: "Far", tags: ["prefix-sums"], rating: 2800, meta: meta("prefix-sums") },
      { ...base, slug: "r-off", title: "Off", tags: ["graphs"], meta: meta("graphs") },
    ]);
    const [u] = await db().insert(schema.users).values({ email: "rec@example.com", username: "recuser", passwordHash: "x", displayName: "rec", timezone: "UTC" }).returning();
    await db().insert(schema.userStats).values({ userId: u.id });
    userId = u.id;
  }, 120_000);
  afterAll(async () => {
    const { getPool } = await import("@/server/db/client");
    await getPool().end();
  });

  it("a new learner gets Review first for problems whose units are not mastered, with the missing unit named", async () => {
    const out = await rec.getProblemRecommendations(userId, "r-anchor", 6);
    const review = out.filter((r: any) => r.category === "review");
    expect(out.length).toBeGreaterThan(0);
    expect(review.length).toBe(1);
    expect(review[0].reviewUnits.map((u: any) => u.slug)).toContain("prefix-two-pointers");
    expect(review[0].reason).toContain(review[0].reviewUnits[0].title);
    const slugs = out.map((r: any) => r.slug);
    expect(slugs).not.toContain("r-off"); // unrelated skill
    expect(slugs).not.toContain("r-far"); // far outside the difficulty window
    expect(out.find((r: any) => r.slug === "r-d1")?.reliability ?? "derived").toBe("derived");
    expect(out.every((r: any) => r.slug !== "r-anchor")).toBe(true);
  });

  it("is read-only: asking for recommendations, or opening a problem, changes no progress, XP, hearts or mastery", async () => {
    const before = await snapshot();
    const path0 = JSON.stringify((await (await import("@/server/services/path")).getLearningPath(userId)).map((w: any) => w.units.map((u: any) => [u.slug, u.mastered, u.state])));
    await rec.getProblemRecommendations(userId, "r-anchor");
    await probs.getProblem(userId, "r-anchor");
    const after = await snapshot();
    expect(after).toEqual(before);
    expect(JSON.stringify((await (await import("@/server/services/path")).getLearningPath(userId)).map((w: any) => w.units.map((u: any) => [u.slug, u.mastered, u.state])))).toBe(path0);
  });

  it("excludes solved problems", async () => {
    const first = await rec.getProblemRecommendations(userId, "r-anchor", 6);
    expect(first.length).toBeGreaterThan(0);
    const victim = first[0];
    const [p] = await db().select().from(schema.problems).where(orm.eq(schema.problems.slug, victim.slug));
    await db().insert(schema.userProblemProgress).values({ userId, problemId: p.id, attempts: 1, solved: true });
    const again = await rec.getProblemRecommendations(userId, "r-anchor", 6);
    expect(again.map((r: any) => r.slug)).not.toContain(victim.slug);
  });

  it("mastering a unit flips its Review items to Ready, and is deterministic between calls", async () => {
    const lessons = await db().execute(orm.sql`select l.id from lessons l join units u on u.id = l.unit_id where u.slug = 'prefix-two-pointers' and l.kind <> 'checkpoint' and l.deleted_at is null`);
    // master every unit (legacy "everything done" learner): no Review item may remain
    const all = await db().execute(orm.sql`select l.id from lessons l where l.kind <> 'checkpoint' and l.deleted_at is null`);
    expect(lessons.rows.length).toBeGreaterThan(0);
    await db().insert(schema.userLessonProgress).values(all.rows.map((r: any) => ({ userId, lessonId: r.id, completions: 1, firstCompletedAt: new Date(), lastCompletedAt: new Date() })));
    const a = await rec.getProblemRecommendations(userId, "r-anchor", 6);
    const b = await rec.getProblemRecommendations(userId, "r-anchor", 6);
    expect(a.map(reason)).toEqual(b.map(reason));
    expect(a.some((r: any) => r.category === "review")).toBe(false);
    expect(a.length).toBeGreaterThan(0);
  });

  it("falls back cleanly: unknown problem gives no recommendations, and getProblem still returns related problems", async () => {
    expect(await rec.getProblemRecommendations(userId, "no-such-problem")).toEqual([]);
    const p = await probs.getProblem(userId, "r-anchor");
    expect(Array.isArray(p.recommendations)).toBe(true);
    expect(Array.isArray(p.related)).toBe(true);
    const c = await probs.getProblem(userId, "r-anchor", { forContest: true });
    expect(c.recommendations).toEqual([]);
  });
});
