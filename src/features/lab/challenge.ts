/**
 * Counterexample Lab framework (pure: no React, no I/O, no randomness, no database).
 * A challenge pairs a deliberately flawed algorithm with an independent reference. Traces reuse the visualizer's
 * `Step` type and playback reducer; nothing here touches XP, hearts, mastery or any stored progress.
 */
import type { Step } from "@/features/visualizer/engine";
import type { Field } from "@/features/visualizer/registry";
import type { BfsState } from "@/features/visualizer/bfs";
import type { TwoPointersState } from "@/features/visualizer/two-pointers";

export type CoinState = { kind: "coins"; coins: number[]; amount: number; taken: number[]; remaining: number; optimal: number[] | null; phase: "start" | "take" | "stuck" | "done" | "compare" };
export type KadaneState = { kind: "kadane"; arr: number[]; i: number; cur: number; best: number; correct: number | null; phase: "start" | "extend" | "best" | "done" };
export type WindowState = { kind: "window"; arr: number[]; limit: number; l: number; r: number; sum: number; best: number; bestL: number; bestR: number; /** Longest valid subarray the reference found. */ truth: [number, number] | null; phase: "start" | "add" | "shrink" | "record" | "done" };
export type LabState = CoinState | KadaneState | WindowState | TwoPointersState;
// BfsState is re-exported only so a future challenge can reuse the graph stage without touching this file's contract.
export type { BfsState };

/** A step plus a marker for the step where the flawed reasoning goes wrong. */
export type LabStep = Step<LabState> & { flaw?: boolean };

export type Evaluation = { ok: true; flawed: string; correct: string; differs: boolean; steps: LabStep[]; /** Index of the first step marked `flaw`, or null. */ flawStep: number | null } | { ok: false; errors: string[] };

export type Counterexample = {
  values: Record<string, string>;
  flawed: string;
  correct: string;
  /** What was searched, in plain words. */
  space: string;
  /** How many inputs of the space were examined before this one was reached. */
  examined: number;
  /** Total size of the space. */
  total: number;
  /** Exactly what can honestly be claimed about this example. */
  claim: string;
  /** Why this input exposes the flaw. */
  why: string;
};

export type Challenge = {
  id: string;
  title: string;
  kind: string;
  objective: string;
  statement: string;
  /** The flawed idea in a sentence or two. */
  approach: string;
  seems: string;
  assumptions: string[];
  constraints: string;
  fields: Field[];
  /** An example on which the flawed approach happens to work. */
  defaults: Record<string, string>;
  flawedCode: string[];
  correctCode: string[];
  suggestions: Array<{ label: string; values: Record<string, string> }>;
  evaluate: (values: Record<string, string>) => Evaluation;
  /** Bounded, ordered search space for the counterexample. */
  space: { description: string; inputs: () => Iterable<Record<string, string>>; order: string };
  /** "Which assumption does the approach rely on?" */
  question: { prompt: string; options: string[]; correct: number; feedbackWrong: string };
  explanation: { assumption: string; whySeems: string; whyFails: string; needs: string };
  /** Three levels, none of which names the counterexample. */
  hints: [string, string, string];
  repair: { direction: string; complexity: string; correctNote: string };
};

/**
 * Deterministic discovery: walk the bounded space in its stated order and stop at the first input on which the flawed
 * result differs from the reference. Because the whole space is walked in order, the result is the FIRST such input in
 * that order, which is what the claim says and nothing more. Null when no input of the space exposes the flaw.
 */
export function discover(c: Challenge): Counterexample | null {
  let examined = 0;
  const all = [...c.space.inputs()];
  for (const values of all) {
    examined++;
    const ev = c.evaluate(values);
    if (ev.ok && ev.differs) {
      return {
        values,
        flawed: ev.flawed,
        correct: ev.correct,
        space: c.space.description,
        examined,
        total: all.length,
        claim: `Every one of the ${all.length} inputs in this space was tried in the order "${c.space.order}"; this is the first one where the flawed result differs from the reference, so it is the smallest in that order. Larger inputs outside this space were not searched.`,
        why: ev.steps.find((s) => s.flaw)?.why ?? "",
      };
    }
  }
  return null;
}

export const counterexampleText = (c: Challenge, x: Counterexample) => c.fields.map((f) => `${f.key}=${x.values[f.key]}`).join(" ");
