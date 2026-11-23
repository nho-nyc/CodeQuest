import { CheckCircle2, Loader2, XCircle, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RunResult, SubmitResult } from "@/server/services/problems";
import { VERDICT_LABEL, verdictColor } from "./verdict";
import { explainCompileOutput, VERDICT_HELP } from "./verdict-help";

const Pre = ({ children, className }: { children: string; className?: string }) => (
  <pre className={cn("max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-code p-2.5 font-mono text-xs", className)}>{children || " "}</pre>
);

export function RunPanel({ result }: { result: RunResult }) {
  if (result.compileError) {
    return (
      <div role="alert" className="flex flex-col gap-2">
        <p className="flex items-center gap-2 font-extrabold text-danger">
          <XCircle size={18} /> Compilation Error
        </p>
        <Pre>{result.compileError}</Pre>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {result.cases.map((c, i) => (
        <section key={i} className="rounded-2xl border-2 border-line p-3" aria-label={c.label}>
          <p className={cn("flex items-center gap-2 text-sm font-extrabold", c.passed === null ? "text-muted" : c.passed ? "text-brand-dark dark:text-brand" : "text-danger")}>
            {c.passed === null ? null : c.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {c.label}: {c.passed === null && c.status === "ran" ? "Output" : VERDICT_LABEL[c.status] ?? c.status}
            {c.timeMs !== null && <span className="ml-auto text-xs font-bold text-muted">{c.timeMs} ms</span>}
          </p>
          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
            <div>
              <p className="mb-1 font-bold uppercase text-muted">Input</p>
              <Pre>{c.input}</Pre>
            </div>
            {c.expected !== null && (
              <div>
                <p className="mb-1 font-bold uppercase text-muted">Expected</p>
                <Pre>{c.expected}</Pre>
              </div>
            )}
            <div>
              <p className="mb-1 font-bold uppercase text-muted">Your output</p>
              <Pre>{c.output}</Pre>
            </div>
          </div>
          {c.stderr && <Pre className="mt-2 text-danger">{c.stderr}</Pre>}
        </section>
      ))}
    </div>
  );
}

export function SubmitPanel({ result }: { result: SubmitResult }) {
  const ok = result.verdict === "accepted";
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className={cn("flex items-center gap-2 text-xl font-black", verdictColor(result.verdict))}>
          {ok ? <CheckCircle2 /> : <XCircle />} {VERDICT_LABEL[result.verdict] ?? result.verdict}
        </p>
        {result.verdict !== "compilation_error" && (
          <span className="text-sm font-bold text-muted">
            {result.passed}/{result.total} tests · {result.timeMs} ms · {(result.memoryKb / 1024).toFixed(1)} MB
          </span>
        )}
      </div>
      {result.failedTest !== null && <p className="text-sm text-muted">First failing test: #{result.failedTest}. Hidden test data is never shown.</p>}
      {result.compileOutput && <Pre>{result.compileOutput}</Pre>}
      {result.verdict === "compilation_error" && result.compileOutput && explainCompileOutput(result.compileOutput).length > 0 && (
        <ul className="flex flex-col gap-1 rounded-2xl bg-sky/10 px-3 py-2 text-sm" aria-label="What the compiler is telling you">
          {explainCompileOutput(result.compileOutput).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      {!ok && VERDICT_HELP[result.verdict] && (
        <details className="rounded-2xl border-2 border-line p-3 text-sm">
          <summary className="cursor-pointer font-extrabold">What does this mean and what should I check?</summary>
          <p className="mt-2 text-muted">{VERDICT_HELP[result.verdict]!.meaning}</p>
          <ul className="mt-2 list-disc pl-5">
            {VERDICT_HELP[result.verdict]!.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      )}
      {ok && result.firstSolve && (
        <p className="flex items-center gap-2 rounded-2xl bg-gold/20 px-3 py-2 font-extrabold text-gold-dark dark:text-gold">
          <Zap size={18} fill="currentColor" /> +{result.xpGained} XP earned!
          {result.level?.leveledUp && <span className="ml-auto text-grape-dark dark:text-grape">Level {result.level.after}</span>}
        </p>
      )}
      {result.rewards.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label="Rewards">
          {result.rewards.map((r) => (
            <li key={`${r.kind}:${r.slug}`} className="flex items-center gap-2 rounded-2xl bg-sky/10 px-3 py-2 text-sm font-extrabold text-sky">
              {r.kind === "quest" ? "Quest complete" : "Achievement unlocked"}: {r.title}
              {r.xp > 0 && <span className="ml-auto text-gold-dark dark:text-gold">+{r.xp} XP</span>}
            </li>
          ))}
        </ul>
      )}
      {ok && !result.firstSolve && <p className="text-sm text-muted">Already solved before, so no additional XP.</p>}
      {result.verdict !== "compilation_error" && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Per-test results">
          {result.tests.map((t) => (
            <li
              key={t.index}
              title={`Test ${t.index}: ${VERDICT_LABEL[t.verdict] ?? t.verdict}${t.timeMs !== null ? ` (${t.timeMs} ms)` : ""}`}
              className={cn("grid size-7 place-items-center rounded-lg text-[11px] font-extrabold text-white", t.verdict === "accepted" ? "bg-brand" : "bg-danger")}
            >
              {t.index}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 font-bold text-sky" role="status">
      <Loader2 className="animate-spin" size={18} /> {label}
    </p>
  );
}
