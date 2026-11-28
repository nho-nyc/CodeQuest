import { Judge, JudgeUnavailableError, type Language, type Limits, type RunStatus, type TestRun } from "./types";

/**
 * Judge0 (CE or RapidAPI) client using the batch API.
 * https://ce.judge0.com/  (POST /submissions/batch, GET /submissions/batch)
 *
 * Each test is a separate Judge0 submission, so every test is compiled and run in Judge0's own sandbox
 * (isolate): CPU time, wall time, memory, process and filesystem limits are enforced there. No user code is
 * executed in this application's process.
 */
export type Judge0Config = {
  baseUrl: string;
  /** X-Auth-Token for self-hosted instances that enable authentication. */
  authToken?: string;
  /** RapidAPI credentials (alternative to authToken). */
  rapidApiKey?: string;
  rapidApiHost?: string;
  languageIds: Record<Language, number>;
  pollTimeoutMs?: number;
  fetchImpl?: typeof fetch;
};

type RawResult = {
  token: string;
  status: { id: number; description: string };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
};

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s: string | null | undefined) => (s ? Buffer.from(s, "base64").toString("utf8") : "");
const BATCH = 20; // Judge0 default MAX_SUBMISSION_BATCH_SIZE
const COMPILER_OPTIONS: Record<Language, string> = { cpp17: "-std=c++17 -O2", cpp20: "-std=c++20 -O2" };
const MAX_CAPTURED = 64 * 1024; // keep at most 64 KB of any stream

const clip = (s: string) => (s.length > MAX_CAPTURED ? `${s.slice(0, MAX_CAPTURED)}\n[output truncated]` : s);

export function mapStatus(statusId: number, memoryKb: number | null, limits: Limits): RunStatus {
  if (memoryKb !== null && memoryKb > limits.memoryMb * 1024) return "memory_limit";
  switch (statusId) {
    case 3:
      return "ok";
    case 5:
      return "time_limit";
    case 6:
      return "compilation_error";
    case 7: // SIGSEGV
    case 8: // SIGXFSZ
    case 9: // SIGFPE
    case 10: // SIGABRT
    case 11: // NZEC
    case 12: // other
      return "runtime_error";
    default:
      return "internal_error"; // 13 internal error, 14 exec format error, anything unexpected
  }
}

export class Judge0Judge implements Judge {
  readonly name = "judge0";
  private readonly f: typeof fetch;
  constructor(private readonly cfg: Judge0Config) {
    this.f = cfg.fetchImpl ?? fetch;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.cfg.authToken) h["X-Auth-Token"] = this.cfg.authToken;
    if (this.cfg.rapidApiKey) {
      h["X-RapidAPI-Key"] = this.cfg.rapidApiKey;
      if (this.cfg.rapidApiHost) h["X-RapidAPI-Host"] = this.cfg.rapidApiHost;
    }
    return h;
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await this.f(`${this.cfg.baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers: this.headers(), signal: AbortSignal.timeout(20_000) });
    } catch {
      throw new JudgeUnavailableError("network error or timeout reaching Judge0");
    }
    // Learners only ever see the generic message; the status is for the operator's logs (never the URL, headers or body).
    if (res.status === 401 || res.status === 403) throw new JudgeUnavailableError(`Judge0 refused our credentials (HTTP ${res.status}): check JUDGE0_AUTH_TOKEN / RapidAPI settings`);
    if (res.status === 429 || res.status >= 500) throw new JudgeUnavailableError(`Judge0 responded with HTTP ${res.status}`);
    if (!res.ok) throw new JudgeUnavailableError(`Judge0 rejected the request (HTTP ${res.status}): check the language ids and limits`);
    try {
      return (await res.json()) as T;
    } catch {
      throw new JudgeUnavailableError("Judge0 returned a reply that is not valid JSON");
    }
  }

  async run(source: string, language: Language, inputs: string[], limits: Limits): Promise<TestRun[]> {
    const out: TestRun[] = [];
    for (let i = 0; i < inputs.length; i += BATCH) {
      out.push(...(await this.runChunk(source, language, inputs.slice(i, i + BATCH), limits)));
    }
    return out;
  }

  private async runChunk(source: string, language: Language, inputs: string[], limits: Limits): Promise<TestRun[]> {
    const cpu = limits.timeMs / 1000;
    const created = await this.call<Array<{ token?: string; error?: string }>>("/submissions/batch?base64_encoded=true", {
      method: "POST",
      body: JSON.stringify({
        submissions: inputs.map((stdin) => ({
          source_code: b64(source),
          language_id: this.cfg.languageIds[language],
          stdin: b64(stdin),
          compiler_options: COMPILER_OPTIONS[language],
          cpu_time_limit: cpu,
          wall_time_limit: Math.max(cpu * 3, cpu + 2),
          memory_limit: limits.memoryMb * 1024, // KB
          enable_network: false,
        })),
      }),
    });
    if (!Array.isArray(created) || created.length !== inputs.length || created.some((c) => !c || !c.token)) throw new JudgeUnavailableError("Judge0 did not accept the submission batch");
    const tokens = created.map((c) => c.token!);

    const deadline = Date.now() + (this.cfg.pollTimeoutMs ?? 45_000);
    let delay = 400;
    for (;;) {
      const res = await this.call<{ submissions: RawResult[] }>(
        `/submissions/batch?base64_encoded=true&tokens=${tokens.join(",")}&fields=token,status,stdout,stderr,compile_output,message,time,memory`,
      );
      if (!res || !Array.isArray(res.submissions)) throw new JudgeUnavailableError("Judge0 returned an unexpected reply while polling");
      const byToken = new Map(res.submissions.filter((s) => s && typeof s.token === "string" && s.status && typeof s.status.id === "number").map((s) => [s.token, s]));
      const all = tokens.map((t) => byToken.get(t));
      if (all.every((s) => s && s.status.id >= 3)) return all.map((s) => this.toRun(s!, limits));
      if (Date.now() > deadline) throw new JudgeUnavailableError("judging did not finish before the polling deadline");
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 1.5, 2000);
    }
  }

  private toRun(r: RawResult, limits: Limits): TestRun {
    const memoryKb = r.memory ?? null;
    const timeMs = r.time !== null && r.time !== undefined ? Math.round(parseFloat(r.time) * 1000) : null;
    return {
      status: mapStatus(r.status.id, memoryKb, limits),
      stdout: clip(unb64(r.stdout)),
      stderr: clip(unb64(r.stderr) || unb64(r.message)),
      compileOutput: clip(unb64(r.compile_output)),
      timeMs: Number.isFinite(timeMs) ? timeMs : null,
      memoryKb,
    };
  }
}
