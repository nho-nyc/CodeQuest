import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { buildQuestion, QuestionFormError, type QuestionFormInput } from "@/features/admin/question-form";
import { buildProblemMeta, type ProblemMetaInput } from "@/features/admin/problem-meta-form";
import { validateHints } from "@/content/problems/hints";
import { canonicalTags } from "@/content/problems/tags";
import { getDb, schema } from "@/server/db/client";
import type { LessonContent } from "@/server/db/schema";
import { ServiceError } from "./lesson-run";
import { clearSettingsCache, saveXpRules, xpRulesSchema } from "./settings";
import type { Tx } from "./xp";

type Actor = { id: string; role: string };
const CONTENT_ROLES = ["admin", "content_editor"];
const need = (a: Actor, roles: string[]) => {
  if (!roles.includes(a.role)) throw new ServiceError("You do not have permission to do this", 403);
};
const staff = (a: Actor) => need(a, CONTENT_ROLES);
const adminOnly = (a: Actor) => need(a, ["admin"]);

export async function audit(tx: Pick<Tx, "insert">, actor: Actor, action: string, targetType: string, targetId: string | null, meta: Record<string, unknown> = {}) {
  await tx.insert(schema.auditLog).values({ actorId: actor.id, action, targetType, targetId, meta });
}

export const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const slugOk = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length >= 2 && s.length <= 60;
const text = (v: string | undefined, name: string, min: number, max: number) => {
  const t = (v ?? "").trim();
  if (t.length < min || t.length > max) throw new ServiceError(`${name} must be ${min} to ${max} characters`, 400);
  return t;
};
const int = (v: string | number | undefined, name: string, min: number, max: number) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new ServiceError(`${name} must be a whole number from ${min} to ${max}`, 400);
  return n;
};
const isUniqueViolation = (e: unknown) => {
  const c = (e as { cause?: { code?: string } })?.cause?.code ?? (e as { code?: string })?.code;
  return c === "23505";
};
async function guard<T>(fn: () => Promise<T>, dupMessage = "That slug is already used"): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isUniqueViolation(e)) throw new ServiceError(dupMessage, 409);
    if (e instanceof QuestionFormError) throw new ServiceError(e.message, 400);
    throw e;
  }
}

// ───────────────────────── users ─────────────────────────

export async function listUsers(actor: Actor, q: string, page: number) {
  adminOnly(actor);
  const U = schema.users;
  const term = q.trim().slice(0, 60).replace(/[%_\\]/g, "\\$&");
  const where = term ? or(ilike(U.email, `%${term}%`), ilike(U.username, `%${term}%`), ilike(U.displayName, `%${term}%`)) : undefined;
  const rows = await getDb()
    .select({ id: U.id, email: U.email, username: U.username, displayName: U.displayName, role: U.role, createdAt: U.createdAt, deletedAt: U.deletedAt, xp: schema.userStats.totalXp })
    .from(U)
    .leftJoin(schema.userStats, eq(schema.userStats.userId, U.id))
    .where(where)
    .orderBy(desc(U.createdAt))
    .limit(26)
    .offset(Math.max(0, page) * 25);
  return { rows: rows.slice(0, 25), hasMore: rows.length > 25 };
}

export async function setUserRole(actor: Actor, userId: string, role: string) {
  adminOnly(actor);
  if (!["user", "content_editor", "admin"].includes(role)) throw new ServiceError("Unknown role", 400);
  if (userId === actor.id) throw new ServiceError("You cannot change your own role", 409);
  await getDb().transaction(async (tx) => {
    const [u] = await tx.select().from(schema.users).where(eq(schema.users.id, userId)).for("update");
    if (!u) throw new ServiceError("User not found", 404);
    await tx.update(schema.users).set({ role: role as "user" }).where(eq(schema.users.id, userId));
    await audit(tx, actor, "user.role", "user", userId, { from: u.role, to: role });
  });
}

