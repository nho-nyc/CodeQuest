import { Check, Crown, Lock, Play, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { PathLesson } from "@/server/services/path";

const STYLE: Record<PathLesson["state"], string> = {
  locked: "bg-surface-2 border-line text-muted cursor-not-allowed",
  available: "bg-brand border-brand-dark text-white hover:brightness-105",
  in_progress: "bg-sky border-sky-dark text-white hover:brightness-105",
  completed: "bg-gold border-gold-dark text-white hover:brightness-105",
  perfected: "bg-grape border-grape-dark text-white hover:brightness-105",
};
const LABEL: Record<PathLesson["state"], string> = {
  locked: "Locked",
  available: "Start",
  in_progress: "Continue",
  completed: "Completed",
  perfected: "Perfected",
};
const ICON = { locked: Lock, available: Star, in_progress: Play, completed: Check, perfected: Crown } as const;

export function LessonNode({ lesson, offset, index = 0 }: { lesson: PathLesson; offset: number; index?: number }) {
  const Icon = lesson.kind !== "lesson" && lesson.state !== "completed" && lesson.state !== "perfected" && lesson.state !== "locked" ? ShieldCheck : ICON[lesson.state];
  const kindLabel = lesson.kind === "assessment" ? "Unit assessment" : lesson.kind === "checkpoint" ? "Optional checkpoint" : null;
  const locked = lesson.state === "locked";
  const body = (
    <>
      <span
        style={{ animationDelay: `${200 + index * 80}ms` }}
        className={cn(
          "relative grid size-[72px] animate-pop [animation-fill-mode:backwards] place-items-center rounded-full border-b-[7px] transition hover:scale-110 active:translate-y-[3px] active:border-b-[3px]",
          STYLE[lesson.state],
        )}
      >
        {(lesson.state === "available" || lesson.state === "in_progress") && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-current opacity-20" />}
        <Icon size={30} fill={lesson.state === "available" || lesson.state === "completed" ? "currentColor" : "none"} strokeWidth={2.5} />
      </span>
      <span className="mt-2 max-w-[11rem] text-center text-sm font-extrabold leading-tight">{lesson.title}</span>
      {kindLabel && <span className="text-[10px] font-extrabold uppercase tracking-wide text-sky">{kindLabel}</span>}
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
        {LABEL[lesson.state]}
        {!locked && lesson.state !== "completed" && lesson.state !== "perfected" ? ` · +${lesson.xpReward} XP` : ""}
      </span>
    </>
  );
  const common = "flex flex-col items-center";
  return (
    <li style={{ transform: `translateX(${offset}px)` }} className="list-none">
      {locked ? (
        <div className={common} aria-disabled aria-label={`${lesson.title} (locked)`}>
          {body}
        </div>
      ) : (
        <Link href={`/lesson/${lesson.id}`} prefetch={false} className={common}>
          {body}
        </Link>
      )}
    </li>
  );
}
