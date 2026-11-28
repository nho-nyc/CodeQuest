/**
 * Server-side educational gating for the Repair Workshop, WITHOUT a database table.
 *
 * What the learner has earned (hints taken, attempts judged, accepted) travels in a signed, httpOnly cookie, one per
 * challenge. The learner can read it but cannot raise it: it is an HMAC over {user, challenge, state}, keyed from the
 * user's password hash (never sent to the browser). A forged, edited, expired, other-user or other-challenge cookie is
 * treated as "nothing earned yet". The worst a learner can do by deleting or replaying a cookie is lose or keep what they
 * already earned; they can never obtain a later hint or the reference solution early.
 *
 * Policy
 *  - Hint 1 needs nothing. Hint n needs hint n-1 (earlier hints can be re-read).
 *  - The reference solution needs an explicit request AND real engagement: one judged Submit, or all three hints,
 *    or an Accepted verdict. It never requires being right first, so a stuck learner is not locked out.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { ServiceError } from "@/server/services/lesson-run";

export type Progress = { hints: 0 | 1 | 2 | 3; submits: number; runs: number; accepted: boolean };
export const EMPTY: Progress = { hints: 0, submits: 0, runs: 0, accepted: false };
const TTL_MS = 7 * 86_400_000;
const MAX_COUNT = 10_000;

export const cookieName = (challengeId: string) => `cq_rw_${challengeId.replace(/[^a-z0-9-]/gi, "")}`;

type Payload = { v: 1; u: string; c: string; h: number; s: number; r: number; a: boolean; e: number };

function keyFor(passwordHash: string): Buffer {
  return createHmac("sha256", passwordHash).update(`repair-progress-v1:${process.env.REPAIR_PROGRESS_SECRET ?? ""}`).digest();
}
const mac = (key: Buffer, body: string) => createHmac("sha256", key).update(body).digest("base64url");

export function signProgress(user: { id: string; passwordHash: string }, challengeId: string, p: Progress, now = Date.now()): string {
  const payload: Payload = { v: 1, u: user.id, c: challengeId, h: p.hints, s: p.submits, r: p.runs, a: p.accepted, e: now + TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${mac(keyFor(user.passwordHash), body)}`;
}

/** Returns what the cookie proves, or EMPTY for anything that does not verify. Never throws. */
export function readProgress(token: string | undefined, user: { id: string; passwordHash: string }, challengeId: string, now = Date.now()): Progress {
  try {
    if (!token || token.length > 512) return EMPTY;
    const [body, sig, extra] = token.split(".");
    if (!body || !sig || extra !== undefined) return EMPTY;
    const expected = mac(keyFor(user.passwordHash), body);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return EMPTY;
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (p.v !== 1 || p.u !== user.id || p.c !== challengeId || typeof p.e !== "number" || p.e < now) return EMPTY;
    const hints = p.h === 1 || p.h === 2 || p.h === 3 ? p.h : 0;
    const clamp = (n: unknown) => (typeof n === "number" && Number.isInteger(n) && n >= 0 ? Math.min(n, MAX_COUNT) : 0);
    return { hints, submits: clamp(p.s), runs: clamp(p.r), accepted: p.a === true };
  } catch {
    return EMPTY;
  }
}

export const canReveal = (p: Progress) => p.accepted || p.submits >= 1 || p.hints >= 3;

/** The progress after taking `level`, or a 403 when the previous hint has not been taken. Re-reading an earlier hint changes nothing. */
export function takeHint(p: Progress, level: number): Progress {
  if (level <= p.hints) return p;
  if (level !== p.hints + 1) throw new ServiceError(`Take hint ${p.hints + 1} first. The hints build on each other.`, 403, "hint_locked");
  return { ...p, hints: level as Progress["hints"] };
}

export function assertCanReveal(p: Progress): void {
  if (!canReveal(p)) throw new ServiceError("The reference solution unlocks after you submit once, or after you have read all three hints. Give the repair a try first.", 403, "reveal_locked");
}

export const afterRun = (p: Progress): Progress => ({ ...p, runs: Math.min(p.runs + 1, MAX_COUNT) });
export const afterSubmit = (p: Progress, accepted: boolean): Progress => ({ ...p, submits: Math.min(p.submits + 1, MAX_COUNT), accepted: p.accepted || accepted });
