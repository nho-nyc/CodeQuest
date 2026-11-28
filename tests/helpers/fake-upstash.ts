/** TEST HARNESS ONLY. Speaks the subset of the Upstash Redis REST API used by the shared rate limiter (POST /multi-exec with INCR and PEXPIRE). */
import http from "node:http";

export type FakeUpstash = {
  url: string;
  token: string;
  /** Raw request bodies the server received (to assert what is and is not sent). */
  bodies: string[];
  counters: Map<string, { n: number; expiresAt: number }>;
  mode: "ok" | "http500" | "garbage" | "unauthorized";
  close: () => Promise<void>;
};

export async function startFakeUpstash(token = "test-token-not-a-secret"): Promise<FakeUpstash> {
  const f: FakeUpstash = { url: "", token, bodies: [], counters: new Map(), mode: "ok", close: async () => {} };
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      f.bodies.push(body);
      const send = (code: number, data: unknown) => {
        res.writeHead(code, { "Content-Type": "application/json" });
        res.end(typeof data === "string" ? data : JSON.stringify(data));
      };
      if (f.mode === "http500") return send(500, { error: "boom" });
      if (f.mode === "garbage") return send(200, "<html>not json</html>");
      if (req.headers.authorization !== `Bearer ${f.token}` || f.mode === "unauthorized") return send(401, { error: "Unauthorized" });
      if (req.method !== "POST" || req.url !== "/multi-exec") return send(404, { error: "not found" });
      const cmds = JSON.parse(body) as string[][];
      const now = Date.now();
      // MULTI/EXEC: the whole batch runs without interleaving (a single synchronous step here).
      const out = cmds.map(([cmd, key, arg]) => {
        const c = f.counters.get(key!);
        if (cmd === "INCR") {
          const cur = c && c.expiresAt > now ? c : { n: 0, expiresAt: Infinity };
          cur.n += 1;
          f.counters.set(key!, cur);
          return { result: cur.n };
        }
        if (cmd === "PEXPIRE") {
          if (c) c.expiresAt = now + Number(arg);
          return { result: c ? 1 : 0 };
        }
        return { error: "ERR unknown command" };
      });
      send(200, out);
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  f.url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  f.close = () => new Promise((r) => server.close(() => r()));
  return f;
}
