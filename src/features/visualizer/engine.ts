/**
 * Visualizer engine (pure: no React, no timers, no randomness, no I/O).
 *
 * An algorithm is a function from validated input to a TRACE: an ordered list of steps. Every step carries the full
 * algorithm state after it, the C++ line it corresponds to, and plain-language text. Playback is a separate reducer
 * over a step index, so the same input always shows the same steps and the engine can be tested without a browser.
 */
export type Tone = "info" | "good" | "warn";

export type Step<S> = {
  state: S;
  /** 0-based index into the algorithm's code listing, or null when no single line applies. */
  line: number | null;
  /** What happens in this step (short). */
  what: string;
  /** Why it happens (the reasoning a beginner should take away). */
  why: string;
  /** Optional insight for this specific step; the algorithm's general insight is shown otherwise. */
  notice?: string;
  tone: Tone;
};

export type RunResult<S> = { ok: true; steps: Step<S>[] } | { ok: false; errors: string[] };

/** Cap on the number of steps any trace may hold, so a visualization can never grow without bound. */
export const MAX_STEPS = 300;

export function finishTrace<S>(steps: Step<S>[]): RunResult<S> {
  if (steps.length > MAX_STEPS) return { ok: false, errors: [`This input needs ${steps.length} steps; the limit is ${MAX_STEPS}. Use a smaller input.`] };
  return { ok: true, steps };
}

export type Speed = 0.5 | 1 | 2;
export const SPEEDS: readonly Speed[] = [0.5, 1, 2];
const BASE_DELAY_MS = 1200;
export const delayFor = (speed: Speed) => Math.round(BASE_DELAY_MS / speed);

export type Player = { index: number; total: number; playing: boolean; speed: Speed };
export type PlayerAction = { type: "next" } | { type: "prev" } | { type: "reset" } | { type: "play" } | { type: "pause" } | { type: "toggle" } | { type: "tick" } | { type: "seek"; index: number } | { type: "speed"; speed: Speed } | { type: "load"; total: number };

export const initialPlayer = (total: number, speed: Speed = 1): Player => ({ index: 0, total: Math.max(1, total), playing: false, speed });
export const lastIndex = (p: Player) => p.total - 1;
export const atEnd = (p: Player) => p.index >= lastIndex(p);

const clamp = (p: Player, i: number) => Math.min(lastIndex(p), Math.max(0, Math.trunc(Number.isFinite(i) ? i : 0)));

/** Playing from the end restarts from the beginning; reaching the end always pauses. */
export function playerReducer(p: Player, a: PlayerAction): Player {
  switch (a.type) {
    case "next":
      return { ...p, index: clamp(p, p.index + 1), playing: false };
    case "prev":
      return { ...p, index: clamp(p, p.index - 1), playing: false };
    case "reset":
      return { ...p, index: 0, playing: false };
    case "seek":
      return { ...p, index: clamp(p, a.index), playing: false };
    case "speed":
      return { ...p, speed: a.speed };
    case "load":
      return initialPlayer(a.total, p.speed);
    case "play":
      return atEnd(p) ? { ...p, index: 0, playing: p.total > 1 } : { ...p, playing: true };
    case "pause":
      return { ...p, playing: false };
    case "toggle":
      return playerReducer(p, { type: p.playing ? "pause" : "play" });
    case "tick": {
      if (!p.playing) return p;
      const index = clamp(p, p.index + 1);
      return { ...p, index, playing: index < lastIndex(p) };
    }
  }
}

/** Shared parsing helpers for the input panels. */
export function parseIntList(text: string, opts: { min: number; max: number; lo: number; hi: number; label: string }): { ok: true; values: number[] } | { ok: false; error: string } {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 0) return { ok: false, error: `${opts.label}: enter at least ${opts.min} numbers separated by commas.` };
  const values: number[] = [];
  for (const p of parts) {
    if (!/^-?\d+$/.test(p)) return { ok: false, error: `${opts.label}: "${p.slice(0, 12)}" is not a whole number. Use numbers like 3, -2, 10.` };
    values.push(Number(p));
  }
  if (values.length < opts.min || values.length > opts.max) return { ok: false, error: `${opts.label}: use between ${opts.min} and ${opts.max} numbers (you gave ${values.length}).` };
  const bad = values.find((v) => v < opts.lo || v > opts.hi);
  if (bad !== undefined) return { ok: false, error: `${opts.label}: ${bad} is outside the allowed range ${opts.lo} to ${opts.hi}.` };
  return { ok: true, values };
}

export function parseIntField(text: string, opts: { lo: number; hi: number; label: string }): { ok: true; value: number } | { ok: false; error: string } {
  const t = text.trim();
  if (!/^-?\d+$/.test(t)) return { ok: false, error: `${opts.label}: enter a whole number.` };
  const v = Number(t);
  if (v < opts.lo || v > opts.hi) return { ok: false, error: `${opts.label}: use a value from ${opts.lo} to ${opts.hi}.` };
  return { ok: true, value: v };
}
