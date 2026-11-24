import { ArrowRight, CheckCircle2, ChevronDown, Compass, FastForward, Sprout, TrendingUp } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PlacementResult } from "@/server/services/placement";

type View = Pick<PlacementResult, "skills" | "recommendation"> & { missed?: PlacementResult["missed"]; answered?: number; total?: number };

const LEVELS = [
  { id: "strong", title: "Looks strong", icon: CheckCircle2, tone: "text-brand-dark dark:text-brand", chip: "bg-brand/15" },
  { id: "developing", title: "Developing", icon: TrendingUp, tone: "text-sky-dark dark:text-sky", chip: "bg-sky/15" },
  { id: "practice", title: "Needs practice", icon: Sprout, tone: "text-gold-dark", chip: "bg-gold/25" },
] as const;

const ACTION = {
  study: { label: "Study", hint: "Take the lessons" },
  review: { label: "Review", hint: "Skim the lessons, then continue" },
  "skip-test": { label: "Skip test", hint: "Try the test-out" },
} as const;

export function ResultView({ result, onRetake }: { result: View; onRetake?: () => void }) {
  const { skills, recommendation: rec } = result;
  const start = rec.steps.find((s) => s.unit === rec.startUnit);
  return (
    <div className="flex flex-col gap-5">
      <Card className="border-sky/40 bg-sky/10 p-5">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-sky">
          <Compass size={14} /> Your starting point
        </p>
        {start ? (
          <>
            <h2 className="mt-1 text-2xl font-black">Start with {start.title}</h2>
            <p className="mt-1 text-sm">{start.reason}</p>
          </>
        ) : (
          <h2 className="mt-1 text-2xl font-black">Continue where you are</h2>
        )}
        {rec.note && <p className="mt-2 text-sm text-muted">{rec.note}</p>}
        <p className="mt-3 text-xs text-muted">
          This is a provisional estimate from {result.total ?? skills.reduce((n, s) => n + s.total, 0)} questions. It is a suggestion only: nothing was unlocked or marked as done, and your normal path works exactly as before.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-black">Skill breakdown</h2>
        <div className="mt-3 flex flex-col gap-4">
          {LEVELS.map((lv) => {
            const list = skills.filter((s) => s.level === lv.id);
            if (!list.length) return null;
            return (
              <section key={lv.id} aria-label={lv.title}>
                <p className={`flex items-center gap-2 text-xs font-extrabold uppercase ${lv.tone}`}>
                  <lv.icon size={14} /> {lv.title}
                </p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {list.map((s) => (
                    <li key={s.skillId} className="flex items-center justify-between gap-3 rounded-xl border-2 border-line px-3 py-2 text-sm">
                      <span className="font-bold">{s.title}</span>
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-extrabold ${lv.chip}`} title={s.confidence === "low" ? "Based on a single question" : undefined}>
                        {s.correct}/{s.total}
                        {s.confidence === "low" ? " · 1 question" : ""}
                        {s.unknown > 0 ? ` · ${s.unknown} unsure` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Card>

      {rec.steps.length > 0 && (
        <Card className="p-5">
          <h2 className="text-lg font-black">Suggested path</h2>
          <p className="mt-1 text-sm text-muted">Units you have not mastered yet that lead to your starting point, in order. A unit still opens only when the units before it are mastered.</p>
          <ol className="mt-3 flex flex-col gap-2">
            {rec.steps.map((s, i) => (
              <li key={s.unit} className={`flex flex-wrap items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${s.unit === rec.startUnit ? "border-sky bg-sky/10" : "border-line"}`}>
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-black">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold leading-tight">{s.title}</p>
                  <p className="text-xs text-muted">{s.reason}</p>
                </div>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-extrabold uppercase">{ACTION[s.action].label}</span>
                {s.action === "skip-test" ? (
                  <Link href={`/learn/skip/${s.unitId}`} className="inline-flex items-center gap-1 text-xs font-extrabold uppercase text-sky hover:underline">
                    <FastForward size={13} /> Test out
                  </Link>
                ) : (
                  <Link href={`/learn#unit-${s.unitId}`} className="inline-flex items-center gap-1 text-xs font-extrabold uppercase text-sky hover:underline">
                    Open <ArrowRight size={13} />
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {result.missed && result.missed.length > 0 && (
        <Card className="p-5">
          <details>
            <summary className="flex cursor-pointer items-center gap-2 font-black">
              <ChevronDown size={16} /> Review {result.missed.length} question{result.missed.length === 1 ? "" : "s"} you missed or skipped
            </summary>
            <ul className="mt-3 divide-y-2 divide-line">
              {result.missed.map((m) => (
                <li key={m.questionId} className="py-3 text-sm">
                  <p className="font-bold">{m.prompt}</p>
                  {m.correctAnswer && <p className="mt-1 font-mono text-xs">Answer: {m.correctAnswer}</p>}
                  <p className="mt-1 text-muted">{m.explanation}</p>
                </li>
              ))}
            </ul>
          </details>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/learn" size="lg" className="sm:flex-1">
          Go to my learning path
        </ButtonLink>
        {onRetake && (
          <button type="button" onClick={onRetake} className="rounded-2xl border-2 border-b-4 border-line px-5 py-3 text-sm font-extrabold uppercase hover:bg-surface-2">
            Retake the test
          </button>
        )}
      </div>
    </div>
  );
}
