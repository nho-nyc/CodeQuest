/**
 * The Repair Workshop's entry points as the API routes use them: each call reads the learner's signed progress, applies the
 * educational policy, performs the work, and writes the new progress. Kept free of Next.js so it can be tested directly
 * with an in-memory cookie jar. Still no database: nothing here can touch XP, hearts, mastery or solved status.
 */
import { assertCanReveal, afterRun, afterSubmit, canReveal, cookieName, readProgress, signProgress, takeHint, type Progress } from "@/server/repair/progress";
import { SECRETS } from "@/server/repair/secret";
import { REPAIR_BY_ID } from "@/features/repair/challenges";
import { ServiceError } from "./lesson-run";
import { repairHint, repairSolution, runRepair, submitRepair, type RepairRunResult, type RepairSubmitResult } from "./repair";

export type Jar = { get(name: string): string | undefined; set(name: string, value: string): void };
export type Learner = { id: string; passwordHash: string };

function known(id: unknown): string {
  if (typeof id !== "string" || !Object.prototype.hasOwnProperty.call(REPAIR_BY_ID, id)) throw new ServiceError("Challenge not found", 404);
  return id;
}
const load = (u: Learner, jar: Jar, id: string) => readProgress(jar.get(cookieName(id)), u, id);
const save = (u: Learner, jar: Jar, id: string, p: Progress) => jar.set(cookieName(id), signProgress(u, id, p));

export type ProgressView = { hints: string[]; canReveal: boolean; accepted: boolean };
const view = (id: string, p: Progress): ProgressView => ({ hints: SECRETS[id]!.hints.slice(0, p.hints), canReveal: canReveal(p), accepted: p.accepted });

export function flowProgress(u: Learner, jar: Jar, idIn: unknown): ProgressView {
  const id = known(idIn);
  return view(id, load(u, jar, id));
}

export async function flowRun(u: Learner, jar: Jar, idIn: unknown, source: unknown, language: unknown): Promise<RepairRunResult> {
  const id = known(idIn);
  const result = await runRepair(u.id, id, source, language);
  save(u, jar, id, afterRun(load(u, jar, id)));
  return result;
}

export async function flowSubmit(u: Learner, jar: Jar, idIn: unknown, source: unknown, language: unknown): Promise<RepairSubmitResult> {
  const id = known(idIn);
  const result = await submitRepair(u.id, id, source, language);
  // A judge outage throws above, so an attempt that was never judged is not counted.
  save(u, jar, id, afterSubmit(load(u, jar, id), result.verdict === "accepted"));
  return result;
}

export function flowHint(u: Learner, jar: Jar, idIn: unknown, level: unknown): { level: number; text: string; canReveal: boolean } {
  const id = known(idIn);
  const hint = repairHint(id, level); // validates the level (1 to 3)
  const next = takeHint(load(u, jar, id), hint.level);
  save(u, jar, id, next);
  return { ...hint, canReveal: canReveal(next) };
}

export function flowSolution(u: Learner, jar: Jar, idIn: unknown) {
  const id = known(idIn);
  assertCanReveal(load(u, jar, id));
  return repairSolution(id);
}