/** Deactivating blocks login (users.deleted_at) and ends every session. Data is kept. */
export async function setUserActive(actor: Actor, userId: string, active: boolean) {
  adminOnly(actor);
  if (userId === actor.id) throw new ServiceError("You cannot deactivate yourself", 409);
  await getDb().transaction(async (tx) => {
    const [u] = await tx.select().from(schema.users).where(eq(schema.users.id, userId)).for("update");
    if (!u) throw new ServiceError("User not found", 404);
    await tx.update(schema.users).set({ deletedAt: active ? null : new Date() }).where(eq(schema.users.id, userId));
    if (!active) await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    await audit(tx, actor, active ? "user.activate" : "user.deactivate", "user", userId);
  });
}

// ───────────────────────── curriculum ─────────────────────────

export async function listCurriculum(actor: Actor) {
  staff(actor);
  const db = getDb();
  const [w, u, l] = await Promise.all([
    db.select().from(schema.worlds).where(isNull(schema.worlds.deletedAt)).orderBy(asc(schema.worlds.position)),
    db.select().from(schema.units).where(isNull(schema.units.deletedAt)).orderBy(asc(schema.units.position)),
    db
      .select({ id: schema.lessons.id, unitId: schema.lessons.unitId, slug: schema.lessons.slug, title: schema.lessons.title, position: schema.lessons.position, published: schema.lessons.published, questions: sql<number>`(select count(*)::int from lesson_questions q where q.lesson_id = lessons.id and q.deleted_at is null)` })
      .from(schema.lessons)
      .where(isNull(schema.lessons.deletedAt))
      .orderBy(asc(schema.lessons.position)),
  ]);
  return w.map((world) => ({ ...world, units: u.filter((x) => x.worldId === world.id).map((unit) => ({ ...unit, lessons: l.filter((x) => x.unitId === unit.id) })) }));
}

