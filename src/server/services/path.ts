import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db/client";
import { isLessonUnlockedIn, isUnitMastered, lockedReason, resolveGates, type GraphUnit } from "./curriculum-graph";
import { SKIP_MIN_POOL, skippedUnitIds } from "./skip";

export type LessonState = "locked" | "available" | "in_progress" | "completed" | "perfected";

export type PathLesson = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  xpReward: number;
  state: LessonState;
  kind: "lesson" | "assessment" | "checkpoint";
};
export type PathPrereq = { slug: string; title: string; done: boolean };
export type PathPractice = { slug: string; title: string; difficulty: string; solved: boolean };
export type PathUnit = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  lessons: PathLesson[];
  completed: number;
  total: number;
  xp: number;
  state: "locked" | "unlocked" | "completed";
  /** Passed the skip test: its lessons count as done but earned no XP. */
  skipped: boolean;
  /** A skip test can be taken for this unit right now. */
  canSkip: boolean;
  objectives: string[];
  prerequisites: PathPrereq[];
  /** Why the unit cannot be started yet (null when open). */
  lockedReason: string | null;
  /** The unit's required assessment (or optional checkpoint), if it has one. */
  assessment: { lessonId: string; state: LessonState; required: boolean } | null;
  practice: PathPractice[];
  /** All required lessons and the assessment are done: dependent units open. */
  mastered: boolean;
};
export type PathWorld = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  playable: boolean;
  units: PathUnit[];
  completed: number;
  total: number;
};

type Curriculum = Array<{
  world: typeof schema.worlds.$inferSelect;
  units: Array<{ unit: typeof schema.units.$inferSelect; lessons: Array<typeof schema.lessons.$inferSelect> }>;
}>;

/** Whole curriculum structure (worlds -> units -> lessons) in display order. Small; fetched in 3 queries. */
export async function loadCurriculum(): Promise<Curriculum> {
  const db = getDb();
  const worlds = await db.select().from(schema.worlds).where(isNull(schema.worlds.deletedAt)).orderBy(asc(schema.worlds.position));
  const units = await db
    .select()
    .from(schema.units)
    .where(and(isNull(schema.units.deletedAt), eq(schema.units.published, true)))
    .orderBy(asc(schema.units.position));
  const lessons = await db
    .select()
    .from(schema.lessons)
    .where(and(isNull(schema.lessons.deletedAt), eq(schema.lessons.published, true)))
    .orderBy(asc(schema.lessons.position));
  return worlds.map((world) => ({
    world,
    units: units
      .filter((u) => u.worldId === world.id)
      .map((unit) => ({ unit, lessons: lessons.filter((l) => l.unitId === unit.id) })),
  }));
}

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const normKind = (k: string): "lesson" | "assessment" | "checkpoint" => (k === "assessment" || k === "checkpoint" ? k : "lesson");

/** Units of published worlds in curriculum order, shaped for the pure graph logic. */
export function graphUnits(c: Curriculum): GraphUnit[] {
  return c
    .filter((w) => w.world.published)
    .flatMap((w) => w.units.map(({ unit, lessons }) => ({ id: unit.id, slug: unit.slug, title: unit.title, prerequisites: asStrings(unit.prerequisites), lessons: lessons.map((l) => ({ id: l.id, kind: l.kind })) })));
}

/** Playable lesson ids in global learning order (published worlds only). */
export function lessonSequence(c: Curriculum): string[] {
  return c.filter((w) => w.world.published).flatMap((w) => w.units.flatMap((u) => u.lessons.map((l) => l.id)));
}

/** Lessons of units the learner tested out of count as completed (for unlocking and display) without being credited. */
export function withSkips(c: Curriculum, completed: Set<string>, skipped: Set<string>): Set<string> {
  const out = new Set(completed);
  for (const w of c) for (const u of w.units) if (skipped.has(u.unit.id)) for (const l of u.lessons) out.add(l.id);
  return out;
}

export async function loadUserProgress(userId: string) {
  const db = getDb();
  const progress = await db.select().from(schema.userLessonProgress).where(eq(schema.userLessonProgress.userId, userId));
  const active = await db
    .select({ lessonId: schema.lessonRuns.lessonId })
    .from(schema.lessonRuns)
    .where(and(eq(schema.lessonRuns.userId, userId), eq(schema.lessonRuns.status, "in_progress")));
  return {
    completed: new Set(progress.filter((p) => p.completions > 0).map((p) => p.lessonId)),
    perfected: new Set(progress.filter((p) => p.perfected).map((p) => p.lessonId)),
    inProgress: new Set(active.map((a) => a.lessonId)),
  };
}

