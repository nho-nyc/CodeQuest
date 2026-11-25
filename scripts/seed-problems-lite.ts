import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../src/server/db/schema";
import { PROBLEMS } from "../src/content/problems";
import { PROBLEM_META } from "../src/content/problems/meta-data";
import tests from "../src/content/problems/small-tests.json";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

/**
 * No g++ needed. Inserts problems that are MISSING from the database, with the small pre-generated test cases
 * (src/content/problems/small-tests.json). Existing problems are never touched. Run `npm run db:seed:problems`
 * on a machine with g++ to install the complete (large) hidden test sets.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  const db = drizzle(pool, { schema });
  const { problems, problemTestCases } = schema;
  const byslug = tests as Record<string, Array<{ input: string; expected: string; isSample: boolean }>>;
  let added = 0;
  for (const p of PROBLEMS) {
    const [exists] = await db.select({ id: problems.id }).from(problems).where(eq(problems.slug, p.slug)).limit(1);
    if (exists) continue;
    const list = byslug[p.slug] ?? [];
    if (!list.length) continue;
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(problems)
        .values({ slug: p.slug, title: p.title, statement: p.statement, inputFormat: p.inputFormat, outputFormat: p.outputFormat, constraints: p.constraints, difficulty: p.difficulty, rating: p.rating, tags: p.tags, timeLimitMs: p.timeLimitMs, memoryLimitMb: p.memoryLimitMb, samples: p.samples, hints: [...p.hints], editorial: p.editorial, referenceSolution: p.reference, estimatedMinutes: p.estimatedMinutes, meta: PROBLEM_META[p.slug] ?? {}, published: true })
        .returning({ id: problems.id });
      await tx.insert(problemTestCases).values(list.map((t, i) => ({ problemId: row!.id, position: i + 1, input: t.input, expectedOutput: t.expected, isSample: t.isSample })));
    });
    added++;
  }
  console.log(`✔ added ${added} missing problems`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
