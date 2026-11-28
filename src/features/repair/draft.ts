/**
 * Draft recovery for the Repair Workshop's editor, kept in the browser.
 *
 * Stored per USER and per CHALLENGE, in a versioned envelope: `cq:repair:v1:<userId>:<challengeId>` ->
 * `{"v":1,"code":"...","savedAt":<ms>}`. Only the learner's own C++ text is stored: no tokens, no credentials, no results.
 *
 * - A different user on the same device never sees it (the key includes the user id), and switching challenges cannot overwrite
 *   another challenge's draft.
 * - The pre-versioning key (`cq:repair:<challengeId>`, a bare string with no owner) is deliberately never read: its owner is
 *   unknown, so adopting it could show one person's code to another. It is also never deleted.
 * - Anything that does not parse or validate is ignored, never thrown on and never deleted, so a damaged value cannot break
 *   the page or silently destroy work.
 */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const DRAFT_VERSION = 1;
/** Matches the server's 64 KB source limit with generous headroom; larger values are neither saved nor loaded. */
export const MAX_DRAFT_CHARS = 200_000;

export const draftKey = (userId: string, challengeId: string) => `cq:repair:v${DRAFT_VERSION}:${userId}:${challengeId}`;

export function loadDraft(storage: StorageLike | null, userId: string, challengeId: string): string | null {
  try {
    const raw = storage?.getItem(draftKey(userId, challengeId));
    if (!raw) return null;
    const d = JSON.parse(raw) as { v?: unknown; code?: unknown };
    if (!d || typeof d !== "object" || d.v !== DRAFT_VERSION || typeof d.code !== "string") return null;
    if (d.code.trim() === "" || d.code.length > MAX_DRAFT_CHARS) return null;
    return d.code;
  } catch {
    return null;
  }
}

export type SaveOutcome = "saved" | "cleared" | "skipped";

export function saveDraft(storage: StorageLike | null, userId: string, challengeId: string, code: string, now = Date.now()): SaveOutcome {
  try {
    if (!storage) return "skipped";
    const key = draftKey(userId, challengeId);
    if (code.trim() === "") {
      storage.removeItem(key); // the learner emptied the editor on purpose
      return "cleared";
    }
    if (code.length > MAX_DRAFT_CHARS) return "skipped"; // keep the previous draft rather than lose it to a quota error
    storage.setItem(key, JSON.stringify({ v: DRAFT_VERSION, code, savedAt: now }));
    return "saved";
  } catch {
    return "skipped"; // storage unavailable or full: the draft is simply not remembered
  }
}
