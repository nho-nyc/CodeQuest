import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WORLDS } from "@/content";
import { REPAIR_CHALLENGES } from "@/features/repair/challenges";
import { SECRETS } from "@/server/repair/secret";

const units = WORLDS.flatMap((w) => w.units);
const lessonTitles = new Set(units.flatMap((u) => u.lessons.map((l) => l.title)));
const unitTitles = new Set(units.map((u) => u.title));

describe("repair content integrity", () => {
  it("every 'Learn' pointer names a real unit and a real lesson of that unit", () => {
    for (const c of REPAIR_CHALLENGES) {
      expect(c.learn.length).toBeGreaterThan(0);
      for (const l of c.learn) {
        expect(unitTitles.has(l.unit), `${c.id}: unit "${l.unit}"`).toBe(true);
        const unit = units.find((u) => u.title === l.unit)!;
        expect(unit.lessons.some((x) => x.title === l.lesson), `${c.id}: lesson "${l.lesson}" in "${l.unit}"`).toBe(true);
      }
    }
  });
  it("lessons quoted in the reflections exist", () => {
    for (const c of REPAIR_CHALLENGES) {
      const quoted = [...SECRETS[c.id]!.reflection.reinforce.matchAll(/'([^']{6,})'/g)].map((m) => m[1]!);
      for (const q of quoted) expect(lessonTitles.has(q), `${c.id}: '${q}'`).toBe(true);
    }
  });
  it("hints do not promise things the workshop cannot do (it only runs the visible tests)", () => {
    for (const c of REPAIR_CHALLENGES) for (const h of SECRETS[c.id]!.hints) expect(h, c.id).not.toMatch(/of your own|your own input|run your own|custom input/i);
  });
  it("no reflection or hint makes the (false) claim that two values within the limits overflow a 32-bit int", () => {
    const all = REPAIR_CHALLENGES.flatMap((c) => [...SECRETS[c.id]!.hints, ...Object.values(SECRETS[c.id]!.reflection)]).join("\n");
    expect(all).not.toMatch(/2\^31|above 2\^31|overflow/i);
    // the arithmetic behind that decision: the largest sum of two values (10^9 each) fits in int32
    expect(2 * 10 ** 9).toBeLessThan(2 ** 31 - 1);
  });
  it("complexity claims match the stated constraints", () => {
    const ref = (id: string) => SECRETS[id]!.reflection.complexity;
    expect(ref("greedy-coins")).toContain("O(n · m)");
    expect(50 * 10_000).toBe(500_000); // "half a million steps"
    expect(ref("max-subarray-boundary")).toContain("O(n)");
    expect(1e5 * 1e9).toBe(1e14); // sums reach 10^14 (long long needed)
    expect(ref("two-pointers-unsorted")).toContain("O(n log n)");
    expect(ref("window-negatives")).toContain("O(n²)");
    expect(2000 * 2001 / 2).toBeLessThan(2_100_000); // "about 2 million additions"
    expect(ref("window-negatives")).not.toMatch(/prefix sums|different technique|faster/i); // no unneeded advanced algorithm
  });
  it("each flawed program really has the intended flaw and each reference lacks it", () => {
    const by = Object.fromEntries(REPAIR_CHALLENGES.map((c) => [c.id, c.flawedCode]));
    const sol = (id: string) => SECRETS[id]!.solution;
    expect(by["greedy-coins"]).toMatch(/m \/ c/);
    expect(sol("greedy-coins")).not.toMatch(/m \/ c/);
    expect(sol("greedy-coins")).toMatch(/dp\[/);
    expect(by["max-subarray-boundary"]).toMatch(/best = 0, cur = 0/);
    expect(by["max-subarray-boundary"]).toMatch(/max\(0LL/);
    expect(sol("max-subarray-boundary")).toMatch(/best = a\[0\]/);
    expect(by["two-pointers-unsorted"]).not.toMatch(/sort\(/);
    expect(sol("two-pointers-unsorted")).toMatch(/sort\(a\.begin\(\), a\.end\(\)\)/);
    expect(by["window-negatives"]).toMatch(/while \(sum > k/);
    expect(sol("window-negatives")).not.toMatch(/while \(sum > k/);
  });
  it("the statements agree with what the references accept (positions, non-empty, limits)", () => {
    const byId = Object.fromEntries(REPAIR_CHALLENGES.map((c) => [c.id, c]));
    expect(byId["max-subarray-boundary"]!.statement).toMatch(/non-empty/);
    expect(byId["two-pointers-unsorted"]!.outputFormat).toMatch(/do not need to say which positions/i);
    expect(byId["two-pointers-unsorted"]!.statement).toMatch(/i ≠ j/);
    expect(byId["window-negatives"]!.outputFormat).toMatch(/or 0/);
    expect(byId["window-negatives"]!.constraints).toMatch(/2 000/);
    expect(byId["greedy-coins"]!.outputFormat).toMatch(/-1/);
  });
  it("the workshop is English-only like the rest of the app, so there is no Vietnamese terminology to keep consistent", () => {
    const files = ["src/features/repair/challenges.ts", "src/server/repair/secret.ts", "src/components/repair/workshop.tsx"];
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/[ạảãàáâăắằẳẵặẹẻẽèéêềếểễệỉịọỏõòóôồốổỗộơờớởỡợụủũùúưừứửữựỳỵỷỹđ]/i);
  });
});

describe("repair feature has no database or progression access", () => {
  it("progress, flow and service modules import nothing that can write progress", () => {
    for (const f of ["src/server/repair/progress.ts", "src/server/services/repair-flow.ts", "src/server/services/repair.ts", "src/server/inflight.ts"]) {
      const src = readFileSync(f, "utf8");
      const imports = src.split("\n").filter((l) => /^\s*import\b/.test(l)).join("\n");
      expect(imports, f).not.toMatch(/db\/client|drizzle|\/xp|hearts|gamification|engagement|\/path|reviews|activity|placement/i);
      expect(src, f).not.toMatch(/getDb\(|\b(db|tx)\.(insert|update|delete)\(|awardXp|changeHearts/);
    }
  });
});
