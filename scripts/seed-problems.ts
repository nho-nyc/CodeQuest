import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, notInArray } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../src/server/db/schema";
import { PROBLEMS } from "../src/content/problems";
import { PROBLEM_META } from "../src/content/problems/meta-data";
import { buildProblem, hasGpp } from "./lib/problem-build";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

/**
 * Idempotent. Compiles every reference solution with the local g++ to generate the expected outputs
 * (so it must run on a developer/CI machine with g++, not inside the web app), then upserts the problems.
 * Submissions and learner progress are kept (rows are matched by slug).
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  if (!hasGpp()) throw new Error("g++ is required to generate expected outputs for the problems");
  const pool = new Pool({ connectionString: url, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  const db = drizzle(pool, { schema });
  const { problems, problemTestCases } = schema;
  let nTests = 0;

  for (const p of PROBLEMS) {
    const built = buildProblem(p);
    nTests += built.tests.length;
    const values = {
      title: p.title,
      statement: p.statement,
      inputFormat: p.inputFormat,
      outputFormat: p.outputFormat,
      constraints: p.constraints,
      difficulty: p.difficulty,
      rating: p.rating,
      tags: p.tags,
      timeLimitMs: p.timeLimitMs,
      memoryLimitMb: p.memoryLimitMb,
      samples: p.samples,
      hints: [...p.hints],
      editorial: p.editorial,
      referenceSolution: p.reference,
      estimatedMinutes: p.estimatedMinutes,
      meta: PROBLEM_META[p.slug] ?? {},
      published: true,
      deletedAt: null,
    };
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(problems)
        .values({ slug: p.slug, ...values })
        .onConflictDoUpdate({ target: problems.slug, set: values, setWhere: eq(problems.locked, false) })
        .returning({ id: problems.id });
      if (!row) return; // edited in the admin CMS: leave the problem and its test cases alone
      await tx.delete(problemTestCases).where(eq(problemTestCases.problemId, row!.id));
      // insert in chunks to keep each statement small (some inputs are ~1 MB)
      for (let i = 0; i < built.tests.length; i += 4) {
        await tx.insert(problemTestCases).values(
          built.tests.slice(i, i + 4).map((t, k) => ({ problemId: row!.id, position: i + k + 1, input: t.input, expectedOutput: t.expected, isSample: t.isSample })),
        );
      }
    });
    console.log(`  ${p.slug}: ${built.tests.length} tests`);
  }
  await db.update(problems).set({ published: false }).where(and(eq(problems.locked, false), notInArray(problems.slug, PROBLEMS.map((p) => p.slug))));
  console.log(`✔ seeded ${PROBLEMS.length} problems, ${nTests} test cases`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
