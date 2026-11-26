import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { discover, type Challenge } from "@/features/lab/challenge";
import { optimalCoins } from "@/features/lab/coins";
import { bestNonEmptySubarray } from "@/features/lab/max-subarray";
import { findPair } from "@/features/lab/two-pointers-unsorted";
import { longestBlock } from "@/features/lab/window-negatives";
import { canReveal, initialInvestigation, investigate, traceVisible, type Investigation, type InvAction } from "@/features/lab/investigation";
import { CHALLENGES, CHALLENGE_BY_ID, isChallengeId } from "@/features/lab/registry";

const ok = (c: Challenge, v: Record<string, string>) => {
  const e = c.evaluate(v);
  if (!e.ok) throw new Error(e.errors.join(";"));
  return e;
};
const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

describe("challenges are well formed", () => {
  it("has exactly four with distinct failure kinds and ids", () => {
    expect(CHALLENGES).toHaveLength(4);
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(4);
    expect(new Set(CHALLENGES.map((c) => c.kind)).size).toBe(4);
    expect(isChallengeId("nope")).toBe(false);
    expect(isChallengeId(CHALLENGES[0]!.id)).toBe(true);
  });
  it.each(CHALLENGES.map((c) => [c.id, c] as const))("%s has all required content and 3 hints", (_, c) => {
    for (const k of ["title", "objective", "statement", "approach", "seems", "constraints"] as const) expect(c[k].length).toBeGreaterThan(10);
    expect(c.assumptions.length).toBeGreaterThan(0);
    expect(c.hints).toHaveLength(3);
    expect(c.flawedCode.length).toBeGreaterThan(3);
    expect(c.correctCode.length).toBeGreaterThan(3);
    expect(c.question.options.length).toBeGreaterThanOrEqual(3);
    expect(c.question.correct).toBeLessThan(c.question.options.length);
    expect(c.suggestions.length).toBeGreaterThan(0);
  });
  it.each(CHALLENGES.map((c) => [c.id, c] as const))("%s default example does not expose the bug", (_, c) => {
    expect(ok(c, c.defaults).differs).toBe(false);
  });
  it.each(CHALLENGES.map((c) => [c.id, c] as const))("%s suggestions are valid inputs", (_, c) => {
    for (const s of c.suggestions) expect(c.evaluate(s.values).ok).toBe(true);
  });
});

describe("reference implementations", () => {
  it("coin DP matches brute force", () => {
    const r = rng(1);
    for (let t = 0; t < 200; t++) {
      const coins = [1, ...Array.from({ length: 2 }, () => 2 + Math.floor(r() * 9))];
      const amt = 1 + Math.floor(r() * 25);
      let best = Infinity;
      const go = (rem: number, n: number) => {
        if (n >= best) return;
        if (rem === 0) { best = n; return; }
        for (const c of coins) if (c <= rem) go(rem - c, n + 1);
      };
      go(amt, 0);
      expect(optimalCoins(coins, amt).count).toBe(best);
    }
  });
  it("max subarray matches O(n^3) brute force", () => {
    const r = rng(2);
    for (let t = 0; t < 200; t++) {
      const a = Array.from({ length: 1 + Math.floor(r() * 8) }, () => Math.floor(r() * 41) - 20);
      let b = -Infinity;
      for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) b = Math.max(b, a.slice(i, j + 1).reduce((x, y) => x + y, 0));
      expect(bestNonEmptySubarray(a)).toBe(b);
    }
  });
  it("pair search finds a pair iff one exists", () => {
    expect(findPair([1, 3, 2], 4)).toEqual([0, 1]);
    expect(findPair([1, 2], 10)).toBeNull();
  });
  it("longest block handles negatives", () => {
    expect(longestBlock([0, 1, -1], 0).length).toBe(3);
    expect(longestBlock([5], 1).length).toBe(0);
  });
});

describe("flawed behaviour and counterexample discovery", () => {
  const expected: Record<string, Record<string, string>> = {};
  it.each(CHALLENGES.map((c) => [c.id, c] as const))("%s: finds a real counterexample, deterministically", (_, c) => {
    const a = discover(c);
    const b = discover(c);
    expect(a).not.toBeNull();
    expect(b).toEqual(a);
    const e = ok(c, a!.values);
    expect(e.differs).toBe(true);
    expect(e.flawed).toBe(a!.flawed);
    expect(e.correct).toBe(a!.correct);
    expect(e.flawStep).not.toBeNull();
    expect(a!.examined).toBeLessThanOrEqual(a!.total);
    expect(a!.claim).toMatch(/search|searched|space|inputs/i);
    expected[c.id] = a!.values;
  });
  it("known small counterexamples", () => {
    const coins = ok(CHALLENGE_BY_ID[CHALLENGES[0]!.id]!, { coins: "1, 3, 4", amount: "6" });
    expect(coins.differs).toBe(true);
    expect(coins.flawed).not.toBe(coins.correct);
  });
  it("the search is minimal only within its stated order and bound", () => {
    for (const c of CHALLENGES) {
      const x = discover(c)!;
      expect(x.claim).not.toMatch(/smallest possible|globally|always the smallest/i);
    }
  });
  it("trace flaw marker only when the answers differ", () => {
    for (const c of CHALLENGES) {
      const same = ok(c, c.defaults);
      expect(same.flawStep).toBeNull();
      expect(same.steps.some((s) => s.flaw)).toBe(false);
      expect(same.steps.length).toBeGreaterThan(1);
    }
  });
  it("hints never reveal the counterexample values", () => {
    for (const c of CHALLENGES) {
      const x = discover(c)!;
      const text = c.hints.join(" ");
      for (const v of Object.values(x.values)) expect(text).not.toContain(`[${v}]`);
      expect(text).not.toContain(x.flawed + " vs " + x.correct);
    }
  });
});

