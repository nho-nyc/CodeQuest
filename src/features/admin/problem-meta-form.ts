import { validateMeta, type ProblemMeta } from "@/content/problems/meta";

export type ProblemMetaInput = { primarySkill?: string; approach?: string; timeComplexity?: string; spaceComplexity?: string; commonMistakes?: string; prerequisites?: string };

/**
 * Admin form fields -> stored metadata. All fields blank means "no metadata" ({}), which is always valid.
 * Once any field is filled the whole set must validate, so a half-written entry can never reach learners.
 */
export function buildProblemMeta(input: ProblemMetaInput, tags: readonly string[]): { meta: ProblemMeta; errors: string[] } {
  const t = (v: string | undefined) => (v ?? "").trim();
  const mistakes = (input.commonMistakes ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
  const prereq = (input.prerequisites ?? "").split(/[,\s]+/).map((x) => x.trim()).filter(Boolean);
  const empty = !t(input.primarySkill) && !t(input.approach) && !t(input.timeComplexity) && !t(input.spaceComplexity) && mistakes.length === 0 && prereq.length === 0;
  if (empty) return { meta: {}, errors: [] };
  const meta: ProblemMeta = {
    primarySkill: t(input.primarySkill),
    approach: t(input.approach),
    timeComplexity: t(input.timeComplexity),
    spaceComplexity: t(input.spaceComplexity),
    commonMistakes: mistakes,
  };
  if (prereq.length) meta.prerequisites = prereq;
  return { meta, errors: validateMeta(meta, { tags }) };
}
