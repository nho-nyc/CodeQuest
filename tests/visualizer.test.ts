import { describe, expect, it } from "vitest";
import { WORLDS } from "@/content";
import { MAX_STEPS, atEnd, delayFor, initialPlayer, playerReducer, type Player } from "@/features/visualizer/engine";
import { runTwoPointers } from "@/features/visualizer/two-pointers";
import { runSlidingWindow } from "@/features/visualizer/sliding-window";
import { parseOps, runContainer } from "@/features/visualizer/containers";
import { BFS_DEFAULT, parseGraph, runBfs, type BfsState } from "@/features/visualizer/bfs";
import { ALGORITHMS, ALGORITHM_BY_ID, VISUALIZER_BY_LESSON } from "@/features/visualizer/registry";

const rng = (seed: number) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
describe("player (playback is separate from the algorithms)", () => {
  const p0 = initialPlayer(5);
  it("moves forward and backward and clamps at both ends", () => {
    let p = p0;
    for (let i = 0; i < 9; i++) p = playerReducer(p, { type: "next" });
    expect(p.index).toBe(4);
    for (let i = 0; i < 9; i++) p = playerReducer(p, { type: "prev" });
    expect(p.index).toBe(0);
  });
  it("manual stepping pauses playback; reset returns to the start", () => {
    let p: Player = playerReducer(p0, { type: "play" });
    expect(p.playing).toBe(true);
    p = playerReducer(p, { type: "next" });
    expect(p.playing).toBe(false);
    p = playerReducer(playerReducer(p, { type: "seek", index: 3 }), { type: "reset" });
    expect(p).toMatchObject({ index: 0, playing: false });
  });
  it("tick advances only while playing and stops at the end", () => {
    expect(playerReducer(p0, { type: "tick" })).toBe(p0);
    let p = playerReducer(p0, { type: "play" });
    for (let i = 0; i < 10; i++) p = playerReducer(p, { type: "tick" });
    expect(p.index).toBe(4);
    expect(p.playing).toBe(false);
    expect(atEnd(p)).toBe(true);
  });
  it("playing from the end restarts; seek is clamped and tolerates junk", () => {
    const end = { ...p0, index: 4 };
    expect(playerReducer(end, { type: "play" })).toMatchObject({ index: 0, playing: true });
    expect(playerReducer(p0, { type: "seek", index: 99 }).index).toBe(4);
    expect(playerReducer(p0, { type: "seek", index: -5 }).index).toBe(0);
    expect(playerReducer(p0, { type: "seek", index: NaN }).index).toBe(0);
  });
  it("speed changes the delay and survives loading a new trace", () => {
    expect(delayFor(2)).toBeLessThan(delayFor(1));
    expect(delayFor(0.5)).toBeGreaterThan(delayFor(1));
    const p = playerReducer(playerReducer(p0, { type: "speed", speed: 2 }), { type: "load", total: 9 });
    expect(p).toMatchObject({ index: 0, total: 9, speed: 2, playing: false });
    expect(initialPlayer(0).total).toBe(1);
  });
  it("a single-step trace cannot play", () => {
    expect(playerReducer(initialPlayer(1), { type: "play" }).playing).toBe(false);
  });
});