describe("input validation", () => {
  it.each(CHALLENGES.map((c) => [c.id, c] as const))("%s rejects empty, junk and oversized input", (_, c) => {
    for (const f of c.fields) {
      for (const bad of ["", "abc", "1;2", "999999999", "1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25"]) {
        const e = c.evaluate({ ...c.defaults, [f.key]: bad });
        expect(e.ok).toBe(false);
        if (!e.ok) expect(e.errors.length).toBeGreaterThan(0);
      }
    }
  });
  it("never throws on hostile strings", () => {
    for (const c of CHALLENGES) for (const bad of ["<script>", "1e9", "-", "NaN", "0x10", "1 2 3"]) for (const f of c.fields) expect(() => c.evaluate({ ...c.defaults, [f.key]: bad })).not.toThrow();
  });
});

describe("investigation state machine", () => {
  const run = (acts: InvAction[], s: Investigation = initialInvestigation()) => acts.reduce(investigate, s);
  it("moves through the stages in order", () => {
    let s = initialInvestigation();
    expect(s.stage).toBe("predict");
    s = run([{ type: "predict", prediction: "works" }], s);
    expect(s.stage).toBe("experiment");
    s = run([{ type: "run", differs: false }], s);
    expect(s.stage).toBe("experiment");
    s = run([{ type: "reveal" }], s);
    expect(s.stage).toBe("find");
    s = run([{ type: "continue" }], s);
    expect(s.stage).toBe("understand");
    s = run([{ type: "answer", index: 1, correct: true }, { type: "repair" }], s);
    expect(s.stage).toBe("repair");
  });
  it("cannot skip ahead or reveal early", () => {
    const s0 = initialInvestigation();
    expect(run([{ type: "reveal" }, { type: "continue" }, { type: "repair" }, { type: "hint" }, { type: "run", differs: true }], s0)).toEqual(s0);
    const s1 = run([{ type: "predict", prediction: "fails" }]);
    expect(canReveal(s1)).toBe(false);
    expect(run([{ type: "reveal" }], s1).stage).toBe("experiment");
    expect(traceVisible(s1)).toBe(false);
  });
  it("a hint unlocks the reveal and hints are capped at three", () => {
    let s = run([{ type: "predict", prediction: "works" }, { type: "hint" }]);
    expect(canReveal(s)).toBe(true);
    s = run([{ type: "hint" }, { type: "hint" }, { type: "hint" }, { type: "hint" }], s);
    expect(s.hints).toBe(3);
  });
  it("a learner run that differs finds the failure themselves", () => {
    const s = run([{ type: "predict", prediction: "works" }, { type: "run", differs: true }]);
    expect(s.stage).toBe("find");
    expect(s.foundByLearner).toBe(true);
    expect(traceVisible(s)).toBe(true);
  });
  it("is immutable and isolated per instance, and restart resets", () => {
    const a = initialInvestigation();
    const b = investigate(a, { type: "predict", prediction: "works" });
    expect(a.stage).toBe("predict");
    expect(b).not.toBe(a);
    expect(initialInvestigation()).toEqual(a);
    expect(investigate(b, { type: "restart" })).toEqual(a);
  });
});

describe("no progression side effects", () => {
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  const files = [...walk("src/features/lab"), ...walk("src/components/lab"), "src/app/(app)/counterexample-lab/page.tsx"];
  it("lab code imports nothing from the server, database or progression", () => {
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const imports = src.split("\n").filter((l) => /^\s*(import|export)\b.*\bfrom\b/.test(l)).join("\n");
      expect(imports, f).not.toMatch(/@\/server|drizzle|@\/db|judge0/i);
      expect(src, f).not.toMatch(/getDb\(|fetch\(/);
    }
  });
  it("the component never calls a server action or API", () => {
    const src = readFileSync("src/components/lab/lab.tsx", "utf8");
    expect(src).not.toMatch(/use server|\/api\//);
  });
});

describe("flaw marker is always present when answers differ (regression)", () => {
  it("every differing input in each search space has a marked flaw step", () => {
    for (const c of CHALLENGES) {
      let n = 0;
      for (const v of c.space.inputs()) {
        const e = c.evaluate(v);
        if (!e.ok || !e.differs) continue;
        n++;
        expect(e.flawStep, `${c.id} ${JSON.stringify(v)}`).not.toBeNull();
        expect(e.steps[e.flawStep!]!.flaw, `${c.id} ${JSON.stringify(v)}`).toBe(true);
      }
      expect(n).toBeGreaterThan(0);
    }
  });
});

describe("suggested edge cases", () => {
  it.each(CHALLENGES.map((c) => [c.id, c] as const))("%s offers at least one suggestion that exposes the bug and one that does not mislead", (_, c) => {
    const diffs = c.suggestions.map((s) => ok(c, s.values).differs);
    expect(diffs.some(Boolean)).toBe(true);
  });
});
