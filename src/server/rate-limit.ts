/**
 * Fixed-window in-memory rate limiter.
 * LIMITATION: state is per server instance. On Vercel/multi-instance deployments, back this with Redis
 * (REDIS_URL, see .env.example). The interface is intentionally tiny so it can be swapped.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return { ok: true, retryAfterSec: 0 };
  }
  b.count++;
  return { ok: b.count <= limit, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
}

/**
 * GLOBAL limiter for the expensive endpoints (code judging). When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are
 * set, counters live in that shared Redis so the limit holds across every serverless instance: one atomic MULTI/EXEC
 * (INCR + PEXPIRE) per call, on a key per fixed window so expiry is always set. Without them, or when the store is
 * unreachable, this falls back to the per-instance limiter above and `shared` is false: the limit is then only per
 * instance, which callers and the README state plainly. A storage outage never opens the gate (it degrades to the local
 * limit) and never blocks learners (nothing throws).
 */
import { createHash } from "node:crypto";

export type SharedResult = { ok: boolean; retryAfterSec: number; shared: boolean };
type SharedConfig = { url: string; token: string; fetchImpl?: typeof fetch };
let lastWarn = 0;

function sharedConfig(): SharedConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

/** Keys are hashed so user ids and bucket names never appear in the shared store. */
export const sharedKey = (key: string, window: number) => `cq:rl:${createHash("sha256").update(key).digest("hex").slice(0, 32)}:${window}`;

export async function rateLimitShared(key: string, limit: number, windowMs: number, now = Date.now(), cfg: SharedConfig | null = sharedConfig()): Promise<SharedResult> {
  if (!cfg) return { ...rateLimit(key, limit, windowMs), shared: false };
  const window = Math.floor(now / windowMs);
  const k = sharedKey(key, window);
  try {
    const res = await (cfg.fetchImpl ?? fetch)(`${cfg.url}/multi-exec`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", k], ["PEXPIRE", k, String(windowMs * 2)]]),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const out = (await res.json()) as Array<{ result?: unknown; error?: string }>;
    const count = Number(out[0]?.result);
    if (!Number.isInteger(count) || out[0]?.error) throw new Error("unexpected reply");
    return { ok: count <= limit, retryAfterSec: Math.max(1, Math.ceil(((window + 1) * windowMs - now) / 1000)), shared: true };
  } catch (e) {
    // One warning a minute, with the reason only: never the URL, token or key.
    if (now - lastWarn > 60_000) {
      lastWarn = now;
      console.warn(`[rate-limit] shared store unavailable (${e instanceof Error ? e.message.slice(0, 80) : "error"}); using the per-instance limit`);
    }
    return { ...rateLimit(key, limit, windowMs), shared: false };
  }
}