describe("two pointers", () => {
  const run = (array: string, target: string) => runTwoPointers({ array, target });
  it("the spec example (target 10) finds 1 + 9 at once, and the default (12) moves both pointers", () => {
    const r = run("1, 2, 4, 6, 8, 9", "10");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const last = r.steps[r.steps.length - 1]!.state;
    expect(last.verdict).toBe("found");
    expect(last.arr[last.l]! + last.arr[last.r]!).toBe(10);
    expect(r.steps[0]!.state).toMatchObject({ l: 0, r: 5, verdict: "start" });
    const d = run("1, 2, 4, 6, 8, 9", "12");
    if (!d.ok) throw new Error("x");
    const verdicts = d.steps.map((s) => s.state.verdict);
    expect(verdicts).toContain("too-small");
    expect(verdicts).toContain("too-large");
    expect(d.steps[d.steps.length - 1]!.state).toMatchObject({ verdict: "found", l: 2, r: 4 });
  });
  it("agrees with brute force on random sorted arrays", () => {
    const rand = rng(7);
    for (let t = 0; t < 300; t++) {
      const n = 2 + Math.floor(rand() * 10);
      const arr = Array.from({ length: n }, () => Math.floor(rand() * 40) - 10).sort((a, b) => a - b);
      const target = Math.floor(rand() * 50) - 15;
      const r = run(arr.join(","), String(target));
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      let exists = false;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (arr[i]! + arr[j]! === target) exists = true;
      const last = r.steps[r.steps.length - 1]!.state;
      expect(last.verdict === "found").toBe(exists);
      if (exists) expect(arr[last.l]! + arr[last.r]!).toBe(target);
      expect(r.steps.length).toBeLessThanOrEqual(1 + 2 * n);
    }
  });
  it("pointers only move inward, never skipping a pair that could match", () => {
    const r = run("1, 3, 3, 5, 9", "12");
    if (!r.ok) throw new Error("x");
    for (let i = 1; i < r.steps.length; i++) {
      expect(r.steps[i]!.state.l).toBeGreaterThanOrEqual(r.steps[i - 1]!.state.l);
      expect(r.steps[i]!.state.r).toBeLessThanOrEqual(r.steps[i - 1]!.state.r);
    }
  });
  it("reports not found and handles minimum size", () => {
    const r = run("1, 2", "10");
    if (!r.ok) throw new Error("x");
    expect(r.steps[r.steps.length - 1]!.state.verdict).toBe("none");
  });
  it("validates input with specific messages", () => {
    expect(run("", "5")).toMatchObject({ ok: false });
    expect(run("1", "5")).toMatchObject({ ok: false });
    expect((run("3, 1, 2", "4") as { errors: string[] }).errors[0]).toContain("sorted");
    expect((run("1, 2, x", "4") as { errors: string[] }).errors[0]).toContain("not a whole number");
    expect((run("1, 2, 3", "abc") as { errors: string[] }).errors[0]).toContain("Target");
    expect((run("1, 2, 300", "4") as { errors: string[] }).errors[0]).toContain("outside");
    expect(run(Array.from({ length: 13 }, (_, i) => i).join(","), "4")).toMatchObject({ ok: false });
    const both = run("x", "y") as { errors: string[] };
    expect(both.errors.length).toBe(2);
  });
});

describe("sliding window", () => {
  const run = (array: string, k: string) => runSlidingWindow({ array, k });
  it("matches brute force and reports where the best window is", () => {
    const rand = rng(11);
    for (let t = 0; t < 300; t++) {
      const n = 2 + Math.floor(rand() * 12);
      const arr = Array.from({ length: n }, () => Math.floor(rand() * 40) - 15);
      const k = 1 + Math.floor(rand() * n);
      const r = run(arr.join(","), String(k));
      if (!r.ok) throw new Error(r.errors.join());
      let best = -Infinity;
      for (let i = 0; i + k <= n; i++) best = Math.max(best, arr.slice(i, i + k).reduce((a, b) => a + b, 0));
      const last = r.steps[r.steps.length - 1]!.state;
      expect(last.phase).toBe("done");
      expect(last.best).toBe(best);
      expect(arr.slice(last.bestStart!, last.bestStart! + k).reduce((a, b) => a + b, 0)).toBe(best);
    }
  });
  it("every slide changes the sum by exactly entering - leaving and the window moves by one", () => {
    const r = run("2, 1, 5, 1, 3, 2", "3");
    if (!r.ok) throw new Error("x");
    const slides = r.steps.filter((s) => s.state.phase === "slide");
    expect(slides).toHaveLength(3);
    let prev = r.steps.find((s) => s.state.phase === "built")!.state;
    for (const s of slides) {
      expect(s.state.sum).toBe(prev.sum! + s.state.arr[s.state.entering!]! - s.state.arr[s.state.leaving!]!);
      expect(s.state.start).toBe(prev.start + 1);
      prev = s.state;
    }
  });
  it("k equal to n has a single window and k = 1 is the maximum element", () => {
    const whole = run("4, -1, 2", "3");
    if (!whole.ok) throw new Error("x");
    expect(whole.steps.filter((s) => s.state.phase === "slide")).toHaveLength(0);
    expect(whole.steps[whole.steps.length - 1]!.state.best).toBe(5);
    const one = run("4, -1, 9, 2", "1");
    if (!one.ok) throw new Error("x");
    expect(one.steps[one.steps.length - 1]!.state.best).toBe(9);
  });
  it("validates k against the array length", () => {
    expect(run("1, 2, 3", "4")).toMatchObject({ ok: false });
    expect(run("1, 2, 3", "0")).toMatchObject({ ok: false });
    expect(run("1, 2, 3", "1.5")).toMatchObject({ ok: false });
    expect(run("1", "1")).toMatchObject({ ok: false });
  });
});

