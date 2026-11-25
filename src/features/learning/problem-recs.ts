/**
 * Skill-aware problem recommendations: pure, deterministic, no database, no randomness, no clock.
 * Suggestions only. Nothing here (or in its loader) unlocks a unit, changes mastery, awards XP, spends hearts or
 * marks a problem solved.
 *
 * HOW A CANDIDATE IS JUDGED
 *  1. Hard filters (a problem failing any of them is never suggested):
 *     - not the problem being viewed, not solved, not in `recentSlugs`;
 *     - relevant: it shares a skill with the focus (see Relevance). A shared tag alone is not enough, it must also
 *       pass the difficulty window below;
 *     - difficulty window: |rating - target| <= MAX_RATING_GAP, where target = median solved rating + 100 (800 if none).
 *  2. Category (what the learner is told):
 *     - "review":  at least one prerequisite unit is not mastered. The message names exactly those units.
 *     - "ready":   prerequisites are known and all mastered, AND the problem's primary skill is the focus.
 *     - "related": it shares a skill with the focus but is not the focus skill, or nothing is known about its
 *                  prerequisites. A related skill is NEVER presented as a required prerequisite.
 *  3. Score, 0-100, the plain sum of the terms below (ties break by slug, so the order is reproducible):
 *       relevance   0 / 12 (shares a non-primary skill) / 30 (primary skill is the focus)
 *       readiness   20 x (mastered prerequisites / prerequisites); unknown prerequisites give a flat 8
 *       difficulty  20 x (1 - |rating - target| / MAX_RATING_GAP)
 *       goal        10 when one of the problem's prerequisite units is a current learning goal
 *       unit        5 when the problem is listed as practice for an open, unmastered unit
 *       attempted   5 when the learner already tried it (a started problem is worth finishing)
 *       reliability 4 for explicit reviewed metadata, 0 otherwise
 *  4. Selection walks the ranking best-first and applies diversity rules: at most MAX_PER_SKILL per skill, at most
 *     MAX_REVIEW "review" items.
 *
 * METADATA RELIABILITY (never invented)
 *  - "explicit": a valid hand-written `meta` exists (primary skill and, maybe, listed prerequisites).
 *  - "derived":  no metadata; prerequisites are computed from tags with TAG_TO_UNIT. It can say "review", but it
 *                can never be the focus skill: a derived problem is at most "related" unless it is "review".
 *  - "missing":  no metadata and no tag maps to a unit; nothing about readiness is known.
 */
import { TAG_TO_UNIT, type ProblemMeta, prerequisiteUnits } from "@/content/problems/meta";

export const MAX_RATING_GAP = 500;
export const MAX_PER_SKILL = 2;
export const MAX_REVIEW = 1;
export const WEIGHTS = { relevancePrimary: 30, relevanceSecondary: 12, readiness: 20, readinessUnknown: 8, difficulty: 20, goal: 10, unit: 5, attempted: 5, explicit: 4 } as const;

export type Reliability = "explicit" | "derived" | "missing";
export type RecCategory = "ready" | "review" | "related";

export type Candidate = {
  slug: string;
  title: string;
  difficulty: string;
  rating: number;
  tags: string[];
  /** Already validated with parseProblemMeta (null when absent or invalid). */
  meta: ProblemMeta | null;
  solved: boolean;
  attempted: boolean;
};

export type Learner = {
  /** Unit slugs the learner has mastered (from the curriculum graph, including skipped units). */
  masteredUnits: ReadonlySet<string>;
  /** Unit slugs currently open and not mastered. */
  openUnits: ReadonlySet<string>;
  /** Unit slugs the learner is working towards (placement result, or the next unit). May be empty. */
  goalUnits: ReadonlySet<string>;
  /** Ratings of problems already solved; sets the difficulty target. */
  solvedRatings: readonly number[];
  /** Practice slugs listed on open, unmastered units. */
  unitPractice: ReadonlySet<string>;
};

export type Focus = { primary: string; secondary: string[] };

export type Rec = {
  slug: string;
  title: string;
  difficulty: string;
  rating: number;
  category: RecCategory;
  reliability: Reliability;
  /** The skill this suggestion is about (a tag), for display. */
  skill: string;
  reason: string;
  /** Prerequisite units still to review ("review" only). */
  reviewUnits: Array<{ slug: string; title: string }>;
  score: number;
};

export type RecOptions = { limit?: number; recentSlugs?: ReadonlySet<string>; unitTitles?: ReadonlyMap<string, string> };

export function targetFor(solvedRatings: readonly number[]): number {
  if (solvedRatings.length === 0) return 800;
  const s = [...solvedRatings].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]! + 100;
}

