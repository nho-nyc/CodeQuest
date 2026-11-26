"use client";

import { Check, FlaskConical, Lightbulb, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { discover, type Challenge, type Evaluation } from "@/features/lab/challenge";
import { canReveal, initialInvestigation, investigate, STAGES, STAGE_LABEL, stageIndex, traceVisible, type Prediction } from "@/features/lab/investigation";
import { CHALLENGES, CHALLENGE_BY_ID } from "@/features/lab/registry";
import { cn } from "@/lib/cn";
import { PlaybackControls, playbackKeys, usePlayer } from "@/components/visualizer/playback";
import { LabStage } from "./lab-stages";

const inputCls = "w-full rounded-xl border-2 border-line bg-surface px-3 py-2 text-sm font-bold focus:border-sky";
const HINT_TITLES = ["Hint 1 · what to test", "Hint 2 · where to look", "Hint 3 · how to repair it"];

function CodeBlock({ title, lines, active }: { title: string; lines: string[]; active?: number | null }) {
  return (
    <Card className="overflow-hidden p-0">
      <h3 className="border-b-2 border-line px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-muted">{title}</h3>
      <pre className="overflow-x-auto py-2 font-mono text-[13px] leading-6" aria-label={title}>
        {lines.map((l, i) => (
          <code key={i} aria-current={active === i ? "step" : undefined} className={cn("block whitespace-pre px-4 transition-colors", active === i ? "bg-gold/25 font-bold text-fg shadow-[inset_4px_0_0_var(--color-gold-dark)]" : "text-muted")}>
            {l || " "}
          </code>
        ))}
      </pre>
    </Card>
  );
}

function Challenge({ c, next }: { c: Challenge; next: Challenge | null }) {
  const [inv, dispatch] = useReducer(investigate, undefined, initialInvestigation);
  const [form, setForm] = useState<Record<string, string>>(c.defaults);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [last, setLast] = useState<{ values: Record<string, string>; ev: Extract<Evaluation, { ok: true }> } | null>(null);
  const cx = useMemo(() => (inv.revealed ? discover(c) : null), [inv.revealed, c]);
  const steps = last?.ev.steps ?? [];
  const [player, pdispatch] = usePlayer(Math.max(1, steps.length), last);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [inv.stage]);
  // Open the trace on the step where the reasoning breaks.
  useEffect(() => {
    if (last && last.ev.flawStep !== null) pdispatch({ type: "seek", index: last.ev.flawStep });
  }, [last, pdispatch]);

  function run(values: Record<string, string>) {
    const ev = c.evaluate(values);
    if (!ev.ok) {
      setErrors(ev.errors);
      return;
    }
    setErrors(null);
    setLast({ values, ev });
    dispatch({ type: "run", differs: ev.differs });
  }
  function reveal() {
    if (!canReveal(inv)) return;
    const x = discover(c);
    if (!x) return;
    setForm(x.values);
    const ev = c.evaluate(x.values);
    if (ev.ok) setLast({ values: x.values, ev });
    setErrors(null);
    dispatch({ type: "reveal" });
  }
  function restart() {
    dispatch({ type: "restart" });
    setForm(c.defaults);
    setLast(null);
    setErrors(null);
  }

  const step = steps[Math.min(player.index, Math.max(0, steps.length - 1))];
  const showTrace = traceVisible(inv) && last;
  const result = last?.ev;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" onKeyDown={(e) => showTrace && playbackKeys(e, pdispatch, steps.length)}>
      <div className="flex min-w-0 flex-col gap-5">
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-extrabold uppercase tracking-widest text-sky">{c.kind}</p>
          <h2 className="mt-1 text-xl font-black">{c.title}</h2>
          <p className="mt-1 text-sm text-muted">Goal: {c.objective}</p>
          <h3 className="mt-4 text-xs font-extrabold uppercase tracking-widest text-muted">The problem</h3>
          <p className="mt-1 text-[15px] leading-relaxed">{c.statement}</p>
          <h3 className="mt-4 text-xs font-extrabold uppercase tracking-widest text-muted">The approach to investigate</h3>
          <p className="mt-1 text-[15px] leading-relaxed">{c.approach}</p>
          <h3 className="mt-4 text-xs font-extrabold uppercase tracking-widest text-muted">Why it looks reasonable</h3>
          <p className="mt-1 text-[15px] leading-relaxed">{c.seems}</p>
          <p className="mt-3 text-xs text-muted">Input limits: {c.constraints}</p>
        </Card>
        <CodeBlock title="C++ (the approach under test)" lines={c.flawedCode} active={showTrace ? step?.line ?? null : null} />

        {stageIndex(inv.stage) >= stageIndex("experiment") && (
          <Card className="p-4 sm:p-5">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted">Try an input</h3>
            <form
              className="mt-3 flex flex-col gap-3"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                run(form);
              }}
            >
              {c.fields.map((f) => (
                <div key={f.key}>
                  <label htmlFor={`lab-${c.id}-${f.key}`} className="text-sm font-extrabold">{f.label}</label>
                  <input id={`lab-${c.id}-${f.key}`} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} aria-describedby={`lab-${c.id}-${f.key}-h`} className={cn(inputCls, "mt-1 font-mono")} autoComplete="off" />
                  <p id={`lab-${c.id}-${f.key}-h`} className="mt-1 text-xs text-muted">{f.hint}</p>
                </div>
              ))}
              {errors && (
                <div role="alert" data-testid="lab-error" className="rounded-xl border-2 border-danger bg-danger/10 p-3 text-sm font-bold text-danger">
                  {errors.map((m, i) => <p key={i}>{m}</p>)}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" variant="blue">Run both</Button>
                <Button size="sm" variant="outline" onClick={() => { setForm(c.defaults); setErrors(null); }}>Reset to example</Button>
              </div>
            </form>
            <p className="mt-4 text-xs font-extrabold uppercase text-muted">Suggested things to try</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {c.suggestions.map((s) => (
                <button key={s.label} type="button" onClick={() => { setForm(s.values); setErrors(null); run(s.values); }} className="rounded-xl border-2 border-line px-3 py-1.5 text-sm font-bold transition hover:bg-surface-2">{s.label}</button>
              ))}
            </div>
            {result && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2" aria-live="polite" data-testid="comparison">
                <div className="rounded-2xl border-2 border-line bg-surface-2/50 p-3">
                  <p className="text-xs font-extrabold uppercase text-muted">The approach says</p>
                  <p className={cn("mt-1 text-lg font-black", result.differs && "text-danger")}>{result.flawed}</p>
                </div>
                <div className="rounded-2xl border-2 border-line bg-surface-2/50 p-3">
                  <p className="text-xs font-extrabold uppercase text-muted">The reference says</p>
                  <p className="mt-1 text-lg font-black text-brand-dark dark:text-brand">{result.correct}</p>
                </div>
                <p className={cn("rounded-xl px-3 py-2 text-sm font-extrabold sm:col-span-2", result.differs ? "bg-danger/10 text-danger" : "bg-brand/10 text-brand-dark dark:text-brand")}>
                  {result.differs ? "Different answers: this input exposes the bug." : "Same answer: this input does not expose a bug. Try another kind of input."}
                </p>
              </div>
            )}
          </Card>
        )}

        {showTrace && step && (
          <Card className="p-4 sm:p-5" data-testid="trace">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted">Step through the failing run</h3>
            <div className="mt-3 min-h-[10rem]"><LabStage s={step.state} /></div>
            <div className={cn("mt-4 rounded-2xl border-2 p-3", step.flaw ? "border-danger bg-danger/10" : "border-line bg-surface-2/50")} aria-live="polite">
              {step.flaw && <p className="text-xs font-extrabold uppercase text-danger">The reasoning breaks here</p>}
              <p className="font-extrabold" data-testid="what">{step.what}</p>
              <p className="mt-1 text-[15px] leading-relaxed">{step.why}</p>
              {step.notice && <p className="mt-1 text-sm font-bold text-muted">{step.notice}</p>}
            </div>
            <div className="mt-4 border-t-2 border-line pt-4">
              <PlaybackControls player={player} dispatch={pdispatch} total={steps.length} />
              {last && last.ev.flawStep !== null && <Button size="sm" variant="outline" className="mt-3" onClick={() => pdispatch({ type: "seek", index: last.ev.flawStep! })}>Jump to where it breaks</Button>}
            </div>
          </Card>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <Card className="p-4 sm:p-5">
          <ol className="flex flex-wrap gap-1.5" aria-label="Investigation progress">
            {STAGES.map((s) => (
              <li key={s} aria-current={s === inv.stage ? "step" : undefined} className={cn("rounded-lg border-2 px-2 py-0.5 text-xs font-extrabold", s === inv.stage ? "border-sky bg-sky/15 text-sky" : stageIndex(s) < stageIndex(inv.stage) ? "border-brand bg-brand/10 text-brand-dark dark:text-brand" : "border-line text-muted")}>
                {stageIndex(s) < stageIndex(inv.stage) && <Check size={12} className="mr-1 inline" aria-hidden />}{STAGE_LABEL[s]}
              </li>
            ))}
          </ol>
          <h3 ref={heading} tabIndex={-1} className="mt-4 text-lg font-black outline-none" data-testid="stage-title">{STAGE_LABEL[inv.stage]}</h3>

          {inv.stage === "predict" && (
            <fieldset className="mt-2">
              <legend className="text-[15px] font-bold">Do you think this approach always works?</legend>
              <p className="mt-1 text-sm text-muted">Decide first, then test your belief. There is no score: the aim is to build the habit of checking.</p>
              <div className="mt-3 flex flex-col gap-2">
                {([["works", "Yes, it always works"], ["fails", "No, there is an input where it fails"]] as Array<[Prediction, string]>).map(([v, label]) => (
                  <button key={v} type="button" onClick={() => dispatch({ type: "predict", prediction: v })} className="rounded-2xl border-2 border-line px-4 py-3 text-left text-sm font-extrabold transition hover:border-sky hover:bg-sky/10">{label}</button>
                ))}
              </div>
            </fieldset>
          )}

          {inv.stage === "experiment" && (
            <div className="mt-2 flex flex-col gap-3">
              <p className="text-[15px]">You predicted: <strong>{inv.prediction === "works" ? "it always works" : "it can fail"}</strong>. Try inputs on the left, including small and unusual ones. Runs so far: {inv.runs}.</p>
              <Button size="sm" variant="primary" onClick={reveal} disabled={!canReveal(inv)} aria-describedby="reveal-help">Show me a counterexample</Button>
              <p id="reveal-help" className="text-xs text-muted">{canReveal(inv) ? "This will fill in a failing input found by a systematic search." : "Run at least one input of your own, or take a hint, before asking for a counterexample."}</p>
            </div>
          )}

          {inv.stage === "find" && last && (
            <div className="mt-2 flex flex-col gap-3">
              <p className="text-[15px]">{inv.foundByLearner ? "Your own input exposed the bug. Well found." : "Here is a counterexample."} The approach answers <strong className="text-danger">{last.ev.flawed}</strong> but the correct answer is <strong className="text-brand-dark dark:text-brand">{last.ev.correct}</strong>.</p>
              {inv.prediction && <p className="text-sm text-muted">You predicted: {inv.prediction === "works" ? "it always works" : "it can fail"}. One failing input is enough to show it does not always work.</p>}
              {cx && (
                <div className="rounded-2xl border-2 border-line bg-surface-2/50 p-3 text-sm" data-testid="discovery">
                  <p className="font-extrabold">How it was found</p>
                  <p className="mt-1">Searched {cx.total} inputs: {cx.space}. Tried in the order: {c.space.order}.</p>
                  <p className="mt-1 text-muted">{cx.claim}</p>
                </div>
              )}
              <p className="text-sm">Step through the run on the left, and look for the step marked in red.</p>
              <Button size="sm" variant="blue" onClick={() => dispatch({ type: "continue" })}>Why does it fail?</Button>
            </div>
          )}

          {inv.stage === "understand" && (
            <div className="mt-2 flex flex-col gap-3">
              <fieldset>
                <legend className="text-[15px] font-bold">{c.question.prompt}</legend>
                <div className="mt-3 flex flex-col gap-2">
                  {c.question.options.map((o, i) => (
                    <button key={i} type="button" disabled={inv.answer !== null} onClick={() => dispatch({ type: "answer", index: i, correct: i === c.question.correct })} aria-pressed={inv.answer === i} className={cn("rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold transition", inv.answer === null ? "border-line hover:border-sky hover:bg-sky/10" : i === c.question.correct ? "border-brand bg-brand/10" : inv.answer === i ? "border-danger bg-danger/10" : "border-line opacity-60")}>
                      {inv.answer !== null && (i === c.question.correct ? <Check size={14} className="mr-1 inline text-brand-dark" aria-hidden /> : inv.answer === i ? <X size={14} className="mr-1 inline text-danger" aria-hidden /> : null)}
                      {o}
                    </button>
                  ))}
                </div>
              </fieldset>
              {inv.answer !== null && (
                <div className="flex flex-col gap-2 text-[15px] leading-relaxed" aria-live="polite" data-testid="explanation">
                  <p className="font-extrabold">{inv.answeredRight ? "Right." : "Not quite."} {!inv.answeredRight && <span className="font-normal">{c.question.feedbackWrong}</span>}</p>
                  <p><strong>The hidden assumption:</strong> {c.explanation.assumption}</p>
                  <p><strong>Why it seemed reasonable:</strong> {c.explanation.whySeems}</p>
                  <p><strong>Why it fails:</strong> {c.explanation.whyFails}</p>
                  <p><strong>What a correct method needs:</strong> {c.explanation.needs}</p>
                  <Button size="sm" variant="blue" onClick={() => dispatch({ type: "repair" })}>Repair the reasoning</Button>
                </div>
              )}
            </div>
          )}

          {inv.stage === "repair" && (
            <div className="mt-2 flex flex-col gap-3 text-[15px] leading-relaxed">
              <p><strong>Direction:</strong> {c.repair.direction}</p>
              <p><strong>Complexity:</strong> {c.repair.complexity}</p>
              <p className="text-sm text-muted">{c.repair.correctNote}</p>
              <p className="text-sm">Before you open the solution: can you explain in one sentence which assumption you will no longer make?</p>
              {!inv.solutionShown ? <Button size="sm" variant="outline" onClick={() => dispatch({ type: "showSolution" })}>Show a correct C++ version</Button> : null}
              <div className="flex flex-wrap gap-2">
                {next && <Link href={`/counterexample-lab?c=${next.id}`} className="inline-flex h-9 items-center rounded-2xl border-2 border-b-4 border-line bg-surface px-4 text-sm font-extrabold uppercase text-sky transition hover:bg-surface-2">Next challenge: {next.title}</Link>}
                <Button size="sm" variant="ghost" onClick={restart}>Start this challenge again</Button>
              </div>
            </div>
          )}
        </Card>

        {stageIndex(inv.stage) >= stageIndex("experiment") && stageIndex(inv.stage) <= stageIndex("find") && (
          <Card className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-muted"><Lightbulb size={14} /> Hints (optional)</h3>
            <ol className="mt-2 flex flex-col gap-2" data-testid="hints">
              {c.hints.slice(0, inv.hints).map((h, i) => (
                <li key={i} className="rounded-xl border-2 border-gold-dark/50 bg-gold/10 p-3 text-sm"><p className="text-xs font-extrabold uppercase text-muted">{HINT_TITLES[i]}</p><p className="mt-1 leading-relaxed">{h}</p></li>
              ))}
            </ol>
            {inv.hints < 3 ? <Button size="sm" variant="outline" className="mt-3" onClick={() => dispatch({ type: "hint" })}>Show hint {inv.hints + 1} of 3</Button> : <p className="mt-2 text-xs text-muted">That is all three hints.</p>}
          </Card>
        )}

        {inv.stage === "understand" && inv.answer !== null && (
          <Card className="p-4 sm:p-5">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted">Assumptions behind the approach</h3>
            <ul className="mt-2 list-disc pl-5 text-[15px]">{c.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
          </Card>
        )}

        {inv.stage === "repair" && inv.solutionShown && <CodeBlock title="C++ (corrected reasoning)" lines={c.correctCode} />}
      </div>
    </div>
  );
}

export function Lab({ initial }: { initial: string }) {
  const [id, setId] = useState(initial);
  const c = CHALLENGE_BY_ID[id] ?? CHALLENGES[0]!;
  const idx = CHALLENGES.indexOf(c);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black"><FlaskConical className="text-sky" /> Counterexample Lab</h1>
        <p className="mt-1 text-muted">Find out why a plausible algorithm fails. Predict, experiment, find the failing input, and name the hidden assumption. Nothing here affects your XP, hearts or progress.</p>
      </div>
      <div role="tablist" aria-label="Challenges" className="flex gap-2 overflow-x-auto pb-1">
        {CHALLENGES.map((ch, i) => (
          <button key={ch.id} role="tab" type="button" aria-selected={ch.id === c.id} onClick={() => { setId(ch.id); window.history.replaceState(null, "", `/counterexample-lab?c=${ch.id}`); }} className={cn("shrink-0 rounded-2xl border-2 px-4 py-2 text-sm font-extrabold transition", ch.id === c.id ? "border-sky bg-sky/10 text-sky" : "border-line text-muted hover:bg-surface-2")}>
            {i + 1}. {ch.title}
          </button>
        ))}
      </div>
      <Challenge key={c.id} c={c} next={CHALLENGES[idx + 1] ?? null} />
    </div>
  );
}
