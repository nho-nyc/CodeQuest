import { describe, expect, it } from "vitest";
import { explainCompileOutput, VERDICT_HELP } from "@/components/practice/verdict-help";

describe("verdict help", () => {
  it("covers every failing verdict the judge can return", () => {
    for (const v of ["wrong_answer", "time_limit_exceeded", "runtime_error", "memory_limit_exceeded", "compilation_error", "internal_error"]) {
      expect(VERDICT_HELP[v]?.meaning.length).toBeGreaterThan(20);
      expect(VERDICT_HELP[v]?.tips.length).toBeGreaterThan(0);
    }
    expect(VERDICT_HELP.accepted).toBeUndefined();
  });
  it("explains common compiler errors in plain words", () => {
    expect(explainCompileOutput("main.cpp:5:5: error: 'x' was not declared in this scope")[0]).toMatch(/declared|misspelled/);
    expect(explainCompileOutput("main.cpp:6:1: error: expected ';' before 'return'")[0]).toMatch(/semicolon/);
    expect(explainCompileOutput("main.cpp:3:1: error: 'vector' does not name a type")[0]).toMatch(/#include/);
    expect(explainCompileOutput("something unrelated")).toEqual([]);
  });
});
