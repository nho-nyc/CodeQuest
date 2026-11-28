import { describe, expect, it } from "vitest";
import { draftKey, loadDraft, MAX_DRAFT_CHARS, saveDraft, type StorageLike } from "@/features/repair/draft";

/** Minimal Storage stand-in. */
function fakeStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}
const CODE = "#include <bits/stdc++.h>\nint main(){}\n";

describe("repair draft storage", () => {
  it("survives a refresh (save, then load in a new page)", () => {
    const s = fakeStorage();
    expect(saveDraft(s, "u1", "greedy-coins", CODE)).toBe("saved");
    expect(loadDraft(s, "u1", "greedy-coins")).toBe(CODE);
  });
  it("keeps challenges apart: switching never overwrites another draft", () => {
    const s = fakeStorage();
    saveDraft(s, "u1", "greedy-coins", "A");
    saveDraft(s, "u1", "window-negatives", "B");
    saveDraft(s, "u1", "greedy-coins", "A2");
    expect(loadDraft(s, "u1", "greedy-coins")).toBe("A2");
    expect(loadDraft(s, "u1", "window-negatives")).toBe("B");
    expect(loadDraft(s, "u1", "max-subarray-boundary")).toBeNull();
  });
  it("is private per user on a shared device, and survives logout and login of the same user", () => {
    const s = fakeStorage();
    saveDraft(s, "alice", "greedy-coins", "alice's code");
    expect(loadDraft(s, "bob", "greedy-coins")).toBeNull(); // Bob logs in on the same browser
    saveDraft(s, "bob", "greedy-coins", "bob's code");
    expect(loadDraft(s, "alice", "greedy-coins")).toBe("alice's code"); // Alice comes back
    expect(loadDraft(s, "bob", "greedy-coins")).toBe("bob's code");
  });
  it("ignores invalid JSON, wrong shapes and wrong versions without throwing or deleting", () => {
    const s = fakeStorage();
    const k = draftKey("u1", "greedy-coins");
    for (const bad of ["{not json", "null", "42", '"just a string"', "[]", '{"v":2,"code":"x"}', '{"v":1,"code":42}', '{"v":1}', ""]) {
      s.data.set(k, bad);
      expect(loadDraft(s, "u1", "greedy-coins")).toBeNull();
      expect(s.data.get(k)).toBe(bad); // never deleted
    }
  });
  it("never reads or deletes the old, ownerless format", () => {
    const s = fakeStorage();
    s.data.set("cq:repair:greedy-coins", "legacy code of an unknown user");
    expect(loadDraft(s, "u1", "greedy-coins")).toBeNull();
    saveDraft(s, "u1", "greedy-coins", CODE);
    expect(s.data.get("cq:repair:greedy-coins")).toBe("legacy code of an unknown user");
  });
  it("treats an empty or whitespace-only draft as no draft (and a cleared editor removes the saved one)", () => {
    const s = fakeStorage();
    saveDraft(s, "u1", "greedy-coins", CODE);
    expect(saveDraft(s, "u1", "greedy-coins", "   \n")).toBe("cleared");
    expect(loadDraft(s, "u1", "greedy-coins")).toBeNull();
    s.data.set(draftKey("u1", "greedy-coins"), JSON.stringify({ v: 1, code: "  ", savedAt: 1 }));
    expect(loadDraft(s, "u1", "greedy-coins")).toBeNull();
  });
  it("does not store or load oversized drafts, and keeps the previous good draft", () => {
    const s = fakeStorage();
    saveDraft(s, "u1", "greedy-coins", CODE);
    expect(saveDraft(s, "u1", "greedy-coins", "x".repeat(MAX_DRAFT_CHARS + 1))).toBe("skipped");
    expect(loadDraft(s, "u1", "greedy-coins")).toBe(CODE);
    const edge = "y".repeat(MAX_DRAFT_CHARS);
    expect(saveDraft(s, "u1", "greedy-coins", edge)).toBe("saved");
    expect(loadDraft(s, "u1", "greedy-coins")).toBe(edge);
    s.data.set(draftKey("u1", "greedy-coins"), JSON.stringify({ v: 1, code: "z".repeat(MAX_DRAFT_CHARS + 5), savedAt: 1 }));
    expect(loadDraft(s, "u1", "greedy-coins")).toBeNull();
  });
  it("survives unavailable or full storage", () => {
    const throwing: StorageLike = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("blocked"); } };
    expect(loadDraft(throwing, "u1", "greedy-coins")).toBeNull();
    expect(saveDraft(throwing, "u1", "greedy-coins", CODE)).toBe("skipped");
    expect(loadDraft(null, "u1", "greedy-coins")).toBeNull();
    expect(saveDraft(null, "u1", "greedy-coins", CODE)).toBe("skipped");
  });
  it("stores only the learner's code in a versioned envelope: no tokens, credentials or results", () => {
    const s = fakeStorage();
    saveDraft(s, "u1", "greedy-coins", CODE, 1234);
    expect([...s.data.keys()]).toEqual(["cq:repair:v1:u1:greedy-coins"]);
    expect(JSON.parse(s.data.get("cq:repair:v1:u1:greedy-coins")!)).toEqual({ v: 1, code: CODE, savedAt: 1234 });
  });
});
