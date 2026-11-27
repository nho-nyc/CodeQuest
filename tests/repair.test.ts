/**
 * Algorithm Repair Workshop. The judge is a Judge0-compatible test server that compiles with the local g++ (tests only).
 * No database is involved: the feature has no persistence, which is itself asserted below.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { REPAIR_CHALLENGES, REPAIR_BY_ID, isRepairId } from "@/features/repair/challenges";
import { CHALLENGES } from "@/features/lab/registry";
import { SECRETS } from "@/server/repair/secret";
import { startFakeJudge0, type FakeJudge0 } from "./helpers/fake-judge0";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let svc: any;
let fake: FakeJudge0;
const fixture = (id: string) => REPAIR_BY_ID[id]!;

beforeAll(async () => {
  fake = await startFakeJudge0();
  process.env.DATABASE_URL ??= "postgresql://x:x@localhost:5432/x";
  process.env.JUDGE0_URL = fake.url;
  svc = await import("@/server/services/repair");
});
afterAll(async () => {
  await fake.close();
});

describe("challenge definitions", () => {
  it("has exactly four challenges that match the Counterexample Lab", () => {
    expect(REPAIR_CHALLENGES).toHaveLength(4);
    expect(new Set(REPAIR_CHALLENGES.map((c) => c.id)).size).toBe(4);
    for (const c of REPAIR_CHALLENGES) {
      expect(CHALLENGES.map((l) => l.id)).toContain(c.labId);
      expect(SECRETS[c.id], c.id).toBeDefined();
    }
    expect(isRepairId("greedy-coins")).toBe(true);
    expect(isRepairId("toString")).toBe(false);
    expect(isRepairId(undefined)).toBe(false);
  });
  it("is complete: statement, formats, constraints, flawed code, 3 samples, 3 hints, reflection", () => {
    for (const c of REPAIR_CHALLENGES) {
      for (const k of ["title", "objective", "statement", "inputFormat", "outputFormat", "constraints", "approach", "seems", "flawedCode"] as const) expect(c[k].length, `${c.id}.${k}`).toBeGreaterThan(10);
      expect(c.samples).toHaveLength(3);
      expect(c.timeLimitMs).toBeLessThanOrEqual(2000);
      const s = SECRETS[c.id]!;
      expect(s.hints).toHaveLength(3);
      for (const k of Object.keys(s.reflection) as Array<keyof typeof s.reflection>) expect(s.reflection[k].length).toBeGreaterThan(10);
    }
  });
  it("public sample answers agree with the independent reference", () => {
    for (const c of REPAIR_CHALLENGES) for (const s of c.samples) expect(SECRETS[c.id]!.reference(s.input), `${c.id} ${s.label}`).toBe(s.expected);
  });
  it("hidden tests are deterministic, non-trivial and disjoint from the samples", () => {
    for (const c of REPAIR_CHALLENGES) {
      const a = SECRETS[c.id]!.hidden();
      const b = SECRETS[c.id]!.hidden();
      expect(a).toEqual(b);
      expect(a.length).toBeGreaterThanOrEqual(10);
      const pub = new Set(c.samples.map((s) => s.input));
      for (const t of a) expect(pub.has(t.input)).toBe(false);
      expect(new Set(a.map((t) => t.expected)).size).toBeGreaterThan(1);
    }
  });
  it("hidden tests respect the stated constraints", () => {
    const within = (xs: number[], lo: number, hi: number) => xs.every((x) => x >= lo && x <= hi);
    const lines = (s: string) => s.trim().split("\n").map((l) => l.trim().split(/\s+/).map(Number));
    for (const t of SECRETS["greedy-coins"]!.hidden()) {
      const [[n, m], coins] = lines(t.input) as [number[], number[]];
      expect(n).toBe(coins!.length);
      expect(n! >= 1 && n! <= 50 && m! >= 1 && m! <= 10000 && within(coins!, 1, 1000)).toBe(true);
    }
    for (const t of SECRETS["max-subarray-boundary"]!.hidden()) {
      const [[n], a] = lines(t.input) as [number[], number[]];
      expect(n).toBe(a!.length);
      expect(n! >= 1 && n! <= 100000 && within(a!, -1e9, 1e9)).toBe(true);
    }
    for (const t of SECRETS["two-pointers-unsorted"]!.hidden()) {
      const [[n, tgt], a] = lines(t.input) as [number[], number[]];
      expect(n).toBe(a!.length);
      expect(n! >= 2 && n! <= 100000 && within(a!, -1e9, 1e9) && Math.abs(tgt!) <= 2e9).toBe(true);
    }
    for (const t of SECRETS["window-negatives"]!.hidden()) {
      const [[n, k], a] = lines(t.input) as [number[], number[]];
      expect(n).toBe(a!.length);
      expect(n! >= 1 && n! <= 2000 && within(a!, -1e6, 1e6) && Math.abs(k!) <= 1e9).toBe(true);
    }
  });
});

describe("references are correct (independent brute force)", () => {
  const rnd = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  it("coins: DP reference equals exhaustive search", () => {
    const r = rnd(11);
    for (let t = 0; t < 150; t++) {
      const coins = Array.from({ length: 1 + Math.floor(r() * 4) }, () => 1 + Math.floor(r() * 9));
      const m = 1 + Math.floor(r() * 30);
      let best = Infinity;
      const go = (rem: number, n: number) => {
        if (n >= best) return;
        if (rem === 0) return void (best = n);
        for (const c of coins) if (c <= rem) go(rem - c, n + 1);
      };
      go(m, 0);
      expect(SECRETS["greedy-coins"]!.reference(`${coins.length} ${m}\n${coins.join(" ")}\n`)).toBe(String(best === Infinity ? -1 : best));
    }
  });
  it("max subarray: prefix formulation equals O(n^3)", () => {
    const r = rnd(12);
    for (let t = 0; t < 150; t++) {
      const a = Array.from({ length: 1 + Math.floor(r() * 8) }, () => Math.floor(r() * 41) - 20);
      let b = -Infinity;
      for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) b = Math.max(b, a.slice(i, j + 1).reduce((x, y) => x + y, 0));
      expect(SECRETS["max-subarray-boundary"]!.reference(`${a.length}\n${a.join(" ")}\n`)).toBe(String(b));
    }
  });
  it("pair sum: hash reference equals all pairs", () => {
    const r = rnd(13);
    for (let t = 0; t < 150; t++) {
      const a = Array.from({ length: 2 + Math.floor(r() * 6) }, () => Math.floor(r() * 11) - 5);
      const tg = Math.floor(r() * 15) - 7;
      let yes = false;
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i]! + a[j]! === tg) yes = true;
      expect(SECRETS["two-pointers-unsorted"]!.reference(`${a.length} ${tg}\n${a.join(" ")}\n`)).toBe(yes ? "YES" : "NO");
    }
  });
  it("window: reference equals a recomputation from prefix sums", () => {
    const r = rnd(14);
    for (let t = 0; t < 150; t++) {
      const a = Array.from({ length: 1 + Math.floor(r() * 8) }, () => Math.floor(r() * 19) - 9);
      const k = Math.floor(r() * 20) - 6;
      const P = [0];
      a.forEach((x) => P.push(P[P.length - 1]! + x));
      let best = 0;
      for (let i = 0; i <= a.length; i++) for (let j = i + 1; j <= a.length; j++) if (P[j]! - P[i]! <= k) best = Math.max(best, j - i);
      expect(SECRETS["window-negatives"]!.reference(`${a.length} ${k}\n${a.join(" ")}\n`)).toBe(String(best));
    }
  });
});

describe("judging through the Judge0 protocol", () => {
  it.each(REPAIR_CHALLENGES.map((c) => [c.id] as const))("%s: the reference C++ solution is Accepted on every test and shows a reflection", async (id) => {
    const r = await svc.submitRepair("u", id, SECRETS[id]!.solution, "cpp17");
    expect(r.verdict).toBe("accepted");
    expect(r.passed).toBe(r.total);
    expect(r.hiddenPassed).toBe(r.hiddenTotal);
    expect(r.reflection).not.toBeNull();
  }, 120000);
  it.each(REPAIR_CHALLENGES.map((c) => [c.id] as const))("%s: the flawed program passes some samples, fails a public one and fails verification", async (id) => {
    const c = fixture(id);
    const run = await svc.runRepair("u", id, c.flawedCode, "cpp17");
    expect(run.compileError).toBeNull();
    const passed = run.cases.filter((x: { passed: boolean }) => x.passed).length;
    expect(passed).toBeGreaterThan(0);
    expect(passed).toBeLessThan(run.cases.length);
    const bad = run.cases.find((x: { passed: boolean }) => !x.passed);
    expect(bad.status).toBe("wrong_answer");
    expect(bad.expected).toBeTruthy();
    expect(bad.input).toBeTruthy();
    const sub = await svc.submitRepair("u", id, c.flawedCode, "cpp17");
    expect(sub.verdict).toBe("wrong_answer");
    expect(sub.reflection).toBeNull();
    expect(sub.hiddenFailure).toBe("wrong_answer");
    expect(sub.passed).toBeLessThan(sub.total);
  }, 120000);
  it("sample tests alone never prove correctness: a program that only answers the samples fails verification", async () => {
    const c = fixture("two-pointers-unsorted");
    const cheat = `#include <bits/stdc++.h>\nusing namespace std;\nint main(){int n;long long t;cin>>n>>t;vector<long long>a(n);for(auto&x:a)cin>>x;if(n<=5){cout<<"YES\\n";}else cout<<"NO\\n";}`;
    const run = await svc.runRepair("u", c.id, cheat, "cpp17");
    expect(run.cases.every((x: { passed: boolean }) => x.passed)).toBe(true);
    const sub = await svc.submitRepair("u", c.id, cheat, "cpp17");
    expect(sub.verdict).not.toBe("accepted");
    expect(sub.reflection).toBeNull();
  }, 60000);
  it("reports compilation errors for run and submit", async () => {
    const src = "int main( { return 0 }";
    const run = await svc.runRepair("u", "greedy-coins", src, "cpp17");
    expect(run.compileError).toBeTruthy();
    expect(run.cases).toEqual([]);
    const sub = await svc.submitRepair("u", "greedy-coins", src, "cpp17");
    expect(sub.verdict).toBe("compilation_error");
    expect(sub.compileOutput).toBeTruthy();
    expect(sub.reflection).toBeNull();
    expect(sub.passed).toBe(0);
  }, 60000);
  it("reports runtime errors and time limits", async () => {
    const rte = await svc.submitRepair("u", "greedy-coins", `#include <cstdlib>\nint main(){ std::abort(); }`, "cpp17");
    expect(rte.verdict).toBe("runtime_error");
    const tle = await svc.runRepair("u", "greedy-coins", `int main(){ for(;;){} }`, "cpp17");
    expect(tle.cases[0].status).toBe("time_limit_exceeded");
    expect(tle.cases.every((x: { passed: boolean }) => !x.passed)).toBe(true);
  }, 120000);
  it("treats malformed output as Wrong Answer", async () => {
    const r = await svc.runRepair("u", "greedy-coins", `#include <iostream>\nint main(){ std::cout << "banana"; }`, "cpp17");
    expect(r.cases.every((x: { status: string }) => x.status === "wrong_answer")).toBe(true);
  }, 60000);
  it("a duplicate submission gives the same result and records nothing", async () => {
    const a = await svc.submitRepair("u", "max-subarray-boundary", SECRETS["max-subarray-boundary"]!.solution, "cpp17");
    const b = await svc.submitRepair("u", "max-subarray-boundary", SECRETS["max-subarray-boundary"]!.solution, "cpp17");
    expect({ ...a, timeMs: 0, memoryKb: 0, publicCases: [] }).toEqual({ ...b, timeMs: 0, memoryKb: 0, publicCases: [] });
  }, 120000);
  it("maps judge outages to a 503 service error", async () => {
    const broken = await startFakeJudge0();
    const url = broken.url;
    await broken.close();
    vi.resetModules();
    process.env.JUDGE0_URL = url;
    // the env module caches, so load a fresh copy of the service graph
    const fresh = await import("@/server/services/repair");
    await expect(fresh.runRepair("u", "greedy-coins", "int main(){}", "cpp17")).rejects.toMatchObject({ status: 503 });
    process.env.JUDGE0_URL = fake.url;
  }, 60000);
});

describe("input validation", () => {
  it("rejects bad source, language, challenge and hint level", async () => {
    await expect(svc.runRepair("u", "greedy-coins", "", "cpp17")).rejects.toMatchObject({ status: 400 });
    await expect(svc.runRepair("u", "greedy-coins", 42, "cpp17")).rejects.toMatchObject({ status: 400 });
    await expect(svc.runRepair("u", "greedy-coins", "int main(){}", "python")).rejects.toMatchObject({ status: 400 });
    await expect(svc.submitRepair("u", "greedy-coins", "x".repeat(70 * 1024), "cpp17")).rejects.toMatchObject({ status: 413 });
    await expect(svc.runRepair("u", "nope", "int main(){}", "cpp17")).rejects.toMatchObject({ status: 404 });
    await expect(svc.runRepair("u", "__proto__", "int main(){}", "cpp17")).rejects.toMatchObject({ status: 404 });
    await expect(svc.submitRepair("u", undefined, "int main(){}", "cpp17")).rejects.toMatchObject({ status: 404 });
    for (const bad of [0, 4, 1.5, "1", null, NaN]) expect(() => svc.repairHint("greedy-coins", bad)).toThrow();
    expect(() => svc.repairHint("nope", 1)).toThrow();
  });
});

describe("hints and reveal", () => {
  it("serves three levels in order and never contains a hidden test", () => {
    for (const c of REPAIR_CHALLENGES) {
      const texts = [1, 2, 3].map((l) => svc.repairHint(c.id, l).text as string);
      expect(texts).toEqual(SECRETS[c.id]!.hints);
      expect(new Set(texts).size).toBe(3);
      for (const t of SECRETS[c.id]!.hidden()) for (const line of t.input.trim().split("\n")) if (line.length > 8) for (const h of texts) expect(h).not.toContain(line);
      // hint 1 points at an edge case without handing over the repair code
      expect(texts[0]).not.toMatch(/dp\[|cur = max|sort\(|for \(int l/);
    }
  });
  it("the reference solution is separate from the public bundle", () => {
    for (const c of REPAIR_CHALLENGES) {
      const sol = svc.repairSolution(c.id);
      expect(sol.solution).toContain("int main");
      expect(sol.solution).not.toBe(c.flawedCode);
      expect(sol.reflection.complexity.length).toBeGreaterThan(10);
    }
  });
});

describe("no hidden-test leakage", () => {
  it("submit results contain no hidden input or output, only counts and a failure kind", async () => {
    for (const c of REPAIR_CHALLENGES) {
      const sub = await svc.submitRepair("u", c.id, c.flawedCode, "cpp17");
      const json = JSON.stringify(sub);
      for (const t of SECRETS[c.id]!.hidden()) for (const line of t.input.trim().split("\n")) if (line.length > 12) expect(json).not.toContain(line);
      expect(Object.keys(sub).sort()).toEqual(["compileOutput", "hiddenFailure", "hiddenPassed", "hiddenTotal", "memoryKb", "passed", "publicCases", "publicPassed", "publicTotal", "reflection", "timeMs", "total", "verdict"]);
      expect(sub.publicCases).toHaveLength(3);
    }
  }, 120000);
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  it("client-visible code never imports the secret module", () => {
    const files = [...walk("src/features"), ...walk("src/components"), ...walk("src/app").filter((f) => !f.includes("/api/") && !f.endsWith("counterexample-lab/page.tsx"))];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/@\/server\/repair|server\/repair\/secret/);
    }
  });
  it("the public definitions contain no hidden test text or reference solution", () => {
    const pub = readFileSync("src/features/repair/challenges.ts", "utf8");
    for (const c of REPAIR_CHALLENGES) {
      for (const t of SECRETS[c.id]!.hidden()) for (const line of t.input.trim().split("\n")) if (line.length > 12) expect(pub).not.toContain(line);
      expect(pub).not.toContain(SECRETS[c.id]!.solution);
    }
  });
});

describe("protections and side effects", () => {
  it("every route is authenticated and rate limited through the shared handler", () => {
    const limits: Record<string, number> = { run: 20, submit: 8, hint: 60, solution: 10 };
    for (const [name, max] of Object.entries(limits)) {
      const src = readFileSync(`src/app/api/repair/[id]/${name}/route.ts`, "utf8");
      expect(src).toContain("handle(");
      const m = src.match(/limit:\s*(\d+),\s*bucket:\s*"repair-(\w+)"/);
      expect(m, name).not.toBeNull();
      expect(Number(m![1])).toBeLessThanOrEqual(max);
      expect(m![2]).toBe(name);
    }
  });
  it("the service has no database, progression or reward access", () => {
    const src = readFileSync("src/server/services/repair.ts", "utf8");
    const imports = src.split("\n").filter((l) => /^\s*import\b/.test(l)).join("\n");
    expect(imports).not.toMatch(/db\/client|drizzle|xp|hearts|gamification|engagement|path|reviews|activity|placement/i);
    expect(src).not.toMatch(/getDb\(|\.insert\(|\.update\(|\.delete\(|awardXp|changeHearts/);
  });
  it("the workshop UI stores nothing on the server and never calls progression APIs", () => {
    const src = readFileSync("src/components/repair/workshop.tsx", "utf8");
    expect(src).not.toMatch(/\/api\/(?!repair\/)/);
  });
});
