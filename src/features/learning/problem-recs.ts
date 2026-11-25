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
 *     - "review":  at least one prerequisite unit is not mastered. The message names exactly those units. For reviewed
 *                  metadata without an explicit prerequisite list only the primary skill's unit counts.
 *     - "ready":   prerequisites are known and all mastered, AND the problem's primary skill is the focus.
 *     - "related": it shares a skill with the focus but is not the focus skill, or nothing is known about its
 *                  prerequisites. A related skill is NEVER presented as a required prerequisite.
 *  3. Score, 0-100, the plain sum of the terms below (ties break by slug, so the order is reproducible):
 *       relevance   30 reviewed primary skill is the focus / 20 unreviewed problem that carries the focus tag /
 *                   12 shares only another skill (+4 for each further shared skill, at most 2). Without a reviewed focus
 *                   problem there is no "main skill" bonus at all. Generic tags (GENERIC_TAGS) never count.
 *       readiness   explicit prerequisites: 20 x (mastered / all); derived (tag-estimated): 12 x (mastered / all);
 *                   unknown: 8. Estimated prerequisites are worth less because they are a guess.
 *       difficulty  20 x (1 - |rating - target| / MAX_RATING_GAP)
 *       goal        10 for a Review item whose missing units are all open right now or are learning goals
 *                   (the learner can act on it); 0 when a missing unit is still locked behind other units
 *       unit        5 when the problem is listed as practice for an open, unmastered unit
 *       attempted   5 when the learner already tried it (a started problem is worth finishing)
 *     There is deliberately NO bonus for having reviewed metadata: coverage must not decide relevance.
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

/** Tags that describe a style of problem, not a teachable skill. Sharing one of these is never a reason to recommend a problem. */
export const GENERIC_TAGS: ReadonlySet<string> = new Set(["implementation", "math", "simulation", "constructive", "counting", "data-structures"]);

export const MAX_RATING_GAP = 500;
export const MAX_PER_SKILL = 2;
export const MAX_REVIEW = 1;
export const WEIGHTS = { relevancePrimary: 30, relevanceTag: 20, relevanceSecondary: 12, relevanceExtraShared: 4, readiness: 20, readinessDerived: 12, readinessUnknown: 8, difficulty: 20, goal: 10, unit: 5, attempted: 5 } as const;

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

/** `primaryReviewed` is false when the focus problem has no reviewed metadata: its first tag is then only a guess, so nothing may be called "Ready" on its basis. */
export type Focus = { primary: string; secondary: string[]; primaryReviewed: boolean };

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
  /** `open`: the learner can start that unit now (false: it is still locked behind earlier units). */
  reviewUnits: Array<{ slug: string; title: string; open: boolean }>;
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
  const skills = tags.filter((t) => !GENERIC_TAGS.has(t));
  const primary = meta?.primarySkill ?? skills[0] ?? tags[0];
  if (!primary) return null;
  return { primary, secondary: skills.filter((t) => t !== primary), primaryReviewed: !!meta?.primarySkill };
}

/** Focus for a learner with no current problem: the tags whose unit is a current learning goal. */
export function focusOfGoals(goalUnits: ReadonlySet<string>): Focus | null {
  const tags = Object.entries(TAG_TO_UNIT).filter(([, u]) => goalUnits.has(u)).map(([t]) => t).sort();
  return tags.length ? { primary: tags[0]!, secondary: tags.slice(1), primaryReviewed: false } : null;
}

