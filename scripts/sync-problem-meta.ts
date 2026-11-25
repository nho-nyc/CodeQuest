import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../src/server/db/schema";
import { PROBLEMS } from "../src/content/problems";
import { PROBLEM_META } from "../src/content/problems/meta-data";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

/**
 * Light, g++-free update of the TEACHING fields of existing problems: tags, difficulty/rating, hints and metadata.
 * It never touches statements, test cases, submissions or learner progress, and skips problems edited in the admin CMS (locked).
 * Pass --dry to only report what would change. Idempotent.
 */
/** jsonb returns keys in its own order, so compare with sorted keys. */
const stable = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const dry = process.argv.includes("--dry");
  const pool = new Pool({ connectionString: url, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  const db = drizzle(pool, { schema });
  const { problems } = schema;
  let changed = 0, same = 0, locked = 0, missing = 0;
  for (const p of PROBLEMS) {
    const [row] = await db.select().from(problems).where(eq(problems.slug, p.slug)).limit(1);
    if (!row) { missing++; continue; }
    if (row.locked) { locked++; continue; }
    const next = { tags: p.tags, difficulty: p.difficulty, rating: p.rating, hints: [...p.hints], meta: PROBLEM_META[p.slug] ?? {} };
    const cur = { tags: row.tags, difficulty: row.difficulty, rating: row.rating, hints: row.hints, meta: row.meta };
    if (stable(cur) === stable(next)) { same++; continue; }
    changed++;
    if (!dry) await db.update(problems).set(next).where(and(eq(problems.id, row.id), eq(problems.locked, false)));
  }
  console.log(`${dry ? "[dry run] " : ""}${changed} updated, ${same} already current, ${locked} locked (CMS-edited, left alone), ${missing} not in the database`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
