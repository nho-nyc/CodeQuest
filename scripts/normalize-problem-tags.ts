import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../src/server/db/schema";
import { canonicalTags } from "../src/content/problems/tags";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

/** Idempotent: rewrites tags of non-locked problems to the canonical taxonomy (rows edited in the admin CMS are left alone). */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  const db = drizzle(pool, { schema });
  const { problems } = schema;
  const rows = await db.select({ id: problems.id, tags: problems.tags, locked: problems.locked }).from(problems);
  let changed = 0;
  for (const r of rows) {
    if (r.locked) continue;
    const next = canonicalTags(r.tags);
    if (next.join("|") !== r.tags.join("|")) {
      await db.update(problems).set({ tags: next }).where(eq(problems.id, r.id));
      changed++;
    }
  }
  console.log(`✔ normalised tags on ${changed} problems`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