type WorldForm = { title: string; description: string; icon?: string; color?: string; slug?: string; published?: boolean };
const color = (c?: string) => {
  if (c && !/^#[0-9a-fA-F]{6}$/.test(c)) throw new ServiceError("Color must look like #58CC02", 400);
  return c || "#58CC02";
};

export async function saveWorld(actor: Actor, id: string | null, f: WorldForm): Promise<string> {
  staff(actor);
  const title = text(f.title, "Title", 2, 60);
  const description = text(f.description, "Description", 0, 400);
  const icon = (f.icon ?? "Rocket").trim().slice(0, 30) || "Rocket";
  return guard(() =>
    getDb().transaction(async (tx) => {
      if (id) {
        const r = await tx.update(schema.worlds).set({ title, description, icon, color: color(f.color), published: !!f.published, locked: true }).where(eq(schema.worlds.id, id)).returning({ id: schema.worlds.id });
        if (!r[0]) throw new ServiceError("World not found", 404);
        await audit(tx, actor, "world.update", "world", id, { title });
        return id;
      }
      const slug = f.slug?.trim() || slugify(title);
      if (!slugOk(slug)) throw new ServiceError("Slug may only contain lowercase letters, digits and dashes", 400);
      const [{ n }] = (await tx.select({ n: sql<number>`coalesce(max(position),0)::int` }).from(schema.worlds)) as [{ n: number }];
      const [w] = await tx.insert(schema.worlds).values({ slug, title, description, icon, color: color(f.color), position: n + 1, published: !!f.published, locked: true }).returning({ id: schema.worlds.id });
      await audit(tx, actor, "world.create", "world", w!.id, { slug });
      return w!.id;
    }),
  );
}

export async function saveUnit(actor: Actor, id: string | null, worldId: string, f: { title: string; description: string; icon?: string; slug?: string; published?: boolean }): Promise<string> {
  staff(actor);
  const title = text(f.title, "Title", 2, 60);
  const description = text(f.description, "Description", 0, 400);
  const icon = (f.icon ?? "BookOpen").trim().slice(0, 30) || "BookOpen";
  return guard(() =>
    getDb().transaction(async (tx) => {
      if (id) {
        const r = await tx.update(schema.units).set({ title, description, icon, published: !!f.published, locked: true }).where(eq(schema.units.id, id)).returning({ id: schema.units.id });
        if (!r[0]) throw new ServiceError("Unit not found", 404);
        await audit(tx, actor, "unit.update", "unit", id, { title });
        return id;
      }
      const [w] = await tx.select({ id: schema.worlds.id }).from(schema.worlds).where(eq(schema.worlds.id, worldId));
      if (!w) throw new ServiceError("World not found", 404);
      const slug = f.slug?.trim() || slugify(title);
      if (!slugOk(slug)) throw new ServiceError("Slug may only contain lowercase letters, digits and dashes", 400);
      const [{ n }] = (await tx.select({ n: sql<number>`coalesce(max(position),0)::int` }).from(schema.units).where(eq(schema.units.worldId, worldId))) as [{ n: number }];
      const [u] = await tx.insert(schema.units).values({ worldId, slug, title, description, icon, position: n + 1, published: !!f.published, locked: true }).returning({ id: schema.units.id });
      await audit(tx, actor, "unit.create", "unit", u!.id, { slug });
      return u!.id;
    }),
  );
}

export type LessonForm = { title: string; summary: string; concept: string; explanation: string; syntax?: string; exampleCode?: string; exampleOutput?: string; exampleNote?: string; mistakes?: string; xpReward?: string; slug?: string; published?: boolean };
const paragraphs = (s?: string) => (s ?? "").split(/\r?\n\s*\r?\n/).map((x) => x.trim()).filter(Boolean);

export async function saveLesson(actor: Actor, id: string | null, unitId: string, f: LessonForm): Promise<string> {
  staff(actor);
  const title = text(f.title, "Title", 2, 80);
  const summary = text(f.summary, "Summary", 0, 300);
  const explanation = paragraphs(f.explanation);
  const concept = text(f.concept, "Concept", 2, 200);
  if (!explanation.length) throw new ServiceError("Write at least one explanation paragraph", 400);
  const content: LessonContent = { concept, explanation };
  if (f.syntax?.trim()) content.syntax = f.syntax.replace(/\s+$/, "");
  if (f.exampleCode?.trim()) content.example = { code: f.exampleCode.replace(/\s+$/, ""), output: f.exampleOutput ?? "", ...(f.exampleNote?.trim() ? { note: f.exampleNote.trim() } : {}) };
  const mistakes = (f.mistakes ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (mistakes.length) content.commonMistakes = mistakes;
  const xpReward = int(f.xpReward ?? 20, "XP reward", 0, 500);
  return guard(() =>
    getDb().transaction(async (tx) => {
      if (id) {
        const r = await tx.update(schema.lessons).set({ title, summary, content, xpReward, published: !!f.published, locked: true }).where(eq(schema.lessons.id, id)).returning({ id: schema.lessons.id });
        if (!r[0]) throw new ServiceError("Lesson not found", 404);
        await audit(tx, actor, "lesson.update", "lesson", id, { title });
        return id;
      }
      const [u] = await tx.select({ id: schema.units.id }).from(schema.units).where(eq(schema.units.id, unitId));
      if (!u) throw new ServiceError("Unit not found", 404);
      const slug = f.slug?.trim() || slugify(title);
      if (!slugOk(slug)) throw new ServiceError("Slug may only contain lowercase letters, digits and dashes", 400);
      const [{ n }] = (await tx.select({ n: sql<number>`coalesce(max(position),0)::int` }).from(schema.lessons).where(eq(schema.lessons.unitId, unitId))) as [{ n: number }];
      const [l] = await tx.insert(schema.lessons).values({ unitId, slug, title, summary, content, xpReward, position: n + 1, published: !!f.published, locked: true }).returning({ id: schema.lessons.id });
      await audit(tx, actor, "lesson.create", "lesson", l!.id, { slug });
      return l!.id;
    }),
  );
}

type Kind = "world" | "unit" | "lesson";
const T = { world: schema.worlds, unit: schema.units, lesson: schema.lessons } as const;

/** Soft delete. Learner progress that references the row is kept. */
export async function deleteNode(actor: Actor, kind: Kind, id: string) {
  staff(actor);
  const t = T[kind];
  await getDb().transaction(async (tx) => {
    const r = await tx.update(t).set({ deletedAt: new Date(), published: false, locked: true }).where(and(eq(t.id, id), isNull(t.deletedAt))).returning({ id: t.id });
    if (!r[0]) throw new ServiceError("Not found", 404);
    await audit(tx, actor, `${kind}.delete`, kind, id);
  });
}

export async function setPublished(actor: Actor, kind: Kind, id: string, published: boolean) {
  staff(actor);
  const t = T[kind];
  await getDb().transaction(async (tx) => {
    const r = await tx.update(t).set({ published, locked: true }).where(and(eq(t.id, id), isNull(t.deletedAt))).returning({ id: t.id });
    if (!r[0]) throw new ServiceError("Not found", 404);
    await audit(tx, actor, `${kind}.${published ? "publish" : "unpublish"}`, kind, id);
  });
}

/** Swap with the neighbour above or below. Positions of worlds/units/lessons are not unique-indexed, so a plain swap is safe. */
export async function moveNode(actor: Actor, kind: Kind, id: string, dir: "up" | "down") {
  staff(actor);
  const t = T[kind];
  await getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(t).where(eq(t.id, id)).for("update");
    if (!row) throw new ServiceError("Not found", 404);
    const parent = kind === "unit" ? eq(schema.units.worldId, (row as { worldId: string }).worldId) : kind === "lesson" ? eq(schema.lessons.unitId, (row as { unitId: string }).unitId) : undefined;
    const siblings = await tx.select({ id: t.id, position: t.position }).from(t).where(and(isNull(t.deletedAt), parent)).orderBy(asc(t.position), asc(t.id));
    const i = siblings.findIndex((s) => s.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= siblings.length) return;
    // Renumber the whole sibling list so duplicates (from imports) cannot make a swap a no-op.
    const order = siblings.map((s) => s.id);
    [order[i], order[j]] = [order[j]!, order[i]!];
    for (const [k, sid] of order.entries()) await tx.update(t).set({ position: k + 1, locked: true }).where(eq(t.id, sid));
    await audit(tx, actor, `${kind}.move`, kind, id, { dir });
  });
}

