import { cn } from "@/lib/cn";
import type { BfsState } from "@/features/visualizer/bfs";
import type { ContainerState } from "@/features/visualizer/containers";
import type { SlidingWindowState } from "@/features/visualizer/sliding-window";
import type { TwoPointersState } from "@/features/visualizer/two-pointers";

export const cell = "flex aspect-square min-w-0 items-center justify-center rounded-xl border-2 text-sm font-black transition-colors duration-300 sm:text-lg";

export function ArrayRow({ arr, className, children }: { arr: number[]; className?: (i: number) => string; children?: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${arr.length}, minmax(0, 1fr))` }}>
      {arr.map((v, i) => (
        <div key={i} className="flex min-w-0 flex-col items-center gap-1">
          <div className={cn(cell, "w-full", className?.(i))}>{v}</div>
          <span className="text-[10px] font-bold text-muted">{i}</span>
        </div>
      ))}
      {children}
    </div>
  );
}

export function Chip({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "good" | "warn" | "info" }) {
  return (
    <span className={cn("rounded-xl border-2 px-3 py-1.5 text-sm font-extrabold", tone === "good" && "border-brand bg-brand/10 text-brand-dark dark:text-brand", tone === "warn" && "border-gold-dark bg-gold/15", tone === "info" && "border-sky bg-sky/10 text-sky", tone === "plain" && "border-line bg-surface-2")}>{children}</span>
  );
}

export function TwoPointersStage({ s }: { s: TwoPointersState }) {
  const verdictText = { start: "Not compared yet", "too-small": "Too small: move L right", "too-large": "Too large: move R left", found: "Equal: found!", none: "Pointers met: no pair" }[s.verdict];
  const tone = s.verdict === "found" ? "good" : s.verdict === "none" ? "warn" : s.sum === null ? "plain" : "info";
  return (
    <div className="flex flex-col gap-4">
      <ArrayRow
        arr={s.arr}
        className={(i) => cn(s.discarded.includes(i) && "opacity-30", i === s.l && i === s.r ? "border-gold-dark bg-gold/30" : i === s.l ? "border-sky bg-sky/20" : i === s.r ? "border-brand bg-brand/20" : "border-line bg-surface-2", s.verdict === "found" && (i === s.l || i === s.r) && "ring-4 ring-brand/40")}
      />
      <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${s.arr.length}, minmax(0, 1fr))` }} aria-hidden>
        {s.arr.map((_, i) => (
          <div key={i} className="flex h-6 items-start justify-center gap-0.5 text-xs font-black">
            {i === s.l && <span className="rounded bg-sky px-1.5 text-white">L</span>}
            {i === s.r && <span className="rounded bg-brand px-1.5 text-white">R</span>}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={tone}>{s.sum === null ? `a[${s.l}] + a[${s.r}] = ?` : `${s.arr[s.l]} + ${s.arr[s.r]} = ${s.sum}`}</Chip>
        <Chip>target = {s.target}</Chip>
        <Chip tone={tone}>{verdictText}</Chip>
      </div>
    </div>
  );
}

export function SlidingWindowStage({ s }: { s: SlidingWindowState }) {
  const inWin = (i: number) => s.size > 0 && i >= s.start && i < s.start + s.size;
  return (
    <div className="flex flex-col gap-3">
      <ArrayRow
        arr={s.arr}
        className={(i) => cn(inWin(i) ? "border-sky bg-sky/15" : "border-line bg-surface-2", s.phase === "done" && inWin(i) && "border-brand bg-brand/20", i === s.entering && "border-brand bg-brand/30 ring-4 ring-brand/30", i === s.leaving && "border-dashed border-danger bg-danger/10")}
      />
      <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${s.arr.length}, minmax(0, 1fr))` }} aria-hidden>
        {s.size > 0 ? (
          <div className="mt-1 rounded-b-xl border-x-2 border-b-2 border-sky px-1 pb-1 text-center text-[11px] font-extrabold uppercase text-sky" style={{ gridColumn: `${s.start + 1} / span ${s.size}` }}>
            window · {s.size}
          </div>
        ) : (
          <div style={{ gridColumn: `1 / span ${s.arr.length}` }} className="text-center text-xs text-muted">No window yet</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="info">window sum = {s.sum ?? "?"}</Chip>
        <Chip tone={s.phase === "done" ? "good" : "plain"}>best = {s.best ?? "?"}</Chip>
        {s.entering !== null && <Chip tone="good">in: {s.arr[s.entering]}</Chip>}
        {s.leaving !== null && <span className="rounded-xl border-2 border-dashed border-danger px-3 py-1.5 text-sm font-extrabold text-danger">out: {s.arr[s.leaving]}</span>}
      </div>
    </div>
  );
}

export function ContainerStage({ s }: { s: ContainerState }) {
  const stack = s.kind === "stack";
  const items = s.items;
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-wrap gap-1.5" aria-label="Operations">
        {s.ops.map((o, i) => (
          <li key={i} aria-current={i === s.opIndex ? "step" : undefined} className={cn("rounded-lg border-2 px-2 py-0.5 text-xs font-extrabold transition-colors", i === s.opIndex ? "border-sky bg-sky/15 text-sky" : i < s.opIndex ? "border-line bg-surface-2 text-muted" : "border-line text-fg")}>
            {o}
          </li>
        ))}
      </ol>
      {stack ? (
        <div className="mx-auto flex w-full max-w-xs flex-col items-stretch gap-2">
          <div className="flex h-9 items-end justify-center">{s.removed !== null && <span className="rounded-xl border-2 border-dashed border-danger px-4 py-1 text-sm font-black text-danger">popped {s.removed}</span>}</div>
          <div className="flex min-h-[15rem] flex-col justify-end gap-1.5 rounded-b-2xl border-x-4 border-b-4 border-line bg-surface-2/50 p-2" role="list" aria-label="Stack, top first">
            {items.length === 0 && <p className="m-auto text-sm font-bold text-muted">empty stack</p>}
            {[...items].reverse().map((v, ri) => {
              const i = items.length - 1 - ri;
              const top = i === items.length - 1;
              return (
                <div key={i} role="listitem" className={cn("relative flex h-9 items-center justify-center rounded-xl border-2 text-lg font-black transition-colors", top ? "border-sky bg-sky/20" : "border-line bg-surface", s.touched === i && "ring-4 ring-gold/50")}>
                  {v}
                  {top && <span className="absolute -left-1 top-1/2 -translate-x-full -translate-y-1/2 pr-1 text-[11px] font-black uppercase text-sky">top →</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex h-8 items-end justify-start">{s.removed !== null && <span className="rounded-xl border-2 border-dashed border-danger px-4 py-1 text-sm font-black text-danger">left the front: {s.removed}</span>}</div>
          <div className="flex items-stretch gap-2">
            <span className="hidden self-center text-xs font-black uppercase text-muted sm:block">out ←</span>
            <div className="grid min-h-16 flex-1 gap-1.5 rounded-2xl border-y-4 border-line bg-surface-2/50 p-2" style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }} role="list" aria-label="Queue, front first">
              {items.length === 0 && <p className="m-auto text-sm font-bold text-muted">empty queue</p>}
              {items.map((v, i) => (
                <div key={i} role="listitem" className="flex min-w-0 flex-col items-center gap-1">
                  <div className={cn("flex aspect-square w-full items-center justify-center rounded-xl border-2 text-sm font-black transition-colors sm:text-lg", i === 0 ? "border-sky bg-sky/20" : i === items.length - 1 ? "border-brand bg-brand/20" : "border-line bg-surface", s.touched === i && "ring-4 ring-gold/50")}>{v}</div>
                  <span className="h-4 text-[10px] font-black uppercase leading-4">
                    {i === 0 && <span className="text-sky">front</span>}
                    {i === 0 && i === items.length - 1 && " · "}
                    {i === items.length - 1 && <span className="text-brand-dark dark:text-brand">back</span>}
                  </span>
                </div>
              ))}
            </div>
            <span className="hidden self-center text-xs font-black uppercase text-muted sm:block">← in</span>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Chip>size = {items.length}</Chip>
        {s.result !== null && <Chip tone="info">result: {s.result}</Chip>}
        {s.warning && <Chip tone="warn">not allowed on an empty {stack ? "stack" : "queue"}</Chip>}
      </div>
    </div>
  );
}

export function GraphStage({ s }: { s: BfsState }) {
  const W = 120;
  const H = 106;
  const pos = (v: number) => {
    const a = (2 * Math.PI * v) / s.n - Math.PI / 2;
    return { x: W / 2 + 44 * Math.cos(a), y: H / 2 + 34 * Math.sin(a) };
  };
  const isExploring = (a: number, b: number) => s.exploring && s.exploring[0] === a && s.exploring[1] === b;
  const touched = (a: number, b: number) => s.dist[a]! >= 0 && s.dist[b]! >= 0 && s.phase !== "start";
  return (
    <div className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-md text-fg" role="img" aria-label={`Graph with ${s.n} vertices. Current vertex: ${s.current ?? "none"}.`}>
        {s.edges.map(([a, b]) => {
          const p = pos(a);
          const q = pos(b);
          return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className={cn("transition-all duration-300", isExploring(a, b) ? "stroke-gold-dark" : touched(a, b) ? "stroke-sky/60" : "stroke-line")} strokeWidth={isExploring(a, b) ? 2.6 : 1.4} strokeLinecap="round" />;
        })}
        {Array.from({ length: s.n }, (_, v) => {
          const { x, y } = pos(v);
          const found = s.dist[v]! >= 0;
          const cls = v === s.current ? "fill-gold stroke-gold-dark" : v === s.discovered && (s.phase === "look-new" || s.phase === "start") ? "fill-brand/40 stroke-brand" : s.finished.includes(v) ? "fill-brand/25 stroke-brand" : found ? "fill-sky/20 stroke-sky" : "fill-surface-2 stroke-line";
          return (
            <g key={v}>
              <circle cx={x} cy={y} r={7.5} className={cn("transition-colors duration-300", cls)} strokeWidth={1.8} />
              <text x={x} y={y + 2.6} textAnchor="middle" className="fill-current text-[7px] font-black">{v}</text>
              <text x={x} y={y + (y > H / 2 ? 15.5 : -10.5)} textAnchor="middle" className="fill-current text-[5px] font-bold opacity-70">{found ? `d=${s.dist[v]}` : "d=?"}</text>
              {v === s.start && <text x={x + 9.5} y={y - 6} className="fill-sky text-[4.6px] font-black uppercase">start</text>}
            </g>
          );
        })}
      </svg>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-2xl border-2 border-line bg-surface-2/50 p-3">
          <p className="text-xs font-extrabold uppercase text-muted">Queue (front first)</p>
          <div className="mt-1.5 flex min-h-9 flex-wrap items-center gap-1.5" aria-label="Queue">
            {s.queue.length === 0 ? <span className="text-muted">empty</span> : s.queue.map((v, i) => <span key={`${v}-${i}`} className={cn("flex h-9 min-w-9 items-center justify-center rounded-xl border-2 px-2 font-black", i === 0 ? "border-sky bg-sky/20" : "border-line bg-surface")}>{v}</span>)}
          </div>
        </div>
        <div className="rounded-2xl border-2 border-line bg-surface-2/50 p-3">
          <p className="text-xs font-extrabold uppercase text-muted">Visit order</p>
          <div className="mt-1.5 flex min-h-9 flex-wrap items-center gap-1.5" aria-label="Visit order">
            {s.order.length === 0 ? <span className="text-muted">nothing yet</span> : s.order.map((v) => <span key={v} className="flex h-9 min-w-9 items-center justify-center rounded-xl border-2 border-brand bg-brand/10 px-2 font-black">{v}</span>)}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted">Adjacency list: {s.adj.map((l, v) => `${v}: [${l.join(", ")}]`).join("   ")}</p>
    </div>
  );
}
