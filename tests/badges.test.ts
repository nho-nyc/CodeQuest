/** Quest badge collection and public profile badges against a REAL database. Requires TEST_DATABASE_URL. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("badge collection (real database)", () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let db: any, schema: any, orm: any, views: any, social: any, uid: string;
  let saved: Array<{ id: string; active: boolean }> = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const { execFileSync } = await import("node:child_process");
    const env = { ...process.env, DATABASE_URL: url };
    execFileSync("npx", ["tsx", "scripts/migrate.ts"], { env, stdio: "pipe" });
    execFileSync("npx", ["tsx", "scripts/seed.ts"], { env, stdio: "pipe" });
    orm = await import("drizzle-orm");
    ({ getDb: db, schema } = await import("@/server/db/client"));
    views = await import("@/server/services/gamification-views");
    social = await import("@/server/services/social");
    const h = db();
    await h.execute(orm.sql`TRUNCATE users CASCADE`);
    saved = await h.select({ id: schema.dailyQuests.id, active: schema.dailyQuests.active }).from(schema.dailyQuests);
    await h.update(schema.dailyQuests).set({ active: true });
    const [u] = await h.insert(schema.users).values({ email: "b@example.com", username: "badgey", passwordHash: "x", displayName: "Badgey", timezone: "UTC" }).returning();
    await h.insert(schema.userStats).values({ userId: u.id });
    uid = u.id;
  }, 120_000);
  afterAll(async () => {
    // leave the shared test database as we found it (other suites assume quest rewards are off)
    for (const q of saved) await db().update(schema.dailyQuests).set({ active: q.active }).where(orm.eq(schema.dailyQuests.id, q.id));
    const { getPool } = await import("@/server/db/client");
    await getPool().end();
  });

  it("starts empty, then collects a badge per completed quest and counts repeats", async () => {
    const h = db();
    const before = await views.getBadgeCollection(uid);
    expect(before.length).toBeGreaterThan(5);
    expect(before.every((b: any) => b.times === 0 && b.firstAt === null)).toBe(true);

    const [q] = await h.select().from(schema.dailyQuests).where(orm.eq(schema.dailyQuests.slug, "warm-up"));
    for (const day of ["2026-01-01", "2026-01-02"]) {
      await h.insert(schema.userQuests).values({ userId: uid, questId: q.id, day, progress: 1, completedAt: new Date(`${day}T10:00:00Z`) });
    }
    // an unfinished quest must not count
    const [q2] = await h.select().from(schema.dailyQuests).where(orm.eq(schema.dailyQuests.slug, "flawless"));
    await h.insert(schema.userQuests).values({ userId: uid, questId: q2.id, day: "2026-01-02", progress: 0 });

    const after = await views.getBadgeCollection(uid);
    expect(after[0].slug).toBe("warm-up"); // collected first
    expect(after[0].times).toBe(2);
    expect(after.find((b: any) => b.slug === "flawless").times).toBe(0);

    const prof = await social.getPublicProfile("badgey");
    expect(prof.badges.map((b: any) => b.slug)).toEqual(["warm-up"]);
    expect(prof.longestStreak).toBe(0);
  }, 60_000);
});
