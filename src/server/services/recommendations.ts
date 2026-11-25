/**
 * Loads what the pure ranker needs (problems with metadata, solved status, unit mastery, placement goals) and runs it.
 * READ-ONLY: this file never inserts, updates or deletes anything, so viewing recommendations cannot change
 * progress, mastery, XP, hearts or unlocks.
 */
import { sql } from "drizzle-orm";
import { WORLDS } from "@/content";
import { parseProblemMeta } from "@/content/problems/meta";
import { focusOfProblem, rankProblems, type Candidate, type Learner, type Rec } from "@/features/learning/problem-recs";
import { getDb } from "@/server/db/client";
import { getLearningPath } from "./path";
import { SKILLS } from "@/content/placement";
import { recommend } from "./placement-logic";
import { latestPlacementSkills } from "./placement";

const UNFINISHED_CONTEST = sql`exists (select 1 from contest_problems cp join contests c on c.id = cp.contest_id where cp.problem_id = p.id and c.published and now() < c.starts_at + c.duration_min * interval '1 minute')`;
const UNIT_TITLES = new Map(WORLDS.flatMap((w) => w.units).map((u) => [u.slug, u.title] as const));

export async function loadCandidates(userId: string): Promise<Candidate[]> {
  const r = await getDb().execute(sql`
    select p.slug, p.title, p.difficulty, p.rating, p.tags, p.meta, coalesce(up.solved, false) as solved, coalesce(up.attempts, 0) > 0 as attempted
    from problems p
    left join user_problem_progress up on up.problem_id = p.id and up.user_id = ${userId}
    where p.published and p.deleted_at is null and not ${UNFINISHED_CONTEST}
    order by p.slug`);
  return (r.rows as Array<{ slug: string; title: string; difficulty: string; rating: number; tags: string[]; meta: unknown; solved: boolean; attempted: boolean }>).map((x) => ({
    slug: x.slug,
    title: x.title,
    difficulty: x.difficulty,
    rating: Number(x.rating),
    tags: x.tags,
    meta: parseProblemMeta(x.meta, x.tags),
    solved: x.solved,
    attempted: x.attempted,
  }));
}

/** Unit mastery, open units and learning goals, derived from the existing curriculum graph and the latest placement result. */
export async function loadLearner(userId: string, solvedRatings: number[]): Promise<Learner> {
  const path = await getLearningPath(userId);
  const playable = path.filter((w) => w.playable).flatMap((w) => w.units);
  const known = new Set(playable.map((u) => u.slug));
  // A unit that does not exist for this learner (unpublished) cannot be asked of them.
  const mastered = new Set<string>([...[...UNIT_TITLES.keys()].filter((s) => !known.has(s)), ...playable.filter((u) => u.mastered).map((u) => u.slug)]);
  const open = new Set(playable.filter((u) => !u.mastered && u.state === "unlocked").map((u) => u.slug));
  const unitPractice = new Set(playable.filter((u) => open.has(u.slug)).flatMap((u) => u.practice.map((p) => p.slug)));

  const goals = new Set<string>();
  const skills = await latestPlacementSkills(userId).catch(() => null);
  const steps = skills ? recommend(skills, SKILLS, playable.map((u) => ({ id: u.id, slug: u.slug, title: u.title, prerequisites: u.prerequisites.map((p) => p.slug), mastered: u.mastered }))).steps : [];
  for (const s of steps) if (s.action !== "skip-test" && !mastered.has(s.unit)) goals.add(s.unit);
  if (goals.size === 0) {
    const next = playable.find((u) => !u.mastered && u.state === "unlocked");
    if (next) goals.add(next.slug);
  }
  return { masteredUnits: mastered, openUnits: open, goalUnits: goals, solvedRatings, unitPractice };
}

/** Skill-aware suggestions for the problem being viewed. An empty list means "not enough information": callers fall back to the tag-based related list. */
export async function getProblemRecommendations(userId: string, slug: string, limit = 3): Promise<Rec[]> {
  const candidates = await loadCandidates(userId);
  const anchor = candidates.find((c) => c.slug === slug);
  if (!anchor) return [];
  const learner = await loadLearner(userId, candidates.filter((c) => c.solved).map((c) => c.rating));
  return rankProblems(candidates, learner, focusOfProblem(anchor.tags, anchor.meta), slug, { limit, unitTitles: UNIT_TITLES });
}
