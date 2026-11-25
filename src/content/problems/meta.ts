import type { ProblemMetaJson } from "@/server/db/schema";
import { UNIT_META } from "../curriculum-meta";

export type ProblemMeta = ProblemMetaJson;

/** Units a learner should know before a problem that is mainly about this topic. Topics beyond the curriculum map to nothing. */
export const TAG_TO_UNIT: Record<string, string> = {
  arrays: "arrays",
  strings: "strings",
  sorting: "sorting-searching",
  "binary-search": "sorting-searching",
  stack: "stack-queue",
  "monotonic-stack": "stack-queue",
  queue: "stack-queue",
  "set-map": "set-map",
  hashing: "set-map",
  heap: "priority-queue-pairs",
  "prefix-sums": "prefix-two-pointers",
  "two-pointers": "prefix-two-pointers",
  "sliding-window": "prefix-two-pointers",
  greedy: "greedy",
  dp: "dp-intro",
  graphs: "graph-traversal",
  bfs: "graph-traversal",
  dfs: "graph-traversal",
  trees: "graph-traversal",
  grids: "graph-traversal",
  "shortest-path": "graph-traversal",
};

export const KNOWN_UNITS: ReadonlySet<string> = new Set(Object.keys(UNIT_META));

/** Units to know first: the explicit list when the author gave one, otherwise derived from the tags (primary skill first). At most 3. */
export function prerequisiteUnits(tags: readonly string[], meta: ProblemMeta | null): string[] {
  if (meta?.prerequisites && meta.prerequisites.length) return meta.prerequisites.filter((u) => KNOWN_UNITS.has(u)).slice(0, 3);
  const ordered = meta?.primarySkill ? [meta.primarySkill, ...tags] : [...tags];
  return [...new Set(ordered.map((t) => TAG_TO_UNIT[t]).filter((u): u is string => !!u))].slice(0, 3);
}

const COMPLEXITY = /^O\([^()]*(?:\([^()]*\))?[^()]*\)$/;
const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");

/** Returns human-readable problems; an empty list means the metadata is acceptable. `{}` (no metadata) is valid. */
export function validateMeta(meta: ProblemMeta | null | undefined, ctx: { tags: readonly string[] }): string[] {
  if (!meta) return [];
  const errs: string[] = [];
  const keys = Object.keys(meta).filter((k) => (meta as Record<string, unknown>)[k] !== undefined);
  if (keys.length === 0) return errs;
  const allowed = ["primarySkill", "approach", "timeComplexity", "spaceComplexity", "commonMistakes", "prerequisites"];
  for (const k of keys) if (!allowed.includes(k)) errs.push(`unknown metadata field "${k}"`);
  if (!clean(meta.primarySkill)) errs.push("primarySkill is required once any metadata is given");
  else if (!ctx.tags.includes(clean(meta.primarySkill))) errs.push(`primarySkill "${meta.primarySkill}" must be one of the tags (${ctx.tags.join(", ")})`);
  const approach = clean(meta.approach);
  if (approach.length < 20 || approach.length > 300) errs.push("approach must be 20-300 characters");
  for (const f of ["timeComplexity", "spaceComplexity"] as const) {
    const v = clean(meta[f]);
    if (!COMPLEXITY.test(v) || v.length > 40) errs.push(`${f} must look like O(n log n)`);
  }
  const m = meta.commonMistakes;
  if (!Array.isArray(m) || m.length < 1 || m.length > 4) errs.push("give 1-4 common mistakes");
  else {
    if (new Set(m.map((x) => x.trim().toLowerCase())).size !== m.length) errs.push("common mistakes must be distinct");
    for (const x of m) if (clean(x).length < 15 || clean(x).length > 220) errs.push(`a common mistake must be 15-220 characters: "${String(x).slice(0, 30)}"`);
  }
  if (meta.prerequisites !== undefined) {
    if (!Array.isArray(meta.prerequisites) || meta.prerequisites.length > 3) errs.push("prerequisites: at most 3 unit slugs");
    else {
      if (new Set(meta.prerequisites).size !== meta.prerequisites.length) errs.push("prerequisites must be distinct");
      for (const u of meta.prerequisites) if (!KNOWN_UNITS.has(u)) errs.push(`prerequisite "${u}" is not a curriculum unit`);
    }
  }
  return errs;
}

/** Stored JSON -> usable metadata, or null when it is missing or invalid. Never throws. */
export function parseProblemMeta(raw: unknown, tags: readonly string[]): ProblemMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const meta = raw as ProblemMeta;
  if (Object.keys(meta).length === 0) return null;
  return validateMeta(meta, { tags }).length === 0 ? meta : null;
}

/** The first "O(...)" an editorial states, for consistency checks against the metadata. */
export function editorialTimeComplexity(editorial: string): string | null {
  const m = editorial.match(/Complexity:\s*(O\([^()]*(?:\([^()]*\))?[^()]*\))/) ?? editorial.match(/(O\([^()]*(?:\([^()]*\))?[^()]*\))/);
  return m ? m[1]! : null;
}

export const normComplexity = (s: string) => s.replace(/\s+/g, "").replace(/·|\*/g, "").toLowerCase();
