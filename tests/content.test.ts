import { describe, expect, it } from "vitest";
import { WORLDS } from "@/content";
import { EXTERNAL_BY_UNIT } from "@/content/external-problems";

describe("curriculum content", () => {
  const units = WORLDS.flatMap((w) => w.units);
  it("has unique slugs and enough questions per lesson", () => {
    expect(new Set(WORLDS.map((w) => w.slug)).size).toBe(WORLDS.length);
    for (const w of WORLDS) {
      expect(new Set(w.units.map((u) => u.slug)).size).toBe(w.units.length);
      for (const u of w.units) {
        expect(new Set(u.lessons.map((l) => l.slug)).size).toBe(u.lessons.length);
        for (const l of u.lessons) expect(l.questions.length).toBeGreaterThanOrEqual(5);
      }
    }
  });
  it("every unit has a pool large enough for a skip test", () => {
    for (const u of units) expect(u.lessons.reduce((s, l) => s + l.questions.length, 0)).toBeGreaterThanOrEqual(6);
  });
  it("external problem links point at known judges and reference real unit slugs", () => {
    const slugs = new Set(units.map((u) => u.slug));
    const hosts = ["cses.fi", "codeforces.com", "atcoder.jp", "oj.vnoi.info"];
    for (const [slug, list] of Object.entries(EXTERNAL_BY_UNIT)) {
      expect(slugs.has(slug), slug).toBe(true);
      expect(new Set(list.map((p) => p.url)).size).toBe(list.length);
      for (const p of list) expect(hosts).toContain(new URL(p.url).hostname);
    }
  });
});

import { PROBLEMS } from "@/content/problems";
import { canonicalTag, canonicalTags } from "@/content/problems/tags";

describe("problem tags", () => {
  it("merges duplicate spellings", () => {
    expect(canonicalTag("Binary Search")).toBe("binary-search");
    expect(canonicalTag("binary search on answer")).toBe("binary-search");
    expect(canonicalTag("dynamic programming")).toBe("dp");
    expect(canonicalTags(["prefix sums", "prefix-sum", "arrays"])).toEqual(["prefix-sums", "arrays"]);
  });
  it("library tags are canonical, idempotent and not fragmented", () => {
    const all = new Set<string>();
    for (const p of PROBLEMS) {
      expect(p.tags.length).toBeGreaterThan(0);
      expect(canonicalTags(p.tags)).toEqual(p.tags);
      p.tags.forEach((t) => all.add(t));
    }
    expect(all.size).toBeLessThanOrEqual(70);
    expect(all.has("binary search")).toBe(false);
  });
});
