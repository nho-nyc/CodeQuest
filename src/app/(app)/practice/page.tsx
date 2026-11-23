import type { Metadata } from "next";
import { CheckCircle2, ChevronDown, CircleDashed, Search, Timer } from "lucide-react";
import Link from "next/link";
import { DifficultyBadge } from "@/components/practice/difficulty-badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { requireUser } from "@/server/auth/session";
import { listProblems } from "@/server/services/problems";

export const metadata: Metadata = { title: "Practice" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function PracticePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const filters = { difficulty: one(sp.difficulty), tag: one(sp.tag), status: one(sp.status), q: one(sp.q), page: Number(one(sp.page)) || 1 };
  const data = await listProblems(user.id, filters);

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { difficulty: filters.difficulty, tag: filters.tag, status: filters.status, q: filters.q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/practice?${s}` : "/practice";
  };
  const chip = (active: boolean) => cn("rounded-full border-2 px-3 py-1 text-xs font-extrabold uppercase", active ? "border-sky bg-sky/10 text-sky" : "border-line text-muted hover:bg-surface-2");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-black">Practice</h1>
      <p className="mt-1 text-muted">Solve real problems. Every submission is judged on hidden tests by a real judge.</p>
      <p className="mt-1 text-sm"><Link href="/practice/links" className="font-extrabold text-sky hover:underline">More problems on CSES, Codeforces, AtCoder and VNOJ →</Link></p>

      <form action="/practice" className="mt-5 flex gap-2" role="search">
        {filters.difficulty && <input type="hidden" name="difficulty" value={filters.difficulty} />}
        {filters.tag && <input type="hidden" name="tag" value={filters.tag} />}
        {filters.status && <input type="hidden" name="status" value={filters.status} />}
        <label className="relative flex-1">
          <span className="sr-only">Search problems</span>
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={filters.q} placeholder="Search by title" className="h-11 w-full rounded-2xl border-2 border-line bg-surface pl-10 pr-3 outline-none focus:border-sky" />
        </label>
        <button className="rounded-2xl bg-sky px-4 font-extrabold text-white">Search</button>
      </form>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5" aria-label="Difficulty">
          <Link href={href({ difficulty: undefined })} className={chip(!filters.difficulty)}>All levels</Link>
          {["newbie", "easy", "medium", "hard"].map((d) => (
            <Link key={d} href={href({ difficulty: d })} className={chip(filters.difficulty === d)}>{d}</Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Status">
          <Link href={href({ status: undefined })} className={chip(!filters.status)}>Any status</Link>
          {["unsolved", "attempted", "solved"].map((s) => (
            <Link key={s} href={href({ status: s })} className={chip(filters.status === s)}>{s}</Link>
          ))}
        </div>
        <details className="group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border-2 border-line px-3 py-1 text-xs font-extrabold uppercase text-muted hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
            Topics{filters.tag ? `: ${filters.tag}` : ""}
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Topic">
            <Link href={href({ tag: undefined })} className={chip(!filters.tag)}>All topics</Link>
            {data.tags.map((t) => (
              <Link key={t} href={href({ tag: t })} className={chip(filters.tag === t)}>{t}</Link>
            ))}
          </div>
        </details>
      </div>

      <p className="mt-5 text-sm font-bold text-muted">{data.total} problem{data.total === 1 ? "" : "s"}</p>
      <ul className="mt-2 flex flex-col gap-3">
        {data.items.map((p) => (
          <li key={p.slug}>
            <Link href={`/practice/${p.slug}`}>
              <Card className="flex items-center gap-4 transition hover:border-sky/60">
                {p.status === "solved" ? (
                  <CheckCircle2 className="shrink-0 text-brand" aria-label="Solved" />
                ) : p.status === "attempted" ? (
                  <CircleDashed className="shrink-0 text-gold" aria-label="Attempted" />
                ) : (
                  <CircleDashed className="shrink-0 text-line" aria-label="Not started" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">{p.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">{p.tags.join(" · ")}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <DifficultyBadge difficulty={p.difficulty} rating={p.rating} />
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Timer size={12} /> ~{p.estimatedMinutes} min{p.acceptance !== null ? ` · ${Math.round(p.acceptance * 100)}% acc.` : ""}
                  </span>
                </div>
              </Card>
            </Link>
          </li>
        ))}
        {data.items.length === 0 && <li className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-muted">No problems match these filters.</li>}
      </ul>

      {data.pages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Pagination">
          {data.page > 1 && <Link className={chip(false)} href={href({ page: String(data.page - 1) })}>Previous</Link>}
          <span className="text-sm font-bold text-muted">Page {data.page} of {data.pages}</span>
          {data.page < data.pages && <Link className={chip(false)} href={href({ page: String(data.page + 1) })}>Next</Link>}
        </nav>
      )}
    </div>
  );
}
