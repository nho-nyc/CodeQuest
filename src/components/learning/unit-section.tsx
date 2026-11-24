import { CheckCircle2, ExternalLink, FastForward, Lock, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";
import { DynamicIcon } from "@/components/ui/icon";
import { externalForUnit } from "@/content/external-problems";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { PathUnit } from "@/server/services/path";
import { LessonNode } from "./lesson-node";

const OFFSETS = [0, 44, 64, 44, 0, -44, -64, -44];

export function UnitSection({ unit, index, color }: { unit: PathUnit; index: number; color: string }) {
  return (
    <section id={`unit-${unit.id}`} aria-labelledby={`unit-title-${unit.id}`} className="mb-12 scroll-mt-20 animate-rise" style={{ animationDelay: `${Math.min(index, 4) * 90}ms` }}>
      <div className="rounded-3xl border-b-4 p-5 text-white" style={{ background: color, borderColor: "rgb(0 0 0 / 0.18)" }}>
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20">
            <DynamicIcon name={unit.icon} size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-widest text-white/80">Unit {index + 1}</p>
            <h3 id={`unit-title-${unit.id}`} className="text-xl font-black">
              {unit.title}
            </h3>
            <p className="mt-1 text-sm text-white/90">{unit.description}</p>
          </div>
          {unit.state === "completed" && <CheckCircle2 aria-label="Unit completed" size={28} />}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={unit.total ? unit.completed / unit.total : 0} className="h-3 bg-black/20 [&>div]:origin-left [&>div]:animate-grow" color="bg-white" label={`${unit.title} progress`} />
          <span className="whitespace-nowrap text-xs font-extrabold">
            {unit.completed}/{unit.total} · {unit.xp} XP
          </span>
        </div>
        {unit.lockedReason && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-black/20 px-3 py-2 text-sm font-bold">
            <Lock size={16} className="mt-0.5 shrink-0" /> {unit.lockedReason}
          </p>
        )}
        {unit.prerequisites.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase">
            <span className="text-white/80">Needs</span>
            {unit.prerequisites.map((p) => (
              <span key={p.slug} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${p.done ? "bg-white text-black" : "bg-black/25"}`}>
                {p.done ? <CheckCircle2 size={12} /> : <Lock size={12} />} {p.title}
              </span>
            ))}
          </div>
        )}
        {unit.objectives.length > 0 && (
          <details className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-sm">
            <summary className="flex cursor-pointer items-center gap-2 text-xs font-extrabold uppercase">
              <Target size={14} /> You will learn to
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {unit.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </details>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
        {unit.assessment && (
          <p className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-extrabold uppercase">
            <ShieldCheck size={14} />
            {unit.assessment.state === "completed" || unit.assessment.state === "perfected"
              ? unit.assessment.required ? "Assessment passed" : "Checkpoint done"
              : unit.assessment.state === "locked"
                ? unit.assessment.required ? "Assessment unlocks after the lessons" : "Checkpoint unlocks after the lessons"
                : unit.assessment.required ? "Assessment ready: it unlocks the next units" : "Optional checkpoint ready"}
          </p>
        )}
        {unit.skipped && <p className="w-full text-xs font-extrabold uppercase text-white/90">Skipped by test. You can still replay any lesson.</p>}
        {unit.canSkip && (
          <Link href={`/learn/skip/${unit.id}`} className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-extrabold uppercase hover:bg-white/30">
            <FastForward size={14} /> Already know this? Test out
          </Link>
        )}
        {externalForUnit(unit.slug).length > 0 && (
          <Link href={`/practice/links#${unit.slug}`} className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-extrabold uppercase hover:bg-white/30">
            <ExternalLink size={14} /> {externalForUnit(unit.slug).length} external {externalForUnit(unit.slug).length === 1 ? "problem" : "problems"}
          </Link>
        )}
        </div>
      </div>
      {unit.practice.length > 0 && (
        <div className="mt-4 rounded-2xl border-2 border-line p-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted">Practice for this unit</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unit.practice.map((p) => (
              <Link key={p.slug} href={`/practice/${p.slug}`} className="inline-flex items-center gap-1.5 rounded-full border-2 border-line px-3 py-1 text-xs font-bold hover:border-sky">
                {p.solved && <CheckCircle2 size={13} className="text-brand" aria-label="solved" />}
                {p.title}
                <span className="uppercase text-muted">{p.difficulty}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <ol className="mt-8 flex flex-col items-center gap-7 p-0">
        {unit.lessons.map((l, i) => (
          <LessonNode key={l.id} lesson={l} offset={OFFSETS[i % OFFSETS.length]!} index={i} />
        ))}
      </ol>
    </section>
  );
}