// ───────────────────────── questions ─────────────────────────

export async function listQuestions(actor: Actor, lessonId: string) {
  staff(actor);
  return getDb().select().from(schema.lessonQuestions).where(and(eq(schema.lessonQuestions.lessonId, lessonId), isNull(schema.lessonQuestions.deletedAt))).orderBy(asc(schema.lessonQuestions.position));
}

export async function saveQuestion(actor: Actor, id: string | null, lessonId: string, form: QuestionFormInput): Promise<string> {
  staff(actor);
  return guard(async () => {
    const q = buildQuestion(form);
    return getDb().transaction(async (tx) => {
      const [lesson] = await tx.select({ id: schema.lessons.id }).from(schema.lessons).where(eq(schema.lessons.id, lessonId)).for("update");
      if (!lesson) throw new ServiceError("Lesson not found", 404);
      await tx.update(schema.lessons).set({ locked: true }).where(eq(schema.lessons.id, lessonId));
      if (id) {
        const r = await tx.update(schema.lessonQuestions).set({ ...q }).where(and(eq(schema.lessonQuestions.id, id), eq(schema.lessonQuestions.lessonId, lessonId), isNull(schema.lessonQuestions.deletedAt))).returning({ id: schema.lessonQuestions.id });
        if (!r[0]) throw new ServiceError("Question not found", 404);
        await audit(tx, actor, "question.update", "question", id, { lessonId });
        return id;
      }
      // Soft-deleted questions keep their position, so count against every row to stay clear of the unique index.
      const [{ n }] = (await tx.select({ n: sql<number>`coalesce(max(position),0)::int` }).from(schema.lessonQuestions).where(eq(schema.lessonQuestions.lessonId, lessonId))) as [{ n: number }];
      const [row] = await tx.insert(schema.lessonQuestions).values({ lessonId, position: n + 1, ...q }).returning({ id: schema.lessonQuestions.id });
      await audit(tx, actor, "question.create", "question", row!.id, { lessonId });
      return row!.id;
    });
  });
}

export async function deleteQuestion(actor: Actor, id: string) {
  staff(actor);
  await getDb().transaction(async (tx) => {
    const [q] = await tx.select().from(schema.lessonQuestions).where(and(eq(schema.lessonQuestions.id, id), isNull(schema.lessonQuestions.deletedAt)));
    if (!q) throw new ServiceError("Question not found", 404);
    await tx.update(schema.lessonQuestions).set({ deletedAt: new Date() }).where(eq(schema.lessonQuestions.id, id));
    await tx.update(schema.lessons).set({ locked: true }).where(eq(schema.lessons.id, q.lessonId));
    await audit(tx, actor, "question.delete", "question", id);
  });
}

