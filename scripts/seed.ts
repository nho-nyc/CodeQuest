import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../src/server/db/schema";
import { WORLDS } from "../src/content";
import { ACHIEVEMENTS, QUESTS } from "../src/content/gamification";
import { ROADMAP } from "../src/content/roadmap";
import { UNIT_META } from "../src/content/curriculum-meta";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

/** Idempotent: safe to re-run. Upserts by slug so learner progress (which references ids) is preserved. */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  const pool = new Pool({ connectionString: url, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  const db = drizzle(pool, { schema });
  const { worlds, units, lessons, lessonQuestions } = schema;

  const all = [...WORLDS, ...ROADMAP];
  let nLessons = 0;
  let nQuestions = 0;

  await db.transaction(async (tx) => {
    for (const [wi, w] of all.entries()) {
      const [wRow] = await tx
        .insert(worlds)
        .values({ slug: w.slug, title: w.title, description: w.description, icon: w.icon, color: w.color, position: wi + 1, published: w.published })
        .onConflictDoUpdate({ target: worlds.slug, set: { title: w.title, description: w.description, icon: w.icon, color: w.color, position: wi + 1, published: w.published, deletedAt: null }, setWhere: eq(worlds.locked, false) })
        .returning({ id: worlds.id });
      // Rows edited in the admin CMS are locked: the seed never overwrites them.
      const wId = wRow?.id ?? (await tx.select({ id: worlds.id }).from(worlds).where(eq(worlds.slug, w.slug)))[0]!.id;
      for (const [ui, u] of w.units.entries()) {
        const meta = UNIT_META[u.slug] ?? { objectives: [], prerequisites: [], practice: [] };
        const [uRow] = await tx
          .insert(units)
          .values({ worldId: wId, slug: u.slug, title: u.title, description: u.description, icon: u.icon, position: ui + 1, published: true, ...meta })
          .onConflictDoUpdate({ target: [units.worldId, units.slug], set: { title: u.title, description: u.description, icon: u.icon, position: ui + 1, published: true, deletedAt: null, ...meta }, setWhere: eq(units.locked, false) })
          .returning({ id: units.id });
        const uId = uRow?.id ?? (await tx.select({ id: units.id }).from(units).where(and(eq(units.worldId, wId), eq(units.slug, u.slug))))[0]!.id;
        for (const [li, l] of u.lessons.entries()) {
          nLessons++;
          const [lRow] = await tx
            .insert(lessons)
            .values({ unitId: uId, slug: l.slug, title: l.title, summary: l.summary, position: li + 1, content: l.content, kind: l.kind ?? "lesson", published: true })
            .onConflictDoUpdate({ target: [lessons.unitId, lessons.slug], set: { title: l.title, summary: l.summary, position: li + 1, content: l.content, kind: l.kind ?? "lesson", published: true, deletedAt: null }, setWhere: eq(lessons.locked, false) })
            .returning({ id: lessons.id });
          if (!lRow) continue; // locked in the CMS: keep its edited questions as well
          // Park existing positions out of the way so reordering cannot violate the unique (lesson, position) index.
          await tx.update(lessonQuestions).set({ position: sql`${lessonQuestions.position} + 1000` }).where(eq(lessonQuestions.lessonId, lRow!.id));
          for (const [qi, q] of l.questions.entries()) {
            nQuestions++;
            const existing = await tx
              .select({ id: lessonQuestions.id })
              .from(lessonQuestions)
              .where(and(eq(lessonQuestions.lessonId, lRow!.id), eq(lessonQuestions.position, qi + 1 + 1000)))
              .limit(1);
            const values = { type: q.type, prompt: q.prompt, code: q.code ?? null, data: q.data, answer: q.answer, explanation: q.explanation, position: qi + 1, deletedAt: null };
            if (existing[0]) await tx.update(lessonQuestions).set(values).where(eq(lessonQuestions.id, existing[0].id));
            else await tx.insert(lessonQuestions).values({ lessonId: lRow!.id, ...values });
          }
          // Questions removed from the content: soft-delete the leftovers (still parked at 1000+).
          await tx
            .update(lessonQuestions)
            .set({ deletedAt: new Date() })
            .where(and(eq(lessonQuestions.lessonId, lRow!.id), sql`${lessonQuestions.position} >= 1000`));
        }
      }
    }
    // Retire worlds that disappeared from the content files.
    await tx.update(worlds).set({ published: false }).where(and(eq(worlds.locked, false), notInArray(worlds.slug, all.map((w) => w.slug))));
  });

  const { dailyQuests, achievements } = schema;
  for (const q of QUESTS) {
    await db.insert(dailyQuests).values(q).onConflictDoUpdate({ target: dailyQuests.slug, set: { title: q.title, description: q.description, metric: q.metric, target: q.target, rewardXp: q.rewardXp, icon: q.icon } });
  }
  for (const [i, a] of ACHIEVEMENTS.entries()) {
    const v = { ...a, position: i };
    await db.insert(achievements).values(v).onConflictDoUpdate({ target: achievements.slug, set: { title: v.title, description: v.description, metric: v.metric, threshold: v.threshold, rewardXp: v.rewardXp, icon: v.icon, position: v.position } });
  }
  console.log(`✔ ${QUESTS.length} daily quests, ${ACHIEVEMENTS.length} achievements`);
  console.log(`✔ seeded ${all.length} worlds (${WORLDS.length} playable), ${nLessons} lessons, ${nQuestions} questions`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