describe("stack and queue", () => {
  const model = (kind: "stack" | "queue", ops: string) => {
    const items: number[] = [];
    for (const o of ops.split(",").map((s) => s.trim())) {
      const [n, v] = o.split(" ");
      if (n === "push") items.push(Number(v));
      else if (n === "pop" && items.length) {
        if (kind === "stack") items.pop();
        else items.shift();
      }
    }
    return items;
  };
  it("stack is LIFO: the default example pops in reverse push order", () => {
    const r = runContainer("stack", { ops: "push 1, push 2, push 3, pop, pop, pop" });
    if (!r.ok) throw new Error("x");
    const removed = r.steps.map((s) => s.state.removed).filter((x) => x !== null);
    expect(removed).toEqual([3, 2, 1]);
    expect(r.steps[r.steps.length - 1]!.state.items).toEqual([]);
  });
  it("queue is FIFO: pops in push order", () => {
    const r = runContainer("queue", { ops: "push 1, push 2, push 3, pop, pop, pop" });
    if (!r.ok) throw new Error("x");
    expect(r.steps.map((s) => s.state.removed).filter((x) => x !== null)).toEqual([1, 2, 3]);
  });
  it("final contents match a reference model on random operation sequences", () => {
    const rand = rng(5);
    for (const kind of ["stack", "queue"] as const) {
      for (let t = 0; t < 200; t++) {
        const names = kind === "stack" ? ["push", "pop", "top", "empty"] : ["push", "pop", "front", "back", "empty"];
        const ops = Array.from({ length: 1 + Math.floor(rand() * 12) }, () => {
          const n = names[Math.floor(rand() * names.length)]!;
          return n === "push" ? `push ${Math.floor(rand() * 100)}` : n;
        }).join(", ");
        const r = runContainer(kind, { ops });
        if (!r.ok) continue; // too many values at once is rejected by validation
        expect(r.steps[r.steps.length - 1]!.state.items).toEqual(model(kind, ops));
      }
    }
  });
  it("top/front/back/empty report values without changing the container", () => {
    const r = runContainer("queue", { ops: "push 4, push 9, front, back, empty" });
    if (!r.ok) throw new Error("x");
    const s = r.steps;
    expect(s[3]!.state.result).toBe("4");
    expect(s[4]!.state.result).toBe("9");
    expect(s[5]!.state.result).toBe("false");
    expect(s[5]!.state.items).toEqual([4, 9]);
    expect(runContainer("stack", { ops: "empty" }).ok && (runContainer("stack", { ops: "empty" }) as { steps: Array<{ state: { result: string | null } }> }).steps[1]!.state.result).toBe("true");
  });
  it("popping or reading an empty container is a warning step, not a crash or a state change", () => {
    for (const op of ["pop", "top"]) {
      const r = runContainer("stack", { ops: `${op}, push 1` });
      if (!r.ok) throw new Error("x");
      expect(r.steps[1]!.state.warning).toBe(true);
      expect(r.steps[1]!.state.items).toEqual([]);
      expect(r.steps[1]!.tone).toBe("warn");
    }
    const q = runContainer("queue", { ops: "front" });
    if (!q.ok) throw new Error("x");
    expect(q.steps[1]!.state.warning).toBe(true);
  });
  it("validates operations", () => {
    expect(parseOps("", "stack")).toMatchObject({ ok: false });
    expect(parseOps("push", "stack")).toMatchObject({ ok: false });
    expect(parseOps("push x", "stack")).toMatchObject({ ok: false });
    expect(parseOps("front", "stack")).toMatchObject({ ok: false }); // not a stack operation
    expect(parseOps("top", "queue")).toMatchObject({ ok: false }); // not a queue operation
    expect(parseOps("pop 3", "stack")).toMatchObject({ ok: false });
    expect(parseOps("push 5000", "stack")).toMatchObject({ ok: false });
    expect(parseOps(Array(21).fill("pop").join(","), "stack")).toMatchObject({ ok: false });
    expect(parseOps(Array(11).fill("push 1").join(","), "queue")).toMatchObject({ ok: false });
    expect(parseOps("PUSH 3 ,  Pop", "stack")).toMatchObject({ ok: true });
    expect(parseOps(Array(10).fill("push 1").concat(["pop", "push 2"]).join(","), "stack")).toMatchObject({ ok: true });
  });
});