// ───────────────────────── problems ─────────────────────────

export async function listProblemsAdmin(actor: Actor) {
  staff(actor);
  return getDb()
    .select({ id: schema.problems.id, slug: schema.problems.slug, title: schema.problems.title, difficulty: schema.problems.difficulty, rating: schema.problems.rating, published: schema.problems.published, tests: sql<number>`(select count(*)::int from problem_test_cases t where t.problem_id = problems.id)` })
    .from(schema.problems)
    .where(isNull(schema.problems.deletedAt))
    .orderBy(asc(schema.problems.rating), asc(schema.problems.title));
}

export type ProblemForm = {
  title: string; statement: string; inputFormat: string; outputFormat: string; constraints: string; difficulty: string; rating: string; tags: string;
  timeLimitMs: string; memoryLimitMb: string; sampleInput: string; sampleOutput: string; hint1: string; hint2: string; hint3: string; editorial: string; referenceSolution: string; estimatedMinutes: string; slug?: string; published?: boolean;
} & ProblemMetaInput;
const DIFFS = ["newbie", "easy", "medium", "hard", "expert"];

export async function saveProblem(actor: Actor, id: string | null, f: ProblemForm): Promise<string> {
  staff(actor);
  if (!DIFFS.includes(f.difficulty)) throw new ServiceError("Unknown difficulty", 400);
  const hints = [f.hint1, f.hint2, f.hint3].map((h) => h.trim());
  if (hints.some((h) => !h)) throw new ServiceError("Give all 3 hints", 400);
  const hintErrors = validateHints(hints);
  if (hintErrors.length) throw new ServiceError(hintErrors.join("; "), 400);
  const tags = canonicalTags(f.tags.split(",").map((t) => t.trim()).filter(Boolean)).slice(0, 8);
  const { meta, errors: metaErrors } = buildProblemMeta(f, tags);
  if (metaErrors.length) throw new ServiceError(`Metadata: ${metaErrors.join("; ")}`, 400);
  if (!f.sampleInput.trim() || !f.sampleOutput.trim()) throw new ServiceError("Give a sample input and output", 400);
  const values = {
    title: text(f.title, "Title", 3, 100),
    statement: text(f.statement, "Statement", 10, 8000),
    inputFormat: text(f.inputFormat, "Input format", 3, 2000),
    outputFormat: text(f.outputFormat, "Output format", 3, 2000),
    constraints: text(f.constraints, "Constraints", 1, 2000),
    difficulty: f.difficulty as "easy",
    rating: int(f.rating, "Rating", 400, 3500),
    tags,
    timeLimitMs: int(f.timeLimitMs, "Time limit", 100, 10000),
    memoryLimitMb: int(f.memoryLimitMb, "Memory limit", 16, 1024),
    samples: [{ input: f.sampleInput.replace(/\s+$/, "") + "\n", output: f.sampleOutput.replace(/\s+$/, "") + "\n" }],
    hints,
    editorial: text(f.editorial, "Editorial", 10, 8000),
    referenceSolution: text(f.referenceSolution, "Reference solution", 10, 20000),
    estimatedMinutes: int(f.estimatedMinutes, "Estimated minutes", 1, 240),
    meta,
    published: !!f.published,
    locked: true,
  };
  return guard(() =>
    getDb().transaction(async (tx) => {
      if (id) {
        const r = await tx.update(schema.problems).set(values).where(eq(schema.problems.id, id)).returning({ id: schema.problems.id });
        if (!r[0]) throw new ServiceError("Problem not found", 404);
        await audit(tx, actor, "problem.update", "problem", id, { title: values.title });
        return id;
      }
      const slug = f.slug?.trim() || slugify(values.title);
      if (!slugOk(slug)) throw new ServiceError("Slug may only contain lowercase letters, digits and dashes", 400);
      const [p] = await tx.insert(schema.problems).values({ slug, ...values }).returning({ id: schema.problems.id });
      await audit(tx, actor, "problem.create", "problem", p!.id, { slug });
      return p!.id;
    }),
  );
}

const MAX_TEST_BYTES = 2_000_000;

