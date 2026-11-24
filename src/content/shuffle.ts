import type { QuestionSeed, UnitSeed, WorldSeed } from "./types";

/**
 * Authors write the correct option first. Shown that way, "always pick the first one" would pass; so options of
 * choice questions are permuted deterministically (same permutation on every build) and the stored answer index
 * follows. true_false keeps True/False order.
 */
const CHOICE_TYPES = new Set(["multiple_choice", "predict_output", "find_bug"]);

function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function shuffleQuestion(q: QuestionSeed): QuestionSeed {
  if (!CHOICE_TYPES.has(q.type)) return q;
  const options = (q.data as { options?: string[] }).options;
  const correct = (q.answer as { index?: number }).index;
  if (!options || options.length < 2 || typeof correct !== "number") return q;
  let seed = seedOf(`${q.prompt}\n${q.code ?? ""}\n${options.join("|")}`);
  const next = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return { ...q, data: { ...q.data, options: order.map((i) => options[i]!) }, answer: { ...q.answer, index: order.indexOf(correct) } };
}

export const shuffleUnit = (u: UnitSeed): UnitSeed => ({ ...u, lessons: u.lessons.map((l) => ({ ...l, questions: l.questions.map(shuffleQuestion) })) });
export const shuffleWorld = (w: WorldSeed): WorldSeed => ({ ...w, units: w.units.map(shuffleUnit) });
