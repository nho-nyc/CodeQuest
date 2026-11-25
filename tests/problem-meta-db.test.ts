/** Problem metadata through the real service layer and scripts (real PostgreSQL). Requires TEST_DATABASE_URL. */
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("problem metadata: service + sync script", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let svc: any, db: any, schema: any, orm: any;
  let userId: string;
  const base = { statement: "x", inputFormat: "x", outputFormat: "x", constraints: "x", difficulty: "easy", rating: 1000, timeLimitMs: 500, memoryLimitMb: 256, samples: [{ input: "1\n", output: "1\n" }], hints: ["aaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbb", "cccccccccccccccccccc"], editorial: "ED", referenceSolution: "REF" };
  const meta = { primarySkill: "prefix-sums", approach: "Precompute prefix sums and answer each query as a difference.", timeComplexity: "O(n + q)", spaceComplexity: "O(n)", commonMistakes: ["Summing the range for every query, which is O(n * q)."] };
  const run = (script: string, ...args: string[]) => execFileSync("npx", ["tsx", script, ...args], { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe", timeout: 110_000 }).toString();

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    execFileSync("npx", ["tsx", "scripts/migrate.ts"], { env: { ...process.env }, stdio: "pipe" });
    orm = await import("drizzle-orm");
    ({ getDb: db, schema } = await import("@/server/db/client"));
    svc = await import("@/server/services/problems");
    const h = db();
    await h.execute(orm.sql`TRUNCATE users, problems CASCADE`);
    const [u] = await h.insert(schema.users).values({ email: "m@example.com", username: "mtester", passwordHash: "x", displayName: "M", timezone: "UTC" }).returning();
    userId = u.id;
    await h.insert(schema.userStats).values({ userId });
    await h.insert(schema.problems).values([
      { ...base, slug: "m-with", title: "With", tags: ["prefix-sums", "arrays"], meta },
      { ...base, slug: "m-none", title: "None", tags: ["dp", "geometry"] },
      { ...base, slug: "m-bad", title: "Bad", tags: ["arrays"], meta: { primarySkill: "dp", approach: "x" } },
      { ...base, slug: "m-explicit", title: "Explicit", tags: ["arrays"], meta: { ...meta, primarySkill: "arrays", prerequisites: ["loops"] } },
    ]);
  }, 60_000);
  afterAll(async () => {
    const { getPool } = await import("@/server/db/client");
    await getPool().end();
  });

  it("new rows default to empty metadata (migration is additive)", async () => {
    const [r] = await db().select().from(schema.problems).where(orm.eq(schema.problems.slug, "m-none"));
    expect(r.meta).toEqual({});
  });

  it("shows the main skill and prerequisites up front but keeps approach, complexity and mistakes until solved", async () => {
    const p = await svc.getProblem(userId, "m-with");
    expect(p.primarySkill).toBe("prefix-sums");
    expect(p.prerequisites.map((x: { slug: string }) => x.slug)).toEqual(["prefix-two-pointers", "arrays"]); // primary skill first, then the other tags
    expect(p.prerequisites[0].title.length).toBeGreaterThan(3);
    expect(p.insights).toBeNull();
    expect(JSON.stringify(p)).not.toContain("Precompute prefix sums");
    expect(JSON.stringify(p)).not.toContain("O(n + q)");
    const [row] = await db().select().from(schema.problems).where(orm.eq(schema.problems.slug, "m-with"));
    await db().insert(schema.userProblemProgress).values({ userId, problemId: row.id, solved: true, attempts: 1 });
    const solved = await svc.getProblem(userId, "m-with");
    expect(solved.insights).toEqual({ approach: meta.approach, timeComplexity: "O(n + q)", spaceComplexity: "O(n)", commonMistakes: meta.commonMistakes });
  });

  it("handles problems without metadata: nothing shown, prerequisites derived from tags, no error", async () => {
    const p = await svc.getProblem(userId, "m-none");
    expect(p.primarySkill).toBeNull();
    expect(p.insights).toBeNull();
    expect(p.prerequisites.map((x: { slug: string }) => x.slug)).toEqual(["dp-intro"]); // geometry is beyond the curriculum
  });

  it("ignores invalid stored metadata instead of failing or showing half of it", async () => {
    const p = await svc.getProblem(userId, "m-bad");
    expect(p.primarySkill).toBeNull();
    expect(p.insights).toBeNull();
  });

  it("uses explicit prerequisites when the author gave them", async () => {
    const p = await svc.getProblem(userId, "m-explicit");
    expect(p.prerequisites.map((x: { slug: string }) => x.slug)).toEqual(["loops"]);
  });

  it("never exposes metadata or prerequisites inside a contest", async () => {
    const [row] = await db().select().from(schema.problems).where(orm.eq(schema.problems.slug, "m-with"));
    await db().update(schema.userProblemProgress).set({ solved: true }).where(orm.eq(schema.userProblemProgress.problemId, row.id));
    const p = await svc.getProblem(userId, "m-with", { forContest: true });
    expect(p.primarySkill).toBeNull();
    expect(p.prerequisites).toEqual([]);
    expect(p.insights).toBeNull();
  });

  it("sync-problem-meta restores teaching fields, is idempotent, and leaves CMS-edited (locked) rows alone", async () => {
    run("scripts/seed-problems-lite.ts"); // inserts the library problems that have small test sets
    const h = db();
    const pick = await h.select().from(schema.problems).where(orm.and(orm.eq(schema.problems.slug, "range-sum-queries")));
    expect(pick.length).toBe(1);
    const id = pick[0].id;
    await h.update(schema.problems).set({ meta: {}, hints: ["junkjunkjunkjunkjunk", "junkjunkjunkjunkjunk2", "junkjunkjunkjunkjunk3"], rating: 1500 }).where(orm.eq(schema.problems.id, id));
    const dry = run("scripts/sync-problem-meta.ts", "--dry");
    expect(dry).toContain("[dry run]");
    expect((await h.select().from(schema.problems).where(orm.eq(schema.problems.id, id)))[0].rating).toBe(1500); // dry run changed nothing
    run("scripts/sync-problem-meta.ts");
    const [after] = await h.select().from(schema.problems).where(orm.eq(schema.problems.id, id));
    expect(after.rating).toBe(1000);
    expect(after.meta.primarySkill).toBe("prefix-sums");
    expect(after.hints[0]).not.toContain("junk");
    expect(after.statement).toBe(pick[0].statement); // statements and test cases are never touched
    expect(run("scripts/sync-problem-meta.ts")).toMatch(/^0 updated/);
    await h.update(schema.problems).set({ locked: true, rating: 1234 }).where(orm.eq(schema.problems.id, id));
    run("scripts/sync-problem-meta.ts");
    expect((await h.select().from(schema.problems).where(orm.eq(schema.problems.id, id)))[0].rating).toBe(1234);
  }, 120_000);
});