/**
 * Adds hidden test cases. Each case is an input and the expected output. Existing cases are kept unless `replace`.
 * A problem must keep at least one non-sample case to be published (checked at publish time in setProblemPublished).
 */
export async function addTestCases(actor: Actor, problemId: string, cases: Array<{ input: string; expected: string }>, opts: { replace?: boolean; isSample?: boolean } = {}) {
  staff(actor);
  if (!cases.length) throw new ServiceError("No test cases to add", 400);
  if (cases.length > 100) throw new ServiceError("Add at most 100 test cases at a time", 400);
  let bytes = 0;
  for (const c of cases) {
    bytes += c.input.length + c.expected.length;
    if (!c.expected.trim()) throw new ServiceError("Every test case needs an expected output", 400);
  }
  if (bytes > MAX_TEST_BYTES) throw new ServiceError("Test data is too large (2 MB limit per upload)", 413);
  await getDb().transaction(async (tx) => {
    const [p] = await tx.select({ id: schema.problems.id }).from(schema.problems).where(eq(schema.problems.id, problemId)).for("update");
    if (!p) throw new ServiceError("Problem not found", 404);
    if (opts.replace) await tx.delete(schema.problemTestCases).where(and(eq(schema.problemTestCases.problemId, problemId), eq(schema.problemTestCases.isSample, !!opts.isSample)));
    const [{ n }] = (await tx.select({ n: sql<number>`coalesce(max(position),0)::int` }).from(schema.problemTestCases).where(eq(schema.problemTestCases.problemId, problemId))) as [{ n: number }];
    await tx.insert(schema.problemTestCases).values(cases.map((c, i) => ({ problemId, position: n + i + 1, input: c.input, expectedOutput: c.expected, isSample: !!opts.isSample })));
    await tx.update(schema.problems).set({ locked: true }).where(eq(schema.problems.id, problemId));
    await audit(tx, actor, "problem.tests", "problem", problemId, { added: cases.length, replace: !!opts.replace });
  });
}

export async function deleteTestCase(actor: Actor, testId: string) {
  staff(actor);
  await getDb().transaction(async (tx) => {
    const r = await tx.delete(schema.problemTestCases).where(eq(schema.problemTestCases.id, testId)).returning({ problemId: schema.problemTestCases.problemId });
    if (!r[0]) throw new ServiceError("Test case not found", 404);
    await tx.update(schema.problems).set({ locked: true }).where(eq(schema.problems.id, r[0].problemId));
    await audit(tx, actor, "problem.test.delete", "problem", r[0].problemId, { testId });
  });
}

export async function listTestCases(actor: Actor, problemId: string) {
  staff(actor);
  const rows = await getDb().select().from(schema.problemTestCases).where(eq(schema.problemTestCases.problemId, problemId)).orderBy(asc(schema.problemTestCases.position));
  // Admins see a short preview only; full data never needs to travel to the browser.
  return rows.map((r) => ({ id: r.id, position: r.position, isSample: r.isSample, inputPreview: r.input.slice(0, 80), inputBytes: r.input.length, outputBytes: r.expectedOutput.length }));
}

export async function setProblemPublished(actor: Actor, id: string, published: boolean) {
  staff(actor);
  await getDb().transaction(async (tx) => {
    if (published) {
      const [{ n }] = (await tx.select({ n: count() }).from(schema.problemTestCases).where(and(eq(schema.problemTestCases.problemId, id), eq(schema.problemTestCases.isSample, false)))) as [{ n: number }];
      if (n < 1) throw new ServiceError("Add at least one hidden test case before publishing", 409);
    }
    const r = await tx.update(schema.problems).set({ published, locked: true }).where(eq(schema.problems.id, id)).returning({ id: schema.problems.id });
    if (!r[0]) throw new ServiceError("Problem not found", 404);
    await audit(tx, actor, published ? "problem.publish" : "problem.unpublish", "problem", id);
  });
}

// ───────────────────────── contests ─────────────────────────

export async function listContestsAdmin(actor: Actor) {
  staff(actor);
  return getDb()
    .select({ id: schema.contests.id, slug: schema.contests.slug, title: schema.contests.title, startsAt: schema.contests.startsAt, durationMin: schema.contests.durationMin, published: schema.contests.published, ratedAt: schema.contests.ratedAt, participants: sql<number>`(select count(*)::int from contest_participants p where p.contest_id = contests.id)`, problems: sql<number>`(select count(*)::int from contest_problems p where p.contest_id = contests.id)` })
    .from(schema.contests)
    .orderBy(desc(schema.contests.startsAt));
}

