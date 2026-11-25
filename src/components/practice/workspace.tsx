"use client";

import { ArrowLeft, Lightbulb, Minus, Play, Plus, RotateCcw, Send } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { CodeBlock } from "@/components/lesson/code-block";
import { cn } from "@/lib/cn";
import type { ProblemDetail, RunResult, SubmissionRow, SubmitResult } from "@/server/services/problems";
import { Countdown } from "@/components/contest/countdown";
import { DifficultyBadge } from "./difficulty-badge";
import { HINT_LEVELS } from "@/content/problems/hints";
import { RichText } from "./rich-text";
import { RunPanel, Spinner, SubmitPanel } from "./results-panel";
import { VERDICT_LABEL, verdictColor } from "./verdict";

const CodeEditor = dynamic(() => import("./code-editor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-muted">Loading editor...</p>,
});

const TEMPLATE = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}
`;

type Lang = "cpp17" | "cpp20";
type Tab = "problem" | "submissions" | "editorial";

const storeKey = (slug: string, lang: Lang) => `cq:code:${slug}:${lang}`;
function readStored(slug: string, lang: Lang): string {
  try {
    return localStorage.getItem(storeKey(slug, lang)) ?? TEMPLATE;
  } catch {
    return TEMPLATE;
  }
}
function writeStored(slug: string, lang: Lang, code: string) {
  try {
    localStorage.setItem(storeKey(slug, lang), code);
  } catch {
    /* storage unavailable: the code simply is not remembered */
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

export type ContestInfo = { slug: string; title: string; label: string; mode: "live" | "virtual" | "practice"; endsAt: string | null };

export function ProblemWorkspace({ problem, submissions: initialSubs, contest }: { problem: ProblemDetail; submissions: SubmissionRow[]; contest?: ContestInfo }) {
  const base = contest ? `/api/contests/${contest.slug}/problems/${contest.label}` : `/api/problems/${problem.slug}`;
  const storageSlug = contest ? `${contest.slug}:${contest.label}` : problem.slug;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("problem");
  const [lang, setLang] = useState<Lang>("cpp17");
  const [code, setCode] = useState(() => readStored(storageSlug, "cpp17"));
  const [fontSize, setFontSize] = useState(14);
  const [busy, setBusy] = useState<null | "run" | "submit">(null);
  const [run, setRun] = useState<RunResult | null>(null);
  const [sub, setSub] = useState<SubmitResult | null>(null);
  const [subs, setSubs] = useState(initialSubs);
  const [hints, setHints] = useState<string[]>(problem.hintsRevealed);
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const clearError = useCallback(() => setError(null), []);
  const noJudge = !problem.judgeAvailable;

  function changeCode(v: string) {
    setCode(v);
    writeStored(storageSlug, lang, v);
  }
  function changeLang(l: Lang) {
    setLang(l);
    setCode(readStored(storageSlug, l));
  }

  async function doRun() {
    if (busy) return;
    setBusy("run");
    setSub(null);
    try {
      setRun(await api<RunResult>(`${base}/run`, { method: "POST", body: JSON.stringify({ source: code, language: lang, customInput: showCustom && custom ? custom : undefined }) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run your code");
    } finally {
      setBusy(null);
    }
  }

  async function doSubmit() {
    if (busy) return;
    setBusy("submit");
    setRun(null);
    try {
      const r = await api<SubmitResult>(`${base}/submit`, { method: "POST", body: JSON.stringify({ source: code, language: lang }) });
      setSub(r);
      setSubs((s) => [{ id: r.submissionId, verdict: r.verdict, language: lang, timeMs: r.timeMs, memoryKb: r.memoryKb, testsPassed: r.passed, testsTotal: r.total, createdAt: new Date() }, ...s].slice(0, 10));
      if (r.verdict === "accepted") router.refresh(); // reload server data: editorial, XP in the header
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your code");
    } finally {
      setBusy(null);
    }
  }

  async function revealHint() {
    const level = hints.length + 1;
    try {
      const h = await api<{ level: number; text: string }>(`/api/problems/${problem.slug}/hint`, { method: "POST", body: JSON.stringify({ level }) });
      setHints((x) => [...x, h.text]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the hint");
    }
  }

  async function loadSubmission(id: string) {
    try {
      const s = await api<{ sourceCode: string; language: Lang }>(`/api/problems/${problem.slug}/submissions/${id}`);
      setLang(s.language);
      setCode(s.sourceCode);
      writeStored(storageSlug, s.language, s.sourceCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the submission");
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "problem", label: "Problem" },
    { id: "submissions", label: "Submissions" },
    ...(problem.solved && !contest ? [{ id: "editorial" as Tab, label: "Editorial" }] : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Toast message={error} onDone={clearError} />
      <header className="flex flex-wrap items-center gap-3 border-b-2 border-line bg-surface px-4 py-2.5">
        <Link href={contest ? `/contests/${contest.slug}` : "/practice"} aria-label={contest ? "Back to contest" : "Back to problems"} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-black">
          {contest ? `${contest.label}. ` : ""}
          {problem.title}
        </h1>
        <DifficultyBadge difficulty={problem.difficulty} rating={problem.rating} />
        {problem.solved && <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-extrabold uppercase text-brand-dark dark:text-brand">Solved</span>}
        {contest && (
          <span className="rounded-full bg-sky/15 px-2.5 py-0.5 text-xs font-extrabold uppercase text-sky">
            {contest.title} · {contest.mode}
            {contest.endsAt && (
              <>
                {" · "}
                <Countdown target={contest.endsAt} doneText="time is up" />
              </>
            )}
          </span>
        )}
        {!contest && (
          <Link href={`/discuss/problem/${problem.id}`} className="text-xs font-extrabold uppercase text-sky hover:underline">
            Discussion
          </Link>
        )}
        <span className="ml-auto text-xs font-bold text-muted">
          {problem.timeLimitMs} ms · {problem.memoryLimitMb} MB
        </span>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-2">
        {/* LEFT: statement */}
        <section className="flex flex-col border-line lg:min-h-0 lg:border-r-2" aria-label="Problem">
          <div role="tablist" className="flex gap-1 border-b-2 border-line px-3 pt-2">
            {tabs.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn("rounded-t-xl px-4 py-2 text-sm font-extrabold uppercase tracking-wide", tab === t.id ? "bg-surface-2 text-sky" : "text-muted hover:text-fg")}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-5 lg:min-h-0">
            {tab === "problem" && (
              <div className="flex flex-col gap-5 text-[15px] leading-relaxed">
                <RichText text={problem.statement} />
                <div>
                  <h2 className="mb-1 text-sm font-extrabold uppercase text-muted">Input</h2>
                  <RichText text={problem.inputFormat} />
                </div>
                <div>
                  <h2 className="mb-1 text-sm font-extrabold uppercase text-muted">Output</h2>
                  <RichText text={problem.outputFormat} />
                </div>
                <div>
                  <h2 className="mb-1 text-sm font-extrabold uppercase text-muted">Constraints</h2>
                  <pre className="whitespace-pre-wrap font-mono text-sm">{problem.constraints}</pre>
                </div>
                {problem.samples.map((s, i) => (
                  <div key={i}>
                    <h2 className="mb-2 text-sm font-extrabold uppercase text-muted">Example {i + 1}</h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-bold text-muted">Input</p>
                        <CodeBlock code={s.input.trimEnd()} label={`Example ${i + 1} input`} />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-bold text-muted">Output</p>
                        <CodeBlock code={s.output.trimEnd()} label={`Example ${i + 1} output`} />
                      </div>
                    </div>
                    {s.explanation && <p className="mt-2 text-sm text-muted">{s.explanation}</p>}
                  </div>
                ))}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2" aria-label="Skills">
                    {[...problem.tags].sort((x, y) => Number(y === problem.primarySkill) - Number(x === problem.primarySkill)).map((t) => (
                      <span key={t} className={cn("rounded-full px-3 py-1 text-xs font-bold", t === problem.primarySkill ? "bg-sky/15 text-sky" : "bg-surface-2 text-muted")} title={t === problem.primarySkill ? "Main skill" : undefined}>
                        {t}
                      </span>
                    ))}
                  </div>
                  {problem.prerequisites.length > 0 && (
                    <p className="text-xs text-muted">
                      <span className="font-extrabold uppercase">Good to know first:</span> {problem.prerequisites.map((u) => u.title).join(" · ")}
                    </p>
                  )}
                </div>
                {!contest && (
                <div className="rounded-2xl border-2 border-line p-4">
                  <h2 className="flex items-center gap-2 font-extrabold">
                    <Lightbulb size={18} className="text-gold" /> Hints
                  </h2>
                  <p className="mt-1 text-xs text-muted">Hints are revealed one at a time. Solving without hints is its own achievement later.</p>
                  <ol className="mt-3 flex flex-col gap-2">
                    {hints.map((h, i) => (
                      <li key={i} className="rounded-xl bg-gold/10 p-3 text-sm">
                        <span className="font-extrabold">Hint {i + 1}{HINT_LEVELS[i] ? ` · ${HINT_LEVELS[i]!.label}` : ""}: </span>
                        {h}
                      </li>
                    ))}
                  </ol>
                  {hints.length < problem.hintsTotal && (
                    <Button size="sm" variant="outline" onClick={revealHint} className="mt-3">
                      Show hint {hints.length + 1} of {problem.hintsTotal}
                      {HINT_LEVELS[hints.length] ? ` · ${HINT_LEVELS[hints.length]!.short}` : ""}
                    </Button>
                  )}
                </div>
                )}
                {!contest && problem.related.length > 0 && (
                  <div className="rounded-2xl border-2 border-line p-4">
                    <h2 className="font-extrabold">Related problems</h2>
                    <p className="mt-1 text-xs text-muted">Chosen by shared topics and close difficulty. Unsolved ones come first.</p>
                    <ul className="mt-3 flex flex-col gap-2">
                      {problem.related.map((r) => (
                        <li key={r.slug}>
                          <Link href={`/practice/${r.slug}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface-2 p-3 text-sm transition hover:ring-2 hover:ring-sky/50">
                            <span className="font-extrabold">{r.title}</span>
                            <DifficultyBadge difficulty={r.difficulty} rating={r.rating} />
                            {r.solved && <span className="text-xs font-bold text-brand-dark dark:text-brand">Solved</span>}
                            <span className="w-full text-xs text-muted">{r.reason}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {tab === "submissions" && (
              <div>
                {subs.length === 0 ? (
                  <p className="text-muted">No submissions yet. Write your solution and press Submit.</p>
                ) : (
                  <ul className="divide-y-2 divide-line">
                    {subs.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                        <span className={cn("font-extrabold", verdictColor(s.verdict))}>{VERDICT_LABEL[s.verdict] ?? s.verdict}</span>
                        <span className="text-muted">
                          {s.testsPassed}/{s.testsTotal} · {s.language === "cpp20" ? "C++20" : "C++17"}
                          {s.timeMs !== null ? ` · ${s.timeMs} ms` : ""}
                        </span>
                        <span className="text-xs text-muted">{new Date(s.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        <button type="button" onClick={() => loadSubmission(s.id)} className="ml-auto text-xs font-extrabold uppercase text-sky hover:underline">
                          Load code
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {tab === "editorial" && problem.editorial && (
              <div className="flex flex-col gap-4 text-[15px] leading-relaxed">
                {problem.insights && (
                  <div className="rounded-2xl border-2 border-line p-4 text-sm" aria-label="Problem insights">
                    <p>
                      <span className="font-extrabold uppercase text-muted">Approach: </span>
                      {problem.insights.approach}
                    </p>
                    <p className="mt-2">
                      <span className="font-extrabold uppercase text-muted">Expected complexity: </span>
                      time <code className="font-mono">{problem.insights.timeComplexity}</code>, memory <code className="font-mono">{problem.insights.spaceComplexity}</code>
                    </p>
                    <div className="mt-2">
                      <p className="font-extrabold uppercase text-muted">Common mistakes</p>
                      <ul className="mt-1 list-disc pl-5">
                        {problem.insights.commonMistakes.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                <RichText text={problem.editorial} />
                {problem.referenceSolution && (
                  <div>
                    <h2 className="mb-2 text-sm font-extrabold uppercase text-muted">Reference solution (C++17)</h2>
                    <CodeBlock code={problem.referenceSolution} />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: editor */}
        <section className="flex min-h-[28rem] flex-col lg:min-h-0" aria-label="Code editor">
          <div className="flex flex-wrap items-center gap-2 border-b-2 border-line bg-surface px-3 py-2">
            <label className="sr-only" htmlFor="lang">
              Language
            </label>
            <select id="lang" value={lang} onChange={(e) => changeLang(e.target.value as Lang)} className="h-9 rounded-xl border-2 border-line bg-surface-2 px-2 text-sm font-bold">
              <option value="cpp17">C++17</option>
              <option value="cpp20">C++20</option>
            </select>
            <div className="flex items-center gap-1" role="group" aria-label="Font size">
              <button type="button" aria-label="Smaller font" onClick={() => setFontSize((s) => Math.max(11, s - 1))} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2">
                <Minus size={16} />
              </button>
              <span className="w-7 text-center text-xs font-bold text-muted">{fontSize}</span>
              <button type="button" aria-label="Larger font" onClick={() => setFontSize((s) => Math.min(24, s + 1))} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2">
                <Plus size={16} />
              </button>
            </div>
            <button type="button" onClick={() => setConfirmReset(true)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-extrabold uppercase text-muted hover:bg-surface-2">
              <RotateCcw size={14} /> Reset
            </button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={doRun} disabled={!!busy || noJudge} title="Ctrl+Enter">
                <Play size={15} /> Run
              </Button>
              <Button size="sm" onClick={doSubmit} disabled={!!busy || noJudge} title="Ctrl+Shift+Enter">
                <Send size={15} /> Submit
              </Button>
            </div>
          </div>

          <div className="h-[22rem] lg:h-auto lg:min-h-0 lg:flex-[3]">
            <CodeEditor value={code} onChange={changeCode} fontSize={fontSize} onRun={doRun} onSubmit={doSubmit} />
          </div>

          <div className="max-h-[50vh] flex-1 overflow-y-auto border-t-2 border-line bg-surface p-4 lg:min-h-0 lg:max-h-none lg:flex-[2]">
            {noJudge && (
              <p role="alert" className="mb-3 rounded-2xl border-2 border-tangerine/50 bg-tangerine/10 p-3 text-sm font-bold">
                The code judge is not configured on this server, so Run and Submit are disabled. You can still read the problem and write code. See the README (Judge0) to enable judging.
              </p>
            )}
            {busy === "run" && <Spinner label="Running your code on the samples..." />}
            {busy === "submit" && <Spinner label="Judging against all tests..." />}
            {!busy && run && <RunPanel result={run} />}
            {!busy && sub && <SubmitPanel result={sub} />}
            {!busy && !run && !sub && (
              <div className="text-sm text-muted">
                <p>Run checks the examples. Submit judges all hidden tests; only a real judge result can mark a problem as solved.</p>
                <p className="mt-1 text-xs">Shortcuts: Ctrl+Enter to run, Ctrl+Shift+Enter to submit.</p>
              </div>
            )}
            <details className="mt-3" open={showCustom} onToggle={(e) => setShowCustom((e.target as HTMLDetailsElement).open)}>
              <summary className="cursor-pointer text-xs font-extrabold uppercase text-muted">Custom input for Run</summary>
              <textarea
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                rows={3}
                maxLength={10000}
                aria-label="Custom input"
                placeholder="Type input to try your program on (used together with the samples when you press Run)"
                className="mt-2 w-full rounded-xl border-2 border-line bg-code p-2 font-mono text-xs outline-none focus:border-sky"
              />
            </details>
          </div>
        </section>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset your code?">
        <p className="text-muted">This replaces the editor content with the starter template.</p>
        <div className="mt-5 flex flex-col gap-3">
          <Button
            variant="danger"
            size="lg"
            className="w-full"
            onClick={() => {
              changeCode(TEMPLATE);
              setConfirmReset(false);
            }}
          >
            Reset
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
