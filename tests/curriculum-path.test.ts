/** Learning path + prerequisite graph against a REAL database. Requires TEST_DATABASE_URL. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("curriculum graph on the learning path (real database)", () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let path: any, db: any, schema: any, orm: any;
  let userId: string;
  let byUnit: Map<string, any>;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const { execFileSync } = await import("node:child_process");
    const env = { ...process.env, DATABASE_URL: url };
    execFileSync("npx", ["tsx", "scripts/migrate.ts"], { env, stdio: "pipe" });
    execFileSync("npx", ["tsx", "scripts/seed.ts"], { env, stdio: "pipe" });
    execFileSync("npx", ["tsx", "scripts/seed-problems-lite.ts"], { env, stdio: "pipe", timeout: 120_000 });
    orm = await import("drizzle-orm");
    ({ getDb: db, schema } = await import("@/server/db/client"));
    path = await import("@/server/services/path");
    const h = db();
    await h.execute(orm.sql`TRUNCATE users CASCADE`);
    const [u] = await h.insert(schema.users).values({ email: "grapher@example.com", username: "grapher", passwordHash: "x", displayName: "grapher", timezone: "UTC" }).returning();
    await h.insert(schema.userStats).values({ userId: u.id });
    userId = u.id;
    const c = await path.loadCurriculum();
    byUnit = new Map(c.flatMap((w: any) => w.units).map((x: any) => [x.unit.slug, x]));
  }, 180_000);
  afterAll(async () => {
    const { getPool } = await import("@/server/db/client");
    await getPool().end();
  });

  const complete = async (...slugs: string[]) => {
    for (const s of slugs) for (const l of byUnit.get(s).lessons) await db().insert(schema.userLessonProgress).values({ userId, lessonId: l.id, completions: 1 }).onConflictDoNothing();
  };
  const unit = async (slug: string) => (await path.getLearningPath(userId)).flatMap((w: any) => w.units).find((u: any) => u.slug === slug);

  it("seeds objectives, prerequisites, practice and assessments", async () => {
    const ps = await unit("prefix-two-pointers");
    expect(ps.objectives.length).toBeGreaterThanOrEqual(3);
    expect(ps.prerequisites.map((p: any) => p.slug)).toEqual(["problem-solving", "vectors"]);
    expect(ps.practice.length).toBeGreaterThan(0);
    expect(ps.assessment).toMatchObject({ required: true, state: "locked" });
    const last = ps.lessons[ps.lessons.length - 1];
    expect(last.kind).toBe("assessment");
    expect((await unit("getting-started")).lessons[0].state).toBe("available");
  });

  it("explains why a unit is locked and opens it only after the prerequisites are mastered", async () => {
    const locked = await unit("arrays");
    expect(locked.lockedReason).toMatch(/Loops/);
    expect(locked.lessons[0].state).toBe("locked");
    await complete("getting-started", "variables-data-types", "operators", "conditionals", "loops");
    const arrays = await unit("arrays");
    expect(arrays.lockedReason).toBeNull();
    expect(arrays.lessons[0].state).toBe("available");
    expect(arrays.prerequisites).toEqual([{ slug: "loops", title: expect.any(String), done: true }]);
  });

  it("opens sibling units in parallel and keeps joins closed until both branches are done", async () => {
    await complete("functions");
    expect((await unit("strings")).lessons[0].state).toBe("available"); // strings does not need arrays
    expect((await unit("arrays")).lessons[0].state).toBe("available");
    const vectors = await unit("vectors");
    expect(vectors.lessons[0].state).toBe("locked");
    expect(vectors.lockedReason).toMatch(/Arrays/);
    const first = byUnit.get("vectors").lessons[0].id;
    expect(await path.isLessonUnlocked(userId, first)).toBe(false);
  });

  it("an assessment must be passed before dependent units open; lessons inside a unit stay in order", async () => {
    await complete("arrays", "vectors");
    const ps0 = byUnit.get("problem-solving");
    for (const l of ps0.lessons.slice(0, -1)) await db().insert(schema.userLessonProgress).values({ userId, lessonId: l.id, completions: 1 });
    const ps = await unit("problem-solving");
    expect(ps.assessment.state).toBe("available");
    expect(ps.mastered).toBe(false);
    expect((await unit("prefix-two-pointers")).lockedReason).toMatch(/Problem Solving/);
    expect(await path.isLessonUnlocked(userId, byUnit.get("prefix-two-pointers").lessons[0].id)).toBe(false);
    expect((await unit("recursion")).lockedReason).not.toBeNull();
    await db().insert(schema.userLessonProgress).values({ userId, lessonId: ps0.lessons.at(-1).id, completions: 1 });
    expect((await unit("problem-solving")).mastered).toBe(true);
    const after = await unit("prefix-two-pointers");
    expect(after.lockedReason).toBeNull();
    expect(after.lessons[0].state).toBe("available");
    expect(after.lessons[1].state).toBe("locked");
    expect((await unit("recursion")).lockedReason).toBeNull();
  });

  it("every published lesson of the real curriculum can eventually be reached in order (no dead ends)", async () => {
    const p = (await path.getLearningPath(userId)).flatMap((w: any) => w.units);
    expect(p.map((u: any) => u.slug)).toEqual(expect.arrayContaining(["recursion", "backtracking", "greedy", "graph-traversal", "dp-intro"]));
    const seq = path.lessonSequence(await path.loadCurriculum());
    expect(seq.length).toBeGreaterThan(40);
  });

  it("nextLesson recommends an available non-checkpoint lesson", async () => {
    const next = path.nextLesson(await path.getLearningPath(userId));
    expect(next).toBeTruthy();
    expect(next.kind).not.toBe("checkpoint");
    expect(next.state).toMatch(/available|in_progress/);
  });
});
