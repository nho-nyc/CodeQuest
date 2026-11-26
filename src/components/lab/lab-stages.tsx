import { cn } from "@/lib/cn";
import type { CoinState, KadaneState, LabState, WindowState } from "@/features/lab/challenge";
import { ArrayRow, Chip } from "@/components/visualizer/stages";
import { TwoPointersStage } from "@/components/visualizer/stages";

function CoinStage({ s }: { s: CoinState }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip>amount = {s.amount}</Chip>
        <Chip tone={s.phase === "stuck" ? "warn" : "info"}>remaining = {s.remaining}</Chip>
        <span className="text-xs font-bold text-muted">coins:</span>
        {s.coins.map((c) => (
          <span key={c} className="flex h-9 min-w-9 items-center justify-center rounded-full border-2 border-gold-dark bg-gold/20 px-2 text-sm font-black">{c}</span>
        ))}
      </div>
      <div>
        <p className="text-xs font-extrabold uppercase text-muted">Greedy takes</p>
        <div className="mt-1.5 flex min-h-11 flex-wrap items-center gap-1.5" aria-label="Coins taken by greedy">
          {s.taken.length === 0 ? <span className="text-sm text-muted">nothing yet</span> : s.taken.map((c, i) => <span key={i} className="flex h-10 min-w-10 items-center justify-center rounded-full border-2 border-sky bg-sky/15 px-2 font-black">{c}</span>)}
          {s.phase === "stuck" && <span className="text-sm font-bold text-danger">stuck with {s.remaining} left</span>}
        </div>
      </div>
      {s.optimal && (
        <div>
          <p className="text-xs font-extrabold uppercase text-brand-dark dark:text-brand">Reference (best possible)</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Optimal coins">
            {s.optimal.map((c, i) => <span key={i} className="flex h-10 min-w-10 items-center justify-center rounded-full border-2 border-brand bg-brand/15 px-2 font-black">{c}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

function KadaneStage({ s }: { s: KadaneState }) {
  return (
    <div className="flex flex-col gap-3">
      <ArrayRow arr={s.arr} className={(i) => cn(i === s.i ? "border-sky bg-sky/20" : i < s.i ? "border-line bg-surface-2 opacity-70" : "border-line bg-surface-2", s.arr[i]! < 0 && "text-danger")} />
      <div className="flex flex-wrap gap-2">
        <Chip tone="info">cur = {s.cur}</Chip>
        <Chip tone={s.phase === "done" && s.correct !== null && s.best !== s.correct ? "warn" : "plain"}>best = {s.best}</Chip>
        {s.correct !== null && <Chip tone="good">reference = {s.correct}</Chip>}
      </div>
    </div>
  );
}

function WindowStage({ s }: { s: WindowState }) {
  const inWin = (i: number) => s.l <= s.r && i >= s.l && i <= s.r;
  const inTruth = (i: number) => s.truth !== null && i >= s.truth[0] && i <= s.truth[1];
  const n = s.arr.length;
  return (
    <div className="flex flex-col gap-3">
      <ArrayRow arr={s.arr} className={(i) => cn(inWin(i) ? "border-sky bg-sky/15" : "border-line bg-surface-2", inTruth(i) && "ring-4 ring-brand/40", s.arr[i]! < 0 && "text-danger")} />
      <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-hidden>
        {s.l <= s.r ? <div className="rounded-b-xl border-x-2 border-b-2 border-sky px-1 pb-1 text-center text-[11px] font-extrabold uppercase text-sky" style={{ gridColumn: `${s.l + 1} / span ${s.r - s.l + 1}` }}>window</div> : <div style={{ gridColumn: `1 / span ${n}` }} className="text-center text-xs text-muted">window is empty</div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip tone="info">window sum = {s.sum}</Chip>
        <Chip>K = {s.limit}</Chip>
        <Chip tone={s.sum > s.limit ? "warn" : "good"}>{s.sum > s.limit ? "sum is too big" : "fits"}</Chip>
        <Chip>longest = {s.best}</Chip>
        {s.truth && <Chip tone="good">true longest = {s.truth[1] - s.truth[0] + 1} (positions {s.truth[0]} to {s.truth[1]}, green rings)</Chip>}
      </div>
    </div>
  );
}

export function LabStage({ s }: { s: LabState }) {
  switch (s.kind) {
    case "coins":
      return <CoinStage s={s} />;
    case "kadane":
      return <KadaneStage s={s} />;
    case "window":
      return <WindowStage s={s} />;
    default:
      return <TwoPointersStage s={s} />;
  }
}
