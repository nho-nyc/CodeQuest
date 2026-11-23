/** Friends, study groups, discussions and leaderboard privacy against a REAL database. Requires TEST_DATABASE_URL. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("social (real database)", () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let s: any, board: any, db: any, schema: any, orm: any;
  const ids: Record<string, string> = {};
  let problemId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const { execFileSync } = await import("node:child_process");
    const env = { ...process.env, DATABASE_URL: url };
    execFileSync("npx", ["tsx", "scripts/migrate.ts"], { env, stdio: "pipe" });
    execFileSync("npx", ["tsx", "scripts/seed.ts"], { env, stdio: "pipe" });
    execFileSync("npx", ["tsx", "scripts/seed-problems-lite.ts"], { env, stdio: "pipe" });
    orm = await import("drizzle-orm");
    ({ getDb: db, schema } = await import("@/server/db/client"));
    s = await import("@/server/services/social");
    board = await import("@/server/services/leaderboard");
    const h = db();
    await h.execute(orm.sql`TRUNCATE users CASCADE`);
    for (const n of ["alice", "bobby", "carol", "dave"]) {
      const [u] = await h.insert(schema.users).values({ email: `${n}@example.com`, username: n, passwordHash: "x", displayName: n, timezone: "UTC" }).returning();
      await h.insert(schema.userStats).values({ userId: u.id });
      ids[n] = u.id;
    }
    const [p] = await h.select().from(schema.problems).where(orm.eq(schema.problems.published, true)).limit(1);
    problemId = p.id;
    // Give everyone XP today so boards have rows.
    for (const [n, xp] of [["alice", 50], ["bobby", 40], ["carol", 30], ["dave", 20]] as const) {
      await h.insert(schema.xpTransactions).values({ userId: ids[n], amount: xp, reason: "test", idempotencyKey: `t:${n}` });
    }
  }, 120_000);
  afterAll(async () => {
    const { getPool } = await import("@/server/db/client");
    await getPool().end();
  });

  it("friend requests: validation, send, duplicate, accept, auto-accept on reverse", async () => {
    await expect(s.sendFriendRequest(ids.alice, "alice")).rejects.toMatchObject({ status: 400 });
    await expect(s.sendFriendRequest(ids.alice, "nobody_here")).rejects.toMatchObject({ status: 404 });
    expect(await s.sendFriendRequest(ids.alice, "bobby")).toBe("sent");
    await expect(s.sendFriendRequest(ids.alice, "@bobby")).rejects.toMatchObject({ status: 409 });
    const bob = await s.getFriends(ids.bobby);
    expect(bob.incoming).toHaveLength(1);
    await expect(s.respondFriendRequest(ids.carol, bob.incoming[0].friendshipId, true)).rejects.toMatchObject({ status: 404 });
    await s.respondFriendRequest(ids.bobby, bob.incoming[0].friendshipId, true);
    expect((await s.getFriends(ids.alice)).friends.map((f: any) => f.username)).toEqual(["bobby"]);
    // carol and dave send to each other: the second one auto-accepts
    expect(await s.sendFriendRequest(ids.carol, "dave")).toBe("sent");
    expect(await s.sendFriendRequest(ids.dave, "carol")).toBe("accepted");
    expect(await s.friendIds(ids.carol)).toEqual([ids.dave]);
  });

  it("friends leaderboard only contains the viewer and friends", async () => {
    const b = await board.getLeaderboard(ids.alice, "daily", new Date(), [ids.alice, ...(await s.friendIds(ids.alice))]);
    expect(b.rows.map((r: any) => r.username)).toEqual(["alice", "bobby"]);
  });

  it("privacy: opted-out users vanish from public boards but not friend boards", async () => {
    await db().update(schema.users).set({ showOnLeaderboard: false }).where(orm.eq(schema.users.id, ids.alice));
    const pub = await board.getLeaderboard(ids.alice, "daily");
    expect(pub.rows.map((r: any) => r.username)).not.toContain("alice");
    expect(pub.me.hidden).toBe(true);
    const fr = await board.getLeaderboard(ids.bobby, "daily", new Date(), [ids.bobby, ids.alice]);
    expect(fr.rows.map((r: any) => r.username)).toContain("alice");
    await db().update(schema.users).set({ showOnLeaderboard: true }).where(orm.eq(schema.users.id, ids.alice));
  });

  it("unfriending removes the relation both ways", async () => {
    await s.removeFriendship(ids.bobby, ids.alice);
    expect(await s.friendIds(ids.alice)).toEqual([]);
    expect(await s.friendshipState(ids.alice, ids.bobby)).toBe("none");
  });

  it("study groups: create, join, privacy, owner rules", async () => {
    const gid = await s.createGroup(ids.alice, "Algo Club", "weekly drills");
    await expect(s.createGroup(ids.alice, "ab", "")).rejects.toMatchObject({ status: 400 });
    await expect(s.getGroup(ids.bobby, gid)).rejects.toMatchObject({ status: 404 }); // outsiders cannot see it
    const g = await s.getGroup(ids.alice, gid);
    await expect(s.joinGroup(ids.bobby, "WRONGCODE")).rejects.toMatchObject({ status: 404 });
    expect(await s.joinGroup(ids.bobby, g.inviteCode.toLowerCase())).toBe(gid);
    expect(await s.joinGroup(ids.bobby, g.inviteCode)).toBe(gid); // idempotent
    expect(await s.memberIds(gid)).toHaveLength(2);
    await expect(s.leaveGroup(ids.alice, gid)).rejects.toMatchObject({ status: 409 });
    await expect(s.removeMember(ids.bobby, gid, ids.alice)).rejects.toMatchObject({ status: 403 });
    const gb = await board.getLeaderboard(ids.alice, "daily", new Date(), await s.memberIds(gid));
    expect(gb.rows.map((r: any) => r.username)).toEqual(["alice", "bobby"]);
    await s.leaveGroup(ids.bobby, gid);
    await s.joinGroup(ids.bobby, g.inviteCode);
    await s.removeMember(ids.alice, gid, ids.bobby);
    expect(await s.memberIds(gid)).toHaveLength(1);
    await expect(s.deleteGroup(ids.bobby, gid)).rejects.toMatchObject({ status: 404 });
    await s.deleteGroup(ids.alice, gid);
    await expect(s.getGroup(ids.alice, gid)).rejects.toMatchObject({ status: 404 });
    expect(await s.listMyGroups(ids.alice)).toHaveLength(0);
  });

  it("limits owned groups to 5", async () => {
    for (let i = 0; i < 5; i++) await s.createGroup(ids.carol, `Group ${i}`, "");
    await expect(s.createGroup(ids.carol, "One too many", "")).rejects.toMatchObject({ status: 409 });
  });

  it("discussions: threads, replies, validation, moderation", async () => {
    await expect(s.createThread(ids.alice, "problem", problemId, "x", "body")).rejects.toMatchObject({ status: 400 });
    await expect(s.createThread(ids.alice, "problem", ids.alice, "Valid title", "body")).rejects.toMatchObject({ status: 404 });
    const tid = await s.createThread(ids.alice, "problem", problemId, "How to start?", "Any hints?");
    await s.reply(ids.bobby, tid, "Try reading the input first");
    await expect(s.reply(ids.bobby, tid, "   ")).rejects.toMatchObject({ status: 400 });
    await expect(s.reply(ids.bobby, tid, "x".repeat(4001))).rejects.toMatchObject({ status: 400 });
    const t = await s.getThread(tid);
    expect(t.posts).toHaveLength(1);
    expect((await s.listThreads("problem", problemId)).threads[0].replies).toBe(1);
    await expect(s.deletePost(ids.carol, "user", t.posts[0].id)).rejects.toMatchObject({ status: 403 });
    await s.deletePost(ids.carol, "content_editor", t.posts[0].id); // staff can moderate
    expect((await s.getThread(tid)).posts).toHaveLength(0);
    await expect(s.deleteThread(ids.bobby, "user", tid)).rejects.toMatchObject({ status: 403 });
    await s.deleteThread(ids.alice, "user", tid);
    await expect(s.getThread(tid)).rejects.toMatchObject({ status: 404 });
  });

  it("flood control: at most 8 posts per minute", async () => {
    const tid = await s.createThread(ids.dave, "problem", problemId, "Flood test", "first");
    for (let i = 0; i < 6; i++) await s.reply(ids.dave, tid, `r${i}`);
    await s.reply(ids.dave, tid, "r6"); // 8th write
    await expect(s.reply(ids.dave, tid, "r7")).rejects.toMatchObject({ status: 429 });
  });

  it("discussion for a problem in a running contest is closed", async () => {
    const [c] = await db().insert(schema.contests).values({ slug: "soc-live", title: "Live", startsAt: new Date(Date.now() - 60_000), durationMin: 60, published: true }).returning();
    await db().insert(schema.contestProblems).values({ contestId: c.id, problemId, label: "A", position: 0 });
    await expect(s.listThreads("problem", problemId)).rejects.toMatchObject({ status: 423 });
    await db().delete(schema.contests).where(orm.eq(schema.contests.id, c.id));
    await expect(s.listThreads("problem", problemId)).resolves.toBeTruthy();
  });

  it("public profile exposes no private fields", async () => {
    const p = await s.getPublicProfile("ALICE");
    expect(p.username).toBe("alice");
    expect(JSON.stringify(p)).not.toMatch(/email|passwordHash|timezone/i);
    await expect(s.getPublicProfile("ghost_user")).rejects.toMatchObject({ status: 404 });
  });
});
