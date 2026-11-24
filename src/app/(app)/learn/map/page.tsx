import type { Metadata } from "next";
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DynamicIcon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireUser } from "@/server/auth/session";
import { unitDepths } from "@/server/services/curriculum-graph";
import { getLearningPath } from "@/server/services/path";

export const metadata: Metadata = { title: "Skill Map" };

export default async function SkillMapPage() {
  const user = await requireUser();
  const path = await getLearningPath(user.id);
  const units = path.filter((w) => w.playable).flatMap((w) => w.units.map((u) => ({ ...u, color: w.color, world: w.title })));
  const depths = unitDepths(units);
  const maxDepth = Math.max(0, ...depths.values());
  const columns = Array.from({ length: maxDepth + 1 }, (_, d) => units.filter((u) => depths.get(u.slug) === d));
  const next = units.find((u) => u.state !== "completed" && !u.lockedReason);

  return (
    <div>
      <Link href="/learn" className="text-xs font-extrabold uppercase text-sky hover:underline">
        Learning path
      </Link>
      <h1 className="mt-1 text-3xl font-black">Skill Map</h1>
      <p className="mt-1 max-w-2xl text-muted">
        Each column needs the columns to its left. A unit opens when every unit it needs is <b>mastered</b>: all its lessons and its assessment are done. XP alone never opens a unit.
      </p>
      {next && (
        <Card className="mt-5 border-sky/40 bg-sky/10">
          <p className="text-xs font-extrabold uppercase text-sky">Recommended next unit</p>
          <p className="mt-1 text-lg font-black">{next.title}</p>
          <p className="text-sm text-muted">
            {next.completed}/{next.total} done in {next.world}. <Link href="/learn" className="font-bold text-sky hover:underline">Open the path</Link>
          </p>
        </Card>
      )}
      <div className="-mx-4 mt-6 overflow-x-auto px-4 pb-4">
        <div className="flex min-w-max items-start gap-6">
          {columns.map((col, d) => (
            <div key={d} className="w-64 shrink-0">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted">{d === 0 ? "Start here" : `Level ${d + 1}`}</p>
              <ul className="flex flex-col gap-3">
                {col.map((u) => {
                  const locked = !!u.lockedReason;
                  return (
                    <li key={u.id}>
                      <Card className={locked ? "opacity-70" : ""} style={{ borderLeft: `6px solid ${u.color}` }}>
                        <div className="flex items-start gap-2">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: u.color }}>
                            <DynamicIcon name={u.icon} size={18} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold leading-tight">{u.title}</p>
                            <p className="text-[11px] font-bold uppercase text-muted">{u.world}</p>
                          </div>
                          {u.mastered ? <CheckCircle2 size={20} className="text-brand" aria-label="Mastered" /> : locked ? <Lock size={18} className="text-muted" aria-label="Locked" /> : null}
                        </div>
                        <ProgressBar value={u.total ? u.completed / u.total : 0} className="mt-3 h-2" label={`${u.title} progress`} />
                        <p className="mt-1 text-xs font-bold text-muted">
                          {u.completed}/{u.total} lessons
                          {u.assessment?.required && (
                            <span className="ml-2 inline-flex items-center gap-1">
                              <ShieldCheck size={12} /> {u.assessment.state === "completed" || u.assessment.state === "perfected" ? "assessment passed" : "assessment"}
                            </span>
                          )}
                        </p>
                        {u.prerequisites.length > 0 && (
                          <p className="mt-2 text-xs text-muted">
                            Needs:{" "}
                            {u.prerequisites.map((p, i) => (
                              <span key={p.slug} className={p.done ? "font-bold text-brand" : "font-bold"}>
                                {i > 0 && ", "}
                                {p.title}
                                {p.done ? " ✓" : ""}
                              </span>
                            ))}
                          </p>
                        )}
                        {u.lockedReason && <p className="mt-2 text-xs font-bold text-danger">{u.lockedReason}</p>}
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
