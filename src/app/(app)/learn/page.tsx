import type { Metadata } from "next";
import { Hourglass, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { UnitSection } from "@/components/learning/unit-section";
import { Card } from "@/components/ui/card";
import { DynamicIcon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireUser } from "@/server/auth/session";
import { getLearningPath, nextLesson } from "@/server/services/path";

export const metadata: Metadata = { title: "Learning Path" };

export default async function LearnPage() {
  const user = await requireUser();
  const path = await getLearningPath(user.id);
  const next = nextLesson(path);
  const nextUnit = next ? path.flatMap((w) => w.units).find((u) => u.lessons.some((l) => l.id === next.id)) : null;
  const recommended = path.find((w) => w.slug === user.recommendedWorldSlug);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-black">Learning Path</h1>
      <p className="mt-1 text-muted">Lessons inside a unit go in order. A unit opens when the units it needs are mastered (lessons plus assessment).</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link href="/learn/map" className="inline-flex items-center gap-2 rounded-xl border-2 border-line px-3 py-1.5 text-xs font-extrabold uppercase hover:border-sky">
          <MapIcon size={14} /> Skill map
        </Link>
      </div>
      {next && nextUnit && (
        <Card className="mt-5 border-brand/40 bg-brand/10">
          <p className="text-xs font-extrabold uppercase text-brand">Next step</p>
          <p className="mt-1 text-lg font-black">{next.title}</p>
          <p className="text-sm text-muted">
            {next.kind === "assessment" ? "Unit assessment: prove you can use everything in " : "Continue "}
            {nextUnit.title} ({nextUnit.completed}/{nextUnit.total} done).{" "}
            <Link href={`/lesson/${next.id}`} prefetch={false} className="font-bold text-brand hover:underline">Go</Link>
          </p>
        </Card>
      )}

      {recommended && !recommended.playable && (
        <Card className="mt-5 border-sky/40 bg-sky/10">
          <p className="font-extrabold text-sky">Your recommended path: {recommended.title}</p>
          <p className="mt-1 text-sm text-muted">
            That world is not available yet, so we start with C++ Foundations. It is a quick way to lock in the basics.
          </p>
        </Card>
      )}

      <div className="mt-8">
        {path.map((w) =>
          w.playable ? (
            <div key={w.id} className="mb-10">
              <div className="mb-5 flex animate-rise items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl text-white" style={{ background: w.color }}>
                  <DynamicIcon name={w.icon} size={24} />
                </span>
                <div className="flex-1">
                  <h2 className="text-2xl font-black">{w.title}</h2>
                  <div className="mt-1 flex items-center gap-3">
                    <ProgressBar value={w.total ? w.completed / w.total : 0} className="h-2.5 [&>div]:origin-left [&>div]:animate-grow" label={`${w.title} progress`} />
                    <span className="whitespace-nowrap text-xs font-bold text-muted">
                      {w.completed}/{w.total} lessons
                    </span>
                  </div>
                </div>
              </div>
              {w.units.map((u, i) => (
                <UnitSection key={u.id} unit={u} index={i} color={w.color} />
              ))}
            </div>
          ) : null,
        )}

        <h2 className="mb-3 mt-4 text-lg font-black">Coming next</h2>
        <div className="stagger grid gap-3 sm:grid-cols-2">
          {path
            .filter((w) => !w.playable)
            .map((w) => (
              <Card key={w.id} className="flex items-start gap-3 opacity-80">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                  <DynamicIcon name={w.icon} size={20} />
                </span>
                <div>
                  <p className="font-extrabold">{w.title}</p>
                  <p className="text-sm text-muted">{w.description}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold uppercase text-muted">
                    <Hourglass size={12} /> Not available yet
                  </p>
                </div>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
