import type { Metadata } from "next";
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ScrollToCurrent } from "@/components/learning/scroll-to-current";
import { DynamicIcon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireUser } from "@/server/auth/session";
import { layoutUnits } from "@/server/services/curriculum-graph";
import { getLearningPath, type PathUnit } from "@/server/services/path";

export const metadata: Metadata = { title: "Skill Map" };

const W = 220;
const H = 128;
const GAP_X = 72;
const GAP_Y = 20;

type Status = "mastered" | "assessment" | "progress" | "available" | "locked";
const STATUS: Record<Status, { label: string; chip: string }> = {
  mastered: { label: "Mastered", chip: "bg-brand/15 text-brand-dark dark:text-brand" },
  assessment: { label: "Assessment ready", chip: "bg-gold/25 text-gold-dark" },
  progress: { label: "In progress", chip: "bg-sky/15 text-sky-dark dark:text-sky" },
  available: { label: "Ready to start", chip: "bg-surface-2 text-fg" },
  locked: { label: "Locked", chip: "bg-surface-2 text-muted" },
};

function statusOf(u: PathUnit): Status {
  if (u.mastered) return "mastered";
  if (u.lockedReason) return "locked";
  if (u.assessment?.required && u.assessment.state !== "locked" && u.completed >= u.total - 1 && u.completed > 0) return "assessment";
  return u.completed > 0 ? "progress" : "available";
}

export default async function SkillMapPage() {
  const user = await requireUser();
  const path = await getLearningPath(user.id);
  const units = path.filter((w) => w.playable).flatMap((w) => w.units.map((u) => ({ ...u, color: w.color, world: w.title })));
  const pos = layoutUnits(units);
  const cols = Math.max(0, ...[...pos.values()].map((p) => p.col)) + 1;
  const rows = Math.max(0, ...[...pos.values()].map((p) => p.row)) + 1;
  const width = cols * W + (cols - 1) * GAP_X;
  const height = rows * H + (rows - 1) * GAP_Y;
  const xy = (slug: string) => ({ x: pos.get(slug)!.col * (W + GAP_X), y: pos.get(slug)!.row * (H + GAP_Y) });
  const status = new Map(units.map((u) => [u.slug, statusOf(u)]));
  const next = units.find((u) => status.get(u.slug) !== "mastered" && status.get(u.slug) !== "locked");
  const edges = units.flatMap((u) => u.prerequisites.filter((p) => pos.has(p.slug)).map((p) => ({ from: p.slug, to: u.slug, done: p.done })));

  return (
    <div>
      <Link href="/learn" className="text-xs font-extrabold uppercase text-sky hover:underline">
        Learning path
      </Link>
      <h1 className="mt-1 text-3xl font-black">Skill Map</h1>
      <p className="mt-1 max-w-2xl text-muted">
        Lines go from a unit to the units it unlocks. A unit opens when every unit pointing at it is <b>mastered</b> (all lessons and its assessment). XP alone never opens a unit.
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-muted" aria-label="Legend">
        <li className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-6 bg-brand" /> prerequisite mastered</li>
        <li className="flex items-center gap-1.5"><span className="inline-block h-0 w-6 border-t-2 border-dashed border-muted" /> prerequisite not mastered</li>
        <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-brand" /> mastered</li>
        <li className="flex items-center gap-1.5"><Lock size={13} /> locked</li>
        <li className="flex items-center gap-1.5"><ShieldCheck size={13} /> assessment required</li>
      </ul>
      {next && (
        <p className="mt-4 rounded-2xl border-2 border-sky/40 bg-sky/10 px-4 py-3 text-sm">
          <span className="mr-2 text-xs font-extrabold uppercase text-sky">Recommended next unit:</span>
          <Link href={`/learn#unit-${next.id}`} className="font-black hover:underline">{next.title}</Link>
          <span className="text-muted"> ({next.completed}/{next.total} lessons)</span>
        </p>
      )}

      <ScrollToCurrent className="mt-5 overflow-x-auto rounded-2xl border-2 border-line bg-surface p-4 focus-visible:outline-sky">
        <div className="relative" style={{ width, height }}>
          <svg aria-hidden width={width} height={height} className="absolute inset-0">
            {edges.map((e) => {
              const a = xy(e.from);
              const b = xy(e.to);
              const x1 = a.x + W;
              const y1 = a.y + H / 2;
              const x2 = b.x;
              const y2 = b.y + H / 2;
              const mx = (x1 + x2) / 2;
              return (
                <path
                  key={`${e.from}>${e.to}`}
                  d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  fill="none"
                  strokeWidth={2}
                  opacity={Math.abs(pos.get(e.to)!.col - pos.get(e.from)!.col) > 1 ? 0.4 : 1}
                  strokeDasharray={e.done ? undefined : "6 5"}
                  className={e.done ? "stroke-brand" : "stroke-muted/60"}
                />
              );
            })}
          </svg>
          {units.map((u) => {
            const { x, y } = xy(u.slug);
            const st = status.get(u.slug)!;
            const s = STATUS[st];
            const current = next?.slug === u.slug;
            return (
              <Link
                key={u.id}
                href={`/learn#unit-${u.id}`}
                data-current={current ? "" : undefined}
                aria-label={`${u.title}: ${s.label}, ${u.completed} of ${u.total} lessons`}
                style={{ left: x, top: y, width: W, height: H, borderLeftColor: u.color }}
                className={`absolute flex flex-col justify-between rounded-2xl border-2 border-l-[6px] bg-surface p-3 transition hover:-translate-y-0.5 hover:shadow-md ${current ? "border-sky ring-2 ring-sky/40" : "border-line"} ${st === "locked" ? "opacity-75" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: u.color }}>
                    <DynamicIcon name={u.icon} size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-extrabold leading-tight">{u.title}</p>
                    <p className="truncate text-[10px] font-bold uppercase text-muted">{u.world}</p>
                  </div>
                </div>
                <div>
                  <ProgressBar value={u.total ? u.completed / u.total : 0} className="h-2!" label={`${u.title} progress`} />
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] font-bold">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${s.chip}`}>
                      {st === "mastered" ? <CheckCircle2 size={11} /> : st === "locked" ? <Lock size={11} /> : st === "assessment" ? <ShieldCheck size={11} /> : null}
                      {s.label}
                    </span>
                    <span className="text-muted">{u.completed}/{u.total}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollToCurrent>
      <p className="mt-2 text-xs text-muted">Tip: select a unit to jump to it on the learning path, where its lock reason, objectives and assessment are listed.</p>
    </div>
  );
}
