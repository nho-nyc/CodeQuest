/**
 * TEST HARNESS ONLY. A tiny HTTP server that speaks the subset of the Judge0 batch API used by the app and
 * executes programs with the local g++. It exists so the real Judge0 client and the verdict pipeline can be
 * tested end to end. It is NOT a sandbox and must never be used by the application.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

type Job = { done: boolean; result?: Record<string, unknown> };
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s: string) => Buffer.from(s ?? "", "base64").toString("utf8");

// One compile per distinct program: a submission runs the same source on many inputs. Compiles are shared in flight.
const compiled = new Map<string, Promise<{ dir: string; bin: string; status: number | null; stderr: string }>>();
function compileOnce(source: string, opts: string[]) {
  const key = `${opts.join(" ")}\n${source}`;
  let p = compiled.get(key);
  if (!p) {
    p = (async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fj0-"));
      const src = path.join(dir, "main.cpp");
      const bin = path.join(dir, "main");
      fs.writeFileSync(src, source);
      // Async on purpose: a synchronous compile would block the event loop and delay the run timers of other jobs.
      const c = await new Promise<{ status: number | null; stderr: string }>((resolve) => {
        const gpp = spawn("g++", [...opts, "-o", bin, src]);
        let stderr = "";
        gpp.stderr.on("data", (d) => (stderr += d));
        gpp.on("close", (status) => resolve({ status, stderr }));
      });
      return { dir, bin, ...c };
    })();
    compiled.set(key, p);
  }
  return p;
}

async function execute(sub: Record<string, string | number>): Promise<Record<string, unknown>> {
  {
    const opts = String(sub.compiler_options ?? "-std=c++17").split(/\s+/).filter(Boolean);
    const { bin, ...c } = await compileOnce(unb64(sub.source_code as string), opts);
    if (c.status !== 0) return { status: { id: 6, description: "Compilation Error" }, compile_output: b64(c.stderr), stdout: null, stderr: null, message: null, time: null, memory: null };
    const limitMs = Math.round(Number(sub.cpu_time_limit ?? 1) * 1000);
    return await new Promise((resolve) => {
      const started = Date.now();
      const child = spawn(bin, [], { stdio: ["pipe", "pipe", "pipe"] });
      let out = "";
      let err = "";
      let timedOut = false;
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (err += d));
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, limitMs);
      child.stdin.on("error", () => {});
      child.stdin.end(unb64(sub.stdin as string));
      child.on("close", (code, signal) => {
        clearTimeout(timer);
        const time = ((Date.now() - started) / 1000).toFixed(3);
        let id = 3;
        let desc = "Accepted";
        if (timedOut) [id, desc] = [5, "Time Limit Exceeded"];
        else if (signal === "SIGSEGV") [id, desc] = [7, "Runtime Error (SIGSEGV)"];
        else if (signal === "SIGFPE") [id, desc] = [9, "Runtime Error (SIGFPE)"];
        else if (signal === "SIGABRT") [id, desc] = [10, "Runtime Error (SIGABRT)"];
        else if (code !== 0) [id, desc] = [11, "Runtime Error (NZEC)"];
        resolve({ status: { id, description: desc }, stdout: b64(out), stderr: b64(err), compile_output: null, message: null, time, memory: 1024 });
      });
    });
  }
}

export type FakeJudge0 = { url: string; close: () => Promise<void>; stats: { batches: number; submissions: number }; failWith?: number };

export async function startFakeJudge0(): Promise<FakeJudge0> {
  const jobs = new Map<string, Job>();
  const stats = { batches: 0, submissions: 0 };
  const handle: FakeJudge0 = { url: "", close: async () => {}, stats };
  const server = http.createServer((req, res) => {
    const send = (code: number, body: unknown) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (handle.failWith) return send(handle.failWith, { error: "forced failure" });
    const url = new URL(req.url ?? "/", "http://x");
    if (req.method === "POST" && url.pathname === "/submissions/batch") {
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("end", () => {
        const { submissions } = JSON.parse(body) as { submissions: Array<Record<string, string | number>> };
        if (submissions.length > 20) return send(422, { error: "batch too large" });
        stats.batches++;
        const tokens = submissions.map((sub) => {
          stats.submissions++;
          const token = `tok-${jobs.size}-${Math.random().toString(36).slice(2)}`;
          const job: Job = { done: false };
          jobs.set(token, job);
          void execute(sub).then((r) => {
            job.result = r;
            job.done = true;
          });
          return { token };
        });
        send(201, tokens);
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/submissions/batch") {
      const tokens = (url.searchParams.get("tokens") ?? "").split(",");
      send(200, {
        submissions: tokens.map((t) => {
          const j = jobs.get(t);
          return j?.done ? { token: t, ...j.result } : { token: t, status: { id: 2, description: "Processing" } };
        }),
      });
      return;
    }
    send(404, { error: "not found" });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  handle.url = `http://127.0.0.1:${port}`;
  handle.close = () =>
    new Promise((r) =>
      server.close(() => {
        for (const p of compiled.values()) void p.then((c) => fs.rmSync(c.dir, { recursive: true, force: true }));
        compiled.clear();
        r();
      }),
    );
  return handle;
}
