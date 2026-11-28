import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { ServiceError } from "@/server/services/lesson-run";
import { acquire } from "@/server/inflight";
import { rateLimit, rateLimitShared } from "@/server/rate-limit";
import type { User } from "@/server/db/schema";

/** Wraps a route handler: authentication, rate limiting and uniform error responses. */
export async function handle(fn: (user: User) => Promise<unknown>, opts: { limit?: number; bucket?: string; /** Count in the shared store when one is configured (judge-backed endpoints). */ shared?: boolean; /** Most requests of this kind one user may have running at once. */ maxInFlight?: number } = {}): Promise<NextResponse> {
  let release: (() => void) | null = null;
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const key = `api:${opts.bucket ?? "default"}:${user.id}`;
    const rl = opts.shared ? await rateLimitShared(key, opts.limit ?? 120, 60_000) : rateLimit(key, opts.limit ?? 120, 60_000);
    if (!rl.ok) return NextResponse.json({ error: "Slow down a little" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
    if (opts.maxInFlight) {
      release = acquire(key, opts.maxInFlight);
      if (!release) return NextResponse.json({ error: "Your previous request is still running. Wait for it to finish." }, { status: 429, headers: { "Retry-After": "3" } });
    }
    return NextResponse.json(await fn(user));
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    if (e instanceof ZodError || e instanceof SyntaxError) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    console.error("[api] unexpected error", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  } finally {
    release?.();
  }
}

/** Reads a JSON body without ever buffering more than `maxBytes` (the Content-Length header alone can be wrong or absent). */
export async function readJsonLimited(req: Request, maxBytes = 160 * 1024): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new ServiceError("Request is too large", 413);
  if (!req.body) throw new SyntaxError("empty body");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new ServiceError("Request is too large", 413);
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