describe("BFS", () => {
  const refDist = (n: number, edges: Array<[number, number]>, s: number) => {
    const d = Array<number>(n).fill(-1);
    d[s] = 0;
    for (let round = 0; round < n; round++) for (const [a, b] of edges) {
      if (d[a]! >= 0 && (d[b]! < 0 || d[b]! > d[a]! + 1)) d[b] = d[a]! + 1;
      if (d[b]! >= 0 && (d[a]! < 0 || d[a]! > d[b]! + 1)) d[a] = d[b]! + 1;
    }
    return d;
  };
  it("default graph: distances, visit order and level-by-level behaviour", () => {
    const r = runBfs({ ...BFS_DEFAULT });
    if (!r.ok) throw new Error(r.errors.join());
    const last = r.steps[r.steps.length - 1]!.state;
    expect(last.dist).toEqual([0, 1, 1, 2, 2, 2, 3]);
    expect(last.order).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (let i = 1; i < last.order.length; i++) expect(last.dist[last.order[i]!]!).toBeGreaterThanOrEqual(last.dist[last.order[i - 1]!]!);
  });
  it("distances equal an independent shortest-path computation on random graphs", () => {
    const rand = rng(3);
    for (let t = 0; t < 300; t++) {
      const n = 2 + Math.floor(rand() * 7);
      const all: Array<[number, number]> = [];
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (rand() < 0.35) all.push([a, b]);
      if (all.length === 0 || all.length > 14) continue;
      const s = Math.floor(rand() * n);
      const r = runBfs({ vertices: String(n), edges: all.map(([a, b]) => `${a}-${b}`).join(", "), start: String(s) });
      if (!r.ok) throw new Error(r.errors.join());
      const last = r.steps[r.steps.length - 1]!.state;
      expect(last.dist).toEqual(refDist(n, all, s));
      expect(last.order.length).toBe(last.dist.filter((d) => d >= 0).length);
    }
  });
  it("each vertex is discovered once, with dist = parent + 1, and queue holds discovered-not-processed vertices", () => {
    const r = runBfs({ ...BFS_DEFAULT, start: "3" });
    if (!r.ok) throw new Error("x");
    const discovered = r.steps.map((s) => s.state).filter((s) => s.phase === "look-new").map((s) => s.discovered!);
    expect(new Set(discovered).size).toBe(discovered.length);
    for (const st of r.steps.map((s) => s.state).filter((s) => s.phase === "look-new")) expect(st.dist[st.discovered!]).toBe(st.dist[st.current!]! + 1);
    for (const st of r.steps.map((s) => s.state)) for (const v of st.queue) expect(st.dist[v]).toBeGreaterThanOrEqual(0);
  });
  it("unreachable vertices stay at -1 and the final step says so", () => {
    const r = runBfs({ vertices: "5", edges: "0-1, 3-4", start: "0" });
    if (!r.ok) throw new Error("x");
    const last = r.steps[r.steps.length - 1]!;
    expect(last.state.dist).toEqual([0, 1, -1, -1, -1]);
    expect(last.what).toContain("Not reachable");
  });
  it("uses an adjacency list with sorted neighbours, built from undirected edges", () => {
    const r = runBfs({ vertices: "4", edges: "2-0, 0-1, 3-0", start: "0" });
    if (!r.ok) throw new Error("x");
    expect(r.steps[0]!.state.adj).toEqual([[1, 2, 3], [0], [0], [0]]);
    expect(r.steps[0]!.state.edges).toEqual([[0, 2], [0, 1], [0, 3]]);
  });
  it("validates the graph and the start vertex", () => {
    expect(parseGraph("1", "0-1")).toMatchObject({ ok: false });
    expect(parseGraph("9", "0-1")).toMatchObject({ ok: false });
    expect(parseGraph("4", "")).toMatchObject({ ok: false });
    expect(parseGraph("4", "0-4")).toMatchObject({ ok: false });
    expect(parseGraph("4", "1-1")).toMatchObject({ ok: false });
    expect(parseGraph("4", "0-1, 1-0")).toMatchObject({ ok: false });
    expect(parseGraph("4", "0,1")).toMatchObject({ ok: false });
    expect(parseGraph("4", Array(15).fill("0-1").join(","))).toMatchObject({ ok: false });
    expect(runBfs({ vertices: "4", edges: "0-1", start: "4" })).toMatchObject({ ok: false });
    expect(runBfs({ vertices: "4", edges: "0-1", start: "-1" })).toMatchObject({ ok: false });
    expect(runBfs({ vertices: "4", edges: "0-1", start: "x" })).toMatchObject({ ok: false });
    expect(runBfs({ vertices: "x", edges: "0-1", start: "0" })).toMatchObject({ ok: false });
  });
  it("every starting vertex of the default graph works", () => {
    for (let s = 0; s < 7; s++) {
      const r = runBfs({ ...BFS_DEFAULT, start: String(s) });
      if (!r.ok) throw new Error("x");
      expect((r.steps[r.steps.length - 1]!.state as BfsState).dist[s]).toBe(0);
    }
  });
});