export async function getLearningPath(userId: string): Promise<PathWorld[]> {
  const [curriculum, prog0, skipped] = await Promise.all([loadCurriculum(), loadUserProgress(userId), skippedUnitIds(userId)]);
  const prog = { ...prog0, completed: withSkips(curriculum, prog0.completed, skipped) };
  const poolRows = await getDb().execute(sql`select l.unit_id, count(*)::int n from lesson_questions q join lessons l on l.id = q.lesson_id where q.deleted_at is null and l.deleted_at is null and l.published group by l.unit_id`);
  const pool = new Map((poolRows.rows as Array<{ unit_id: string; n: number }>).map((r) => [r.unit_id, Number(r.n)]));
  const graph = graphUnits(curriculum);
  const gates = resolveGates(graph, prog.completed);
  const unitTitle = new Map(graph.map((g) => [g.slug, g.title]));
  const masteredSlug = new Set(graph.filter((g) => isUnitMastered(g, prog.completed)).map((g) => g.slug));
  const allPractice = [...new Set(curriculum.flatMap((c) => c.units.flatMap((u) => asStrings(u.unit.practice))))];
  const practiceRows = allPractice.length
    ? await getDb().select({ slug: schema.problems.slug, title: schema.problems.title, difficulty: schema.problems.difficulty }).from(schema.problems).where(and(inArray(schema.problems.slug, allPractice), eq(schema.problems.published, true), isNull(schema.problems.deletedAt)))
    : [];
  const solvedRows = practiceRows.length
    ? await getDb().select({ slug: schema.problems.slug }).from(schema.userProblemProgress).innerJoin(schema.problems, eq(schema.problems.id, schema.userProblemProgress.problemId)).where(and(eq(schema.userProblemProgress.userId, userId), eq(schema.userProblemProgress.solved, true), inArray(schema.problems.slug, allPractice)))
    : [];
  const solved = new Set(solvedRows.map((r) => r.slug));
  const practiceBySlug = new Map(practiceRows.map((r) => [r.slug, r]));

  const stateOf = (lessonId: string): LessonState => {
    if (prog.perfected.has(lessonId)) return "perfected";
    if (prog.completed.has(lessonId)) return "completed";
    if (!isLessonUnlockedIn(graph, prog.completed, lessonId)) return "locked";
    return prog.inProgress.has(lessonId) ? "in_progress" : "available";
  };

  return curriculum.map(({ world, units }) => {
    const pathUnits: PathUnit[] = units.map(({ unit, lessons }) => {
      const ls: PathLesson[] = lessons.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        summary: l.summary,
        xpReward: l.xpReward,
        state: world.published ? stateOf(l.id) : "locked",
        kind: normKind(l.kind),
      }));
      const reqLessons = ls.filter((l) => l.kind !== "checkpoint");
      const completed = reqLessons.filter((l) => l.state === "completed" || l.state === "perfected").length;
      const gate = gates.get(unit.id);
      const g = graph.find((x) => x.id === unit.id)!;
      const asmt = ls.find((l) => l.kind !== "lesson");
      const prereqSlugs = gate ? gate.prerequisiteIds.map((id) => graph.find((x) => x.id === id)!.slug) : [];
      return {
        id: unit.id,
        slug: unit.slug,
        title: unit.title,
        description: unit.description,
        icon: unit.icon,
        lessons: ls,
        completed,
        total: reqLessons.length,
        xp: ls.reduce((s, l) => s + l.xpReward, 0),
        state: completed === reqLessons.length && reqLessons.length > 0 ? "completed" : ls.some((l) => l.state !== "locked") ? "unlocked" : "locked",
        skipped: skipped.has(unit.id),
        canSkip: world.published && !skipped.has(unit.id) && completed < reqLessons.length && (pool.get(unit.id) ?? 0) >= SKIP_MIN_POOL,
        objectives: asStrings(unit.objectives),
        prerequisites: prereqSlugs.map((slug) => ({ slug, title: unitTitle.get(slug) ?? slug, done: masteredSlug.has(slug) })),
        lockedReason: world.published && gate ? lockedReason(graph, gate) : null,
        assessment: asmt ? { lessonId: asmt.id, state: asmt.state, required: asmt.kind === "assessment" } : null,
        practice: asStrings(unit.practice).flatMap((s) => {
          const r = practiceBySlug.get(s);
          return r ? [{ slug: r.slug, title: r.title, difficulty: r.difficulty, solved: solved.has(r.slug) }] : [];
        }),
        mastered: isUnitMastered(g, prog.completed),
      };
    });
    return {
      id: world.id,
      slug: world.slug,
      title: world.title,
      description: world.description,
      icon: world.icon,
      color: world.color,
      playable: world.published && pathUnits.length > 0,
      units: pathUnits,
      completed: pathUnits.reduce((s, u) => s + u.completed, 0),
      total: pathUnits.reduce((s, u) => s + u.total, 0),
    };
  });
}

/** The lesson the learner should do next (in progress first, else first available). */
export function nextLesson(path: PathWorld[]): PathLesson | null {
  const all = path.flatMap((w) => w.units.flatMap((u) => u.lessons));
  return all.find((l) => l.state === "in_progress") ?? all.find((l) => l.state === "available" && l.kind !== "checkpoint") ?? all.find((l) => l.state === "available") ?? null;
}

export async function isLessonUnlocked(userId: string, lessonId: string): Promise<boolean> {
  const [curriculum, prog, skipped] = await Promise.all([loadCurriculum(), loadUserProgress(userId), skippedUnitIds(userId)]);
  const done = withSkips(curriculum, prog.completed, skipped);
  return isLessonUnlockedIn(graphUnits(curriculum), done, lessonId);
}

export async function lessonsByIds(ids: string[]) {
  if (!ids.length) return [];
  return getDb().select().from(schema.lessons).where(inArray(schema.lessons.id, ids));
}
