import type { ProblemSeed } from "./types";

/** Keeps a problem's hidden tests inside the storage budget: always keeps the two largest tests and the first 8, drops other big ones. */
export function fitBudget(p: ProblemSeed, totalCap = 1_500_000, minTests = 8): ProblemSeed {
  return {
    ...p,
    hidden: () => {
      let tests = p.hidden();
      const size = (xs: string[]) => xs.reduce((a, t) => a + t.length, 0);
      const keep = new Set([...tests].sort((a, b) => b.length - a.length).slice(0, 2));
      while (size(tests) > totalCap && tests.length > minTests) {
        const cand = tests.filter((t) => !keep.has(t)).sort((a, b) => b.length - a.length)[0];
        if (!cand) break;
        tests = tests.filter((t) => t !== cand);
      }
      return tests;
    },
  };
}
