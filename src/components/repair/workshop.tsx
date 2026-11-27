"use client";

import { Check, Hammer, Lightbulb, Play, RotateCcw, Send } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CodeBlock } from "@/components/lesson/code-block";
import { RunPanel, Spinner } from "@/components/practice/results-panel";
import { VERDICT_LABEL, verdictColor } from "@/components/practice/verdict";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { REPAIR_CHALLENGES, REPAIR_BY_ID, type Reflection, type RepairChallenge } from "@/features/repair/challenges";
import { cn } from "@/lib/cn";
import type { RepairRunResult, RepairSubmitResult } from "@/server/services/repair";

const CodeEditor = dynamic(() => import("@/components/practice/code-editor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-muted">Loading editor...</p>,
});

type Prediction = "works" | "fails";
const STAGES = ["Understand", "Investigate", "Diagnose", "Repair", "Verify", "Reflect"] as const;
const storeKey = (id: string) => `cq:repair:${id}`;

async function api<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

const GUIDANCE: Record<string, string> = {
  compilation_error: "Your program did not compile, so nothing was judged. Read the first error: it names a line. Fix compile errors before thinking about logic.",
  runtime_error: "Your program crashed. Typical causes are reading outside a vector, dividing by zero, or reading the input in a different shape than the statement describes.",
  time_limit_exceeded: "Your program is correct on small inputs but too slow for the limits. Compare how many steps your loops take with the largest n in the constraints.",
  memory_limit_exceeded: "Your program used too much memory for the limits. Check how large the containers you create can get.",
  wrong_answer: "On at least one test the printed answer is different from the expected one. A wrong answer alone cannot tell us which line is responsible, so compare expected and actual on a failing visible test and ask which assumption could produce that difference.",
  internal_error: "The judge had a problem. This is not a verdict about your code. Try again in a moment.",
};

function Diagnosis({ c, verdict, hidden }: { c: RepairChallenge; verdict: string; hidden?: string | null }) {
  return (
    <div className="mt-3 rounded-2xl border-2 border-line bg-surface-2/50 p-3 text-sm" data-testid="diagnosis">
      <p className="font-extrabold">What to do next</p>
      <p className="mt-1 leading-relaxed">{GUIDANCE[verdict] ?? GUIDANCE.wrong_answer}</p>
      {hidden && <p className="mt-1 leading-relaxed">A hidden test also failed ({VERDICT_LABEL[hidden] ?? hidden}). Hidden tests are private, so think about which kinds of input the statement allows that you have not tried.</p>}
      <div className="mt-2 flex flex-wrap gap-3 font-extrabold">
        <Link href={`/counterexample-lab?c=${c.labId}`} className="text-sky hover:underline">Investigate in the Counterexample Lab</Link>
        {c.visualizer && <Link href={`/visualizer?a=${c.visualizer}`} className="text-sky hover:underline">Watch it in the Visualizer</Link>}
      </div>
    </div>
  );
}

function ReflectionCard({ c, r }: { c: RepairChallenge; r: Reflection }) {
  const rows: Array<[string, string]> = [
    ["What was wrong", r.wasWrong],
    ["Why the original approach failed", r.whyFailed],
    ["What changed in the repair", r.whatChanged],
    ["The edge case that mattered", r.edgeCase],
    ["Time and space complexity", r.complexity],
    ["Reinforce it", r.reinforce],
  ];
  return (
    <Card className="p-4 sm:p-5" data-testid="reflection">
      <h3 className="text-lg font-black">Reflect: why the repair works</h3>
      <dl className="mt-2 flex flex-col gap-3 text-[15px] leading-relaxed">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-extrabold uppercase tracking-widest text-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap gap-3 text-sm font-extrabold">
        <Link href={`/counterexample-lab?c=${c.labId}`} className="text-sky hover:underline">Counterexample Lab</Link>
        {c.visualizer && <Link href={`/visualizer?a=${c.visualizer}`} className="text-sky hover:underline">Visualizer</Link>}
        <Link href="/learn" className="text-sky hover:underline">Learn: {c.unit}</Link>
      </div>
    </Card>
  );
}

