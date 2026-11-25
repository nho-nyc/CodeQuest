/** Hint structure shared by the problem page, the admin form and the content checks. Pure: safe to import from client components. */

export const HINT_LEVELS = [
  { level: 1, label: "Understand the problem", short: "Understand" },
  { level: 2, label: "Algorithmic direction", short: "Direction" },
  { level: 3, label: "Implementation", short: "Implementation" },
] as const;

const CODE_LIKE = /```|#include|\bfor\s*\(|\bwhile\s*\(|\bint main\b|;\s*\}/;

/** Structural rules every hint set must satisfy. Quality (not leaking, matching the editorial) still needs a human. */
export function validateHints(hints: readonly string[]): string[] {
  const errs: string[] = [];
  if (hints.length !== 3) return ["exactly 3 hints are required"];
  hints.forEach((h, i) => {
    const t = h.trim();
    if (t.length < 20) errs.push(`hint ${i + 1} is too short to help (needs 20+ characters)`);
    if (t.length > 700) errs.push(`hint ${i + 1} is too long (700 max); long text is probably the editorial`);
  });
  if (new Set(hints.map((h) => h.trim().toLowerCase())).size !== 3) errs.push("hints must be different from each other");
  if (CODE_LIKE.test(hints[0]!)) errs.push("hint 1 should not contain code");
  if (CODE_LIKE.test(hints[1]!)) errs.push("hint 2 should give a direction, not code");
  return errs;
}