export function reliabilityOf(c: Pick<Candidate, "meta" | "tags">): Reliability {
  if (c.meta) return "explicit";
  return prerequisiteUnits(c.tags, null).length > 0 ? "derived" : "missing";
}

/** Focus for a learner working through one problem: its own skills. The primary skill falls back to the first tag when no metadata exists. */
export function focusOfProblem(tags: readonly string[], meta: ProblemMeta | null): Focus | null {
  const primary = meta?.primarySkill ?? tags[0];
  if (!primary) return null;
  return { primary, secondary: tags.filter((t) => t !== primary) };
}

/** Focus for a learner with no current problem: the tags whose unit is a current learning goal. */
export function focusOfGoals(goalUnits: ReadonlySet<string>): Focus | null {
  const tags = Object.entries(TAG_TO_UNIT).filter(([, u]) => goalUnits.has(u)).map(([t]) => t).sort();
  return tags.length ? { primary: tags[0]!, secondary: tags.slice(1) } : null;
}

export function rankProblems(candidates: readonly Candidate[], learner: Learner, focus: Focus | null, anchorSlug: string | null, opts: RecOptions = {}): Rec[] {
  if (!focus) return [];
  const limit = opts.limit ?? 3;
  const target = targetFor(learner.solvedRatings);
  const title = (u: string) => opts.unitTitles?.get(u) ?? u;
  const focusTags = new Set([focus.primary, ...focus.secondary]);
  const scored: Rec[] = [];

  for (const c of candidates) {
    if (c.slug === anchorSlug || c.solved || opts.recentSlugs?.has(c.slug)) continue;
    const gap = Math.abs(c.rating - target);
    if (gap > MAX_RATING_GAP) continue;
    const reliability = reliabilityOf(c);
    // Only reviewed metadata may claim a primary skill; otherwise the first tag is just the first tag.
    const candPrimary = c.meta?.primarySkill ?? null;
    const isPrimary = candPrimary === focus.primary;
    const sharedTags = c.tags.filter((t) => focusTags.has(t));
    if (!isPrimary && sharedTags.length === 0) continue; // nothing relevant in common
    const skill = isPrimary ? focus.primary : sharedTags.includes(focus.primary) ? focus.primary : sharedTags[0]!;

    const prereqs = reliability === "missing" ? [] : prerequisiteUnits(c.tags, c.meta);
    const missing = prereqs.filter((u) => !learner.masteredUnits.has(u));
    const known = prereqs.length > 0;

    let category: RecCategory;
    if (known && missing.length > 0) category = "review";
    else if (known && isPrimary) category = "ready";
    else category = "related";

    const readiness = known ? WEIGHTS.readiness * ((prereqs.length - missing.length) / prereqs.length) : WEIGHTS.readinessUnknown;
    const score =
      (isPrimary ? WEIGHTS.relevancePrimary : WEIGHTS.relevanceSecondary) +
      readiness +
      WEIGHTS.difficulty * (1 - gap / MAX_RATING_GAP) +
      (prereqs.some((u) => learner.goalUnits.has(u)) ? WEIGHTS.goal : 0) +
      (learner.unitPractice.has(c.slug) ? WEIGHTS.unit : 0) +
      (c.attempted ? WEIGHTS.attempted : 0) +
      (reliability === "explicit" ? WEIGHTS.explicit : 0);

    const reviewUnits = missing.map((slug) => ({ slug, title: title(slug) }));
    const reason =
      category === "review"
        ? `Review ${reviewUnits.map((u) => u.title).join(" and ")} first: this problem uses ${reviewUnits.length === 1 ? "it" : "them"}${reliability === "derived" ? " (estimated from its topics)" : ""}.`
        : category === "ready"
          ? `Practises ${skill}, and you have finished the units it builds on.`
          : known
            ? `Related practice: also uses ${skill}. It is a different main skill, not a prerequisite.`
            : `Related practice: shares ${skill}. Its prerequisites are not mapped, so readiness is unknown.`;

    scored.push({ slug: c.slug, title: c.title, difficulty: c.difficulty, rating: c.rating, category, reliability, skill, reason, reviewUnits, score: Math.round(score * 100) / 100 });
  }

  scored.sort((a, b) => b.score - a.score || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

  const out: Rec[] = [];
  const perSkill = new Map<string, number>();
  let reviews = 0;
  for (const r of scored) {
    if (out.length >= limit) break;
    if ((perSkill.get(r.skill) ?? 0) >= MAX_PER_SKILL) continue;
    if (r.category === "review" && reviews >= MAX_REVIEW) continue;
    perSkill.set(r.skill, (perSkill.get(r.skill) ?? 0) + 1);
    if (r.category === "review") reviews++;
    out.push(r);
  }
  return out;
}