function Challenge({ c, next, judgeConfigured }: { c: RepairChallenge; next: RepairChallenge | null; judgeConfigured: boolean }) {
  const [panel, setPanel] = useState<"brief" | "code">("brief");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [code, setCode] = useState(c.flawedCode);
  const [fontSize, setFontSize] = useState(14);
  const [busy, setBusy] = useState<null | "run" | "submit">(null);
  const [run, setRun] = useState<RepairRunResult | null>(null);
  const [sub, setSub] = useState<RepairSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [confirmSolution, setConfirmSolution] = useState(false);
  const [ran, setRan] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storeKey(c.id));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the draft can only be read in the browser, after hydration
      if (saved) setCode(saved);
    } catch {
      /* storage unavailable: the draft simply is not remembered */
    }
  }, [c.id]);
  function changeCode(v: string) {
    setCode(v);
    try {
      localStorage.setItem(storeKey(c.id), v);
    } catch {
      /* ignore */
    }
  }
  function restore() {
    if (!window.confirm("Replace your code with the original flawed program?")) return;
    changeCode(c.flawedCode);
  }

  const edited = code !== c.flawedCode;
  const accepted = sub?.verdict === "accepted";
  const ready = prediction !== null && judgeConfigured;
  const stageIndex = reflection ? 5 : accepted ? 4 : submitted ? 4 : edited ? 3 : hints.length > 0 ? 2 : prediction !== null ? 1 : 0;
  const done = [prediction !== null, ran, hints.length > 0, edited, accepted, reflection !== null];

  async function doRun() {
    if (busy || !ready) return;
    setBusy("run");
    setError(null);
    setSub(null);
    try {
      setRun(await api<RepairRunResult>(`/api/repair/${c.id}/run`, { source: code, language: "cpp17" }));
      setRan(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run your code");
    } finally {
      setBusy(null);
    }
  }
  async function doSubmit() {
    if (busy || !ready) return;
    setBusy("submit");
    setError(null);
    setRun(null);
    try {
      const r = await api<RepairSubmitResult>(`/api/repair/${c.id}/submit`, { source: code, language: "cpp17" });
      setSub(r);
      setSubmitted(true);
      if (r.reflection) setReflection(r.reflection);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your code");
    } finally {
      setBusy(null);
    }
  }
  async function showHint() {
    try {
      const h = await api<{ level: number; text: string }>(`/api/repair/${c.id}/hint`, { level: hints.length + 1 });
      setHints((x) => [...x, h.text]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the hint");
    }
  }
  async function showSolution() {
    try {
      const s = await api<{ solution: string; reflection: Reflection }>(`/api/repair/${c.id}/solution`, {});
      setSolution(s.solution);
      setReflection(s.reflection);
      setConfirmSolution(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the solution");
    }
  }

  const failedVerdict = sub && !accepted ? sub.verdict : run ? (run.compileError ? "compilation_error" : run.cases.find((x) => !x.passed)?.status ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Workshop panels" className="flex gap-2 lg:hidden">
        {(["brief", "code"] as const).map((p) => (
          <button key={p} role="tab" type="button" aria-selected={panel === p} onClick={() => setPanel(p)} className={cn("flex-1 rounded-2xl border-2 px-3 py-2 text-sm font-extrabold", panel === p ? "border-sky bg-sky/10 text-sky" : "border-line text-muted")}>
            {p === "brief" ? "Brief and hints" : "Code and results"}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className={cn("min-w-0 flex-col gap-4", panel === "brief" ? "flex" : "hidden", "lg:flex")}>
          <Card className="p-4 sm:p-5">
            <ol className="flex flex-wrap gap-1.5" aria-label="Workshop progress">
              {STAGES.map((s, i) => (
                <li key={s} aria-current={i === stageIndex ? "step" : undefined} className={cn("rounded-lg border-2 px-2 py-0.5 text-xs font-extrabold", i === stageIndex ? "border-sky bg-sky/15 text-sky" : done[i] ? "border-brand bg-brand/10 text-brand-dark dark:text-brand" : "border-line text-muted")}>
                  {done[i] && i !== stageIndex && <Check size={12} className="mr-1 inline" aria-hidden />}
                  {s}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-sky">{c.kind}</p>
            <h2 className="mt-1 text-xl font-black">{c.title}</h2>
            <p className="mt-1 text-sm text-muted">Goal: {c.objective}</p>
            <h3 className="mt-4 text-xs font-extrabold uppercase tracking-widest text-muted">The problem</h3>
            <p className="mt-1 text-[15px] leading-relaxed">{c.statement}</p>
            <dl className="mt-3 grid gap-2 text-sm">
              <div><dt className="font-extrabold">Input</dt><dd className="text-muted">{c.inputFormat}</dd></div>
              <div><dt className="font-extrabold">Output</dt><dd className="text-muted">{c.outputFormat}</dd></div>
              <div><dt className="font-extrabold">Limits</dt><dd className="text-muted">{c.constraints} Time limit {c.timeLimitMs / 1000} s, memory {c.memoryLimitMb} MB.</dd></div>
            </dl>
            <h3 className="mt-4 text-xs font-extrabold uppercase tracking-widest text-muted">The flawed approach</h3>
            <p className="mt-1 text-[15px] leading-relaxed">{c.approach}</p>
            <h3 className="mt-3 text-xs font-extrabold uppercase tracking-widest text-muted">Why it looks reasonable</h3>
            <p className="mt-1 text-[15px] leading-relaxed">{c.seems}</p>
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted">Visible tests</h3>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {c.samples.map((s) => (
                <li key={s.label} className="rounded-xl border-2 border-line p-2">
                  <p className="font-extrabold">{s.label}</p>
                  <pre className="mt-1 overflow-x-auto font-mono text-xs">{`input:\n${s.input}expected: ${s.expected}`}</pre>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4 sm:p-5">
            <fieldset>
              <legend className="text-[15px] font-bold">Before you run anything: do you think this program is correct for every valid input?</legend>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {([["works", "Yes, I think it is correct"], ["fails", "No, I think it can fail"]] as Array<[Prediction, string]>).map(([v, label]) => (
                  <button key={v} type="button" aria-pressed={prediction === v} disabled={prediction !== null && prediction !== v} onClick={() => setPrediction(v)} className={cn("flex-1 rounded-2xl border-2 px-4 py-2 text-left text-sm font-extrabold transition", prediction === v ? "border-sky bg-sky/15" : "border-line hover:border-sky hover:bg-sky/10 disabled:opacity-50")}>
                    {label}
                  </button>
                ))}
              </div>
              {prediction && <p className="mt-2 text-sm text-muted">You predicted: {prediction === "works" ? "it is correct" : "it can fail"}. Now run the visible tests and see. Passing a few tests never proves a program correct.</p>}
            </fieldset>
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-muted"><Lightbulb size={14} /> Hints (optional)</h3>
            <ol className="mt-2 flex flex-col gap-2" data-testid="hints">
              {hints.map((h, i) => (
                <li key={i} className="rounded-xl border-2 border-gold-dark/50 bg-gold/10 p-3 text-sm">
                  <p className="text-xs font-extrabold uppercase text-muted">{["Hint 1 · direction", "Hint 2 · the suspicious assumption", "Hint 3 · repair strategy"][i]}</p>
                  <p className="mt-1 leading-relaxed">{h}</p>
                </li>
              ))}
            </ol>
            {hints.length < 3 ? (
              <Button size="sm" variant="outline" className="mt-3" onClick={showHint} disabled={prediction === null || !ran}>Show hint {hints.length + 1} of 3</Button>
            ) : (
              <p className="mt-2 text-xs text-muted">That is all three hints. The next step is yours: edit the code.</p>
            )}
            {(prediction === null || !ran) && hints.length < 3 && <p className="mt-2 text-xs text-muted">Make a prediction and run the visible tests first. Hints work better once you have seen a failure.</p>}
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted">Stuck?</h3>
            {!solution && !confirmSolution && <Button size="sm" variant="ghost" className="mt-2" onClick={() => setConfirmSolution(true)}>Show a reference solution</Button>}
            {confirmSolution && !solution && (
              <div className="mt-2 flex flex-col gap-2 text-sm" role="group" aria-label="Confirm reveal">
                <p>Seeing the answer skips the repair, which is where the learning happens. Try the hints first. Reveal it anyway?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={showSolution}>Yes, show it</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmSolution(false)}>Keep trying</Button>
                </div>
              </div>
            )}
            {solution && <CodeBlock code={solution} label="Reference solution" className="mt-2" />}
          </Card>

          {reflection && <ReflectionCard c={c} r={reflection} />}
          {reflection && next && (
            <Link href={`/repair-workshop?c=${next.id}`} className="inline-flex h-11 items-center justify-center rounded-2xl border-2 border-b-4 border-line bg-surface px-6 text-sm font-extrabold uppercase text-sky hover:bg-surface-2">
              Next challenge: {next.title}
            </Link>
          )}
        </div>

        <div className={cn("min-w-0 flex-col gap-3", panel === "code" ? "flex" : "hidden", "lg:flex")}>
          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center gap-2 border-b-2 border-line px-3 py-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-muted">C++17</span>
              <button type="button" onClick={restore} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-extrabold uppercase text-muted hover:bg-surface-2" disabled={!edited}>
                <RotateCcw size={14} /> Original code
              </button>
              <div className="flex items-center gap-1 text-xs font-bold text-muted">
                <button type="button" aria-label="Smaller text" className="rounded-lg px-2 py-1 hover:bg-surface-2" onClick={() => setFontSize((f) => Math.max(11, f - 1))}>A−</button>
                <span aria-live="polite">{fontSize}</span>
                <button type="button" aria-label="Larger text" className="rounded-lg px-2 py-1 hover:bg-surface-2" onClick={() => setFontSize((f) => Math.min(22, f + 1))}>A+</button>
              </div>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={doRun} disabled={!!busy || !ready} title="Ctrl+Enter"><Play size={15} /> Run</Button>
                <Button size="sm" onClick={doSubmit} disabled={!!busy || !ready} title="Ctrl+Shift+Enter"><Send size={15} /> Submit</Button>
              </div>
            </div>
            <div className="h-[24rem] lg:h-[30rem]" data-testid="editor">
              <CodeEditor value={code} onChange={changeCode} fontSize={fontSize} onRun={doRun} onSubmit={doSubmit} />
            </div>
            <p className="border-t-2 border-line px-3 py-2 text-xs text-muted">Ctrl+Enter runs the visible tests, Ctrl+Shift+Enter submits. Ctrl+M (Cmd+Shift+M on Mac) lets Tab leave the editor.</p>
          </Card>

          <Card className="p-4 sm:p-5" aria-live="polite">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted">Results</h3>
            {!judgeConfigured && <p role="alert" className="mt-2 rounded-2xl border-2 border-tangerine/50 bg-tangerine/10 p-3 text-sm font-bold">The code judge is not configured on this server, so Run and Submit are disabled.</p>}
            {judgeConfigured && prediction === null && <p className="mt-2 text-sm text-muted" data-testid="predict-first">Make your prediction in the brief first, then Run and Submit unlock.</p>}
            {error && <p role="alert" data-testid="repair-error" className="mt-2 rounded-xl border-2 border-danger bg-danger/10 p-3 text-sm font-bold text-danger">{error}</p>}
            {busy === "run" && <div className="mt-2"><Spinner label="Running your code on the visible tests..." /></div>}
            {busy === "submit" && <div className="mt-2"><Spinner label="Verifying against all tests..." /></div>}
            {!busy && run && (
              <div className="mt-2" data-testid="run-result">
                <RunPanel result={run} />
                {!run.compileError && run.cases.every((x) => x.passed) && <p className="mt-3 rounded-xl bg-gold/15 p-3 text-sm font-bold">All visible tests pass. That does not prove the program is correct: Submit runs the full verification set.</p>}
              </div>
            )}
            {!busy && sub && (
              <div className="mt-2 flex flex-col gap-3" data-testid="submit-result">
                <p className={cn("text-lg font-black", verdictColor(sub.verdict))}>{VERDICT_LABEL[sub.verdict] ?? sub.verdict}</p>
                {sub.compileOutput ? (
                  <RunPanel result={{ compileError: sub.compileOutput, cases: [] }} />
                ) : (
                  <>
                    <p className="text-sm">Visible tests: {sub.publicPassed} of {sub.publicTotal}. Hidden checks: {sub.hiddenPassed} of {sub.hiddenTotal} (their contents stay private). Slowest test: {sub.timeMs} ms.</p>
                    {sub.hiddenFailure && <p className="text-sm font-bold text-danger">A hidden test ended with: {VERDICT_LABEL[sub.hiddenFailure] ?? sub.hiddenFailure}.</p>}
                    <RunPanel result={{ compileError: null, cases: sub.publicCases }} />
                  </>
                )}
                {accepted ? (
                  <p className="rounded-xl bg-brand/15 p-3 text-sm font-extrabold text-brand-dark dark:text-brand" data-testid="accepted"><Hammer size={14} className="mr-1 inline" aria-hidden /> Repaired: every test passed. Read the reflection to see why it works.</p>
                ) : (
                  <Diagnosis c={c} verdict={sub.verdict} hidden={sub.verdict === "wrong_answer" || sub.verdict === "time_limit_exceeded" ? sub.hiddenFailure : null} />
                )}
              </div>
            )}
            {!busy && !sub && run && failedVerdict && failedVerdict !== "accepted" && <Diagnosis c={c} verdict={failedVerdict} />}
            {!busy && !run && !sub && !error && prediction !== null && <p className="mt-2 text-sm text-muted">Run the visible tests to see where the program disagrees with the expected answers.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

export function Workshop({ initial, judgeConfigured }: { initial: string; judgeConfigured: boolean }) {
  const [id, setId] = useState(initial);
  const c = REPAIR_BY_ID[id] ?? REPAIR_CHALLENGES[0]!;
  const idx = REPAIR_CHALLENGES.indexOf(c);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black"><Hammer className="text-tangerine" /> Algorithm Repair Workshop</h1>
        <p className="mt-1 text-muted">Each program below is intentionally flawed. Investigate the failure, repair the code, and verify it. Nothing here changes your XP, hearts or progress.</p>
      </div>
      <div role="tablist" aria-label="Challenges" className="flex gap-2 overflow-x-auto pb-1">
        {REPAIR_CHALLENGES.map((ch, i) => (
          <button key={ch.id} role="tab" type="button" aria-selected={ch.id === c.id} onClick={() => { setId(ch.id); window.history.replaceState(null, "", `/repair-workshop?c=${ch.id}`); }} className={cn("shrink-0 rounded-2xl border-2 px-4 py-2 text-sm font-extrabold transition", ch.id === c.id ? "border-sky bg-sky/10 text-sky" : "border-line text-muted hover:bg-surface-2")}>
            {i + 1}. {ch.title}
          </button>
        ))}
      </div>
      <Challenge key={c.id} c={c} next={REPAIR_CHALLENGES[idx + 1] ?? null} judgeConfigured={judgeConfigured} />
    </div>
  );
}