export function rankProblems(candidates: readonly Candidate[], learner: Learner, focus: Focus | null, anchorSlug: string | null, opts: RecOptions = {}): Rec[] {
  if (!focus) return [];
  const limit = opts.limit ?? 3;
  const target = targetFor(learner.solvedRatings);
  const title = (u: string) => opts.unitTitles?.get(u) ?? u;
  const focusTags = new Set([focus.primary, ...focus.secondary]);
  const focusUnits = new Set([...focusTags].map((t) => TAG_TO_UNIT[t]).filter((u): u is string => !!u));
  const scored: Rec[] = [];

  for (const c of candidates) {
    if (c.slug === anchorSlug || c.solved || opts.recentSlugs?.has(c.slug)) continue;
    const gap = Math.abs(c.rating - target);
    if (gap > MAX_RATING_GAP) continue;
    const reliability = reliabilityOf(c);
    // Only reviewed metadata may claim a primary skill; otherwise the first tag is just the first tag.
    const candPrimary = c.meta?.primarySkill ?? null;
    const isPrimary = candPrimary === focus.primary;
    const carriesPrimaryTag = !candPrimary && c.tags.includes(focus.primary);
    const sharedTags = c.tags.filter((t) => focusTags.has(t));
    if (!isPrimary && sharedTags.length === 0) continue; // nothing relevant in common
    const skill = isPrimary ? focus.primary : sharedTags.includes(focus.primary) ? focus.primary : sharedTags[0]!;

    // A "review first" claim must be conservative. Reviewed metadata without an explicit prerequisite list is trusted
    // only for its primary skill's unit: the other tags (e.g. grids -> graph traversal) are not necessarily needed.
    const prereqs =
      reliability === "missing"
        ? []
        : c.meta && !(c.meta.prerequisites && c.meta.prerequisites.length)
          ? [TAG_TO_UNIT[c.meta.primarySkill ?? ""]].filter((u): u is string => !!u)
          : prerequisiteUnits(c.tags, c.meta);
    const missing = prereqs.filter((u) => !learner.masteredUnits.has(u));
    const known = prereqs.length > 0;

    let category: RecCategory;
    if (known && missing.length > 0) category = "review";
    else if (known && isPrimary && focus.primaryReviewed) category = "ready";
    else category = "related";

    const readyWeight = reliability === "explicit" ? WEIGHTS.readiness : WEIGHTS.readinessDerived;
    const readiness = known ? readyWeight * ((prereqs.length - missing.length) / prereqs.length) : WEIGHTS.readinessUnknown;
    // Extra shared skills add a little; without a reviewed focus nobody gets the "main skill" bonus (the focus is a guess).
    const extra = Math.min(2, Math.max(0, sharedTags.length - 1)) * WEIGHTS.relevanceExtraShared;
    const relevance = isPrimary && focus.primaryReviewed ? WEIGHTS.relevancePrimary : (carriesPrimaryTag && focus.primaryReviewed ? WEIGHTS.relevanceTag : WEIGHTS.relevanceSecondary) + extra;
    // Acting on a Review item is only a good next step when the unit to review belongs to the skill being practised;
    // a tangential unit (e.g. Greedy while practising strings) gets no bonus.
    const onTopic = missing.some((u) => focusUnits.has(u));
    const actionable = category === "review" && onTopic && missing.every((u) => learner.openUnits.has(u) || learner.goalUnits.has(u));
    const score =
      relevance +
      readiness +
      WEIGHTS.difficulty * (1 - gap / MAX_RATING_GAP) +
      (actionable ? WEIGHTS.goal : 0) +
      (learner.unitPractice.has(c.slug) ? WEIGHTS.unit : 0) +
      (c.attempted ? WEIGHTS.attempted : 0);

    const reviewUnits = missing.map((slug) => ({ slug, title: title(slug), open: learner.openUnits.has(slug) }));
    const reason =
      category === "review"
        ? `Review ${reviewUnits.map((u) => u.title).join(" and ")} first: this problem uses ${reviewUnits.length === 1 ? "it" : "them"}${reliability === "derived" ? " (estimated from its topics)" : ""}.`
        : category === "ready"
          ? `Practises ${skill}, and you have finished the units it builds on.`
          : known
            ? `Related practice: also uses ${skill}${reliability === "derived" ? " (from its topic tags)" : ""}. It is not a prerequisite.`
            : `Related practice: shares ${skill}. Its prerequisites are not mapped, so readiness is unknown.`;

    scored.push({ slug: c.slug, title: c.title, difficulty: c.difficulty, rating: c.rating, category, reliability, skill, reason, reviewUnits, score: Math.round(score * 100) / 100 });
  }

  scored.sort((a, b) => b.score - a.score || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

  const out: Rec[] = [];
  const taken = new Set<string>();
  const perSkill = new Map<string, number>();
  let reviews = 0;
  for (const r of scored) {
    if (out.length >= limit) break;
    if ((perSkill.get(r.skill) ?? 0) >= MAX_PER_SKILL) continue;
    if (r.category === "review" && reviews >= MAX_REVIEW) continue;
    perSkill.set(r.skill, (perSkill.get(r.skill) ?? 0) + 1);
    if (r.category === "review") reviews++;
    taken.add(r.slug);
    out.push(r);
  }
  // Backfill: never leave slots empty just because of a diversity preference.
  for (const r of scored) {
    if (out.length >= limit) break;
    if (!taken.has(r.slug)) {
      taken.add(r.slug);
      out.push(r);
    }
  }
  return out.sort((a, b) => b.score - a.score || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
}
