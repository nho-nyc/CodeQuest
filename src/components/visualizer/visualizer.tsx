"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ALGORITHMS, ALGORITHM_BY_ID, type VizId, type VizState } from "@/features/visualizer/registry";
import { cn } from "@/lib/cn";
import { PlaybackControls, playbackKeys, usePlayer } from "./playback";
import { ContainerStage, GraphStage, SlidingWindowStage, TwoPointersStage } from "./stages";

function Stage({ s }: { s: VizState }) {
  switch (s.kind) {
    case "two-pointers":
      return <TwoPointersStage s={s} />;
    case "sliding-window":
      return <SlidingWindowStage s={s} />;
    case "bfs":
      return <GraphStage s={s} />;
    default:
      return <ContainerStage s={s} />;
  }
}

const inputCls = "w-full rounded-xl border-2 border-line bg-surface px-3 py-2 text-sm font-bold focus:border-sky";

export function Visualizer({ initial }: { initial: VizId }) {
  const [id, setId] = useState<VizId>(initial);
  const algo = ALGORITHM_BY_ID[id];
  // Per-algorithm form text, and the text that was last applied (the visualization only changes when "Visualize" is pressed).
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [applied, setApplied] = useState<Record<string, Record<string, string>>>({});
  const form = { ...algo.defaults, ...draft[id] };
  const run = useMemo(() => algo.run({ ...algo.defaults, ...applied[id] }), [algo, applied, id]);
  const [error, setError] = useState<string[] | null>(null);
  const steps = run.ok ? run.steps : [];
  const [player, dispatch] = usePlayer(Math.max(1, steps.length), run);

  const step = steps[Math.min(player.index, Math.max(0, steps.length - 1))];

  const choose = useCallback((next: VizId) => {
    setId(next);
    setError(null);
    window.history.replaceState(null, "", `/visualizer?a=${next}`);
  }, []);

  function apply() {
    const result = algo.run(form);
    if (!result.ok) {
      setError(result.errors);
      return;
    }
    setError(null);
    setApplied((a) => ({ ...a, [id]: form }));
  }
  function resetInput() {
    setDraft((d) => ({ ...d, [id]: {} }));
    setApplied((a) => ({ ...a, [id]: {} }));
    setError(null);
  }

  return (
    <div className="flex flex-col gap-5" onKeyDown={(e) => playbackKeys(e, dispatch, steps.length)}>
      <div>
        <h1 className="text-3xl font-black">Algorithm visualizer</h1>
        <p className="mt-1 text-muted">Step through an algorithm and watch its state change. Nothing here affects your XP, hearts or progress.</p>
      </div>

      <div role="tablist" aria-label="Algorithms" className="flex gap-2 overflow-x-auto pb-1">
        {ALGORITHMS.map((a) => (
          <button key={a.id} role="tab" type="button" aria-selected={a.id === id} onClick={() => choose(a.id)} className={cn("shrink-0 rounded-2xl border-2 px-4 py-2 text-sm font-extrabold transition", a.id === id ? "border-sky bg-sky/10 text-sky" : "border-line text-muted hover:bg-surface-2")}>
            {a.title}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-sm text-muted">{algo.blurb}</p>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="p-4 sm:p-5">
            <details className="group" open>
              <summary className="cursor-pointer select-none text-sm font-extrabold uppercase tracking-wide text-muted">Your input</summary>
              <form
                className="mt-3 flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  apply();
                }}
                noValidate
              >
                {algo.fields.map((f) => (
                  <div key={f.key}>
                    <label htmlFor={`f-${id}-${f.key}`} className="text-sm font-extrabold">
                      {f.label}
                    </label>
                    {f.multiline ? (
                      <textarea id={`f-${id}-${f.key}`} rows={2} value={form[f.key]} onChange={(e) => setDraft((d) => ({ ...d, [id]: { ...form, [f.key]: e.target.value } }))} aria-describedby={`h-${id}-${f.key}`} className={cn(inputCls, "mt-1 font-mono")} />
                    ) : (
                      <input id={`f-${id}-${f.key}`} value={form[f.key]} onChange={(e) => setDraft((d) => ({ ...d, [id]: { ...form, [f.key]: e.target.value } }))} aria-describedby={`h-${id}-${f.key}`} className={cn(inputCls, "mt-1 font-mono")} inputMode="text" autoComplete="off" />
                    )}
                    <p id={`h-${id}-${f.key}`} className="mt-1 text-xs text-muted">
                      {f.hint}
                    </p>
                  </div>
                ))}
                {error && (
                  <div role="alert" className="rounded-xl border-2 border-danger bg-danger/10 p-3 text-sm font-bold text-danger">
                    {error.map((m, i) => (
                      <p key={i}>{m}</p>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm" variant="blue">
                    Visualize
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetInput}>
                    Use example
                  </Button>
                </div>
              </form>
            </details>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="min-h-[14rem]" data-testid="stage">
              {step ? <Stage s={step.state} /> : <p className="text-muted">Fix the input above to see the visualization.</p>}
            </div>
            <div className="mt-5 border-t-2 border-line pt-4">
              <PlaybackControls player={player} dispatch={dispatch} total={steps.length} />
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card className="p-4 sm:p-5" aria-live="polite" data-testid="explanation">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-sky">This step</h2>
            <p className="mt-1 text-base font-extrabold leading-snug" data-testid="what">{step?.what ?? "No steps to show."}</p>
            <h3 className="mt-4 text-xs font-extrabold uppercase tracking-widest text-muted">Why this step happens</h3>
            <p className="mt-1 text-[15px] leading-relaxed">{step?.why}</p>
            <h3 className="mt-4 text-xs font-extrabold uppercase tracking-widest text-muted">What to notice</h3>
            <p className="mt-1 text-[15px] leading-relaxed">{step?.notice ?? algo.insight}</p>
          </Card>

          <Card className="p-0 overflow-hidden">
            <h2 className="border-b-2 border-line px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-muted">C++</h2>
            <pre className="overflow-x-auto py-2 font-mono text-[13px] leading-6" aria-label="C++ code">
              {algo.code.map((l, i) => (
                <code key={i} aria-current={step?.line === i ? "step" : undefined} className={cn("block whitespace-pre px-4 transition-colors", step?.line === i ? "bg-sky/20 font-bold text-fg shadow-[inset_4px_0_0_var(--color-sky)]" : "text-muted")}>
                  {l || " "}
                </code>
              ))}
            </pre>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted">What you are seeing</h2>
            <p className="mt-1 text-[15px] leading-relaxed">{algo.seeing}</p>
            <h2 className="mt-4 text-xs font-extrabold uppercase tracking-widest text-muted">Complexity</h2>
            <p className="mt-1 text-[15px]">
              Time <strong>{algo.time}</strong> · Space <strong>{algo.space}</strong>
            </p>
            <p className="mt-1 text-sm text-muted">{algo.complexityNote}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
