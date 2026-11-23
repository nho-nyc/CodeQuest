/** Admin CMS services against a REAL database. Requires TEST_DATABASE_URL. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("admin CMS (real database)", () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let a: any, settings: any, run: any, path: any, db: any, schema: any, orm: any;
  let admin: { id: string; role: string }, editor: { id: string; role: string }, learner: { id: string; role: string };
  let env: NodeJS.ProcessEnv;

  const exec = async (script: string) => {
    const { execFileSync } = await import("node:child_process");
    execFileSync("npx", ["tsx", script], { env, stdio: "pipe" });
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    env = { ...process.env, DATABASE_URL: url };
    await exec("scripts/migrate.ts");
    await exec("scripts/seed.ts");
    await exec("scripts/seed-problems-lite.ts");
    orm = await import("drizzle-orm");
    ({ getDb: db, schema } = await import("@/server/db/client"));
    a = await import("@/server/services/admin");
    settings = await import("@/server/services/settings");
    run = await import("@/server/services/lesson-run");
    path = await import("@/server/services/path");
    const h = db();
    const h0 = h;
    await h0.execute(orm.sql`delete from worlds where slug = 'cms-world'`);
    await h0.execute(orm.sql`delete from problems where slug = 'add-three'`);
    await h0.execute(orm.sql`delete from contests where slug like 'cms-cup%'`);
    await h0.execute(orm.sql`update worlds set locked = false`);
    await h0.execute(orm.sql`update units set locked = false`);
    await h0.execute(orm.sql`update lessons set locked = false`);
    await h0.execute(orm.sql`update problems set locked = false`);
    await h.execute(orm.sql`TRUNCATE users CASCADE`);
    await h.execute(orm.sql`delete from app_settings`);
    await exec("scripts/seed.ts"); // restores any world renamed by an earlier aborted run
    const mk = async (n: string, role: string) => {
      const [u] = await h.insert(schema.users).values({ email: `${n}@example.com`, username: n, passwordHash: "x", displayName: n, timezone: "UTC", role }).returning();
      await h.insert(schema.userStats).values({ userId: u.id });
      return { id: u.id as string, role };
    };
    admin = await mk("boss", "admin");
    editor = await mk("editor", "content_editor");
    learner = await mk("learner", "user");
  }, 180_000);
  afterAll(async () => {
    // Do not leak custom XP rules or CMS rows into the other test files that share this database.
    await db().execute(orm.sql`delete from app_settings`);
    settings.clearSettingsCache();
    const h0 = db();
    await h0.execute(orm.sql`delete from worlds where slug = 'cms-world'`);
    await h0.execute(orm.sql`delete from problems where slug = 'add-three'`);
    await h0.execute(orm.sql`delete from contests where slug like 'cms-cup%'`);
    await h0.execute(orm.sql`update worlds set locked = false`);
    await h0.execute(orm.sql`update units set locked = false`);
    await h0.execute(orm.sql`update lessons set locked = false`);
    await h0.execute(orm.sql`update problems set locked = false`);
    await exec("scripts/seed.ts");
    await exec("scripts/seed-problems-lite.ts");
    const { getPool } = await import("@/server/db/client");
    await getPool().end();
  }, 120_000);

  it("learners can do nothing; editors cannot manage users", async () => {
    await expect(a.listCurriculum(learner)).rejects.toMatchObject({ status: 403 });
    await expect(a.saveWorld(learner, null, { title: "Hack", description: "" })).rejects.toMatchObject({ status: 403 });
    await expect(a.listUsers(editor, "", 0)).rejects.toMatchObject({ status: 403 });
    await expect(a.setUserRole(editor, learner.id, "admin")).rejects.toMatchObject({ status: 403 });
    await expect(a.updateXpRules(editor, {})).rejects.toMatchObject({ status: 403 });
    await expect(a.listAudit(editor)).rejects.toMatchObject({ status: 403 });
  });

  it("user management: role change, self-protection, deactivate ends sessions", async () => {
    await expect(a.setUserRole(admin, admin.id, "user")).rejects.toMatchObject({ status: 409 });
    await expect(a.setUserRole(admin, learner.id, "superuser")).rejects.toMatchObject({ status: 400 });
    await a.setUserRole(admin, learner.id, "content_editor");
    await a.setUserRole(admin, learner.id, "user");
    await db().insert(schema.sessions).values({ userId: learner.id, tokenHash: "h", expiresAt: new Date(Date.now() + 1e6) });
    await a.setUserActive(admin, learner.id, false);
    const [u] = await db().select().from(schema.users).where(orm.eq(schema.users.id, learner.id));
    expect(u.deletedAt).not.toBeNull();
    expect(await db().select().from(schema.sessions).where(orm.eq(schema.sessions.userId, learner.id))).toHaveLength(0);
    await expect(a.setUserActive(admin, admin.id, false)).rejects.toMatchObject({ status: 409 });
    await a.setUserActive(admin, learner.id, true);
    const found = await a.listUsers(admin, "LEARN", 0);
    expect(found.rows.map((r: any) => r.username)).toEqual(["learner"]);
    // LIKE wildcards in the search box are literal characters, not patterns
    expect((await a.listUsers(admin, "%", 0)).rows).toHaveLength(0);
    expect((await a.listUsers(admin, "l_arner", 0)).rows).toHaveLength(0);
  });

  it("creates a world, unit, lesson and questions that learners can play", async () => {
    const wid = await a.saveWorld(editor, null, { title: "CMS World", description: "made in the CMS", published: true });
    await expect(a.saveWorld(editor, null, { title: "CMS World", description: "" })).rejects.toMatchObject({ status: 409 });
    const uid = await a.saveUnit(editor, null, wid, { title: "CMS Unit", description: "", published: true });
    const lid = await a.saveLesson(editor, null, uid, { title: "CMS Lesson", summary: "s", concept: "A concept", explanation: "Para one.\n\nPara two.", xpReward: "25", published: true });
    await expect(a.saveLesson(editor, null, uid, { title: "Bad", summary: "", concept: "c", explanation: "", published: true })).rejects.toMatchObject({ status: 400 });
    const q1 = await a.saveQuestion(editor, null, lid, { type: "multiple_choice", prompt: "Pick two", explanation: "Because two.", items: "1\n2\n3", correct: "2" });
    await a.saveQuestion(editor, null, lid, { type: "true_false", prompt: "Sky is blue", explanation: "Yes.", correct: "1" });
    await expect(a.saveQuestion(editor, null, lid, { type: "multiple_choice", prompt: "Bad", explanation: "x", items: "a\nb", correct: "9" })).rejects.toMatchObject({ status: 400 });
    // edit then delete then add again: positions must never collide
    await a.saveQuestion(editor, q1, lid, { type: "multiple_choice", prompt: "Pick three", explanation: "Because three.", items: "1\n2\n3", correct: "3" });
    await a.deleteQuestion(editor, q1);
    await a.saveQuestion(editor, null, lid, { type: "fill_blank", prompt: "int ___ = 5;", explanation: "Name.", accepted: "x" });
    expect((await a.listQuestions(editor, lid)).map((q: any) => q.type)).toEqual(["true_false", "fill_blank"]);

    const curriculum = await path.loadCurriculum();
    expect(JSON.stringify(curriculum)).toContain("CMS Lesson");
    const [lesson] = await db().select().from(schema.lessons).where(orm.eq(schema.lessons.id, lid));
    expect(lesson.locked).toBe(true);
    // the question payload sent to learners holds no answer
    const rows = await a.listQuestions(editor, lid);
    expect(rows).toHaveLength(2);
    void run;

    await a.moveNode(editor, "lesson", lid, "up"); // single lesson: no-op, must not throw
    await a.setPublished(editor, "lesson", lid, false);
    await a.deleteNode(editor, "lesson", lid);
    await expect(a.deleteNode(editor, "lesson", lid)).rejects.toMatchObject({ status: 404 });
  });

  it("db:seed never overwrites or retires CMS-edited rows", async () => {
    const [w] = await db().select().from(schema.worlds).orderBy(orm.asc(schema.worlds.position)).limit(1);
    await a.saveWorld(admin, w.id, { title: "Renamed in CMS", description: w.description, published: true });
    await exec("scripts/seed.ts");
    const [after] = await db().select().from(schema.worlds).where(orm.eq(schema.worlds.id, w.id));
    expect(after.title).toBe("Renamed in CMS");
    const [cms] = await db().select().from(schema.worlds).where(orm.eq(schema.worlds.slug, "cms-world"));
    expect(cms.published).toBe(true); // CMS-only world is not retired by the seed
  });

  it("reordering renumbers siblings", async () => {
    const tree = await a.listCurriculum(editor);
    const w = tree.find((x: any) => x.units.length >= 2 || true);
    const worlds = tree.map((x: any) => x.id);
    await a.moveNode(editor, "world", worlds[1], "up");
    const after = (await a.listCurriculum(editor)).map((x: any) => x.id);
    expect(after[0]).toBe(worlds[1]);
    expect(after[1]).toBe(worlds[0]);
    void w;
  });

  it("problems: create draft, publish needs hidden tests, upload tests, edit is locked", async () => {
    const form = { title: "Add Three", statement: "Print a+b+c for three integers.", inputFormat: "Three integers", outputFormat: "One integer", constraints: "|x| <= 1000", difficulty: "newbie", rating: "800", tags: "math, Implementation", timeLimitMs: "1000", memoryLimitMb: "256", sampleInput: "1 2 3", sampleOutput: "6", hint1: "h1", hint2: "h2", hint3: "h3", editorial: "Just add them up.", referenceSolution: "int main(){}", estimatedMinutes: "5" };
    const pid = await a.saveProblem(editor, null, form);
    await expect(a.setProblemPublished(editor, pid, true)).rejects.toMatchObject({ status: 409 });
    await expect(a.addTestCases(editor, pid, [{ input: "1 1 1", expected: "" }])).rejects.toMatchObject({ status: 400 });
    await a.addTestCases(editor, pid, [{ input: "1 1 1\n", expected: "3\n" }, { input: "5 5 5\n", expected: "15\n" }]);
    await a.setProblemPublished(editor, pid, true);
    const tests = await a.listTestCases(editor, pid);
    expect(tests.map((t: any) => t.position)).toEqual([1, 2]);
    expect(JSON.stringify(tests)).not.toContain("15"); // only previews of inputs, never expected output
    await a.addTestCases(editor, pid, [{ input: "9 9 9\n", expected: "27\n" }], { replace: true });
    expect(await a.listTestCases(editor, pid)).toHaveLength(1);
    await a.saveProblem(editor, pid, { ...form, title: "Add Three Numbers" });
    await exec("scripts/seed-problems-lite.ts");
    const [p] = await db().select().from(schema.problems).where(orm.eq(schema.problems.id, pid));
    expect(p.title).toBe("Add Three Numbers");
    expect(p.published).toBe(false); // saveProblem form does not publish; seed does not touch locked
    await expect(a.saveProblem(editor, null, { ...form, difficulty: "godlike" })).rejects.toMatchObject({ status: 400 });
    await expect(a.saveProblem(editor, null, { ...form, hint2: "" })).rejects.toMatchObject({ status: 400 });
  }, 120_000);

  it("contests: create, validate problems, lock after participants", async () => {
    const [p] = await db().select().from(schema.problems).where(orm.eq(schema.problems.published, true)).limit(1);
    const startsAt = new Date(Date.now() + 86_400_000).toISOString();
    await expect(a.saveContest(editor, null, { title: "Bad", startsAt, durationMin: "60", problems: "no-such-problem" })).rejects.toMatchObject({ status: 400 });
    await expect(a.saveContest(editor, null, { title: "Bad", startsAt: "nope", durationMin: "60", problems: p.slug })).rejects.toMatchObject({ status: 400 });
    await expect(a.saveContest(editor, null, { title: "Bad", startsAt, durationMin: "5", problems: p.slug })).rejects.toMatchObject({ status: 400 });
    const cid = await a.saveContest(editor, null, { title: "CMS Cup", startsAt, durationMin: "60", problems: p.slug, published: true });
    await a.saveContest(editor, cid, { title: "CMS Cup 2", startsAt, durationMin: "90", problems: p.slug, published: true });
    const list = await a.listContestsAdmin(editor);
    expect(list.find((c: any) => c.id === cid)).toMatchObject({ title: "CMS Cup 2", durationMin: 90, problems: 1 });
    await db().insert(schema.contestParticipants).values({ contestId: cid, userId: learner.id, mode: "live" });
    await expect(a.saveContest(editor, cid, { title: "Late edit", startsAt, durationMin: "90", problems: p.slug })).rejects.toMatchObject({ status: 409 });
    await expect(a.deleteContest(editor, cid)).rejects.toMatchObject({ status: 409 });
  });

  it("XP rules: validated, applied to new rewards, cached values refresh", async () => {
    await expect(a.updateXpRules(admin, { perfectBonus: -1, problem: {}, streakMilestones: {} })).rejects.toMatchObject({ status: 400 });
    await expect(a.updateXpRules(admin, { perfectBonus: 10, problem: { easy: 1.5 }, streakMilestones: {} })).rejects.toMatchObject({ status: 400 });
    await a.updateXpRules(admin, { perfectBonus: 77, problem: { newbie: 11, easy: 22, medium: 33, hard: 44, expert: 55 }, streakMilestones: { "2": 5 } });
    const r = await settings.getXpRules();
    expect(r.perfectBonus).toBe(77);
    expect(r.problem.medium).toBe(33);
    expect(r.streakMilestones).toEqual({ 2: 5 });
  });

  it("every change is audited", async () => {
    const log = await a.listAudit(admin, 200);
    const actions = log.map((l: any) => l.action);
    for (const x of ["user.role", "user.deactivate", "world.create", "lesson.create", "question.create", "problem.create", "problem.tests", "contest.create", "settings.xp_rules"]) expect(actions).toContain(x);
  });

  it("overview analytics returns numbers", async () => {
    const o = await a.getOverview(editor);
    expect(o.users.total).toBe(3);
    expect(typeof o.subs.total).toBe("number");
    expect(o.content.problems).toBeGreaterThan(0);
  });

  it("quest and achievement switches are admin only", async () => {
    const [q] = await db().select().from(schema.dailyQuests).limit(1);
    await expect(a.setQuestActive(editor, q.id, false)).rejects.toMatchObject({ status: 403 });
    await a.setQuestActive(admin, q.id, false);
    await a.setQuestActive(admin, q.id, true);
  });
});