export type ContestForm = { title: string; description?: string; startsAt: string; durationMin: string; problems: string; slug?: string; published?: boolean };

/** `problems` is a comma separated list of problem slugs, labelled A, B, C... in that order. */
export async function saveContest(actor: Actor, id: string | null, f: ContestForm): Promise<string> {
  staff(actor);
  const title = text(f.title, "Title", 3, 100);
  const startsAt = new Date(f.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new ServiceError("Enter a valid start time", 400);
  const durationMin = int(f.durationMin, "Duration", 10, 600);
  const slugs = f.problems.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
  if (slugs.length < 1 || slugs.length > 26) throw new ServiceError("Add 1 to 26 problem slugs", 400);
  if (new Set(slugs).size !== slugs.length) throw new ServiceError("A problem can appear only once", 400);
  return guard(() =>
    getDb().transaction(async (tx) => {
      const found = await tx.select({ id: schema.problems.id, slug: schema.problems.slug }).from(schema.problems).where(and(isNull(schema.problems.deletedAt), eq(schema.problems.published, true)));
      const bySlug = new Map(found.map((p) => [p.slug, p.id]));
      const missing = slugs.filter((s) => !bySlug.has(s));
      if (missing.length) throw new ServiceError(`Unknown or unpublished problems: ${missing.join(", ")}`, 400);
      let contestId = id;
      if (id) {
        const [c] = await tx.select().from(schema.contests).where(eq(schema.contests.id, id)).for("update");
        if (!c) throw new ServiceError("Contest not found", 404);
        const [{ n }] = (await tx.select({ n: count() }).from(schema.contestParticipants).where(eq(schema.contestParticipants.contestId, id))) as [{ n: number }];
        if (n > 0) throw new ServiceError("This contest already has participants and can no longer be edited", 409);
        await tx.update(schema.contests).set({ title, description: (f.description ?? "").trim().slice(0, 2000), startsAt, durationMin, published: !!f.published }).where(eq(schema.contests.id, id));
        await tx.delete(schema.contestProblems).where(eq(schema.contestProblems.contestId, id));
      } else {
        const slug = f.slug?.trim() || slugify(title);
        if (!slugOk(slug)) throw new ServiceError("Slug may only contain lowercase letters, digits and dashes", 400);
        const [c] = await tx.insert(schema.contests).values({ slug, title, description: (f.description ?? "").trim().slice(0, 2000), startsAt, durationMin, published: !!f.published }).returning({ id: schema.contests.id });
        contestId = c!.id;
      }
      await tx.insert(schema.contestProblems).values(slugs.map((s, i) => ({ contestId: contestId!, problemId: bySlug.get(s)!, label: String.fromCharCode(65 + i), position: i })));
      await audit(tx, actor, id ? "contest.update" : "contest.create", "contest", contestId, { title, problems: slugs.length });
      return contestId!;
    }),
  );
}

export async function deleteContest(actor: Actor, id: string) {
  staff(actor);
  await getDb().transaction(async (tx) => {
    const [{ n }] = (await tx.select({ n: count() }).from(schema.contestParticipants).where(eq(schema.contestParticipants.contestId, id))) as [{ n: number }];
    if (n > 0) throw new ServiceError("A contest with participants cannot be deleted. Unpublish it instead.", 409);
    const r = await tx.delete(schema.contests).where(eq(schema.contests.id, id)).returning({ id: schema.contests.id });
    if (!r[0]) throw new ServiceError("Contest not found", 404);
    await audit(tx, actor, "contest.delete", "contest", id);
  });
}

// ───────────────────────── gamification & settings ─────────────────────────

export async function listGamification(actor: Actor) {
  staff(actor);
  const db = getDb();
  const [quests, achievements] = await Promise.all([db.select().from(schema.dailyQuests).orderBy(asc(schema.dailyQuests.slug)), db.select().from(schema.achievements).orderBy(asc(schema.achievements.position))]);
  return { quests, achievements };
}

/** Only the on/off switch is editable: titles, targets and rewards come from code and are re-applied by `db:seed`. */
export async function setQuestActive(actor: Actor, id: string, active: boolean) {
  adminOnly(actor);
  await getDb().transaction(async (tx) => {
    const r = await tx.update(schema.dailyQuests).set({ active }).where(eq(schema.dailyQuests.id, id)).returning({ id: schema.dailyQuests.id });
    if (!r[0]) throw new ServiceError("Quest not found", 404);
    await audit(tx, actor, "quest.active", "quest", id, { active });
  });
}
export async function setAchievementActive(actor: Actor, id: string, active: boolean) {
  adminOnly(actor);
  await getDb().transaction(async (tx) => {
    const r = await tx.update(schema.achievements).set({ active }).where(eq(schema.achievements.id, id)).returning({ id: schema.achievements.id });
    if (!r[0]) throw new ServiceError("Achievement not found", 404);
    await audit(tx, actor, "achievement.active", "achievement", id, { active });
  });
}

export async function updateXpRules(actor: Actor, input: unknown) {
  adminOnly(actor);
  const parsed = xpRulesSchema.safeParse(input);
  if (!parsed.success) throw new ServiceError("XP values must be whole numbers within range", 400);
  await saveXpRules(parsed.data);
  clearSettingsCache();
  await audit(getDb(), actor, "settings.xp_rules", "settings", "xp_rules", parsed.data as Record<string, unknown>);
}

// ───────────────────────── analytics & audit ─────────────────────────

export async function getOverview(actor: Actor, now = new Date()) {
  staff(actor);
  const db = getDb();
  const d1 = new Date(now.getTime() - 86_400_000);
  const d7 = new Date(now.getTime() - 7 * 86_400_000);
  const d30 = new Date(now.getTime() - 30 * 86_400_000);
  const one = async <T>(q: ReturnType<typeof sql>) => (await db.execute(q)).rows[0] as T;
  const users = await one<{ total: number; active: number; new7: number; new30: number }>(sql`select count(*)::int total, count(*) filter (where deleted_at is null)::int active, count(*) filter (where created_at >= ${d7.toISOString()}::timestamptz)::int new7, count(*) filter (where created_at >= ${d30.toISOString()}::timestamptz)::int new30 from users`);
  const act = await one<{ dau: number; wau: number; mau: number }>(sql`select count(distinct user_id) filter (where created_at >= ${d1.toISOString()}::timestamptz)::int dau, count(distinct user_id) filter (where created_at >= ${d7.toISOString()}::timestamptz)::int wau, count(distinct user_id) filter (where created_at >= ${d30.toISOString()}::timestamptz)::int mau from xp_transactions`);
  const subs = await one<{ total: number; accepted: number; last7: number }>(sql`select count(*)::int total, count(*) filter (where verdict = 'accepted')::int accepted, count(*) filter (where created_at >= ${d7.toISOString()}::timestamptz)::int last7 from submissions`);
  const learn = await one<{ lessons: number; xp: number }>(sql`select (select count(*)::int from lesson_runs where status = 'completed') lessons, coalesce((select sum(amount) from xp_transactions),0)::int xp`);
  const content = await one<{ lessons: number; problems: number; contests: number }>(sql`select (select count(*)::int from lessons where published and deleted_at is null) lessons, (select count(*)::int from problems where published and deleted_at is null) problems, (select count(*)::int from contests where published) contests`);
  const hardest = (await db.execute(sql`select p.slug, p.title, count(*)::int subs, round(100.0 * count(*) filter (where s.verdict = 'accepted') / count(*))::int rate from submissions s join problems p on p.id = s.problem_id group by p.slug, p.title having count(*) >= 3 order by rate asc, subs desc limit 5`)).rows as Array<{ slug: string; title: string; subs: number; rate: number }>;
  return { users, act, subs, learn, content, hardest };
}

export async function listAudit(actor: Actor, limit = 50) {
  adminOnly(actor);
  return getDb()
    .select({ id: schema.auditLog.id, action: schema.auditLog.action, targetType: schema.auditLog.targetType, targetId: schema.auditLog.targetId, meta: schema.auditLog.meta, createdAt: schema.auditLog.createdAt, actor: schema.users.username })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLog.actorId))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(limit);
}

