export type Language = "cpp17" | "cpp20";
export const LANGUAGES: Array<{ id: Language; label: string }> = [
  { id: "cpp17", label: "C++17" },
  { id: "cpp20", label: "C++20" },
];

export type RunStatus = "ok" | "time_limit" | "memory_limit" | "runtime_error" | "compilation_error" | "internal_error";

/** Raw outcome of running one program on one input. It says nothing about correctness of the output. */
export type TestRun = {
  status: RunStatus;
  stdout: string;
  stderr: string;
  compileOutput: string;
  timeMs: number | null;
  memoryKb: number | null;
};

export type Limits = { timeMs: number; memoryMb: number };

export interface Judge {
  /** Human-readable name of the backend, for logs. */
  readonly name: string;
  /** Compile `source` and run it once per input. Results keep the order of `inputs`. */
  run(source: string, language: Language, inputs: string[], limits: Limits): Promise<TestRun[]>;
}

export class JudgeUnavailableError extends Error {
  /** Operational detail for server logs only. It is never part of `message`, which is shown to learners. */
  readonly detail: string;
  constructor(detail = "unavailable") {
    super("The code judge is not available right now. Please try again in a moment.");
    this.detail = detail;
  }
}
