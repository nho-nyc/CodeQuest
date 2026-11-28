import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startFakeUpstash, type FakeUpstash } from "./helpers/fake-upstash";

let up: FakeUpstash;
beforeAll(async () => {
  up = await startFakeUpstash();
});
afterAll(async () => {
  await up.close();
});
const cfg = () => ({ url: up.url, token: up.token });
/** A fresh module graph = a fresh serverless instance with its own in-memory state. */
async function instance() {
  vi.resetModules();
  return import("@/server/rate-limit");
}

describe("per-instance limiter (the confirmed limitation)", () => {
  it("two instances each allow the full limit, so the real ceiling is limit x instances", async () => {
    const a = await instance();
    const b = await instance();
    const hits = (m: typeof a) => Array.from({ length: 10 }, () => m.rateLimit("api:repair-submit:user-1", 8, 60_000).ok).filter(Boolean).length;
    expect(hits(a)).toBe(8);
    expect(hits(b)).toBe(8); // 16 judged submissions in one minute for a limit of 8
  });
  it("without a shared store, rateLimitShared says plainly that it is not shared", async () => {
    const m = await instance();
    const r = await m.rateLimitShared("k-none", 2, 60_000, Date.now(), null);
    expect(r.shared).toBe(false);
    expect(r.ok).toBe(true);
  });
});

describe("shared limiter (fake Upstash REST server; not a real Redis)", () => {
  it("enforces ONE limit across instances", async () => {
    const a = await instance();
    const b = await instance();
    const now = 1_700_000_000_000;
    const ok: boolean[] = [];
    for (let i = 0; i < 10; i++) ok.push((await (i % 2 ? a : b).rateLimitShared("api:repair-submit:user-x", 8, 60_000, now, cfg())).ok);
    expect(ok.filter(Boolean)).toHaveLength(8);
    expect(ok.slice(8)).toEqual([false, false]);
  });
  it("is atomic under parallel requests: exactly `limit` are allowed", async () => {
    const m = await instance();
    const now = 1_700_000_100_000;
    const rs = await Promise.all(Array.from({ length: 60 }, () => m.rateLimitShared("api:repair-run:user-par", 20, 60_000, now, cfg())));
    expect(rs.filter((r) => r.ok)).toHaveLength(20);
    expect(rs.every((r) => r.shared)).toBe(true);
  });
  it("keeps users and buckets apart and never reuses a key across windows", async () => {
    const m = await instance();
    const now = 1_700_000_200_000;
    for (let i = 0; i < 3; i++) await m.rateLimitShared("api:repair-run:user-A", 3, 60_000, now, cfg());
    expect((await m.rateLimitShared("api:repair-run:user-A", 3, 60_000, now, cfg())).ok).toBe(false);
    expect((await m.rateLimitShared("api:repair-run:user-B", 3, 60_000, now, cfg())).ok).toBe(true);
    expect((await m.rateLimitShared("api:repair-submit:user-A", 3, 60_000, now, cfg())).ok).toBe(true);
    expect((await m.rateLimitShared("api:repair-run:user-A", 3, 60_000, now + 60_000, cfg())).ok).toBe(true); // next window
  });
  it("reports a sensible Retry-After", async () => {
    const m = await instance();
    const now = 1_700_000_300_000 + 15_000;
    for (let i = 0; i < 2; i++) await m.rateLimitShared("ra", 1, 60_000, now, cfg());
    const r = await m.rateLimitShared("ra", 1, 60_000, now, cfg());
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(0);
    expect(r.retryAfterSec).toBeLessThanOrEqual(60);
  });
  it("sets an expiry on every key and never sends raw user ids or bucket names to the store", async () => {
    const m = await instance();
    up.bodies.length = 0;
    await m.rateLimitShared("api:repair-submit:SECRET-USER-ID-123", 5, 60_000, 1_700_000_400_000, cfg());
    const sent = up.bodies.join("\n");
    expect(sent).toContain("PEXPIRE");
    expect(sent).not.toContain("SECRET-USER-ID-123");
    expect(sent).not.toContain("repair-submit");
    expect(sent).not.toContain(up.token);
    for (const c of up.counters.values()) expect(Number.isFinite(c.expiresAt)).toBe(true);
  });
  it("degrades to the local limit (never opens, never throws) when the store is down, broken or rejects the token", async () => {
    for (const mode of ["http500", "garbage", "unauthorized"] as const) {
      const m = await instance();
      up.mode = mode;
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const rs = [];
      for (let i = 0; i < 5; i++) rs.push(await m.rateLimitShared(`outage-${mode}`, 3, 60_000, 1_700_000_500_000, cfg()));
      expect(rs.every((r) => r.shared === false)).toBe(true);
      expect(rs.filter((r) => r.ok)).toHaveLength(3); // still limited
      const logged = warn.mock.calls.flat().join(" ");
      expect(logged).not.toContain(up.token);
      expect(logged).not.toContain(up.url);
      expect(logged).not.toContain(`outage-${mode}`);
      expect(warn.mock.calls.length).toBeLessThanOrEqual(1); // one warning, not one per request
      warn.mockRestore();
      up.mode = "ok";
    }
  });
  it("an unreachable store (connection refused) also degrades safely", async () => {
    const m = await instance();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await m.rateLimitShared("refused", 1, 60_000, 1_700_000_600_000, { url: "http://127.0.0.1:1", token: "t" });
    expect(r).toMatchObject({ ok: true, shared: false });
    warn.mockRestore();
  });
});