describe("registry, determinism and curriculum links", () => {
  it("every algorithm runs on its defaults, deterministically, with valid line numbers and text", () => {
    expect(ALGORITHMS.map((a) => a.id)).toEqual(["two-pointers", "sliding-window", "stack", "queue", "bfs"]);
    for (const a of ALGORITHMS) {
      const one = a.run(a.defaults);
      const two = a.run({ ...a.defaults });
      expect(JSON.stringify(one)).toBe(JSON.stringify(two));
      expect(one.ok).toBe(true);
      if (!one.ok) continue;
      expect(one.steps.length).toBeGreaterThan(2);
      expect(one.steps.length).toBeLessThanOrEqual(MAX_STEPS);
      for (const s of one.steps) {
        expect(s.what.length).toBeGreaterThan(10);
        expect(s.why.length).toBeGreaterThan(10);
        if (s.line !== null) {
          expect(s.line).toBeGreaterThanOrEqual(0);
          expect(s.line).toBeLessThan(a.code.length);
        }
      }
      for (const f of a.fields) expect(a.defaults[f.key]).toBeDefined();
      expect(a.time && a.space && a.seeing && a.insight && a.complexityNote).toBeTruthy();
    }
  });
  it("missing fields fall back to defaults and never throw on junk", () => {
    for (const a of ALGORITHMS) {
      expect(a.run({}).ok).toBe(true);
      for (const junk of ["", "   ", "\u0000", "💥", "9".repeat(5000), "-", ",,,,", "1e9"]) {
        const v = Object.fromEntries(a.fields.map((f) => [f.key, junk]));
        expect(() => a.run(v)).not.toThrow();
        expect(a.run(v).ok).toBe(false);
      }
    }
  });
  it("steps never share mutable state (going back shows what was shown before)", () => {
    const r = ALGORITHM_BY_ID["bfs"].run({});
    if (!r.ok) throw new Error("x");
    const frozen = JSON.stringify(r.steps);
    for (const st of r.steps) void (st.state as BfsState).queue.length;
    expect(JSON.stringify(r.steps)).toBe(frozen);
    const queues = r.steps.map((s) => (s.state as BfsState).queue);
    expect(new Set(queues).size).toBe(queues.length);
  });
  it("lesson links point at real, uniquely named lessons", () => {
    const lessons = WORLDS.flatMap((w) => w.units.flatMap((u) => u.lessons.map((l) => ({ unit: u.slug, slug: l.slug }))));
    for (const [slug, id] of Object.entries(VISUALIZER_BY_LESSON)) {
      expect(lessons.filter((l) => l.slug === slug)).toHaveLength(1);
      expect(ALGORITHM_BY_ID[id]).toBeDefined();
    }
  });
});
