/**
 * Server-side enforcement of the educational sequence. Direct API calls (no UI) must not bypass hints or reveal.
 * The routes are called as real Next route handlers with a mocked cookie store and session; judging uses the local fake Judge0.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { REPAIR_CHALLENGES } from "@/features/repair/challenges";
import { SECRETS } from "@/server/repair/secret";
import { cookieName, readProgress, signProgress, EMPTY, canReveal, takeHint, afterSubmit, afterRun } from "@/server/repair/progress";
import { startFakeJudge0, type FakeJudge0 } from "./helpers/fake-judge0";

const hoisted = vi.hoisted(() => ({ jar: new Map<string, string>(), setOpts: [] as Array<Record<string, unknown>>, user: null as null | { id: string; passwordHash: string } }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (hoisted.jar.has(n) ? { name: n, value: hoisted.jar.get(n)! } : undefined),
    set: (n: string, v: string, o: Record<string, unknown>) => {
      hoisted.jar.set(n, v);
      hoisted.setOpts.push({ name: n, ...o });
    },
  }),
}));
vi.mock("@/server/auth/session", () => ({ getCurrentUser: async () => hoisted.user }));

const alice = { id: "alice-id", passwordHash: "hash-of-alice-password" };
const bob = { id: "bob-id", passwordHash: "hash-of-bob-password" };
const ID = "greedy-coins";
const post = (route: string, id: string, body: unknown, extra: RequestInit = {}) =>
  new Request(`http://x/api/repair/${id}/${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body), ...extra });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const asUser = (u: typeof alice | null) => {
  hoisted.user = u;
};
const reset = () => {
  hoisted.jar.clear();
  hoisted.setOpts.length = 0;
};
let fake: FakeJudge0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let routes: Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let flow: any;

beforeAll(async () => {
  fake = await startFakeJudge0();
  process.env.DATABASE_URL ??= "postgresql://x:x@localhost:5432/x";
  process.env.JUDGE0_URL = fake.url;
  routes = {
    hint: await import("@/app/api/repair/[id]/hint/route"),
    solution: await import("@/app/api/repair/[id]/solution/route"),
    run: await import("@/app/api/repair/[id]/run/route"),
    submit: await import("@/app/api/repair/[id]/submit/route"),
    progress: await import("@/app/api/repair/[id]/progress/route"),
  };
  flow = await import("@/server/services/repair-flow");
});
afterAll(async () => {
  await fake.close();
});

describe("signed progress cookie", () => {
  it("round-trips what was earned", () => {
    const p = { hints: 2 as const, submits: 3, runs: 5, accepted: true };
    expect(readProgress(signProgress(alice, ID, p), alice, ID)).toEqual(p);
  });
  it("rejects forged, edited, foreign and expired cookies as 'nothing earned'", () => {
    const good = signProgress(alice, ID, { ...EMPTY, hints: 1 });
    const [body, sig] = good.split(".") as [string, string];
    const raised = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), h: 3 })).toString("base64url");
    const forged = [
      `${raised}.${sig}`, // edited payload, old signature
      `${body}.${sig.slice(0, -2)}AA`, // damaged signature
      `${body}`, `${body}.${sig}.extra`, "", "garbage", ".", "a.b",
      "x".repeat(600),
      signProgress(bob, ID, { ...EMPTY, hints: 3 }), // another user's valid cookie
      signProgress({ id: alice.id, passwordHash: "an-old-password-hash" }, ID, { ...EMPTY, hints: 3 }), // before a password change
      signProgress(alice, "window-negatives", { ...EMPTY, hints: 3 }), // another challenge's cookie
    ];
    for (const f of forged) expect(readProgress(f, alice, ID)).toEqual(EMPTY);
    expect(readProgress(signProgress(alice, ID, { ...EMPTY, hints: 3 }, Date.now() - 8 * 86_400_000), alice, ID)).toEqual(EMPTY); // expired
    expect(readProgress(undefined, alice, ID)).toEqual(EMPTY);
  });
  it("never throws and clamps odd signed values to 'nothing'", () => {
    const odd = signProgress(alice, ID, { hints: 7, submits: -3, runs: 1.5, accepted: "yes" } as never);
    expect(readProgress(odd, alice, ID)).toEqual({ hints: 0, submits: 0, runs: 0, accepted: false });
    expect(() => readProgress("%%%.%%%", alice, ID)).not.toThrow();
  });
  it("policy: hint n needs hint n-1; solution needs a submit, all hints, or acceptance", () => {
    expect(takeHint(EMPTY, 1).hints).toBe(1);
    expect(() => takeHint(EMPTY, 2)).toThrow(/Take hint 1 first/);
    expect(() => takeHint({ ...EMPTY, hints: 1 }, 3)).toThrow(/Take hint 2 first/);
    expect(takeHint({ ...EMPTY, hints: 3 }, 1).hints).toBe(3); // re-reading never lowers it
    expect(canReveal(EMPTY)).toBe(false);
    expect(canReveal(afterRun(afterRun(EMPTY)))).toBe(false);
    expect(canReveal({ ...EMPTY, hints: 2 })).toBe(false);
    expect(canReveal({ ...EMPTY, hints: 3 })).toBe(true);
    expect(canReveal(afterSubmit(EMPTY, false))).toBe(true);
    expect(canReveal(afterSubmit(EMPTY, true))).toBe(true);
  });
});

describe("direct API calls cannot bypass the sequence (real route handlers)", () => {
  it("rejects unauthenticated calls to every route", async () => {
    reset();
    asUser(null);
    for (const [name, req] of [["hint", post("hint", ID, { level: 1 })], ["solution", post("solution", ID, {})], ["run", post("run", ID, { source: "x", language: "cpp17" })], ["submit", post("submit", ID, { source: "x", language: "cpp17" })]] as const) {
      const res = await routes[name].POST(req, ctx(ID));
      expect(res.status, name).toBe(401);
    }
    expect((await routes.progress.GET(new Request("http://x/api/repair/greedy-coins/progress"), ctx(ID))).status).toBe(401);
  });
  it("hint 3 and hint 2 are refused until the previous hint was taken; hint 1 needs nothing", async () => {
    reset();
    asUser({ id: "u-hints", passwordHash: "ph-1" });
    const r3 = await routes.hint.POST(post("hint", ID, { level: 3 }), ctx(ID));
    expect(r3.status).toBe(403);
    expect(await r3.json()).toMatchObject({ code: "hint_locked" });
    expect(JSON.stringify(await (await routes.hint.POST(post("hint", ID, { level: 2 }), ctx(ID))).json())).not.toContain(SECRETS[ID]!.hints[1]!);
    expect((await routes.hint.POST(post("hint", ID, { level: 2 }), ctx(ID))).status).toBe(403);
    const r1 = await routes.hint.POST(post("hint", ID, { level: 1 }), ctx(ID));
    expect(r1.status).toBe(200);
    expect((await r1.json()).text).toBe(SECRETS[ID]!.hints[0]);
    expect((await routes.hint.POST(post("hint", ID, { level: 3 }), ctx(ID))).status).toBe(403); // still can't skip
    expect((await routes.hint.POST(post("hint", ID, { level: 2 }), ctx(ID))).status).toBe(200);
    expect((await routes.hint.POST(post("hint", ID, { level: 3 }), ctx(ID))).status).toBe(200);
    expect((await routes.hint.POST(post("hint", ID, { level: 1 }), ctx(ID))).status).toBe(200); // re-reading is fine
  });
  it("repeated requests do not advance the sequence, and a forged or replayed cookie cannot skip ahead", async () => {
    reset();
    const u = { id: "u-forge", passwordHash: "ph-2" };
    asUser(u);
    for (let i = 0; i < 5; i++) expect((await routes.hint.POST(post("hint", ID, { level: 2 }), ctx(ID))).status).toBe(403);
    // the learner writes their own cookie claiming hint 3, signed with a guessed key
    hoisted.jar.set(cookieName(ID), signProgress({ id: u.id, passwordHash: "guess" }, ID, { ...EMPTY, hints: 3 }));
    expect((await routes.hint.POST(post("hint", ID, { level: 3 }), ctx(ID))).status).toBe(403);
    expect((await routes.solution.POST(post("solution", ID, {}), ctx(ID))).status).toBe(403);
    // copying another user's genuine cookie does not help either
    hoisted.jar.set(cookieName(ID), signProgress(bob, ID, { ...EMPTY, hints: 3, submits: 5, accepted: true }));
    expect((await routes.hint.POST(post("hint", ID, { level: 3 }), ctx(ID))).status).toBe(403);
    expect((await routes.solution.POST(post("solution", ID, {}), ctx(ID))).status).toBe(403);
  });
  it("progress is stored in an httpOnly, path-scoped cookie that the browser cannot read", async () => {
    reset();
    asUser({ id: "u-cookie", passwordHash: "ph-3" });
    await routes.hint.POST(post("hint", ID, { level: 1 }), ctx(ID));
    const set = hoisted.setOpts.at(-1)!;
    expect(set).toMatchObject({ name: "cq_rw_greedy-coins", httpOnly: true, sameSite: "lax", path: "/api/repair" });
    expect(Number(set.maxAge)).toBeGreaterThan(0);
  });
  it("the reference solution stays locked after Run alone or two hints, and unlocks after all three hints", async () => {
    reset();
    asUser({ id: "u-reveal", passwordHash: "ph-4" });
    expect((await routes.solution.POST(post("solution", ID, {}), ctx(ID))).status).toBe(403);
    const body = await (await routes.solution.POST(post("solution", ID, {}), ctx(ID))).json();
    expect(JSON.stringify(body)).not.toContain("int main");
    expect(body.code).toBe("reveal_locked");
    await routes.run.POST(post("run", ID, { source: SECRETS[ID]!.solution, language: "cpp17" }), ctx(ID));
    expect((await routes.solution.POST(post("solution", ID, {}), ctx(ID))).status).toBe(403);
    for (const l of [1, 2]) await routes.hint.POST(post("hint", ID, { level: l }), ctx(ID));
    expect((await routes.solution.POST(post("solution", ID, {}), ctx(ID))).status).toBe(403);
    await routes.hint.POST(post("hint", ID, { level: 3 }), ctx(ID));
    const ok = await routes.solution.POST(post("solution", ID, {}), ctx(ID));
    expect(ok.status).toBe(200);
    expect((await ok.json()).solution).toContain("int main");
  }, 60000);
  it("one judged Submit (even a wrong one) unlocks the solution; an invalid or unjudged one does not", async () => {
    reset();
    asUser({ id: "u-submit", passwordHash: "ph-5" });
    const bad = await routes.submit.POST(post("submit", ID, { source: "", language: "cpp17" }), ctx(ID));
    expect(bad.status).toBe(400);
    expect((await routes.solution.POST(post("solution", ID, {}), ctx(ID))).status).toBe(403);
    const wrong = await routes.submit.POST(post("submit", ID, { source: REPAIR_CHALLENGES[0]!.flawedCode, language: "cpp17" }), ctx(ID));
    expect(wrong.status).toBe(200);
    expect((await wrong.json()).verdict).toBe("wrong_answer");
    expect((await routes.solution.POST(post("solution", ID, {}), ctx(ID))).status).toBe(200);
  }, 90000);
  it("progress is per challenge and per user, and reports only what was earned", async () => {
    reset();
    asUser({ id: "u-scope", passwordHash: "ph-6" });
    await routes.hint.POST(post("hint", ID, { level: 1 }), ctx(ID));
    const mine = await (await routes.progress.GET(new Request("http://x"), ctx(ID))).json();
    expect(mine).toEqual({ hints: [SECRETS[ID]!.hints[0]], canReveal: false, accepted: false });
    const other = await (await routes.progress.GET(new Request("http://x"), ctx("window-negatives"))).json();
    expect(other.hints).toEqual([]);
    expect((await routes.hint.POST(post("hint", "window-negatives", { level: 2 }), ctx("window-negatives"))).status).toBe(403);
    asUser(bob);
    const theirs = await (await routes.progress.GET(new Request("http://x"), ctx(ID))).json(); // Bob on the same browser jar
    expect(theirs.hints).toEqual([]);
  });
  it("unknown challenge ids and bad levels are rejected without side effects", async () => {
    reset();
    asUser({ id: "u-bad", passwordHash: "ph-7" });
    expect((await routes.hint.POST(post("hint", "nope", { level: 1 }), ctx("nope"))).status).toBe(404);
    expect((await routes.hint.POST(post("hint", "__proto__", { level: 1 }), ctx("__proto__"))).status).toBe(404);
    expect((await routes.solution.POST(post("solution", "constructor", {}), ctx("constructor"))).status).toBe(404);
    for (const level of [0, 4, 1.5, -1]) expect((await routes.hint.POST(post("hint", ID, { level }), ctx(ID))).status).toBe(400);
    expect((await routes.hint.POST(post("hint", ID, { level: "1" }), ctx(ID))).status).toBe(400);
    expect(hoisted.setOpts).toHaveLength(0);
  });
  it("the flow layer has the same policy without Next.js (in-memory jar)", async () => {
    const jar = new Map<string, string>();
    const j = { get: (n: string) => jar.get(n), set: (n: string, v: string) => void jar.set(n, v) };
    expect(() => flow.flowHint(alice, j, ID, 2)).toThrow(/Take hint 1 first/);
    expect(flow.flowHint(alice, j, ID, 1).canReveal).toBe(false);
    expect(() => flow.flowSolution(alice, j, ID)).toThrow(/unlocks after/);
  });
});

describe("request protections on the judge routes", () => {
  it("rejects oversized bodies (declared and streamed) and malformed JSON before judging", async () => {
    reset();
    asUser({ id: "u-size", passwordHash: "ph-8" });
    const huge = JSON.stringify({ source: "a".repeat(400 * 1024), language: "cpp17" });
    expect((await routes.run.POST(post("run", ID, huge), ctx(ID))).status).toBe(413);
    const noHeader = new Request(`http://x/api/repair/${ID}/submit`, { method: "POST", body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(huge)); c.close(); } }), duplex: "half" } as RequestInit);
    expect((await routes.submit.POST(noHeader, ctx(ID))).status).toBe(413);
    expect((await routes.run.POST(post("run", ID, "{not json"), ctx(ID))).status).toBe(400);
    expect((await routes.run.POST(post("run", ID, { language: "cpp17" }), ctx(ID))).status).toBe(400);
    const justOver = JSON.stringify({ source: "a".repeat(65 * 1024), language: "cpp17" });
    expect((await routes.run.POST(post("run", ID, justOver), ctx(ID))).status).toBe(413); // inside the body cap, over the 64 KB source cap
  });
  it("error responses never contain stack traces, paths or environment details", async () => {
    reset();
    asUser({ id: "u-err", passwordHash: "ph-9" });
    const res = await routes.run.POST(post("run", ID, { source: "int main(){}", language: "rust" }), ctx(ID));
    const text = await res.text();
    expect(res.status).toBe(400);
    expect(text).not.toMatch(/at \w+ \(|node_modules|\/home\/|JUDGE0|DATABASE_URL|stack/i);
  });
  it("limits how many judge requests one user may run at the same time (per instance)", async () => {
    reset();
    asUser({ id: "u-flight", passwordHash: "ph-10" });
    const slow = "int main(){ for(;;){} }"; // runs until the time limit
    const calls = [1, 2, 3].map(() => routes.run.POST(post("run", ID, { source: slow, language: "cpp17" }), ctx(ID)));
    const first = await Promise.race(calls.map((p, i) => p.then((r: Response) => ({ i, status: r.status }))));
    expect(first.status).toBe(429); // the third was refused immediately while two were still judging
    const all = await Promise.all(calls);
    expect(all.map((r: Response) => r.status).sort()).toEqual([200, 200, 429]);
    // slots are released afterwards
    expect((await routes.run.POST(post("run", ID, { source: "int main(){}", language: "cpp17" }), ctx(ID))).status).toBe(200);
  }, 60000);
  it("rate limits each route per user with Retry-After", async () => {
    reset();
    asUser({ id: "u-rate", passwordHash: "ph-11" });
    const statuses: number[] = [];
    let retry: string | null = null;
    for (let i = 0; i < 62; i++) {
      const r = await routes.hint.POST(post("hint", ID, { level: 1 }), ctx(ID));
      statuses.push(r.status);
      if (r.status === 429) retry = r.headers.get("Retry-After");
    }
    expect(statuses.filter((s) => s === 200)).toHaveLength(60);
    expect(statuses.slice(60)).toEqual([429, 429]);
    expect(Number(retry)).toBeGreaterThan(0);
    asUser({ id: "u-rate-2", passwordHash: "ph-12" }); // another user is unaffected
    expect((await routes.hint.POST(post("hint", ID, { level: 1 }), ctx(ID))).status).toBe(200);
  });
});
