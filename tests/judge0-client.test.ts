/**
 * The REAL Judge0 client code (src/server/judge/judge0.ts) against MOCKED HTTP responses. This checks request construction,
 * polling, status mapping and failure handling. It is NOT a test against a real Judge0 server.
 */
import { describe, expect, it, vi } from "vitest";
import { Judge0Judge, mapStatus } from "@/server/judge/judge0";
import { JudgeUnavailableError } from "@/server/judge/types";

const LIMITS = { timeMs: 2000, memoryMb: 256 };
const b64 = (s: string) => Buffer.from(s).toString("base64");
const TOKEN = "super-secret-judge-token";
type Call = { url: string; init?: RequestInit };

function judge(handler: (c: Call, n: number) => Response | Promise<Response>, over: Partial<ConstructorParameters<typeof Judge0Judge>[0]> = {}) {
  const calls: Call[] = [];
  const j = new Judge0Judge({ baseUrl: "https://judge.example.test/", authToken: TOKEN, languageIds: { cpp17: 54, cpp20: 105 }, pollTimeoutMs: 400, fetchImpl: (async (url: string, init?: RequestInit) => {
    const c = { url, init };
    calls.push(c);
    return handler(c, calls.length);
  }) as unknown as typeof fetch, ...over });
  return { j, calls };
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const done = (token: string, over: Record<string, unknown> = {}) => ({ token, status: { id: 3, description: "Accepted" }, stdout: b64("42\n"), stderr: null, compile_output: null, message: null, time: "0.012", memory: 3000, ...over });

describe("request construction", () => {
  it("creates a base64 batch with limits, language id and auth, then polls until finished", async () => {
    const { j, calls } = judge((c, n) => {
      if (c.init?.method === "POST") return json([{ token: "t1" }, { token: "t2" }]);
      return json({ submissions: n < 3 ? [{ token: "t1", status: { id: 2 } }, { token: "t2", status: { id: 1 } }] : [done("t1"), done("t2", { stdout: b64("7\n") })] });
    });
    const out = await j.run("int main(){}", "cpp17", ["1\n", "2\n"], LIMITS);
    expect(out.map((o) => o.stdout)).toEqual(["42\n", "7\n"]);
    const post = calls[0]!;
    expect(post.url).toBe("https://judge.example.test/submissions/batch?base64_encoded=true");
    const body = JSON.parse(String(post.init?.body)) as { submissions: Array<Record<string, unknown>> };
    expect(body.submissions).toHaveLength(2);
    const s0 = body.submissions[0]!;
    expect(Buffer.from(String(s0.source_code), "base64").toString()).toBe("int main(){}");
    expect(Buffer.from(String(s0.stdin), "base64").toString()).toBe("1\n");
    expect(s0).toMatchObject({ language_id: 54, cpu_time_limit: 2, memory_limit: 262144, enable_network: false, compiler_options: "-std=c++17 -O2" });
    expect(Number(s0.wall_time_limit)).toBeGreaterThanOrEqual(2);
    expect((post.init?.headers as Record<string, string>)["X-Auth-Token"]).toBe(TOKEN);
    expect(calls.length).toBeGreaterThanOrEqual(3); // at least one poll saw "in queue / processing"
  });
  it("uses the C++20 language id and options, and RapidAPI headers when configured", async () => {
    const { j, calls } = judge((c) => (c.init?.method === "POST" ? json([{ token: "t" }]) : json({ submissions: [done("t")] })), { authToken: undefined, rapidApiKey: "rk", rapidApiHost: "judge0-ce.p.rapidapi.com" });
    await j.run("x", "cpp20", ["i"], LIMITS);
    const body = JSON.parse(String(calls[0]!.init?.body)) as { submissions: Array<Record<string, unknown>> };
    expect(body.submissions[0]).toMatchObject({ language_id: 105, compiler_options: "-std=c++20 -O2" });
    const h = calls[0]!.init?.headers as Record<string, string>;
    expect(h["X-RapidAPI-Key"]).toBe("rk");
    expect(h["X-RapidAPI-Host"]).toBe("judge0-ce.p.rapidapi.com");
    expect(h["X-Auth-Token"]).toBeUndefined();
  });
  it("splits more than 20 inputs into several batches and keeps their order", async () => {
    let created = 0;
    const { j, calls } = judge((c) => {
      if (c.init?.method === "POST") {
        const n = (JSON.parse(String(c.init.body)) as { submissions: unknown[] }).submissions.length;
        return json(Array.from({ length: n }, () => ({ token: `t${created++}` })));
      }
      const tokens = new URL(c.url).searchParams.get("tokens")!.split(",");
      return json({ submissions: tokens.map((t) => done(t, { stdout: b64(`${t}\n`) })) });
    });
    const out = await j.run("x", "cpp17", Array.from({ length: 45 }, (_, i) => String(i)), LIMITS);
    expect(out).toHaveLength(45);
    expect(out.map((o) => o.stdout.trim())).toEqual(Array.from({ length: 45 }, (_, i) => `t${i}`));
    expect(calls.filter((c) => c.init?.method === "POST")).toHaveLength(3); // 20 + 20 + 5
  });
});

describe("status mapping", () => {
  it.each([
    [3, "ok"], [5, "time_limit"], [6, "compilation_error"], [7, "runtime_error"], [8, "runtime_error"], [9, "runtime_error"], [10, "runtime_error"], [11, "runtime_error"], [12, "runtime_error"], [13, "internal_error"], [14, "internal_error"], [99, "internal_error"],
  ])("Judge0 status %i -> %s", (id, expected) => {
    expect(mapStatus(id, 1000, LIMITS)).toBe(expected);
  });
  it("reports memory over the limit even when Judge0 said Accepted", () => {
    expect(mapStatus(3, 256 * 1024 + 1, LIMITS)).toBe("memory_limit");
    expect(mapStatus(3, 256 * 1024, LIMITS)).toBe("ok");
  });
  it("carries compile output, stderr, time and memory through", async () => {
    const { j } = judge((c) => (c.init?.method === "POST" ? json([{ token: "t" }]) : json({ submissions: [{ token: "t", status: { id: 6, description: "Compilation Error" }, stdout: null, stderr: null, compile_output: b64("error: expected ';'"), message: null, time: null, memory: null }] })));
    const [r] = await j.run("bad", "cpp17", ["i"], LIMITS);
    expect(r).toMatchObject({ status: "compilation_error", compileOutput: "error: expected ';'", timeMs: null, memoryKb: null });
  });
  it("safely clips huge output", async () => {
    const big = "A".repeat(5 * 1024 * 1024);
    const { j } = judge((c) => (c.init?.method === "POST" ? json([{ token: "t" }]) : json({ submissions: [done("t", { stdout: b64(big), stderr: b64(big) })] })));
    const [r] = await j.run("x", "cpp17", ["i"], LIMITS);
    expect(r!.stdout.length).toBeLessThan(70 * 1024);
    expect(r!.stdout).toContain("[output truncated]");
    expect(r!.stderr.length).toBeLessThan(70 * 1024);
  });
});

describe("failures become a generic 'unavailable' for learners, with detail only for logs", () => {
  async function failure(handler: Parameters<typeof judge>[0], over?: Parameters<typeof judge>[1]) {
    const { j } = judge(handler, over);
    try {
      await j.run("x", "cpp17", ["i"], LIMITS);
    } catch (e) {
      return e;
    }
    return null;
  }
  const cases: Array<[string, Parameters<typeof judge>[0], RegExp]> = [
    ["HTTP 401", () => json({ error: "no" }, 401), /credentials \(HTTP 401\)/],
    ["HTTP 403", () => json({ error: "no" }, 403), /credentials \(HTTP 403\)/],
    ["HTTP 429", () => json({}, 429), /HTTP 429/],
    ["HTTP 500", () => json({}, 500), /HTTP 500/],
    ["HTTP 422", () => json({ error: "bad language" }, 422), /HTTP 422/],
    ["network failure", () => { throw new TypeError("fetch failed: ECONNREFUSED 10.0.0.5:2358"); }, /network error/],
    ["invalid JSON", () => new Response("<html>gateway</html>", { status: 200 }), /not valid JSON/],
    ["creation without tokens", (c) => (c.init?.method === "POST" ? json([{ error: "x" }]) : json({})), /did not accept/],
    ["creation of the wrong size", (c) => (c.init?.method === "POST" ? json([{ token: "a" }, { token: "b" }]) : json({})), /did not accept/],
    ["polling reply without submissions", (c) => (c.init?.method === "POST" ? json([{ token: "t" }]) : json({ nope: 1 })), /unexpected reply/],
    ["polling reply that is null", (c) => (c.init?.method === "POST" ? json([{ token: "t" }]) : json(null)), /unexpected reply/],
  ];
  it.each(cases)("%s", async (_n, handler, detail) => {
    const e = await failure(handler);
    expect(e).toBeInstanceOf(JudgeUnavailableError);
    const err = e as JudgeUnavailableError;
    expect(err.message).toBe("The code judge is not available right now. Please try again in a moment.");
    expect(err.detail).toMatch(detail);
    for (const secret of [TOKEN, "judge.example.test", "10.0.0.5", "ECONNREFUSED"]) {
      expect(err.message).not.toContain(secret);
      expect(err.detail).not.toContain(secret);
    }
  });
  it("gives up with 'unavailable' when judging never finishes (timeout)", async () => {
    const t0 = Date.now();
    const e = await failure((c) => (c.init?.method === "POST" ? json([{ token: "t" }]) : json({ submissions: [{ token: "t", status: { id: 2 } }] })), { pollTimeoutMs: 300 });
    expect(e).toBeInstanceOf(JudgeUnavailableError);
    expect((e as JudgeUnavailableError).detail).toMatch(/polling deadline/);
    expect(Date.now() - t0).toBeLessThan(5000);
  });
});

describe("service layer on top of the client", () => {
  it("maps an outage to HTTP 503 without leaking details, and logs only the operational reason", async () => {
    const { withJudge } = await import("@/server/services/problems");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(withJudge(async () => { throw new JudgeUnavailableError("Judge0 refused our credentials (HTTP 401): check JUDGE0_AUTH_TOKEN"); })).rejects.toMatchObject({ status: 503, message: "The code judge is not available right now. Please try again in a moment." });
    expect(warn.mock.calls.flat().join(" ")).toContain("HTTP 401");
    warn.mockRestore();
  });
  it("an invalid JUDGE0_URL is a clear operational error (503), not a crash, and never echoes the value", async () => {
    vi.resetModules();
    const saved = { url: process.env.JUDGE0_URL, db: process.env.DATABASE_URL };
    process.env.DATABASE_URL ??= "postgresql://x:x@localhost:5432/x";
    process.env.JUDGE0_URL = "not a url with secret-abc";
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const svc = await import("@/server/services/repair");
      await expect(svc.runRepair("u", "greedy-coins", "int main(){}", "cpp17")).rejects.toMatchObject({ status: 503, message: expect.stringContaining("misconfigured") });
      expect(err.mock.calls.flat().join(" ")).toContain("[judge] configuration is invalid");
    } finally {
      err.mockRestore();
      if (saved.url === undefined) delete process.env.JUDGE0_URL;
      else process.env.JUDGE0_URL = saved.url;
      if (saved.db === undefined) delete process.env.DATABASE_URL;
      vi.resetModules();
    }
  });
});
