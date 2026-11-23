/**
 * Submission pipeline against a REAL PostgreSQL database and a Judge0-compatible server that compiles and runs
 * programs with the local g++ (test harness only). Requires TEST_DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startFakeJudge0, type FakeJudge0 } from "./helpers/fake-judge0";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

const AC = `#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}`;
const WA_ON_BIG = `#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}`; // int overflow on big tests
const WRONG = `#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a-b<<"\\n";}`;
const CE = `int main( { return 0 }`;
const TLE = `int main(){ for(;;){} }`;
const RTE = `#include <cstdlib>\nint main(){ std::abort(); }`;

d("practice: run, submit, hints (real DB + judge protocol)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let svc: any, db: any, schema: any, orm: any;
  let fake: FakeJudge0;
  let userId: string;
  const slug = "t-sum";

  beforeAll(async () => {
    fake = await startFakeJudge0();
    process.env.DATABASE_URL = url;
    process.env.JUDGE0_URL = fake.url;
    const { execFileSync } = await import("node:child_process");
    execFileSync("npx", ["tsx", "scripts/migrate.ts"], { env: { ...process.env }, stdio: "pipe" });
    orm = await import("drizzle-orm");
    ({ getDb: db, schema } = await import("@/server/db/client"));
    svc = await import("@/server/services/problems");
    const h = db();
    await h.execute(orm.sql`TRUNCATE users, problems CASCADE`);
    // XP assertions below are about problem XP only: switch off quest/achievement rewards so the result does not depend on other suites
    await h.update(schema.dailyQuests).set({ active: false });
    await h.update(schema.achievements).set({ active: false });
    const [u] = await h.insert(schema.users).values({ email: "p@example.com", username: "ptester", passwordHash: "x", displayName: "P", timezone: "UTC" }).returning();
    userId = u.id;
    await h.insert(schema.userStats).values({ userId });
    const [p] = await h
      .insert(schema.problems)
      .values({
        slug,
        title: "Test Sum",
        statement: "Add two numbers.",
        inputFormat: "a b",
        outputFormat: "a + b",
        constraints: "any",
        difficulty: "easy",
        rating: 1000,
        tags: ["math", "test"],
        timeLimitMs: 500,
        memoryLimitMb: 256,
        samples: [{ input: "1 2\n", output: "3\n" }],
        hints: ["think about sums of two numbers", "use a 64-bit integer type here", "read two numbers and print their sum"],
        editorial: "SECRET-EDITORIAL-TEXT",
        referenceSolution: "SECRET-REFERENCE-CODE",
      })
      .returning();
    const tests = [
      ["1 2\n", "3\n", true],
      ["10 20\n", "30\n", false],
      ["2000000000 2000000000\n", "4000000000\n", false], // overflows int
      ["-5 5\n", "0\n", false],
    ] as const;
    for (const [i, [input, out, sample]] of tests.entries()) await h.insert(schema.problemTestCases).values({ problemId: p.id, position: i + 1, input, expectedOutput: out, isSample: sample });
  });
  afterAll(async () => {
    await fake?.close();
    const { getPool } = await import("@/server/db/client");
    await getPool().end();
  });

  const xp = async () => (await db().select().from(schema.userStats).where(orm.eq(schema.userStats.userId, userId)))[0];

  it("hides editorial and reference solution until the problem is solved", async () => {
    const p = await svc.getProblem(userId, slug);
    expect(p.editorial).toBeNull();
    expect(p.referenceSolution).toBeNull();
    expect(JSON.stringify(p)).not.toContain("SECRET");
    expect(p.hintsRevealed).toEqual([]);
    expect(p.judgeAvailable).toBe(true);
  });

  it("suggests related problems by shared topic, unsolved and closest rating first, never itself or other topics", async () => {
    const h = db();
    const base = { statement: "x", inputFormat: "x", outputFormat: "x", constraints: "x", difficulty: "easy", timeLimitMs: 500, memoryLimitMb: 256, samples: [{ input: "1\n", output: "1\n" }], hints: ["aaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbb", "cccccccccccccccccccc"], editorial: "e", referenceSolution: "r" };
    await h.insert(schema.problems).values([
      { ...base, slug: "rel-near", title: "Near", rating: 1050, tags: ["math", "test"] },
      { ...base, slug: "rel-far", title: "Far", rating: 1800, tags: ["math"] },
      { ...base, slug: "rel-other", title: "Other", rating: 1000, tags: ["unrelated-topic"] },
    ]);
    const p = await svc.getProblem(userId, slug);
    const slugs = p.related.map((r: { slug: string }) => r.slug);
    expect(slugs.slice(0, 2)).toEqual(["rel-near", "rel-far"]);
    expect(slugs).not.toContain(slug);
    expect(slugs).not.toContain("rel-other");
    expect(p.related[0].reason).toContain("similar difficulty");
    expect(JSON.stringify(p.related)).not.toContain("SECRET");
    await h.delete(schema.problems).where(orm.inArray(schema.problems.slug, ["rel-near", "rel-far", "rel-other"]));
  });

  it("never exposes hidden tests or expected outputs", async () => {
    const p = await svc.getProblem(userId, slug);
    const json = JSON.stringify(p);
    expect(json).not.toContain("4000000000");
    expect(json).not.toContain("2000000000");
  });

  it("Run executes the samples and optional custom input, and stores nothing", async () => {
    const r = await svc.runSamples(userId, slug, AC, "cpp17", "7 8\n");
    expect(r.compileError).toBeNull();
    expect(r.cases.map((c: { label: string }) => c.label)).toEqual(["Sample 1", "Custom input"]);
    expect(r.cases[0].passed).toBe(true);
    expect(r.cases[1].output.trim()).toBe("15");
    const n = await db().select().from(schema.submissions);
    expect(n.length).toBe(0);
    expect((await xp()).totalXp).toBe(0);
  });

  it("Run reports compile errors", async () => {
    const r = await svc.runSamples(userId, slug, CE, "cpp17");
    expect(r.compileError).toBeTruthy();
  });

  it("passing the samples is NOT enough: an int-overflow solution gets Wrong Answer on a hidden test", async () => {
    const run = await svc.runSamples(userId, slug, WA_ON_BIG, "cpp17");
    expect(run.cases[0].passed).toBe(true); // sample passes
    const r = await svc.submit(userId, slug, WA_ON_BIG, "cpp17");
    expect(r.verdict).toBe("wrong_answer");
    expect(r.failedTest).toBe(3);
    expect(r.passed).toBe(3); // tests 1, 2 and 4 pass; only the overflowing test 3 fails
    expect(r.xpGained).toBe(0);
    expect((await xp()).totalXp).toBe(0);
    expect(JSON.stringify(r)).not.toContain("4000000000");
  });

  it("classifies compilation error, time limit and runtime error", async () => {
    expect((await svc.submit(userId, slug, CE, "cpp17")).verdict).toBe("compilation_error");
    expect((await svc.submit(userId, slug, TLE, "cpp17")).verdict).toBe("time_limit_exceeded");
    expect((await svc.submit(userId, slug, RTE, "cpp17")).verdict).toBe("runtime_error");
    expect((await svc.submit(userId, slug, WRONG, "cpp17")).verdict).toBe("wrong_answer");
    expect((await xp()).totalXp).toBe(0);
  }, 60_000);

  it("gates hints in order and records the highest level", async () => {
    await expect(svc.revealHint(userId, slug, 2)).rejects.toMatchObject({ status: 409 });
    await expect(svc.revealHint(userId, slug, 4)).rejects.toMatchObject({ status: 400 });
    const h1 = await svc.revealHint(userId, slug, 1);
    expect(h1.text).toContain("think");
    expect((await svc.revealHint(userId, slug, 1)).level).toBe(1); // idempotent
    await svc.revealHint(userId, slug, 2);
    const p = await svc.getProblem(userId, slug);
    expect(p.hintsRevealed.length).toBe(2);
  });

  it("Accepted: awards XP once, updates streak, unlocks the editorial", async () => {
    const r = await svc.submit(userId, slug, AC, "cpp17");
    expect(r.verdict).toBe("accepted");
    expect(r.passed).toBe(4);
    expect(r.firstSolve).toBe(true);
    expect(r.xpGained).toBe(15); // Easy
    expect(r.streak).toEqual({ current: 1, extended: true });
    const s = await xp();
    expect(s.totalXp).toBe(15);
    expect(s.currentStreak).toBe(1);

    const p = await svc.getProblem(userId, slug);
    expect(p.solved).toBe(true);
    expect(p.editorial).toBe("SECRET-EDITORIAL-TEXT");
    expect(p.referenceSolution).toBe("SECRET-REFERENCE-CODE");

    // re-submitting an accepted solution grants nothing more
    const again = await svc.submit(userId, slug, AC, "cpp20");
    expect(again.verdict).toBe("accepted");
    expect(again.firstSolve).toBe(false);
    expect(again.xpGained).toBe(0);
    expect((await xp()).totalXp).toBe(15);

    const ledger = await db().execute(orm.sql`select coalesce(sum(amount),0)::int as s from xp_transactions where user_id = ${userId}`);
    expect(ledger.rows[0].s).toBe(15);
  }, 60_000);

  it("keeps a submission history with verdicts and counts attempts", async () => {
    const subs = await svc.listSubmissions(userId, slug, 50);
    expect(subs.length).toBe(7);
    expect(subs.filter((s: { verdict: string }) => s.verdict === "accepted").length).toBe(2);
    const [prog] = await db().select().from(schema.userProblemProgress).where(orm.eq(schema.userProblemProgress.userId, userId));
    expect(prog.attempts).toBe(7);
    expect(prog.solvedWithoutHints).toBe(false); // hints were used
  });

  it("validates input and refuses oversized source", async () => {
    await expect(svc.submit(userId, slug, "   ", "cpp17")).rejects.toMatchObject({ status: 400 });
    await expect(svc.submit(userId, slug, AC, "python")).rejects.toMatchObject({ status: 400 });
    await expect(svc.submit(userId, slug, "x".repeat(70 * 1024), "cpp17")).rejects.toMatchObject({ status: 413 });
    await expect(svc.submit(userId, "does-not-exist", AC, "cpp17")).rejects.toMatchObject({ status: 404 });
  });

  it("a judge outage is reported honestly and never produces Accepted", async () => {
    fake.failWith = 503;
    await expect(svc.submit(userId, slug, AC, "cpp17")).rejects.toMatchObject({ status: 503 });
    fake.failWith = undefined;
    const subs = await svc.listSubmissions(userId, slug, 1);
    expect(subs[0].verdict).toBe("internal_error");
    expect((await xp()).totalXp).toBe(15);
  });

  it("lists problems with filters, status and no acceptance rate on tiny samples", async () => {
    const all = await svc.listProblems(userId, {});
    expect(all.total).toBe(1);
    expect(all.items[0].status).toBe("solved");
    expect(all.items[0].acceptance).not.toBeNull(); // 7 judged submissions >= 5
    expect((await svc.listProblems(userId, { difficulty: "hard" })).total).toBe(0);
    expect((await svc.listProblems(userId, { tag: "math" })).total).toBe(1);
    expect((await svc.listProblems(userId, { status: "unsolved" })).total).toBe(0);
    expect((await svc.listProblems(userId, { q: "sum" })).total).toBe(1);
    expect((await svc.listProblems(userId, { q: "%" })).total).toBe(0);
  });
});
